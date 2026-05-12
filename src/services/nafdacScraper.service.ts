import axios from "axios";
import { logger } from "../utils/logger";

export interface NAFDACProductInfo {
  found: boolean;
  registrationNumber: string;
  productName?: string;
  manufacturer?: string;
  status?: string;
  registrationDate?: string;
  expiryDate?: string;
  description?: string;
}

interface NAFDACAPIResponse {
  success: boolean;
  count: number;
  data: Array<{
    "Product Name": string;
    "Active Ingredients": string;
    "Product Category": string;
    "NAFDAC Reg No": string;
    Form: string;
    "Route of Administration": string;
    Strengths: string;
    "Applicant Name": string;
    "Approval Date": string;
    Status: string;
  }>;
}

class NAFDACScraperService {
  private readonly apiBaseUrl = "https://nafdac-scrape.onrender.com";
  private readonly apiEndpoint = "/api/drugs";

  async searchNAFDACGreenbook(
    nafdacNumber: string,
  ): Promise<NAFDACProductInfo> {
    try {
      logger.info(`Searching NAFDAC Greenbook for: ${nafdacNumber}`);

      const response = await axios.get<NAFDACAPIResponse>(
        `${this.apiBaseUrl}${this.apiEndpoint}`,
        {
          params: {
            nrn: nafdacNumber,
          },
          timeout: 25000,
        },
      );

      if (response.data.success && response.data.count > 0) {
        const product = response.data.data[0];

        const result: NAFDACProductInfo = {
          found: true,
          registrationNumber: product["NAFDAC Reg No"],
          productName: product["Product Name"],
          manufacturer: product["Applicant Name"],
          status: product.Status,
          registrationDate: product["Approval Date"],
        };

        logger.info(
          `NAFDAC product found: ${result.productName} (${result.registrationNumber})`,
        );
        return result;
      } else {
        logger.warn(`NAFDAC product not found: ${nafdacNumber}`);
        return {
          found: false,
          registrationNumber: nafdacNumber,
        };
      }
    } catch (error) {
      logger.error(`NAFDAC API search failed: ${error}`);
      return {
        found: false,
        registrationNumber: nafdacNumber,
      };
    }
  }

  /**
   * Validate NAFDAC number format
   */
  validateNAFDACFormat(nafdacNumber: string): boolean {
    // NAFDAC format: Letter + number + dash + numbers (e.g., "04-6969" or "A4-100068")
    const nafdacRegex = /^[A-Z]?\d+-\d+$/i;
    return nafdacRegex.test(nafdacNumber);
  }
}

export const nafdacScraperService = new NAFDACScraperService();
