import axios from "axios";
import { logger } from "../utils/logger";

export interface GeminiVisionAnalysis {
  is_authentic: boolean;
  confidence_score: number; // 0.0 to 1.0
  reasoning_details: string;
}

class GeminiVisionService {
  private readonly GEMINI_API_KEY: string;
  private readonly GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn(
        "GEMINI_API_KEY not set. Gemini vision verification will be disabled.",
      );
    }
    this.GEMINI_API_KEY = apiKey || "";
  }

  isEnabled(): boolean {
    return !!this.GEMINI_API_KEY;
  }

  // Helper method to guarantee raw, data-prefix-free base64 text
  private cleanBase64(base64Str: string): string {
    if (!base64Str) return "";
    if (base64Str.includes(",")) {
      return base64Str.split(",")[1];
    }
    return base64Str.trim();
  }

  async analyzeProductImages(
    referenceBase64: string,
    queryBase64: string,
  ): Promise<GeminiVisionAnalysis | null> {
    if (!this.isEnabled()) {
      logger.debug("Gemini vision service is disabled (no API key)");
      return null;
    }

    try {
      logger.debug(
        "Initiating Gemini vision analysis for counterfeit detection",
      );

      // Clean the incoming strings to strip out frontend "data:image/jpeg;base64," blocks
      const cleanReference = this.cleanBase64(referenceBase64);
      const cleanQuery = this.cleanBase64(queryBase64);

      if (!cleanReference || !cleanQuery) {
        logger.warn("One or both image Base64 payloads are empty or invalid.");
        return null;
      }

      const prompt = `You are an expert counterfeit detection AI. Analyze these two images carefully.

Image 1 is the verified authentic product.
Image 2 is the product being inspected.

Perform a side-by-side analysis focusing specifically on:
1. Typography & Font: Check font thickness, kerning, alignment, and letter shape distortions.
2. Logo Integrity: Look for subtle modifications in graphic shape, color variance, or positioning.
3. Color Consistency: Verify color accuracy and saturation levels.
4. Print Quality: Identify smudging, bleeding, or registration issues.
5. Overall Design Elements: Spot missing or incorrectly placed design elements.`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              { text: "Image 1 (Authentic Reference):" },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanReference,
                },
              },
              { text: "Image 2 (Inspected Product):" },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanQuery,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              is_authentic: { type: "boolean" },
              confidence_score: { type: "number" },
              reasoning_details: { type: "string" },
            },
            required: [
              "is_authentic",
              "confidence_score",
              "reasoning_details",
            ],
          },
        },
      };

      const response = await axios.post(
        `${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`,
        requestBody,
        { timeout: 30000 },
      );

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        logger.warn("Gemini returned empty response");
        return null;
      }

      let analysis: GeminiVisionAnalysis;
      try {
        const jsonStr = content.replace(/^```json\s*|```$/gi, "").trim();
        analysis = JSON.parse(jsonStr);
      } catch (parseError) {
        logger.error(`Failed to parse Gemini JSON payload: ${content}`);
        return null;
      }

      if (
        typeof analysis.is_authentic !== "boolean" ||
        typeof analysis.confidence_score !== "number" ||
        typeof analysis.reasoning_details !== "string"
      ) {
        logger.warn(
          "Gemini response missing required fields or types mismatch",
        );
        return null;
      }

      analysis.confidence_score = Math.max(
        0,
        Math.min(1, analysis.confidence_score),
      );

      logger.info(
        `Gemini vision analysis complete: authentic=${analysis.is_authentic}, confidence=${analysis.confidence_score}`,
      );

      return analysis;
    } catch (error) {
      let errorMsg = String(error);

      // Capture explicit error response body details from Axios for easier debugging
      if (axios.isAxiosError(error) && error.response) {
        errorMsg = `${error.message} - Data: ${JSON.stringify(error.response.data)}`;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }

      logger.error(
        `Gemini vision analysis failed: ${errorMsg}. Proceeding without vision verification.`,
      );
      return null;
    }
  }
}

export const geminiVisionService = new GeminiVisionService();
