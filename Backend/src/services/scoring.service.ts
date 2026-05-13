import { logger } from "../utils/logger";
import {
  ParsedPackageDetails,
  SIFTResult,
  VerificationCheck,
  AuthenticationReport,
  BarcodeVerificationData,
  NAFDACVerificationData,
} from "../types/verification.types";
import { v4 as uuidv4 } from "uuid";

class ScoringService {
  private readonly SIFT_MATCH_WEIGHT = 40; // Total SIFT = 60
  private readonly SIFT_SCORE_WEIGHT = 20; // Total SIFT = 60
  private readonly NAFDAC_WEIGHT = 15;
  private readonly NAFDAC_FOUND_WEIGHT = 10; // Bonus: product found in Greenbook
  private readonly EXPIRY_WEIGHT = 5; // Bonus only if detected
  private readonly BARCODE_VALIDITY_WEIGHT = 5; // Reduced: less critical
  private readonly BARCODE_LOOKUP_WEIGHT = 5; // Keep low: API incomplete

  computeAuthenticityScore(
    ocrData: ParsedPackageDetails,
    siftResult: SIFTResult,
    barcodeData?: BarcodeVerificationData,
    nafdacData?: NAFDACVerificationData,
  ): AuthenticationReport {
    const scanId = uuidv4();
    const checks: VerificationCheck[] = [];
    let totalScore = 0;

    logger.debug(`Computing authenticity score for scan ${scanId}`);

    const siftMatchCheck: VerificationCheck = {
      checkName: "SIFT Visual Match",
      passed: siftResult.match_verdict,
      score: siftResult.match_verdict ? this.SIFT_MATCH_WEIGHT : 0,
      details: siftResult.match_verdict
        ? "Packaging visual structure matches reference"
        : "Packaging visual structure does not match reference",
    };
    checks.push(siftMatchCheck);
    totalScore += siftMatchCheck.score;

    const similarityNormalized = Math.min(siftResult.similarity_score / 200, 1);
    const siftScoreCheck: VerificationCheck = {
      checkName: "SIFT Similarity Score",
      passed: siftResult.similarity_score > 100,
      score: Math.round(similarityNormalized * this.SIFT_SCORE_WEIGHT),
      details: `${siftResult.similarity_score} feature matches`,
    };
    checks.push(siftScoreCheck);
    totalScore += siftScoreCheck.score;

    const nafdacCheck: VerificationCheck = {
      checkName: "NAFDAC Registration",
      passed: !!ocrData.nafdac_reg_no && ocrData.nafdac_reg_no.length > 0,
      score:
        ocrData.nafdac_reg_no && ocrData.nafdac_reg_no.length > 0
          ? this.NAFDAC_WEIGHT
          : 0,
      details: ocrData.nafdac_reg_no
        ? `Valid: ${ocrData.nafdac_reg_no}`
        : "NAFDAC number not found",
    };
    checks.push(nafdacCheck);
    totalScore += nafdacCheck.score;

    // NAFDAC Greenbook validation check (if data available)
    if (nafdacData) {
      const nafdacFoundCheck: VerificationCheck = {
        checkName: "NAFDAC Greenbook Verification",
        passed: nafdacData.nafdacFound,
        score: nafdacData.nafdacFound ? this.NAFDAC_FOUND_WEIGHT : 0,
        details: nafdacData.nafdacFound
          ? `Product verified in NAFDAC Greenbook - ${nafdacData.productName}`
          : "Product not found in NAFDAC Greenbook database",
      };
      checks.push(nafdacFoundCheck);
      totalScore += nafdacFoundCheck.score;
    }

    const expiryCheck: VerificationCheck = {
      checkName: "Expiry Date",
      passed: this.hasValidExpiry(ocrData.expiry_date),
      score: this.hasValidExpiry(ocrData.expiry_date) ? this.EXPIRY_WEIGHT : 0,
      details: ocrData.expiry_date
        ? this.isExpired(ocrData.expiry_date)
          ? "EXPIRED - Product is no longer valid"
          : `Valid until: ${ocrData.expiry_date}`
        : "Expiry date not detected",
    };
    checks.push(expiryCheck);
    totalScore += expiryCheck.score;

    // Barcode verification checks (if barcode data is provided)
    if (barcodeData) {
      const barcodeValidityCheck: VerificationCheck = {
        checkName: "Barcode Validity",
        passed: barcodeData.barcodeValid,
        score: barcodeData.barcodeValid ? this.BARCODE_VALIDITY_WEIGHT : 0,
        details: barcodeData.barcodeValid
          ? `Valid barcode format detected`
          : "Barcode not extracted or invalid format",
      };
      checks.push(barcodeValidityCheck);
      totalScore += barcodeValidityCheck.score;

      const barcodeLookupCheck: VerificationCheck = {
        checkName: "Barcode Product Lookup",
        passed: barcodeData.barcodeFound,
        score: barcodeData.barcodeFound ? this.BARCODE_LOOKUP_WEIGHT : 0,
        details: barcodeData.barcodeFound
          ? `Product found: ${barcodeData.barcodeProductTitle}`
          : "Product not found in barcode database",
      };
      checks.push(barcodeLookupCheck);
      totalScore += barcodeLookupCheck.score;
    }

    // Calculate maximum possible score based on detected checks
    // SIFT checks are always present
    let maxScore =
      this.SIFT_MATCH_WEIGHT + this.SIFT_SCORE_WEIGHT + this.NAFDAC_WEIGHT;

    // Add expiry max only if it was detected and contributed points
    if (
      ocrData.expiry_date &&
      ocrData.expiry_date !== "Not visible in the image"
    ) {
      maxScore += this.EXPIRY_WEIGHT;
    }

    // Add NAFDAC found check if available
    if (nafdacData) {
      maxScore += this.NAFDAC_FOUND_WEIGHT;
    }

    // Add barcode max only if barcode was detected
    if (barcodeData) {
      maxScore += this.BARCODE_VALIDITY_WEIGHT + this.BARCODE_LOOKUP_WEIGHT;
    }

    const confidence = Math.round((totalScore / maxScore) * 100);
    const verdict = this.getVerdict((totalScore / maxScore) * 100);

    const report: AuthenticationReport = {
      verdict,
      overallScore: totalScore,
      confidence,
      checks,
      siftVisualization: siftResult.match_visualization,
      extractedFields: {
        nafdacNumber: ocrData.nafdac_reg_no,
        expiryDate: ocrData.expiry_date,
        manufacturerName: ocrData.manufacturer,
        productName: ocrData.drug_name,
        batchNumber: ocrData.batch_number,
      },
      timestamp: new Date().toISOString(),
      scanId,
    };

    logger.info(
      `Authenticity assessment complete. Verdict: ${verdict}, Score: ${totalScore}/${maxScore}, Confidence: ${confidence}%`,
    );

    return report;
  }

