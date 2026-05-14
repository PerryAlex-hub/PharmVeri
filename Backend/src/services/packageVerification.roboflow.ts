import axios from "axios";
import { logger } from "../utils/logger";
import { config } from "../config/environment";
import {
  OCRPackageDetails,
  PackageViews,
  SIFTComparisonResult,
} from "../types/verification.types";
import {
  createEmptyPackageDetails,
  extractExpiryDate,
  extractNafdacNumber,
  isUsableText,
  pickFirstUsable,
  stripMarkdownCodeFences,
} from "./packageVerification.helpers";

const WORKSPACE = config.ROBOFLOW_WORKSPACE_NAME;
const OCR_WORKFLOW_ID = config.OCR_WORKFLOW_ID;
const SIFT_WORKFLOW_ID = config.SIFT_WORKFLOW_ID;
const BASE_URL = "https://serverless.roboflow.com";
const OCR_TIMEOUT_MS = 90000;
const SIFT_TIMEOUT_MS = 90000;

const ROBOFLOW_API_KEY = config.ROBOFLOW_API_KEY;
const OPENAI_API_KEY = config.OPENAI_API_KEY;

export async function runOCR(
  base64Image: string,
  viewName: keyof PackageViews,
): Promise<OCRPackageDetails> {
  try {
    logger.debug(`Running OCR on ${viewName} image...`);

    const response = await axios.post(
      `${BASE_URL}/infer/workflows/${WORKSPACE}/${OCR_WORKFLOW_ID}`,
      {
        api_key: ROBOFLOW_API_KEY,
        inputs: {
          image: { type: "base64", value: base64Image },
          openai_api_key: OPENAI_API_KEY,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: OCR_TIMEOUT_MS,
      },
    );

    const output = response.data.outputs?.[0] as
      | Record<string, unknown>
      | undefined;

    if (!output) {
      logger.warn(`OCR returned no output for ${viewName}`);
      return createEmptyPackageDetails();
    }

    const extractedText = pickFirstUsable([
      output.extracted_text,
      output.text,
      output.raw_text,
    ]);
    const packageDetails = pickFirstUsable([output.package_details]);

    if (!packageDetails) {
      return {
        drug_name: "",
        nafdac_reg_no: extractNafdacNumber(extractedText),
        batch_number: "",
        expiry_date: extractExpiryDate(extractedText),
        manufacturer: "",
        barcode: "",
      };
    }

    const cleanStr = stripMarkdownCodeFences(packageDetails);
    const parsed = JSON.parse(cleanStr) as OCRPackageDetails;
    const fallbackExpiry = extractExpiryDate(extractedText);
    const fallbackNafdac = extractNafdacNumber(extractedText);

    if (!isUsableText(parsed.expiry_date) && fallbackExpiry) {
      parsed.expiry_date = fallbackExpiry;
    }

    if (!isUsableText(parsed.nafdac_reg_no) && fallbackNafdac) {
      parsed.nafdac_reg_no = fallbackNafdac;
    }

    logger.debug(
      `OCR result for ${viewName}: drug_name="${parsed.drug_name}", nafdac="${parsed.nafdac_reg_no}", expiry="${parsed.expiry_date}"`,
    );
    return parsed;
  } catch (error) {
    logger.error(`OCR call failed for ${viewName}: ${error}`);
    throw error;
  }
}

export async function runSIFT(
  referenceBase64: string,
  queryBase64: string,
): Promise<SIFTComparisonResult> {
  logger.debug("Running SIFT verifier...");

  const payload = {
    api_key: ROBOFLOW_API_KEY,
    inputs: {
      reference_image: { type: "base64", value: referenceBase64 },
      query_image: { type: "base64", value: queryBase64 },
    },
  };

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await axios.post(
        `${BASE_URL}/infer/workflows/${WORKSPACE}/${SIFT_WORKFLOW_ID}`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: SIFT_TIMEOUT_MS,
        },
      );

      const out = response.data.outputs?.[0];
      if (!out) {
        logger.warn("SIFT returned empty output");
        return {
          match_verdict: false,
          similarity_score: 0,
          match_visualization: "",
        };
      }

      logger.debug(
        `SIFT result: verdict=${out.match_verdict}, score=${out.similarity_score}`,
      );

      return {
        match_verdict: Boolean(out.match_verdict),
        similarity_score: Number(out.similarity_score) || 0,
        match_visualization: String(out.match_visualization || ""),
      };
    } catch (attemptError) {
      const status = axios.isAxiosError(attemptError)
        ? attemptError.response?.status
        : undefined;
      const body = axios.isAxiosError(attemptError)
        ? attemptError.response?.data
        : undefined;

      logger.warn(
        `SIFT attempt ${attempt}/${maxAttempts} failed${status ? ` with status ${status}` : ""}: ${attemptError}`,
      );
      if (body) {
        logger.warn(`SIFT error response body: ${JSON.stringify(body)}`);
      }

      if (attempt < maxAttempts) {
        const backoffMs = attempt * 2000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      logger.error(`SIFT call failed after ${maxAttempts} attempts`);
      return {
        match_verdict: false,
        similarity_score: 0,
        match_visualization: "",
      };
    }
  }

  return {
    match_verdict: false,
    similarity_score: 0,
    match_visualization: "",
  };
}