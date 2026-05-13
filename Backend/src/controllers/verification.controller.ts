import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { verifyDrugPackage } from "../services/packageVerification.service";
import { PackageViews } from "../types/verification.types";

export async function verifyProduct(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    logger.info("Starting product verification flow...");

    const { front, back, panel_1, panel_2 } = req.body;

    // Validate that all 4 views are provided
    if (!front || !back || !panel_1 || !panel_2) {
      logger.warn(
        "Missing one or more views for 4-view verification. Required: front, back, panel_1, panel_2",
      );
      res.status(400).json({
        error:
          "All 4 views are required: front, back, panel_1, panel_2 (base64 encoded)",
      });
      return;
    }

    // Package views for verification
    const views: PackageViews = {
      front,
      back,
      panel_1,
      panel_2,
    };

    logger.debug("Calling verifyDrugPackage orchestrator...");
    const report = await verifyDrugPackage(views);

    logger.info("Product verification complete");
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error(`Verification endpoint error: ${error}`);
    res.status(500).json({ error: `Verification failed: ${error}` });
  }
}
