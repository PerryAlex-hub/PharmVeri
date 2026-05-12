export interface OCRResult {
  package_details: string;
}

export interface ParsedPackageDetails {
  drug_name: string;
  nafdac_reg_no: string;
  batch_number: string;
  expiry_date: string;
  manufacturer: string;
  barcode?: string;
}

export interface SIFTResult {
  match_verdict: boolean;
  similarity_score: number;
  match_visualization: string;
  reference_keypoints_viz?: string;
  query_keypoints_viz?: string;
}

export interface ExtractedFields {
  nafdacNumber: string;
  expiryDate: string;
  manufacturerName: string;
  productName: string;
  batchNumber: string;
}

export interface ReferenceImageIndex {
  [nafdacNumber: string]: string;
}

export interface VerificationCheck {
  checkName: string;
  passed: boolean;
  score: number;
  details?: string;
}

export interface AuthenticationReport {
  verdict: "GENUINE" | "SUSPICIOUS" | "COUNTERFEIT";
  overallScore: number;
  confidence: number;
  checks: VerificationCheck[];
  siftVisualization?: string;
  extractedFields: ExtractedFields;
  timestamp: string;
  scanId: string;
}

export interface RoboflowResponse<T> {
  outputs: T[];
}

export interface BarcodeVerificationData {
  barcodeValid: boolean;
  barcodeFound: boolean;
  barcodeProductTitle?: string;
  barcodeProductManufacturer?: string;
  matchesOCRData?: boolean;
}

export interface NAFDACVerificationData {
  nafdacFound: boolean;
  nafdacValid: boolean;
  productName?: string;
  manufacturer?: string;
  status?: string;
}
