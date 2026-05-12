import Quagga from "@ericblade/quagga2";
import { logger } from "../utils/logger";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface DetectedBarcode {
  code: string;
  format: string;
  confidence: number;
}

class BarcodeScannerService {
  /**
   * Scan barcode from base64-encoded image
   * Returns the detected barcode code and confidence score
   * Supports multiple barcode formats: EAN-13, EAN-8, UPC-A, UPC-E, CODE128, etc.
   */
  async scanBarcodeFromBase64(
    base64Image: string,
  ): Promise<DetectedBarcode | null> {
    let tempFilePath: string | null = null;

    try {
      logger.debug("Scanning barcode from image using @ericblade/quagga2...");

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Image, "base64");

      // Create temporary file (Quagga2 requires file path)
      // Use os.tmpdir() for cross-platform compatibility (handles Windows, Linux, macOS)
      tempFilePath = path.join(os.tmpdir(), `barcode_${Date.now()}.png`);
      fs.writeFileSync(tempFilePath, imageBuffer);

      // Use Quagga2 to detect and decode barcode
      const result = await Quagga.decodeSingle(
        {
          src: tempFilePath,
          numOfWorkers: 0,
          inputStream: {
            size: 800,
          },
          decoder: {
            readers: [
              "ean_reader",
              "ean_8_reader",
              "upc_reader",
              "upc_e_reader",
              "code_128_reader",
            ],
          },
        },
        (result: any) => {
          // callback - not used in single decode
        },
      );

      if (result && result.codeResult && result.codeResult.code) {
        const barcode: DetectedBarcode = {
          code: result.codeResult.code,
          format: result.codeResult.format || "unknown",
          confidence: 0.95,
        };

        logger.info(
          `Barcode detected: ${barcode.code} (format: ${barcode.format}, confidence: ${barcode.confidence})`,
        );
        return barcode;
      }

      logger.debug("No barcode detected in image");
      return null;
    } catch (error) {
      logger.debug(`Barcode scanning with Quagga2 failed: ${error}`);
      return null;
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (error) {
          logger.debug(`Failed to clean up temp file: ${error}`);
        }
      }
    }
  }

  /**
   * Extract barcode from image using multiple detection strategies
   * Falls back through: Quagga2 → Pattern matching → OCR extraction
   */
  async extractBarcode(
    base64Image: string,
    ocrExtractedBarcode?: string,
  ): Promise<{
    barcode: string | null;
    source: "scanner" | "ocr" | null;
    confidence: number;
  }> {
    logger.debug("Starting barcode extraction process...");

    // First try: Barcode scanner
    const scannedBarcode = await this.scanBarcodeFromBase64(base64Image);
    if (scannedBarcode) {
      logger.info(
        `Barcode detected via scanner: ${scannedBarcode.code} (confidence: ${scannedBarcode.confidence})`,
      );
      return {
        barcode: scannedBarcode.code,
        source: "scanner",
        confidence: scannedBarcode.confidence,
      };
    }

    // Second try: Use OCR extracted barcode
    if (ocrExtractedBarcode) {
      const cleanedBarcode = this.cleanBarcode(ocrExtractedBarcode);
      if (cleanedBarcode) {
        logger.info(`Using OCR-extracted barcode: ${cleanedBarcode}`);
        return {
          barcode: cleanedBarcode,
          source: "ocr",
          confidence: 0.7, // Lower confidence for OCR-extracted barcodes
        };
      }
    }

    logger.warn("No barcode detected from scanner or OCR");
    return {
      barcode: null,
      source: null,
      confidence: 0,
    };
  }

  /**
   * Clean and normalize barcode string
   * Removes spaces, hyphens, and validates format
   */
  private cleanBarcode(barcode: string): string | null {
    try {
      // Remove spaces, hyphens, and other non-digit characters
      const cleaned = barcode.replace(/[\s\-\.]/g, "").trim();

      // Validate length (common barcode formats: 8, 12, 13, 14 digits)
      if (![8, 12, 13, 14].includes(cleaned.length)) {
        logger.warn(
          `Barcode length ${cleaned.length} is not standard: ${cleaned}`,
        );
        return null;
      }

      // Verify all characters are digits
      if (!/^\d+$/.test(cleaned)) {
        logger.warn(`Barcode contains non-digit characters: ${barcode}`);
        return null;
      }

      return cleaned;
    } catch (error) {
      logger.error(`Barcode cleaning failed: ${error}`);
      return null;
    }
  }

  /**
   * Validate if two barcodes match (after normalization)
   */
  validateBarcodeMatch(barcode1: string, barcode2: string): boolean {
    const cleaned1 = this.cleanBarcode(barcode1);
    const cleaned2 = this.cleanBarcode(barcode2);

    if (!cleaned1 || !cleaned2) {
      return false;
    }

    return cleaned1 === cleaned2;
  }
}

export const barcodeScannerService = new BarcodeScannerService();
