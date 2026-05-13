import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";
import { config } from "../config/environment";
import { ReferenceImageIndex } from "../types/verification.types";
import { supabaseStorageService } from "./supabaseStorage.service";

class ReferenceImageService {
  private index: ReferenceImageIndex = {};
  private indexPath: string;
  private referencePath: string;

  constructor() {
    this.referencePath = config.REFERENCE_IMAGES_PATH;
    this.indexPath = path.join(this.referencePath, config.REFERENCE_INDEX_FILE);
    this.loadIndex();
  }

  private loadIndex(): void {
    try {
      if (!fs.existsSync(this.indexPath)) {
        logger.warn(`Reference index not found at ${this.indexPath}`);
        this.index = {};
        return;
      }

      const indexData = fs.readFileSync(this.indexPath, "utf-8");
      const parsed = JSON.parse(indexData);
      this.index = parsed.references || parsed;
      logger.info(
        `Loaded reference image index with ${Object.keys(this.index).length} entries`,
      );
    } catch (error) {
      logger.error(`Failed to load reference image index: ${error}`);
      this.index = {};
    }
  }

  getReferencePath(nafdacNumber: string): string | null {
    const filename = this.index[nafdacNumber];
    if (!filename) {
      logger.warn(`No reference image found for NAFDAC: ${nafdacNumber}`);
      return null;
    }

    const fullPath = path.join(this.referencePath, filename);
    if (!fs.existsSync(fullPath)) {
      logger.warn(`Reference image file does not exist: ${fullPath}`);
      return null;
    }

    return fullPath;
  }

  async getReferenceImageBase64(nafdacNumber: string): Promise<string | null> {
    try {
      logger.debug(
        `Fetching reference image for ${nafdacNumber} (checking Supabase first)`,
      );

      const imageBuffer =
        await supabaseStorageService.downloadReferenceImage(nafdacNumber);
      if (imageBuffer) {
        const base64 = imageBuffer.toString("base64");
        logger.debug(`Reference image fetched from Supabase Storage`);
        return base64;
      }

      logger.debug(
        `Image not in Supabase Storage, checking local filesystem...`,
      );
      const imagePath = this.getReferencePath(nafdacNumber);
      if (!imagePath) {
        return null;
      }

      const localBuffer = fs.readFileSync(imagePath);
      const base64 = localBuffer.toString("base64");
      logger.debug(`Reference image read from local filesystem`);
      return base64;
    } catch (error) {
      logger.error(
        `Failed to read reference image for ${nafdacNumber}: ${error}`,
      );
      return null;
    }
  }

  hasReference(nafdacNumber: string): boolean {
    return this.getReferencePath(nafdacNumber) !== null;
  }

  getAllReferences(): string[] {
    return Object.keys(this.index);
  }

  reload(): void {
    logger.info("Reloading reference image index...");
    this.loadIndex();
  }
}

export const referenceImageService = new ReferenceImageService();