  private normalizeExpiryDate(expiryDate: string): string {
    return expiryDate.trim().replace(/\s+/g, " ");
  }

  private parseExpiryDate(expiryDate: string): Date | null {
    const normalized = this.normalizeExpiryDate(expiryDate).toLowerCase();

    const monthNames = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];

    const monthNameMatch = normalized.match(
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{4})$/,
    );
    if (monthNameMatch) {
      const monthIndex = monthNames.indexOf(monthNameMatch[1]);
      const year = parseInt(monthNameMatch[2], 10);
      if (monthIndex >= 0 && Number.isFinite(year)) {
        return new Date(year, monthIndex + 1, 0);
      }
    }

    const delimiterMatch = normalized.match(
      /^([0-9]{1,4})[\s\/\-.]([0-9]{1,4})$/,
    );
    if (!delimiterMatch) {
      return null;
    }

    const first = parseInt(delimiterMatch[1], 10);
    const second = parseInt(delimiterMatch[2], 10);

    if (!Number.isFinite(first) || !Number.isFinite(second)) {
      return null;
    }

    if (delimiterMatch[1].length === 4) {
      if (second < 1 || second > 12) {
        return null;
      }
      return new Date(first, second, 0);
    }

    if (first < 1 || first > 12) {
      return null;
    }

    const year = delimiterMatch[2].length === 2 ? 2000 + second : second;
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return null;
    }

    return new Date(year, first, 0);
  }

  private isExpiryPlaceholder(expiryDate: string): boolean {
    const normalized = this.normalizeExpiryDate(expiryDate).toLowerCase();
    const isNotVisiblePlaceholder = normalized.startsWith("not visible");
    return [
      "not visible in the image",
      "not provided",
      "not specified",
      "not available",
      "unknown",
      "n/a",
    ].includes(normalized)
      ? true
      : isNotVisiblePlaceholder;
  }

  private isExpired(expiryDate: string | undefined): boolean {
    if (!expiryDate || this.isExpiryPlaceholder(expiryDate)) {
      return false;
    }

    try {
      const expiry = this.parseExpiryDate(expiryDate);
      if (!expiry) {
        return false;
      }

      const today = new Date();

      return expiry < today;
    } catch {
      logger.debug(`Could not parse expiry date: ${expiryDate}`);
      return false;
    }
  }

  private hasValidExpiry(expiryDate: string | undefined): boolean {
    if (!expiryDate) {
      return false;
    }

    if (this.isExpiryPlaceholder(expiryDate)) {
      return false;
    }

    const parsed = this.parseExpiryDate(expiryDate);
    if (!parsed) {
      return false;
    }

    return !this.isExpired(expiryDate);
  }

  private getVerdict(score: number): "GENUINE" | "SUSPICIOUS" | "COUNTERFEIT" {
    if (score >= 80) {
      return "GENUINE";
    } else if (score >= 50) {
      return "SUSPICIOUS";
    } else {
      return "COUNTERFEIT";
    }
  }
}

export const scoringService = new ScoringService();
