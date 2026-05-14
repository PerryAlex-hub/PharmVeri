import { logger } from "../utils/logger";
import {
  OCRPackageDetails,
  PackageViews,
  SIFTComparisonResult,
  VerificationResponse,
  ViewAnalysis,
} from "../types/verification.types";
import { scoringService } from "./scoring.service";
import { geminiVisionService } from "./geminiVision.service";
import { detailedAnalysisService } from "./detailedAnalysis.service";
import { nafdacScraperService } from "./nafdacScraper.service";
import { verdictService } from "./verdict.service";
import { fetchRefBase64 } from "./packageVerification.reference";
import {
  isUsableText,
  mergeOCRResults,
  parseExpiryDate,
  pickFirstUsable,
} from "./packageVerification.helpers";
import { runOCR, runSIFT } from "./packageVerification.roboflow";

function buildConfidenceBand(
  confidence: number,
): "very_high" | "high" | "moderate" | "low" {
  if (confidence >= 90) return "very_high";
  if (confidence >= 75) return "high";
  if (confidence >= 50) return "moderate";
  return "low";
}

function buildExpiryAnalysis(expiryDate: string) {
  const expiryValue = isUsableText(expiryDate) ? expiryDate.trim() : "";
  const parsedExpiry = expiryValue ? parseExpiryDate(expiryValue) : null;

  return {
    detected: Boolean(expiryValue),
    expiry_date: expiryValue || null,
    is_expired: parsedExpiry ? parsedExpiry < new Date() : null,
    note: !expiryValue
      ? "Expiry date not detected"
      : !parsedExpiry
        ? "Expiry detected but format is not parseable"
        : parsedExpiry < new Date()
          ? "Product appears expired"
          : "Product appears valid",
  };
}

export async function verifyDrugPackage(
  views: PackageViews,
): Promise<VerificationResponse> {
  try {
    logger.info("Starting 4-view package verification...");

    const ocrResults = await Promise.all([
      runOCR(views.front, "front"),
      runOCR(views.back, "back"),
      runOCR(views.panel_1, "panel_1"),
      runOCR(views.panel_2, "panel_2"),
    ]);

    const rawOcrPerView: Record<string, OCRPackageDetails> = {
      front: ocrResults[0],
      back: ocrResults[1],
      panel_1: ocrResults[2],
      panel_2: ocrResults[3],
    };

    const mergedOCR = mergeOCRResults(ocrResults);
    const frontOCR = ocrResults[0];

    const expiryDate = pickFirstUsable([
      frontOCR.expiry_date,
      ocrResults[1].expiry_date,
      ocrResults[2].expiry_date,
      ocrResults[3].expiry_date,
    ]);

    if (expiryDate) {
      mergedOCR.expiry_date = expiryDate;
    }

    mergedOCR.drug_name = frontOCR.drug_name || "";

    const nafdacNumber = mergedOCR.nafdac_reg_no;
    const expiryAnalysis = buildExpiryAnalysis(mergedOCR.expiry_date);

    if (!nafdacNumber || nafdacNumber.trim() === "") {
      logger.error("Could not extract NAFDAC number from any view");
      throw new Error(
        `Could not find NAFDAC number across any view. OCR found: drug_name="${mergedOCR.drug_name}", barcode="${mergedOCR.barcode}"`,
      );
    }

    logger.info(`Identified NAFDAC: ${nafdacNumber}`);

    const [refFront, refBack] = await Promise.all([
      fetchRefBase64(nafdacNumber, "front"),
      fetchRefBase64(nafdacNumber, "back"),
    ]);

    const [frontResult, backResult] = await Promise.all([
      runSIFT(refFront, views.front),
      runSIFT(refBack, views.back),
    ]);

    const perViewAnalysis: ViewAnalysis[] = [
      {
        view: "front",
        matched_ref: "front",
        verdict: frontResult.match_verdict,
        similarity_score: frontResult.similarity_score,
        visualization: frontResult.match_visualization,
      },
      {
        view: "back",
        matched_ref: "back",
        verdict: backResult.match_verdict,
        similarity_score: backResult.similarity_score,
        visualization: backResult.match_visualization,
      },
    ];

    let nafdacInfo;
    try {
      nafdacInfo =
        await nafdacScraperService.searchNAFDACGreenbook(nafdacNumber);
    } catch (err) {
      logger.warn(
        `NAFDAC verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      nafdacInfo = null;
    }

    const allPassed = frontResult.match_verdict && backResult.match_verdict;
    const lowestScore = Math.min(
      frontResult.similarity_score,
      backResult.similarity_score,
    );
    const aggregateSimilarity = Math.round(
      (frontResult.similarity_score + backResult.similarity_score) / 2,
    );

    const aggregateSift = {
      match_verdict: allPassed,
      similarity_score: aggregateSimilarity,
      match_visualization: frontResult.match_visualization || "",
    } as SIFTComparisonResult;

    const authReport = scoringService.computeAuthenticityScore(
      mergedOCR as any,
      aggregateSift as any,
    );

    const confPercent = authReport.confidence;
    const confidenceBand = buildConfidenceBand(confPercent);

    const verdictReason = allPassed
      ? "Front and back images matched reference panels."
      : "One or both views (front/back) did not match reference.";

    logger.info(
      `Verification complete: authentic=${allPassed}, sift_confidence=${lowestScore}, scoring_confidence=${confPercent}`,
    );

    let detailedAnalysis;
    try {
      detailedAnalysis = await detailedAnalysisService.generateDetailedAnalysis(
        mergedOCR,
        aggregateSift,
      );
    } catch (err) {
      logger.warn(
        `Detailed analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      detailedAnalysis = null;
    }

    let frontBackComparison;
    if (geminiVisionService.isEnabled()) {
      try {
        frontBackComparison = await geminiVisionService.analyzeProductImages(
          refFront,
          views.front,
        );
      } catch (err) {
        logger.warn(
          `Gemini front comparison failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        frontBackComparison = null;
      }
    }

    const responseBody: VerificationResponse = {
      authentic: allPassed,
      drug_name: frontOCR.drug_name || "Unknown",
      nafdac_number: nafdacNumber,
      sift_confidence: lowestScore,
      scoring_confidence: confPercent,
      confidence_band: confidenceBand,
      expiry_analysis: expiryAnalysis,
      ...(nafdacInfo &&
        nafdacInfo.found && {
          nafdac_verification: {
            found: true,
            product_name: nafdacInfo.productName,
            manufacturer: nafdacInfo.manufacturer,
            status: nafdacInfo.status,
          },
        }),
      ...(frontBackComparison && {
        gemini_front_back_comparison: frontBackComparison,
      }),
      ...(detailedAnalysis && { detailed_analysis: detailedAnalysis }),
      verdict_reason: verdictReason,
      per_view_analysis: perViewAnalysis,
      merged_ocr_data: mergedOCR,
      raw_ocr_per_view: rawOcrPerView,
      panel_matching: {
        assignment: "N/A - panels skipped for speed",
        scores: {},
      },
    };

    const finalVerdict = verdictService.computeFinalVerdict(responseBody);
    responseBody.final_verdict = finalVerdict;

    logger.info(
      `Final verdict: ${finalVerdict.conclusion} (${finalVerdict.confidence_percentage}% confidence)`,
    );

    return responseBody;
  } catch (error) {
    logger.error(`Package verification failed: ${error}`);
    throw error;
  }
}
