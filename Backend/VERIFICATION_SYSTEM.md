# PharmVeri Verification System

This document describes what the backend is building, how the analysis pipeline works, and what the frontend should consume.

## Purpose

PharmVeri is a pharmaceutical package verification backend that combines OCR, image comparison, public registration checks, and Gemini-based visual reasoning to decide whether a product appears authentic, likely authentic, inconclusive, likely counterfeit, or counterfeit.

The current flow is optimized for speed and clarity:

- Front and back images drive the core authenticity decision.
- OCR is used to extract product text and structured package details.
- NAFDAC verification checks the product against the official Greenbook source.
- Gemini is used for semantic visual comparison and higher-level analysis.
- A final verdict is produced for the frontend as a single conclusive authenticity status.

## High-Level Architecture

```text
Frontend uploads images
    ↓
verifyDrugPackage(front, back)
    ↓
OCR per view + raw text logging
    ↓
Merge and normalize extracted fields
    ↓
Extract drug name, NAFDAC number, expiry date, manufacturer
    ↓
NAFDAC Greenbook lookup
    ↓
Fetch reference images from Supabase
    ↓
Run front/back SIFT comparison
    ↓
Run Gemini front/back visual comparison
    ↓
Run Gemini detailed analysis
    ↓
Compute final verdict and frontend-ready response
```

## Main Building Blocks

### 1. OCR Extraction

The OCR step reads each uploaded image independently and returns:

- `extracted_text`
- `package_details`
- image-specific structured fields

Each image’s extracted text is logged to the console so debugging can show exactly what each view contributed.

Important behavior:

- Drug name is taken from the front image only.
- Expiry date is detected from usable OCR text, with fallback parsing when the structured field is missing or unusable.
- Placeholder values like `not visible`, `n/a`, and `not specified` are ignored.

### 2. Text Normalization and Field Merging

The raw OCR output is cleaned and merged into a single working record.

The merged record is used to derive:

- `drug_name`
- `nafdac_number`
- `manufacturer`
- `expiry_date`
- `batch_number`

The code intentionally does not trust a single OCR field blindly. It checks both structured OCR values and the raw extracted text where needed.

### 3. NAFDAC Verification

The extracted NAFDAC number is validated against the NAFDAC Greenbook data source.

This produces a verification object such as:

- `found`
- `product_name`
- `manufacturer`
- `status`
- `approval_date`

This step is important because a product can look visually convincing but still fail registration checks.

### 4. Reference Image Retrieval

Reference images are stored in Supabase and retrieved by NAFDAC number and view.

Current focus:

- front reference image
- back reference image

Side panels exist in the type system, but the current decision path is centered on front and back for speed.

### 5. SIFT Image Matching

SIFT is the low-level visual matching stage in the pipeline. It compares the submitted front and back images against the stored reference images by looking for stable local features and matching those features across images.

In practical terms, this step answers questions such as:

- Do the package layout and geometry align with the authentic reference?
- Do the label placements, borders, and visual anchors line up?
- Does the image structure look like the same product packaging rather than a random reprint or copy?

The SIFT workflow produces the main visual-authenticity signal used by the backend:

- `match_verdict`: whether the reference and query appear to match
- `similarity_score`: how strong the match is
- `match_visualization`: visual evidence of the matching result

That result contributes directly to the internal authenticity decision and is one of the main inputs to the final verdict.

The current pipeline uses the front and back views only. The previous multi-panel matching path was removed to reduce latency.

### 6. Gemini Vision Comparison

Gemini 2.5 Flash is used for a semantic visual check.

This is not a pixel-level match. It is intended to catch higher-level visual cues such as:

- logo consistency
- typography quality
- spacing and layout anomalies
- label and packaging irregularities

Gemini returns:

- `is_authentic`
- `confidence_score` in the range 0 to 1
- `reasoning_details`

### 7. Detailed Analysis

Gemini also generates a higher-level written assessment from the merged OCR data and verification outputs.

This includes:

- a short summary
- positive authenticity indicators
- risk factors
- a recommendation

The recommendation is one of:

- `LIKELY_GENUINE`
- `INCONCLUSIVE`
- `LIKELY_COUNTERFEIT`

### 8. Final Verdict Computation

The backend combines all signals into a single conclusion for the frontend.

Current score bands:

- `AUTHENTIC`: 80-100%
- `LIKELY_AUTHENTIC`: 65-79%
- `INCONCLUSIVE`: 50-64%
- `LIKELY_COUNTERFEIT`: 35-49%
- `COUNTERFEIT`: 0-34%

This is intentionally a simple user-facing grading model so the frontend can show one conclusive result rather than a long list of technical scores.

## Step-by-Step Analysis Flow

### Step 1: Receive Images

The API receives base64 images from the frontend.

Expected views:

- `front`
- `back`

Optional side panels can exist in the request model, but they are not the main decision inputs anymore.

### Step 2: Run OCR on Each View

Each image is sent to the OCR workflow.

For each view, the backend keeps:

- raw extracted text
- package details JSON
- normalized OCR values

The raw text is logged so the analysis path can be inspected later.

### Step 3: Extract Key Fields

