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

// --- 4-View Package Verification Types ---

export interface PackageViews {
  front: string; // base64
  back: string; // base64
  panel_1: string; // base64 (generic side panel - may be left or right)
  panel_2: string; // base64 (generic side panel - may be left or right)
}

export interface OCRPackageDetails {
  drug_name: string;
  nafdac_reg_no: string;
  batch_number: string;
  expiry_date: string;
  manufacturer: string;
  barcode: string;
}

export interface SIFTComparisonResult {
  match_verdict: boolean;
  similarity_score: number;
  match_visualization: string;
}

export interface PanelMatch {
  userPanel: "panel_1" | "panel_2";
  refPanel: "panel_a" | "panel_b";
  score: number;
  verdict: boolean;
  visualization: string;
}

export interface ViewAnalysis {
  view: string;
  matched_ref: string;
  verdict: boolean;
  similarity_score: number;
  visualization: string;
}

export interface PanelMatchingDetails {
  assignment: string;
  scores: Record<string, number>;
}

export interface VerificationResponse {
  authentic: boolean;
  drug_name: string;
  nafdac_number: string;
  overall_confidence: number;
  verdict_reason: string;
  per_view_analysis: ViewAnalysis[];
  merged_ocr_data: OCRPackageDetails;
  raw_ocr_per_view: Record<string, OCRPackageDetails>;
  panel_matching: PanelMatchingDetails;
}
