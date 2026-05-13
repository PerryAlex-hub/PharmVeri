import * as fs from "fs";
import axios from "axios";
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

export async function urlToBase64(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(res.data as ArrayBuffer);
    return buffer.toString("base64");
  } catch (err) {
    logger.error(`Failed to fetch image from URL: ${url} -> ${err}`);
    return null;
  }
}

export async function urlToBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(res.data as ArrayBuffer);
  } catch (err) {
    logger.error(`Failed to fetch image buffer from URL: ${url} -> ${err}`);
    return null;
  }
}

/**
 * Convert base64 string (with or without data URI prefix) to Buffer
 * Handles: "data:image/jpeg;base64,..." or plain base64 string
 */
export function base64ToBuffer(base64String: string): Buffer | null {
  try {
    // Strip data URI prefix if present (e.g., "data:image/jpeg;base64,")
    let cleanBase64 = base64String;
    if (base64String.includes(";base64,")) {
      cleanBase64 = base64String.split(",")[1] || base64String;
    }

    // Remove any whitespace
    cleanBase64 = cleanBase64.replace(/\s/g, "");

    const buffer = Buffer.from(cleanBase64, "base64");

    // Validate buffer is not empty
    if (buffer.length === 0) {
      logger.warn("base64ToBuffer: Resulted in empty buffer");
      return null;
    }

    logger.debug(`Converted base64 to buffer (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    logger.error(`Failed to convert base64 to buffer: ${error}`);
    return null;
  }
}

/**
 * Detect image format from buffer magic bytes
 * Returns MIME type or null if unrecognized
 */
export function detectImageFormat(
  buffer: Buffer,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    if (buffer.length > 12 && buffer.toString("ascii", 8, 12) === "WEBP") {
      return "image/webp";
    }
  }

  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }

  return null;
}
