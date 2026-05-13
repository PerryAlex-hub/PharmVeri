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

    // Count positive factors
    let authenticityScore = 0;
    let maxScore = 0;

    // SIFT Match (40 points)
    if (factors.siftPass) authenticityScore += 40;
    maxScore += 40;

    // Scoring Confidence (30 points)
    authenticityScore += (factors.scoringConfidence / 100) * 30;
    maxScore += 30;

    // NAFDAC Verification (15 points)
    if (factors.nafdacFound) authenticityScore += 15;
    maxScore += 15;

    // Detailed Analysis Recommendation (10 points)
    if (factors.detailedRecommendation) {
      if (factors.detailedRecommendation.includes("LIKELY GENUINE")) {
        authenticityScore += 10;
      } else if (factors.detailedRecommendation.includes("INCONCLUSIVE")) {
        authenticityScore += 5;
      }
    }
    maxScore += 10;

    // Gemini Vision Comparison (5 points bonus)
    if (factors.geminiVerdictAuthentic) {
      authenticityScore += factors.geminiConfidence * 5;
    }
    maxScore += 5;

    // Penalty for expired product
    if (factors.isExpired) {
      authenticityScore -= 10;
    }

    const percentageScore = Math.round((authenticityScore / maxScore) * 100);

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
