import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";
import { config } from "../config/environment";
import {
  PackageViews,
  OCRPackageDetails,
  ViewAnalysis,
  VerificationResponse,
  PanelMatch,
  SIFTComparisonResult,
} from "../types/verification.types";

// --- Config ---
const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const WORKSPACE = "ifechukwu-nwokedi-s-workspace";
const OCR_WORKFLOW_ID = "pharma-package-reader-gpt4o-1778548637743";
const SIFT_WORKFLOW_ID = "pharma-sift-authenticity-verifier-1778509003924";
const BASE_URL = "https://serverless.roboflow.com";
const OCR_TIMEOUT_MS = 90000;
const SIFT_TIMEOUT_MS = 90000;

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

/**
 * Run OCR on a single image using Roboflow Pharma Package Reader workflow
 */
async function runOCR(base64Image: string): Promise<OCRPackageDetails> {
  try {
    logger.debug("Running OCR on image...");

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

    const detailsStr = response.data.outputs?.[0]?.package_details;
    if (!detailsStr) {
      logger.warn("OCR returned no package_details");
      return {
        drug_name: "",
        nafdac_reg_no: "",
        batch_number: "",
        expiry_date: "",
        manufacturer: "",
        barcode: "",
      };
    }

    // Strip markdown code fences if present (```json ... ```)
    let cleanStr = detailsStr
      .replace(/^```[\w]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    const parsed = JSON.parse(cleanStr) as OCRPackageDetails;
    logger.debug(
      `OCR result: drug_name="${parsed.drug_name}", nafdac="${parsed.nafdac_reg_no}"`,
    );
    return parsed;
  } catch (error) {
    logger.error(`OCR call failed: ${error}`);
    throw error;
  }
}

/**
 * Merge 4 OCR results by picking the best non-empty value for each field
 */
function mergeOCRResults(results: OCRPackageDetails[]): OCRPackageDetails {
  logger.debug("Merging 4 OCR results...");

  const isUsableValue = (value: unknown): value is string => {
    if (typeof value !== "string") {
      return false;
    }

    const normalized = value.trim().toLowerCase();
    return (
      normalized !== "" &&
      normalized !== "n/a" &&
      normalized !== "not provided" &&
      normalized !== "not available" &&
      normalized !== "unknown"
    );
  };

  const normalizeNafdac = (value: string): string => {
    const trimmed = value.trim();
    const compact = trimmed.replace(/\s*[-]\s*/g, "-");
    return compact.replace(/\s+/g, " ");
  };

  const extractNafdacNumber = (value: unknown): string | null => {
    if (!isUsableValue(value)) {
      return null;
    }

    const normalized = normalizeNafdac(value);

    const exactMatch = normalized.match(/\b\d{2}-\d{4}\b/);
    if (exactMatch?.[0]) {
      return exactMatch[0];
    }

    const spacedMatch = normalized.match(/\b\d{2}\s*-\s*\d{4}\b/);
    if (spacedMatch?.[0]) {
      return normalizeNafdac(spacedMatch[0]);
    }

    return null;
  };

  const pickNafdac = (): string => {
    for (const result of results) {
      const candidate = extractNafdacNumber(result.nafdac_reg_no);
      if (candidate) {
        return candidate;
      }
    }

    return "";
  };

  const pickBest = (field: keyof OCRPackageDetails): string => {
    const candidates = results.map((r) => r[field]).filter(isUsableValue);

    if (candidates.length === 0) return "";

    return candidates.reduce((a, b) => (a.length >= b.length ? a : b));
  };

  const merged: OCRPackageDetails = {
    drug_name: pickBest("drug_name"),
    nafdac_reg_no: pickNafdac(),
    batch_number: pickBest("batch_number"),
    expiry_date: pickBest("expiry_date"),
    manufacturer: pickBest("manufacturer"),
    barcode: pickBest("barcode"),
  };

  logger.debug(`Merged result: nafdac="${merged.nafdac_reg_no}"`);
  return merged;
}

/**
 * Fetch reference image from Supabase reference-images bucket and convert to base64
 */
async function fetchRefBase64(
  nafdac: string,
  position: string,
): Promise<string> {
  try {
    const path = `${nafdac}_${position}.jpg`;
    logger.debug(`Fetching reference: ${path}`);

    const { data, error } = await supabase.storage
      .from("reference-images")
      .download(path);

    if (error || !data) {
      logger.error(
        `Missing reference image: ${path} — ${error?.message || "unknown error"}`,
      );
      throw new Error(`Reference image not found: ${path} — ${error?.message}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const base64 = buffer.toString("base64");
    logger.debug(`Fetched reference (${buffer.length} bytes) → base64`);
    return base64;
  } catch (error) {
    logger.error(`fetchRefBase64 failed: ${error}`);
    throw error;
  }
}

/**
 * Run SIFT verifier on a view pair using Roboflow SIFT workflow
 */
async function runSIFT(
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

/**
 * Main orchestrator: Verify drug package across 4 views with automatic panel matching
 *
 * Flow:
 * 1. Run OCR on all 4 views (front, back, panel_1, panel_2) in parallel
 * 2. Merge 4 OCR results intelligently
 * 3. Fetch all 4 reference images from Supabase (front, back, panel_a, panel_b)
 * 4. Run SIFT on front/back directly (unambiguous)
 * 5. Run SIFT on all 4 panel combinations (panel_1 vs a, panel_1 vs b, panel_2 vs a, panel_2 vs b)
 * 6. Use Hungarian-style matching to find best assignment for panels
 * 7. All views must pass for authentic=true
 */
export async function verifyDrugPackage(
  views: PackageViews,
): Promise<VerificationResponse> {
  try {
    logger.info("Starting 4-view package verification with panel matching...");

    // STEP 1: Run OCR on ALL 4 views in parallel
    logger.debug("Step 1: Running OCR on all 4 views in parallel");
    const ocrResults = await Promise.all([
      runOCR(views.front),
      runOCR(views.back),
      runOCR(views.panel_1),
      runOCR(views.panel_2),
    ]);

    const rawOcrPerView: Record<string, OCRPackageDetails> = {
      front: ocrResults[0],
      back: ocrResults[1],
      panel_1: ocrResults[2],
      panel_2: ocrResults[3],
    };

    // STEP 2: Merge into one best structured reading
    logger.debug("Step 2: Merging OCR results");
    const mergedOCR = mergeOCRResults(ocrResults);
    const nafdacNumber = mergedOCR.nafdac_reg_no;

    if (!nafdacNumber || nafdacNumber.trim() === "") {
      logger.error("Could not extract NAFDAC number from any view");
      throw new Error(
        `Could not find NAFDAC number across any view. OCR found: drug_name="${mergedOCR.drug_name}", barcode="${mergedOCR.barcode}"`,
      );
    }

    logger.info(`Identified NAFDAC: ${nafdacNumber}`);

    // STEP 3: Fetch ALL 4 reference images from Supabase in parallel
    logger.debug("Step 3: Fetching all 4 reference images from Supabase");
    const [refFront, refBack, refPanelA, refPanelB] = await Promise.all([
      fetchRefBase64(nafdacNumber, "front"),
      fetchRefBase64(nafdacNumber, "back"),
      fetchRefBase64(nafdacNumber, "panel_a"),
      fetchRefBase64(nafdacNumber, "panel_b"),
    ]);

    logger.debug("Fetched all reference images");

    // STEP 4: Run SIFT on FRONT and BACK (direct, unambiguous)
    logger.debug("Step 4: Running SIFT on front and back (direct)");
    const [frontResult, backResult] = await Promise.all([
      runSIFT(refFront, views.front),
      runSIFT(refBack, views.back),
    ]);

    // STEP 5: Run SIFT on ALL 4 panel combinations in parallel
    // This handles automatic matching if user swaps panel_1 and panel_2
    logger.debug("Step 5: Running SIFT on all 4 panel combinations");
    const [p1_a, p1_b, p2_a, p2_b] = await Promise.all([
      runSIFT(refPanelA, views.panel_1),
      runSIFT(refPanelB, views.panel_1),
      runSIFT(refPanelA, views.panel_2),
      runSIFT(refPanelB, views.panel_2),
    ]);

    logger.debug("All panel SIFT comparisons complete");

    // STEP 6: Hungarian-style assignment for best total score
    logger.debug("Step 6: Computing optimal panel assignment");

    // Option A: panel_1→a, panel_2→b
    const totalA = p1_a.similarity_score + p2_b.similarity_score;
    // Option B: panel_1→b, panel_2→a
    const totalB = p1_b.similarity_score + p2_a.similarity_score;

    let panel1Match: PanelMatch;
    let panel2Match: PanelMatch;
    let assignmentStr: string;

    if (totalA >= totalB) {
      // Assignment A is better (or tied)
      logger.debug(
        `Panel assignment A selected: totalA=${totalA} >= totalB=${totalB}`,
      );
      assignmentStr = "panel_1→panel_a, panel_2→panel_b";
      panel1Match = {
        userPanel: "panel_1",
        refPanel: "panel_a",
        score: p1_a.similarity_score,
        verdict: p1_a.match_verdict,
        visualization: p1_a.match_visualization,
      };
      panel2Match = {
        userPanel: "panel_2",
        refPanel: "panel_b",
        score: p2_b.similarity_score,
        verdict: p2_b.match_verdict,
        visualization: p2_b.match_visualization,
      };
    } else {
      // Assignment B is better
      logger.debug(
        `Panel assignment B selected: totalB=${totalB} > totalA=${totalA}`,
      );
      assignmentStr = "panel_1→panel_b, panel_2→panel_a";
      panel1Match = {
        userPanel: "panel_1",
        refPanel: "panel_b",
        score: p1_b.similarity_score,
        verdict: p1_b.match_verdict,
        visualization: p1_b.match_visualization,
      };
      panel2Match = {
        userPanel: "panel_2",
        refPanel: "panel_a",
        score: p2_a.similarity_score,
        verdict: p2_a.match_verdict,
        visualization: p2_a.match_visualization,
      };
    }

    // STEP 7: Build per-view analysis
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
      {
        view: "panel_1",
        matched_ref: panel1Match.refPanel,
        verdict: panel1Match.verdict,
        similarity_score: panel1Match.score,
        visualization: panel1Match.visualization,
      },
      {
        view: "panel_2",
        matched_ref: panel2Match.refPanel,
        verdict: panel2Match.verdict,
        similarity_score: panel2Match.score,
        visualization: panel2Match.visualization,
      },
    ];

    // STEP 8: STRICT aggregation — ALL views must pass
    const allPassed = perViewAnalysis.every((v) => v.verdict === true);
    const lowestScore = Math.min(
      ...perViewAnalysis.map((v) => v.similarity_score),
    );

    const failedViews = perViewAnalysis
      .filter((v) => !v.verdict)
      .map((v) => `${v.view} (vs ref ${v.matched_ref})`)
      .join(", ");

    const verdictReason = allPassed
      ? "All views matched their reference panels."
      : `Failed views: ${failedViews}.`;

    logger.info(
      `Verification complete: authentic=${allPassed}, confidence=${lowestScore}`,
    );

    return {
      authentic: allPassed,
      drug_name: mergedOCR.drug_name || "Unknown",
      nafdac_number: nafdacNumber,
      overall_confidence: lowestScore,
      verdict_reason: verdictReason,
      per_view_analysis: perViewAnalysis,
      merged_ocr_data: mergedOCR,
      raw_ocr_per_view: rawOcrPerView,
      panel_matching: {
        assignment: assignmentStr,
        scores: {
          panel_1_vs_a: p1_a.similarity_score,
          panel_1_vs_b: p1_b.similarity_score,
          panel_2_vs_a: p2_a.similarity_score,
          panel_2_vs_b: p2_b.similarity_score,
        },
      },
    };
  } catch (error) {
    logger.error(`Package verification failed: ${error}`);
    throw error;
  }
}
