import * as fs from "fs";
import { logger } from "./logger";

export function fileToBase64(filePath: string): string | null {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString("base64");
    logger.debug(`Converted file to base64: ${filePath}`);
    return base64;
  } catch (error) {
    logger.error(`Failed to convert file to base64: ${error}`);
    return null;
  }
}

export function base64ToFile(
  base64String: string,
  outputPath: string,
): boolean {
  try {
    const buffer = Buffer.from(base64String, "base64");
    fs.writeFileSync(outputPath, buffer);
    logger.debug(`Wrote base64 to file: ${outputPath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to write base64 to file: ${error}`);
    return false;
  }
}

export function dataUrlToBase64(dataUrl: string): string | null {
  try {
    const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
    if (!match || !match[1]) {
      logger.warn("Invalid data URL format");
      return null;
    }
    return match[1];
  } catch (error) {
    logger.error(`Failed to extract base64 from data URL: ${error}`);
    return null;
  }
}
