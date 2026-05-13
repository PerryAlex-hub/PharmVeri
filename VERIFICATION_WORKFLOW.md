# Verification Workflow Notes

## What We Are Doing

We are refining the package verification pipeline so it is more reliable and easier to inspect during development.

The current focus is on three areas:

1. The drug name should come from the front image only.
2. The expiry date should be extracted even when the OCR does not label it explicitly as "expiry date" and instead uses variations like "exp".
3. Every image should print its full extracted OCR text to the console so we can verify the model is reading the package correctly.

## Technical Approach

The main verification flow lives in `src/services/packageVerification.service.ts`.

### OCR handling

Each of the four uploaded images is sent to OCR separately:

- front
- back
- panel_1
- panel_2

For each image, the service now logs:

- the full extracted text when the OCR response includes it
- the structured `package_details` payload when present
- the parsed OCR summary for that view

If `package_details` is missing, the service falls back to the raw extracted text and still tries to recover useful fields.

### Drug name selection

The drug name is no longer merged from all views.

It is taken from the front image only, because the front panel is the most reliable source for the product identity and side panels often contain warnings, marketing text, or repeated manufacturer details that can pollute the result.

### Expiry extraction

Expiry is handled with a fallback parser that looks for common variations such as:

- `exp`
- `expiry`
- `exp date`
- month/year patterns such as `06/2028`
- year/month patterns such as `2028/06`
- month name formats such as `Jun 2028`

This matters because OCR output is inconsistent and expiry is often printed in abbreviated or partially obscured forms.

### NAFDAC fallback

If the structured OCR response does not include a clean NAFDAC value, the service tries to recover it from the raw text.

This helps keep verification stable even when the OCR workflow returns partial JSON.

### Verification scoring and confidence

The scoring flow remains in `src/services/scoring.service.ts`.

It now accepts broader expiry formats so a valid expiry extracted from raw text is still treated correctly by the scoring layer.

In the package verification response, we also compute a confidence band from the lowest per-view SIFT score:

- `very_high` when the margin above the threshold is large
- `high` when the margin is comfortably above the threshold
- `moderate` when the margin is only somewhat above the threshold
- `low` when the score is close to the threshold

This band is added as `confidence_band` in the verification response.

## User Flow For Verification

1. The user uploads or submits four images of the package: front, back, panel_1, and panel_2.
2. The controller validates that all four images are present.
3. The verification service runs OCR on each image in parallel.
4. The service logs the extracted OCR text for each image to the console.
5. The front image supplies the drug name.
6. Expiry is extracted from structured OCR or from raw text if needed.
7. The service identifies the NAFDAC number.
8. Reference images are fetched from Supabase using the NAFDAC number.
9. SIFT comparison is run for front, back, and both panel combinations.
10. The best panel assignment is selected automatically.
11. The response is built with per-view analysis, merged OCR data, panel matching, overall confidence, and confidence band.

## Current Outcome

The verification pipeline is now easier to debug and more tolerant of OCR variation.

The key behavior changes are:

- front-only drug name selection
- expiry extraction from both explicit and implicit labels
- console visibility into every OCR text output
- clearer confidence interpretation using a banded result
