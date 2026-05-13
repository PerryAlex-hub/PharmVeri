import axios from "axios";
import { logger } from "../utils/logger";
import {
  OCRPackageDetails,
  SIFTComparisonResult,
} from "../types/verification.types";

export interface DetailedAnalysisResult {
  summary: string;
  authenticity_indicators: string[];
  risk_factors: string[];
  recommendation: string;
}

class DetailedAnalysisService {
  private readonly GEMINI_API_KEY: string;
  private readonly GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.GEMINI_API_KEY = apiKey || "";
  }

  isEnabled(): boolean {
    return !!this.GEMINI_API_KEY;
  }

  async generateDetailedAnalysis(
    ocrData: OCRPackageDetails,
    siftResult: SIFTComparisonResult,
  ): Promise<DetailedAnalysisResult | null> {
    if (!this.isEnabled()) {
      logger.debug("Detailed analysis service is disabled (no API key)");
      return null;
    }

    try {
      logger.debug("Generating detailed authenticity analysis with Gemini");

      const prompt = `You are a pharmaceutical authentication expert. Analyze the following OCR data and SIFT visual matching results to provide a detailed authenticity assessment.

OCR Extracted Data:
- Drug Name: ${ocrData.drug_name}
- NAFDAC Registration: ${ocrData.nafdac_reg_no}
- Batch Number: ${ocrData.batch_number}
- Expiry Date: ${ocrData.expiry_date}
- Manufacturer: ${ocrData.manufacturer}
- Barcode: ${ocrData.barcode}

SIFT Visual Analysis:
- Visual Match Verdict: ${siftResult.match_verdict ? "PASS" : "FAIL"}
- Similarity Score: ${siftResult.similarity_score}

Based on this data, provide a JSON response with:
1. summary: A 2-3 sentence overall authenticity assessment
2. authenticity_indicators: Array of 3-4 positive signs indicating genuine product
3. risk_factors: Array of 2-3 potential concerns or red flags (can be empty if all clear)
4. recommendation: "LIKELY GENUINE", "INCONCLUSIVE", or "LIKELY COUNTERFEIT"

Return ONLY valid JSON, no markdown or extra text.`;

      const requestBody = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      };

      const response = await axios.post(
        `${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`,
        requestBody,
        { timeout: 15000 },
      );

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        logger.warn("Gemini returned empty response for detailed analysis");
        return null;
      }

      let analysis: DetailedAnalysisResult;
      try {
        const jsonStr = content.replace(/^```json\s*|```$/gi, "").trim();
        analysis = JSON.parse(jsonStr);
      } catch (parseError) {
        logger.error(`Failed to parse detailed analysis JSON: ${content}`);
        return null;
      }

      // Validate structure
      if (
        typeof analysis.summary !== "string" ||
        !Array.isArray(analysis.authenticity_indicators) ||
        !Array.isArray(analysis.risk_factors) ||
        typeof analysis.recommendation !== "string"
      ) {
        logger.warn("Detailed analysis missing required fields");
        return null;
      }

      logger.info(`Detailed analysis complete: ${analysis.recommendation}`);

      return analysis;
    } catch (error) {
      let errorMsg = String(error);
      if (axios.isAxiosError(error) && error.response) {
        errorMsg = `${error.message} - ${JSON.stringify(error.response.data)}`;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      logger.error(
        `Detailed analysis failed: ${errorMsg}. Proceeding without detailed analysis.`,
      );
      return null;
    }
  }
}

export const detailedAnalysisService = new DetailedAnalysisService();
