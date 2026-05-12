import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";
import { config } from "../config/environment";

class SupabaseStorageService {
  private client: SupabaseClient;
  private bucketName = "reference-images";

  constructor() {
    this.client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    logger.info("Supabase Storage client initialized");
  }

  async uploadReferenceImage(
    nafdacNumber: string,
    imageBuffer: Buffer,
    contentType = "image/jpeg",
  ): Promise<string | null> {
    try {
      const fileName = `${nafdacNumber}-reference.jpg`;
      // Default to uploading into bucket root (users may upload manually to root)
      const filePath = `${fileName}`;

      logger.debug(`Uploading image to Supabase Storage: ${filePath}`);

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .upload(filePath, imageBuffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        logger.error(`Failed to upload image: ${error.message}`);
        return null;
      }

      logger.info(`Image uploaded: ${filePath}`);
      return filePath;
    } catch (err) {
      logger.error(`Storage upload error: ${err}`);
      return null;
    }
  }

  async downloadReferenceImage(nafdacNumber: string): Promise<Buffer | null> {
    try {
      const fileName = `${nafdacNumber}-reference.jpg`;
      const candidates = [`${fileName}`, `reference/${fileName}`];

      logger.debug(
        `Downloading image from Supabase Storage (candidates): ${candidates.join(",")}`,
      );

      let data: any = null;
      let error: any = null;
      for (const path of candidates) {
        const res = await this.client.storage
          .from(this.bucketName)
          .download(path);
        data = res.data;
        error = res.error;
        if (!error && data) {
          logger.debug(`Found image at ${path}`);
          break;
        }
      }

      if (error || !data) {
        logger.warn(`Image not found in Supabase Storage for ${nafdacNumber}`);
        return null;
      }

      // Convert returned data (Blob / ReadableStream / Buffer) into Buffer
      // Node: data may be a ReadableStream or Buffer; browser: Blob
      const anyData: any = data;
      if (Buffer.isBuffer(anyData)) {
        return anyData as Buffer;
      }

      if (typeof anyData.arrayBuffer === "function") {
        const ab = await anyData.arrayBuffer();
        return Buffer.from(ab);
      }

      // Handle Node.js Readable stream
      if (
        anyData instanceof Object &&
        typeof anyData.getReader !== "function" &&
        typeof anyData.pipe === "function"
      ) {
        // It's a stream.Readable
        const chunks: Buffer[] = [];
        for await (const chunk of anyData as AsyncIterable<Uint8Array>) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }

      // Fallback: try to read as text and convert
      try {
        const text = await anyData.text();
        return Buffer.from(text);
      } catch (e) {
        logger.error(`Unable to convert downloaded data to Buffer: ${e}`);
        return null;
      }
    } catch (err) {
      logger.error(`Storage download error: ${err}`);
      return null;
    }
  }

  async getReferenceImageUrl(nafdacNumber: string): Promise<string | null> {
    try {
      const fileName = `${nafdacNumber}-reference.jpg`;
      const candidates = [`${fileName}`, `reference/${fileName}`];

      for (const path of candidates) {
        const { data } = this.client.storage
          .from(this.bucketName)
          .getPublicUrl(path);
        if (data && data.publicUrl) return data.publicUrl;
      }

      logger.warn(`Could not get public URL for ${nafdacNumber}`);
      return null;
    } catch (err) {
      logger.error(`Storage URL error: ${err}`);
      return null;
    }
  }

  async imageExists(nafdacNumber: string): Promise<boolean> {
    try {
      const fileName = `${nafdacNumber}-reference.jpg`;
      // Check root and reference/ prefix
      const rootList = await this.client.storage.from(this.bucketName).list("");
      if (!rootList.error && rootList.data) {
        if (rootList.data.some((f) => f.name === fileName)) return true;
      }

      const refList = await this.client.storage
        .from(this.bucketName)
        .list("reference");
      if (!refList.error && refList.data) {
        if (refList.data.some((f) => f.name === fileName)) return true;
      }

      return false;
    } catch (err) {
      logger.error(`Storage check error: ${err}`);
      return false;
    }
  }

  async deleteReferenceImage(nafdacNumber: string): Promise<boolean> {
    try {
      const fileName = `${nafdacNumber}-reference.jpg`;
      const candidates = [`${fileName}`, `reference/${fileName}`];
      const toDelete: string[] = [];

      for (const p of candidates) {
        const { data, error } = await this.client.storage
          .from(this.bucketName)
          .list(p.includes("/") ? p.split("/")[0] : "");
        if (!error && data && data.some((f) => f.name === fileName)) {
          toDelete.push(p);
        }
      }

      if (toDelete.length === 0) return true;

      const { error } = await this.client.storage
        .from(this.bucketName)
        .remove(toDelete);
      if (error) {
        logger.error(`Failed to delete image(s): ${error.message}`);
        return false;
      }

      logger.info(`Image(s) deleted: ${toDelete.join(",")}`);
      return true;
    } catch (err) {
      logger.error(`Storage delete error: ${err}`);
      return false;
    }
  }
}

export const supabaseStorageService = new SupabaseStorageService();
