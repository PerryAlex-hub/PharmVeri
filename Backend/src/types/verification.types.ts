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

export interface ExpiryAnalysis {
  detected: boolean;
  expiry_date: string | null;
  is_expired: boolean | null;
  note: string;
}

export interface GeminiVisionAnalysis {
  is_authentic: boolean;
  confidence_score: number; // 0.0 to 1.0
  reasoning_details: string;
}

export interface NAFDACVerificationResult {
  found: boolean;
  product_name?: string;
  manufacturer?: string;
  status?: string;
  approval_date?: string;
}

export interface DetailedAnalysisResult {
  summary: string;
  authenticity_indicators: string[];
  risk_factors: string[];
  recommendation: string;
}

export interface FinalVerdict {
  conclusion:
    | "AUTHENTIC"
    | "LIKELY_AUTHENTIC"
    | "INCONCLUSIVE"
    | "LIKELY_COUNTERFEIT"
    | "COUNTERFEIT";
  confidence_percentage: number; // 0-100
  reason: string; // Short explanation of the conclusion
}

export interface FrontendDisplay {
  // Main Verdict
  final_verdict: FinalVerdict;

  // Product Info
  drug_name: string;
  nafdac_number: string;
  manufacturer?: string;
  expiry_date: string | null;
  is_expired: boolean | null;

  // Key Scores
  sift_match_percentage: number; // 0-100, derived from SIFT
  scoring_confidence: number; // 0-100
  confidence_band: "very_high" | "high" | "moderate" | "low";

  // Verification Status
  nafdac_verified: boolean;
  nafdac_product_name?: string;

  // Detailed Insights
  authenticity_summary?: string; // From detailed analysis
  authenticity_indicators?: string[]; // Positive signs
  risk_factors?: string[]; // Concerns to flag
  visual_comparison_verdict?: string; // From Gemini vision

  // Detailed Data (for advanced users)
  full_response?: VerificationResponse;
}

export interface VerificationResponse {
  authentic: boolean;
  drug_name: string;
  nafdac_number: string;
  sift_confidence: number;
  scoring_confidence: number;
  confidence_band: "very_high" | "high" | "moderate" | "low";
  final_verdict?: FinalVerdict;
  expiry_analysis: ExpiryAnalysis;
  nafdac_verification?: NAFDACVerificationResult;
  gemini_front_back_comparison?: GeminiVisionAnalysis;
  detailed_analysis?: DetailedAnalysisResult;
  verdict_reason: string;
  per_view_analysis: ViewAnalysis[];
  merged_ocr_data: OCRPackageDetails;
  raw_ocr_per_view: Record<string, OCRPackageDetails>;
  panel_matching: PanelMatchingDetails;
}
