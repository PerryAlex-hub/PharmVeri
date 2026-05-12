import axios from "axios";
import { logger } from "../utils/logger";

export interface BarcodeProductInfo {
  success: boolean;
  products?: Array<{
    barcode: string;
    title: string;
    manufacturer: string;
    category?: string;
    description?: string;
  }>;
  error?: string;
}

class BarcodeAPIService {
  private readonly apiKey = "uss7ig55m2mmpozz1nv82h34caqir2";
  private readonly baseUrl = "https://api.barcodelookup.com/v3/products";

  async lookupProduct(barcode: string): Promise<BarcodeProductInfo | null> {
    try {
      if (!barcode || barcode.trim().length === 0) {
        logger.debug("Barcode is empty, skipping lookup");
        return null;
      }

      logger.debug(`Looking up barcode: ${barcode}`);

      const response = await axios.get<BarcodeProductInfo>(this.baseUrl, {
        params: {
          barcode: barcode.trim(),
          formatted: "y",
          key: this.apiKey,
        },
        timeout: 10000,
      });

      if (response.data.success && response.data.products) {
        logger.info(
          `Barcode lookup successful: ${response.data.products[0]?.title || "Unknown product"}`,
        );
        return response.data;
      } else {
        logger.warn(`Barcode lookup returned no results for ${barcode}`);
        return null;
      }
    } catch (error) {
      logger.error(`Barcode API lookup failed: ${error}`);
      return null;
    }
  }

  validateBarcodeFormat(barcode: string): boolean {
    // Basic barcode format validation (EAN-13, UPC-A, etc.)
    // Accept 8, 12, 13, or 14 digit barcodes
    const cleanBarcode = barcode.replace(/\D/g, "");
    return (
      cleanBarcode.length === 8 ||
      cleanBarcode.length === 12 ||
      cleanBarcode.length === 13 ||
      cleanBarcode.length === 14
    );
  }
}

export const barcodeAPIService = new BarcodeAPIService();
