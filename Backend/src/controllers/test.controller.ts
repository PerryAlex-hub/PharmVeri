import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { roboflowService } from "../services/roboflow.service";
import { fileToBase64 } from "../utils/imageProcessing";

export async function testOCRIdentifier(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    logger.info("Testing OCR Identifier endpoint...");

    const { imagePath, base64Image } = req.body;

    if (!imagePath && !base64Image) {
      logger.warn("No image provided for testing");
      res
        .status(400)
        .json({ error: "Either imagePath or base64Image is required" });
      return;
    }

    let imageBase64: string | null = base64Image;

    if (imagePath && !base64Image) {
      imageBase64 = fileToBase64(imagePath);
      if (!imageBase64) {
        res.status(400).json({ error: "Failed to read image file" });
        return;
      }
    }

    const ocrResult = await roboflowService.runOCRIdentifier(imageBase64!);

    if (!ocrResult) {
      logger.warn("OCR Identifier returned null");
      res.status(500).json({ error: "OCR Identifier returned null" });
      return;
    }

    logger.info("OCR test successful");
    res.status(200).json({
      success: true,
      data: ocrResult,
    });
  } catch (error) {
    logger.error(`OCR test endpoint error: ${error}`);
    res.status(500).json({ error: `OCR test failed: ${error}` });
  }
}

export async function testSIFTVerifier(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    logger.info("Testing SIFT Verifier endpoint...");

    const { referenceImagePath, queryImagePath, referenceBase64, queryBase64 } =
      req.body;

    if (!referenceImagePath && !referenceBase64) {
      res
        .status(400)
        .json({
          error: "Either referenceImagePath or referenceBase64 is required",
        });
      return;
    }

    if (!queryImagePath && !queryBase64) {
      res
        .status(400)
        .json({ error: "Either queryImagePath or queryBase64 is required" });
      return;
    }

    let refBase64: string | null = referenceBase64;
    let qBase64: string | null = queryBase64;

    if (referenceImagePath && !referenceBase64) {
      refBase64 = fileToBase64(referenceImagePath);
      if (!refBase64) {
        res.status(400).json({ error: "Failed to read reference image file" });
        return;
      }
    }

    if (queryImagePath && !queryBase64) {
      qBase64 = fileToBase64(queryImagePath);
      if (!qBase64) {
        res.status(400).json({ error: "Failed to read query image file" });
        return;
      }
    }

    const siftResult = await roboflowService.runSIFTVerifier(
      refBase64!,
      qBase64!,
    );

    if (!siftResult) {
      logger.warn("SIFT Verifier returned null");
      res.status(500).json({ error: "SIFT Verifier returned null" });
      return;
    }

    logger.info("SIFT test successful");
    res.status(200).json({
      success: true,
      data: siftResult,
    });
  } catch (error) {
    logger.error(`SIFT test endpoint error: ${error}`);
    res.status(500).json({ error: `SIFT test failed: ${error}` });
  }
}
