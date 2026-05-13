import dotenv from "dotenv";

dotenv.config();

export interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  ROBOFLOW_API_KEY: string;
  OPENAI_API_KEY: string;
  ROBOFLOW_WORKSPACE_NAME: string;
  OCR_WORKFLOW_ID: string;
  SIFT_WORKFLOW_ID: string;
  REFERENCE_IMAGES_PATH: string;
  REFERENCE_INDEX_FILE: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  LOG_LEVEL: string;
  GEMINI_API_KEY?: string;
}

function validateEnv(): EnvironmentConfig {
  const requiredVars = [
    "ROBOFLOW_API_KEY",
    "OPENAI_API_KEY",
    "ROBOFLOW_WORKSPACE_NAME",
    "OCR_WORKFLOW_ID",
    "SIFT_WORKFLOW_ID",
    "REFERENCE_IMAGES_PATH",
    "REFERENCE_INDEX_FILE",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    PORT: parseInt(process.env.PORT || "3000", 10),
    NODE_ENV:
      (process.env.NODE_ENV as "development" | "production" | "test") ||
      "development",
    ROBOFLOW_API_KEY: process.env.ROBOFLOW_API_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    ROBOFLOW_WORKSPACE_NAME: process.env.ROBOFLOW_WORKSPACE_NAME!,
    OCR_WORKFLOW_ID: process.env.OCR_WORKFLOW_ID!,
    SIFT_WORKFLOW_ID: process.env.SIFT_WORKFLOW_ID!,
    REFERENCE_IMAGES_PATH: process.env.REFERENCE_IMAGES_PATH!,
    REFERENCE_INDEX_FILE: process.env.REFERENCE_INDEX_FILE!,
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    LOG_LEVEL: process.env.LOG_LEVEL || "debug",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };
}

export const config = validateEnv();
