import { logger } from "../utils/logger";
import { supabaseStorageService } from "./supabaseStorage.service";

export async function fetchRefBase64(
  nafdac: string,
  position: string,
): Promise<string> {
  const buffer = await supabaseStorageService.downloadDrugReference(
    nafdac,
    position,
  );

  if (!buffer) {
    logger.error(`Reference image not found for ${nafdac}_${position}`);
    throw new Error(`Reference image not found for ${nafdac}_${position}`);
  }

  return buffer.toString("base64");
}