The backend pulls out the important product fields.

Rules:

- Drug name comes from the front image only.
- NAFDAC number is extracted from any usable text source.
- Expiry date is extracted from structured OCR first, then from raw OCR text if needed.
- Manufacturer is retained from usable extracted data.

### Step 4: Normalize Expiry Data

Expiry parsing supports several formats, including:

- `MM-YY`
- `MM/YYYY`
- `YYYY-MM`
- month-name formats when present in text

The parser also expands two-digit years into the 2000s when appropriate.

### Step 5: Check NAFDAC Registration

The extracted NAFDAC number is compared against the official database.

This helps answer:

- Does the registration exist?
- Does the product name match?
- Does the manufacturer match?

### Step 6: Fetch Reference Images

The backend loads the authentic reference images linked to the same NAFDAC registration.

These references are used by SIFT and Gemini for comparison.

### Step 7: Compare Front and Back Images

The submitted images are compared with the authenticated references.

This comparison is where SIFT does the heavy lifting. It produces the low-level visual match that checks whether the package structure, features, and layout resemble the authentic reference.

This comparison contributes to:

- `sift_confidence`
- the `authentic` boolean
- the overall verdict

If the SIFT result is weak, the final confidence drops even when some other signals look acceptable. If the SIFT result is strong, it gives the model much more confidence that the submitted package is visually consistent with the authentic product.

### Step 8: Run Gemini Vision Analysis

The same front/back pair is sent to Gemini for semantic visual assessment.

Gemini is used to identify things that classic matching may miss, such as:

- packaging inconsistency
- poor text quality
- suspicious layout differences
- unusual branding details

### Step 9: Run Detailed Gemini Analysis

The merged OCR data and the comparison results are summarized by Gemini.

This generates a human-readable assessment with:

- what looks correct
- what looks suspicious
- whether the product is likely genuine

### Step 10: Compute the Final Verdict

The backend builds one final result object that the frontend can display directly.

The result contains:

- conclusion
- confidence percentage
- short reason

The verdict is not just one signal. It is a weighted interpretation of:

- SIFT match
- scoring confidence
- NAFDAC verification
- detailed Gemini recommendation
- Gemini vision authenticity
- expiry status

## Key Data Shapes

### Final Verdict

```json
{
  "conclusion": "AUTHENTIC",
  "confidence_percentage": 92,
  "reason": "All verification checks passed. Product appears to be genuine."
}
```

### Frontend Display Object

The frontend should primarily consume a cleaned display object, not the raw internal data.

Important fields:

- `final_verdict`
- `drug_name`
- `nafdac_number`
- `manufacturer`
- `expiry_date`
- `is_expired`
- `sift_match_percentage`
- `scoring_confidence`
- `confidence_band`
- `nafdac_verified`
- `nafdac_product_name`
- `authenticity_summary`
- `authenticity_indicators`
- `risk_factors`
- `visual_comparison_verdict`

The raw response can still be included for advanced users or debugging, but it should not dominate the main UI.

## What the Frontend Should Display

### Primary Card

The first thing users should see is the final verdict.

Recommended display order:

1. Big authenticity label: `AUTHENTIC`, `LIKELY_AUTHENTIC`, etc.
2. Confidence percentage.
3. One-line reason.
4. Product name and NAFDAC number.
5. Expiry status.

### Secondary Details

After the verdict card, show:

- manufacturer
- NAFDAC verification result
- SIFT confidence
- scoring confidence
- confidence band

### Analysis Section

Show a concise narrative summary plus bullet points for:

- authenticity indicators
- risk factors
- Gemini visual comparison result

### Advanced View

If needed, provide a collapsible section for:

- full raw response
- OCR per view
- merged OCR data
- per-view analysis
- panel matching details if retained for compatibility

## Technical Stack

### Backend

- Node.js
- TypeScript
- Express
- Winston logging

### OCR and Image Analysis

- Roboflow OCR workflow
- Roboflow SIFT workflow
- Google Gemini 2.5 Flash for visual reasoning and detailed analysis

### External Verification

- NAFDAC Greenbook scraper/API
- Supabase Storage for reference images

### Utilities

- barcode scanning and lookup support
- image processing helpers
- scoring and verdict services

## Important Implementation Notes

- The drug name should come from the front image only.
- Expiry placeholders like `not visible` should not be treated as valid dates.
- Expiry parsing should understand `6-28` as June 2028.
- OCR text for every view should be logged to the console.
- Gemini requests must use the correct API shape and clean base64 strings.
- The final output should give the frontend one clear conclusion rather than forcing it to interpret all raw scores.

## Why This Design Exists

This architecture balances three goals:

- speed: fewer expensive image comparisons
- accuracy: multiple independent checks still remain
- usability: the frontend gets one simple decision with supporting evidence

The intent is not to expose every internal score to users. It is to give a practical verdict that explains itself.

## Current Expected Outcome

For a normal successful scan, the backend should be able to answer:

- What product is this?
- Does the registration exist?
- Does the packaging look authentic?
- Is the product expired?
- What is the final authenticity conclusion?

The response should then be easy to present in the UI as a readable verification result.
