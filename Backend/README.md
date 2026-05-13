# PharmVeri

PharmVeri is a backend verification system for pharmaceutical package authentication and counterfeit detection in Nigeria. It combines OCR, front/back image comparison, NAFDAC verification, Gemini-based visual analysis, and a final verdict engine that produces one clear authenticity conclusion for the frontend.

The current implementation focuses on speed and practical accuracy. Front and back images are the primary inputs, OCR is used to extract text and package details, and the backend merges all evidence into a single result object that is easy to display in a user interface.

## What the system does

- Extracts product information from package images
- Uses the front image as the source of the drug name
- Parses expiry dates from structured OCR and raw text
- Verifies the NAFDAC registration number against the Greenbook source
- Compares the submitted front and back images with authenticated reference images
- Uses Gemini 2.5 Flash for semantic visual comparison and detailed analysis
- Produces one final authenticity verdict for the frontend

## Core pipeline

```text
Frontend uploads front and back images
    ↓
POST /api/verify
    ↓
OCR runs on each view
    ↓
Raw extracted text is logged for each image
    ↓
Text is normalized and merged
    ↓
Drug name is taken from the front image only
    ↓
NAFDAC number and expiry date are extracted
    ↓
NAFDAC Greenbook lookup runs
    ↓
Reference images are loaded from Supabase
    ↓
Front/back SIFT comparison runs
    ↓
Gemini front/back visual comparison runs
    ↓
Gemini detailed analysis runs
    ↓
Final verdict is computed
```

## Step-by-step analysis flow

### 1. Image intake

The API receives base64-encoded images from the frontend. The main decision path expects a front image and a back image.

### 2. OCR extraction

Each image is processed independently. The backend keeps both the raw extracted text and the parsed package details. The extracted text for every image is logged to the console so the analysis trail can be inspected later.

### 3. Field normalization

The OCR output is cleaned and merged into a working record. This record is used to derive the product name, NAFDAC number, manufacturer, batch number, and expiry date.

Rules enforced by the current implementation:

- Drug name comes from the front image only
- Placeholder text such as `not visible`, `n/a`, or `not specified` is ignored
- Expiry parsing supports formats such as `MM-YY`, `MM/YYYY`, and `YYYY-MM`
- Two-digit years are expanded into the 2000s when appropriate

### 4. NAFDAC verification

The extracted NAFDAC number is validated against the NAFDAC Greenbook source. This helps determine whether the product exists in the official registry and whether the name and manufacturer are consistent with the database record.

### 5. Reference image retrieval

Authentic reference images are loaded from Supabase Storage using the NAFDAC number and the requested view.

### 6. SIFT comparison

The submitted front and back images are compared against the reference images using SIFT. This yields a similarity signal that contributes to the overall authenticity assessment.

The current flow uses front and back only. The older multi-panel path was removed to reduce latency.

### 7. Gemini visual analysis

Gemini 2.5 Flash is used to inspect the same front/back pair semantically. This is intended to catch issues that low-level matching may miss, such as layout inconsistencies, typography issues, branding anomalies, and suspicious packaging differences.

Gemini returns:

- `is_authentic`
- `confidence_score` between 0 and 1
- `reasoning_details`

### 8. Detailed Gemini analysis

The merged OCR data and verification outputs are passed to Gemini for a written assessment. The result includes a summary, positive authenticity indicators, risk factors, and a recommendation.

The recommendation is typically one of:

- `LIKELY_GENUINE`
- `INCONCLUSIVE`
- `LIKELY_COUNTERFEIT`

### 9. Final verdict

The backend combines the evidence into a single verdict for the frontend.

Current verdict bands:

- `AUTHENTIC`: 80-100%
- `LIKELY_AUTHENTIC`: 65-79%
- `INCONCLUSIVE`: 50-64%
- `LIKELY_COUNTERFEIT`: 35-49%
- `COUNTERFEIT`: 0-34%

## What the frontend should show

The frontend should present a simple, high-confidence result rather than exposing every raw technical detail first.

Recommended display order:

1. Final verdict label
2. Confidence percentage
3. One-line reason
4. Product name and NAFDAC number
5. Expiry status
6. NAFDAC verification status
7. SIFT confidence and scoring confidence
8. Summary of authenticity indicators and risk factors

For advanced users or debugging, a collapsible section can expose the full response payload.

## Main response shape

The backend is designed to return a frontend-friendly object with the following important fields:

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
- `full_response`

## Technical stack

### Backend

- Node.js
- TypeScript
- Express
- Winston for logging

### Analysis and verification services

- Roboflow OCR workflow
- Roboflow SIFT workflow
- Google Gemini 2.5 Flash
- NAFDAC Greenbook scraping and lookup
- Supabase Storage for reference images

### Supporting utilities

- barcode scanning and lookup support
- image processing helpers
- scoring and verdict services

## Important implementation notes

- The drug name must come from the front image only.
- Expiry placeholders must not be treated as valid dates.
- The system logs the extracted text for each image to the console.
- Gemini requests must use cleaned base64 data and the correct schema shape.
- The final response should give the frontend one clear conclusion instead of forcing it to interpret raw scores.

## Local development

### Prerequisites

- Node.js 18 or newer
- npm
- Environment variables defined in `.env`

### Setup

```bash
git clone <repo-url>
cd PharmVeri
npm install
```

Create a local environment file:

```bash
copy .env.example .env
```

Run the server:

```bash
npm run dev
```

## Environment variables

| Variable                  | Description                |
| ------------------------- | -------------------------- |
| `PORT`                    | Server port                |
| `NODE_ENV`                | Runtime mode               |
| `ROBOFLOW_API_KEY`        | Roboflow API key           |
| `ROBOFLOW_WORKSPACE_NAME` | Roboflow workspace name    |
| `OCR_WORKFLOW_ID`         | OCR workflow ID            |
| `SIFT_WORKFLOW_ID`        | SIFT workflow ID           |
| `SUPABASE_URL`            | Supabase project URL       |
| `SUPABASE_ANON_KEY`       | Supabase anon key          |
| `REFERENCE_IMAGES_PATH`   | Local reference image path |
| `REFERENCE_INDEX_FILE`    | Reference index file       |
| `GEMINI_API_KEY`          | Gemini API key             |
| `LOG_LEVEL`               | Logging level              |

## API endpoint

### POST `/api/verify`

Request:

```json
{
  "front": "base64-image-data",
  "back": "base64-image-data"
}
```

The exact response is the structured verification object returned by the backend, including the final verdict and the detailed analysis fields described above.

## Reference images

See [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md) for instructions on uploading and organizing reference images in Supabase Storage.

## Project structure

```text
src/
  index.ts
  config/
  controllers/
  routes/
  services/
  types/
  utils/
```

## Related documentation

- [VERIFICATION_SYSTEM.md](./VERIFICATION_SYSTEM.md)
- [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md)

## Support

For issues, feature requests, or deployment help, check the troubleshooting section or review service logs in the Render dashboard.

---

**Last Updated**: May 2026
