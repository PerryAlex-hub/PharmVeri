import { logger } from "../utils/logger";
import {
  VerificationResponse,
  FinalVerdict,
  FrontendDisplay,
} from "../types/verification.types";

class VerdictService {
  /**
   * Compute final verdict based on all verification factors
   */
  computeFinalVerdict(response: VerificationResponse): FinalVerdict {
    const factors = {
      siftPass: response.authentic, // Front & back both match
      scoringConfidence: response.scoring_confidence,
      nafdacFound: response.nafdac_verification?.found ?? false,
      detailedRecommendation: response.detailed_analysis?.recommendation,
      geminiVerdictAuthentic:
        response.gemini_front_back_comparison?.is_authentic,
      geminiConfidence:
        response.gemini_front_back_comparison?.confidence_score ?? 0,
      isExpired: response.expiry_analysis.is_expired,
    };

    // Dynamic weighted scoring (Gemini prioritized)
    // Weights (modifiable):
    const GEMINI_WEIGHT = 40; // Gemini (0-1) scaled to this weight
    const SIFT_WEIGHT = 15; // normalized sift contribution
    const SCORING_WEIGHT = 20; // scoring_confidence (0-100)
    const NAFDAC_WEIGHT = 10; // boolean
    const DETAILED_WEIGHT = 10; // detailedRecommendation
    const EXPIRY_PENALTY = 10; // subtract if expired

    let authenticityScore = 0;
    let maxScore = 0;

    // Gemini vision (preferred): use continuous confidence 0-1 * GEMINI_WEIGHT
    if (typeof factors.geminiConfidence === "number" && factors.geminiConfidence >= 0) {
      authenticityScore += factors.geminiConfidence * GEMINI_WEIGHT;
      maxScore += GEMINI_WEIGHT;
    }

    // SIFT: prefer continuous sift_confidence if present, else fallback to boolean pass
    const rawSift = (response as any).sift_confidence ?? 0; // raw numeric score
    // Normalize by 200 (keeps previous frontend convention), clamp to 0-1
    const normalizedSift = Math.max(0, Math.min(1, rawSift / 200));
    if (normalizedSift > 0) {
      authenticityScore += normalizedSift * SIFT_WEIGHT;
      maxScore += SIFT_WEIGHT;
    } else if (factors.siftPass) {
      // fallback: grant partial SIFT weight if boolean pass exists but no numeric score
      authenticityScore += SIFT_WEIGHT * 0.9;
      maxScore += SIFT_WEIGHT;
    }

    // Scoring confidence (0-100 mapped to SCORING_WEIGHT)
    authenticityScore += (factors.scoringConfidence / 100) * SCORING_WEIGHT;
    maxScore += SCORING_WEIGHT;

    // NAFDAC verification
    if (factors.nafdacFound) authenticityScore += NAFDAC_WEIGHT;
    maxScore += NAFDAC_WEIGHT;

    // Detailed analysis recommendation
    if (factors.detailedRecommendation) {
      if (factors.detailedRecommendation.includes("LIKELY GENUINE")) {
        authenticityScore += DETAILED_WEIGHT;
      } else if (factors.detailedRecommendation.includes("INCONCLUSIVE")) {
        authenticityScore += DETAILED_WEIGHT * 0.5;
      }
    }
    maxScore += DETAILED_WEIGHT;

    // Penalty for expired product
    if (factors.isExpired) {
      authenticityScore -= EXPIRY_PENALTY;
    }

    // Avoid division by zero
    const percentageScore =
      maxScore > 0
        ? Math.round((authenticityScore / maxScore) * 100)
        : 0;

    // Determine final verdict based on weighted score and SIFT pass
    let conclusion: FinalVerdict["conclusion"];
    let reason: string;

    if (percentageScore >= 80) {
      // 80-100%: AUTHENTIC
      conclusion = "AUTHENTIC";
      reason = "All verification checks passed. Product appears to be genuine.";
    } else if (percentageScore >= 65) {
      // 65-79%: LIKELY_AUTHENTIC
      conclusion = "LIKELY_AUTHENTIC";
      reason =
        "Majority of verification checks passed. Product likely to be authentic.";
    } else if (percentageScore >= 50) {
      // 50-64%: INCONCLUSIVE
      conclusion = "INCONCLUSIVE";
      reason = "Verification results are mixed. Manual review recommended.";
    } else if (percentageScore >= 35) {
      // 35-49%: LIKELY_COUNTERFEIT
      conclusion = "LIKELY_COUNTERFEIT";
      reason =
        "Multiple verification checks failed. Product shows signs of counterfeiting.";
    } else {
      // 0-34%: COUNTERFEIT
      conclusion = "COUNTERFEIT";
      reason =
        "Visual structure does not match authentic reference. High likelihood of counterfeit.";
    }

    return {
      conclusion,
      confidence_percentage: percentageScore,
      reason,
    };
  }

  /**
   * Generate a frontend-ready display object
   */
  generateFrontendDisplay(response: VerificationResponse): FrontendDisplay {
    const finalVerdict = this.computeFinalVerdict(response);

    // Convert SIFT similarity score to percentage (normalize by 200 as reference)
    const siftMatchPercentage = Math.min(
      100,
      Math.round((response.sift_confidence / 200) * 100),
    );

    return {
      final_verdict: finalVerdict,

      drug_name: response.drug_name,
      nafdac_number: response.nafdac_number,
      manufacturer: response.merged_ocr_data.manufacturer,
      expiry_date: response.expiry_analysis.expiry_date,
      is_expired: response.expiry_analysis.is_expired,

      sift_match_percentage: siftMatchPercentage,
      scoring_confidence: response.scoring_confidence,
      confidence_band: response.confidence_band,

      nafdac_verified: response.nafdac_verification?.found ?? false,
      nafdac_product_name: response.nafdac_verification?.product_name,

      authenticity_summary: response.detailed_analysis?.summary,
      authenticity_indicators:
        response.detailed_analysis?.authenticity_indicators,
      risk_factors: response.detailed_analysis?.risk_factors,
      visual_comparison_verdict: response.gemini_front_back_comparison
        ? `Gemini Vision: ${response.gemini_front_back_comparison.is_authentic ? "Authentic" : "Potentially Counterfeit"} (${Math.round(response.gemini_front_back_comparison.confidence_score * 100)}% confidence)`
        : undefined,

      full_response: response,
    };
  }
}

export const verdictService = new VerdictService();
