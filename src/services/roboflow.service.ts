import axios from "axios";
import { logger } from "../utils/logger";
import { config } from "../config/environment";
import {
  OCRResult,
  SIFTResult,
  RoboflowResponse,
  ParsedPackageDetails,
} from "../types/verification.types";

class RoboflowService {
  private baseUrl = "https://serverless.roboflow.com";
  private apiKey = config.ROBOFLOW_API_KEY;
  private openaiKey = config.OPENAI_API_KEY;
  private workspaceName = config.ROBOFLOW_WORKSPACE_NAME;
  private ocrWorkflowId = config.OCR_WORKFLOW_ID;
  private siftWorkflowId = config.SIFT_WORKFLOW_ID;

  // Retry configuration
  private maxRetries = 3;
  private retryDelayMs = 1000;

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt = 0,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable =
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.message?.includes("timeout");

      if (isRetryable && attempt < this.maxRetries) {
        const delayMs = this.retryDelayMs * Math.pow(2, attempt);
        logger.warn(
          `Retryable error (${error.code}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.maxRetries})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.retryWithBackoff(fn, attempt + 1);
      }

      throw error;
    }
  }

  async runOCRIdentifier(
    base64Image: string,
  ): Promise<ParsedPackageDetails | null> {
    try {
      logger.debug("Calling Roboflow OCR Identifier workflow...");
      logger.debug(`OCR payload size: ~${base64Image.length} bytes`);

      const result = await this.retryWithBackoff(async () => {
        const response = await axios.post<RoboflowResponse<OCRResult>>(
          `${this.baseUrl}/infer/workflows/${this.workspaceName}/${this.ocrWorkflowId}`,
          {
            api_key: this.apiKey,
            inputs: {
              image: {
                type: "base64",
                value: base64Image,
              },
              openai_api_key: this.openaiKey,
            },
          },
          {
            timeout: 45000,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        return response;
      });

      if (!result.data.outputs || result.data.outputs.length === 0) {
        logger.warn("OCR Identifier returned empty outputs");
        return null;
      }

      const ocrResult = result.data.outputs[0];

      logger.debug(`Raw OCR response: ${JSON.stringify(ocrResult)}`);

      if (!ocrResult.package_details) {
        logger.warn(
          `package_details field is missing. Available fields: ${Object.keys(ocrResult).join(", ")}`,
        );
        return null;
      }

      let jsonString = ocrResult.package_details;

      if (jsonString.includes("```json")) {
        jsonString = jsonString
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
      }

      const parsed: ParsedPackageDetails = JSON.parse(jsonString);

      // Normalize NAFDAC registration number by removing extra spaces
      if (parsed.nafdac_reg_no) {
        parsed.nafdac_reg_no = parsed.nafdac_reg_no
          .replace(/\s+/g, "") // Remove all spaces
          .trim();
      }

      logger.info(
        `OCR extraction completed. Drug: ${parsed.drug_name}, NAFDAC: ${parsed.nafdac_reg_no}`,
      );

      return parsed;
    } catch (error) {
      logger.error(`OCR Identifier workflow failed: ${error}`);
      throw error;
    }
  }

  async runSIFTVerifier(
    base64Reference: string,
    base64Query: string,
  ): Promise<SIFTResult | null> {
    try {
      logger.debug("Calling Roboflow SIFT Authenticity Verifier workflow...");
      const totalPayloadSize = base64Reference.length + base64Query.length;
      logger.debug(
        `SIFT payload size: ~${totalPayloadSize} bytes (reference: ${base64Reference.length}, query: ${base64Query.length})`,
      );

      const result = await this.retryWithBackoff(async () => {
        const response = await axios.post<RoboflowResponse<SIFTResult>>(
          `${this.baseUrl}/infer/workflows/${this.workspaceName}/${this.siftWorkflowId}`,
          {
            api_key: this.apiKey,
            inputs: {
              reference_image: {
                type: "base64",
                value: base64Reference,
              },
              query_image: {
                type: "base64",
                value: base64Query,
              },
            },
          },
          {
            timeout: 60000, // Increased timeout for SIFT (processes 2 images)
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        return response;
      });

      if (!result.data.outputs || result.data.outputs.length === 0) {
        logger.warn("SIFT Verifier returned empty outputs");
        return null;
      }

      const siftResult = result.data.outputs[0];
      logger.info(
        `SIFT verification completed. Verdict: ${siftResult.match_verdict}, Score: ${siftResult.similarity_score}`,
      );
      return siftResult;
    } catch (error) {
      logger.error(`SIFT Verifier workflow failed: ${error}`);
      throw error;
    }
  }
}

export const roboflowService = new RoboflowService();
