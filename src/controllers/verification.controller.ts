import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { roboflowService } from "../services/roboflow.service";
import { referenceImageService } from "../services/referenceImage.service";
import { scoringService } from "../services/scoring.service";
import { barcodeAPIService } from "../services/barcodeAPI.service";
import { barcodeScannerService } from "../services/barcodeScanner.service";
import { nafdacScraperService } from "../services/nafdacScraper.service";
import { fileToBase64 } from "../utils/imageProcessing";
import {
  BarcodeVerificationData,
  NAFDACVerificationData,
} from "../types/verification.types";

export async function verifyProduct(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    logger.info("Starting product verification flow...");

    const { imagePath, base64Image } = req.body;

    if (!imagePath && !base64Image) {
      logger.warn("No image provided for verification");
      res
        .status(400)
        .json({ error: "Either imagePath or base64Image is required" });
      return;
    }

    let queryImageBase64: string | null = base64Image;

    if (imagePath && !base64Image) {
      queryImageBase64 = fileToBase64(imagePath);
      if (!queryImageBase64) {
        res.status(400).json({ error: "Failed to read image file" });
        return;
      }
    }

    logger.debug("Step 1: Running OCR identification...");
    const ocrData = await roboflowService.runOCRIdentifier(queryImageBase64!);

    if (!ocrData) {
      logger.warn("OCR identification failed");
      res.status(500).json({ error: "OCR identification failed" });
      return;
    }

    logger.info(
      `OCR extracted: ${ocrData.drug_name} (NAFDAC: ${ocrData.nafdac_reg_no})`,
    );

    logger.debug("Step 2: Starting NAFDAC validation in parallel");
    const nafdacPromise = ocrData.nafdac_reg_no
      ? nafdacScraperService
          .searchNAFDACGreenbook(ocrData.nafdac_reg_no)
          .catch((err) => {
            logger.warn(`NAFDAC background call failed: ${err}`);
            return null;
          })
      : Promise.resolve(null);

    const promiseWithTimeout = async <T>(
      p: Promise<T | null>,
      ms: number,
      label = "bg",
    ): Promise<T | null> => {
      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => {
          logger.warn(`${label} timed out after ${ms}ms`);
          resolve(null);
        }, ms),
      );
      try {
        return (await Promise.race([p, timeout])) as T | null;
      } catch (err) {
        logger.warn(`${label} rejected: ${err}`);
        return null;
      }
    };

    logger.debug("Step 3: Looking up reference image (Supabase → local)...");
    const referenceImageBase64 =
      await referenceImageService.getReferenceImageBase64(
        ocrData.nafdac_reg_no,
      );

    if (!referenceImageBase64) {
      logger.warn(
        `No reference image found for NAFDAC: ${ocrData.nafdac_reg_no}`,
      );
      res.status(404).json({
        error: `No reference image available for this product (NAFDAC: ${ocrData.nafdac_reg_no})`,
      });
      return;
    }

    logger.debug("Step 4: Running SIFT visual verification...");
    const siftResult = await roboflowService.runSIFTVerifier(
      referenceImageBase64,
      queryImageBase64!,
    );

    if (!siftResult) {
      logger.warn("SIFT verification failed");
      res.status(500).json({ error: "SIFT verification failed" });
      return;
    }

    logger.debug("Step 5: Scanning barcode from image...");
    const scannedBarcodeResult = await barcodeScannerService.extractBarcode(
      queryImageBase64!,
      ocrData.barcode,
    );

    let finalBarcode = scannedBarcodeResult.barcode;

    if (scannedBarcodeResult.source === "scanner") {
      logger.info(
        `Barcode detected via independent scanner: ${finalBarcode} (confidence: ${scannedBarcodeResult.confidence})`,
      );
    } else if (scannedBarcodeResult.source === "ocr") {
      logger.info(
        `Using barcode from OCR after cleaning: ${finalBarcode} (confidence: ${scannedBarcodeResult.confidence})`,
      );
    } else {
      logger.warn("No barcode detected from scanner or OCR extraction");
    }

    logger.debug("Step 6: Performing barcode API lookup...");
    let barcodeData: BarcodeVerificationData | undefined = undefined;

    if (finalBarcode) {
      const isBarcodeValid =
        barcodeAPIService.validateBarcodeFormat(finalBarcode);
      const barcodeProductInfo =
        await barcodeAPIService.lookupProduct(finalBarcode);

      barcodeData = {
        barcodeValid: isBarcodeValid,
        barcodeFound:
          !!barcodeProductInfo?.success && !!barcodeProductInfo?.products,
        barcodeProductTitle:
          barcodeProductInfo?.products?.[0]?.title || undefined,
        barcodeProductManufacturer:
          barcodeProductInfo?.products?.[0]?.manufacturer || undefined,
        matchesOCRData:
          barcodeProductInfo?.products?.[0]?.title
            ?.toLowerCase()
            .includes(ocrData.drug_name.toLowerCase()) || false,
      };

      logger.info(
        `Barcode verification: Valid=${barcodeData.barcodeValid}, Found=${barcodeData.barcodeFound}, Source=${scannedBarcodeResult.source}`,
      );
    } else {
      logger.warn("No barcode available for API lookup");
    }

    logger.debug("Step 7: Awaiting NAFDAC (short)");
    let nafdacData: NAFDACVerificationData | undefined = undefined;
    const nafdacInfo = await promiseWithTimeout(nafdacPromise, 15000, "NAFDAC");

    if (nafdacInfo) {
      nafdacData = {
        nafdacFound: nafdacInfo.found,
        nafdacValid: nafdacInfo.found,
        productName: nafdacInfo.productName,
        manufacturer: nafdacInfo.manufacturer,
        status: nafdacInfo.status,
      };
      logger.info(`NAFDAC: found=${nafdacData.nafdacFound}`);
    } else {
      logger.warn("NAFDAC unavailable — continuing");
      nafdacData = { nafdacFound: false, nafdacValid: false };
    }

    logger.debug("Step 8: Computing authenticity score...");
    const report = scoringService.computeAuthenticityScore(
      ocrData,
      siftResult,
      barcodeData,
      nafdacData,
    );

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
