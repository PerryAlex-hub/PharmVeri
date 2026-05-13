# PharmVeri 🔬💊

**AI-Powered Product Authentication & Counterfeit Detection for Nigerian Pharmaceuticals**

PharmVeri is a backend verification system for detecting counterfeit medicines in Nigeria using advanced OCR, computer vision, barcode validation, and NAFDAC database integration.

---

## Features

- **OCR Identification**: Extract drug name and NAFDAC registration from product images
- **SIFT Authentication**: Compare product images against reference database using Roboflow SIFT
- **Barcode Scanning**: Extract and validate barcodes using Quagga2
- **Barcode Lookup**: Cross-reference product barcodes with barcodelookup.com API
- **NAFDAC Validation**: Verify registration against Nigeria's official NAFDAC Greenbook
- **Smart Scoring Engine**: Dynamic authenticity scoring with weighted factors (SIFT, NAFDAC, expiry, barcode)
- **Supabase Storage**: Secure cloud storage for reference product images
- **Resilient APIs**: Retry logic and exponential backoff for external service calls
- **Parallel Processing**: Optimized verification pipeline with concurrent API calls

---

## System Architecture

```
Frontend (User takes photo)
    ↓
POST /api/verify (base64 image)
    ↓
Backend Verification Pipeline:
    ├─ OCR Identification (Roboflow)
    ├─ SIFT Comparison (Roboflow) ─┐
    ├─ NAFDAC Validation (parallel) ├─ Parallel
    ├─ Barcode Scanning (Quagga2) ──┤
    └─ Barcode Lookup API ──────────┘
    ↓
Scoring Engine
    ↓
Response: { status: GENUINE|SUSPICIOUS|COUNTERFEIT, score: 0-100, details }
```

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- npm or yarn
- Environment variables (see `.env.example`)

### Setup

1. **Clone and install**:

```bash
git clone <repo-url>
cd PharmVeri
npm install
```

2. **Configure environment**:

```bash
cp .env.example .env
# Edit .env with your API keys:
# - ROBOFLOW_API_KEY
# - SUPABASE_URL and SUPABASE_ANON_KEY
# - REFERENCE_IMAGES_PATH (optional)
```

3. **Run locally**:

```bash
npm run dev
```

The server starts at `http://localhost:3000`

4. **Test the API**:

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "base64Image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

---

## Deployment to Render

### Step 1: Prepare Your Repository

Ensure your repository includes:

- ✅ `package.json` with build and start scripts
- ✅ `tsconfig.json` for TypeScript compilation
- ✅ `.env.example` with all required variables
- ✅ `.gitignore` (exclude node_modules, .env, etc.)

### Step 2: Set Up on Render

1. **Connect your GitHub repository**:
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select the PharmVeri repository

2. **Configure the Web Service**:

   | Setting           | Value                            |
   | ----------------- | -------------------------------- |
   | **Name**          | pharmveri-api                    |
   | **Environment**   | Node                             |
   | **Region**        | Choose closest to your users     |
   | **Branch**        | main (or your deployment branch) |
   | **Build Command** | `npm install && npm run build`   |
   | **Start Command** | `npm start`                      |

3. **Add Environment Variables**:
   In the Render dashboard, go to **Environment** and add:

   ```
   NODE_ENV=production
   PORT=3000

   ROBOFLOW_API_KEY=<your_key>
   ROBOFLOW_WORKSPACE_NAME=<your_workspace>
   OCR_WORKFLOW_ID=<your_ocr_workflow_id>
   SIFT_WORKFLOW_ID=<your_sift_workflow_id>

   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=<your_anon_key>

   REFERENCE_IMAGES_PATH=src/assets/reference-images
   REFERENCE_INDEX_FILE=index.json

   LOG_LEVEL=info
   ```

4. **Deploy**:
   - Click "Create Web Service"
   - Render automatically deploys from your main branch
   - Check deployment status in the dashboard

### Step 3: Configure CORS (if needed)

If your frontend is on a different domain, add CORS middleware. Update `src/index.ts`:

```typescript
import cors from "cors";

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
);
```

Install cors:

```bash
npm install cors
npm install --save-dev @types/cors
```

---

## API Endpoints

### POST `/api/verify`

Verify a product image for authenticity.

**Request**:

```json
{
  "base64Image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response (Success - 200)**:

```json
{
  "status": "GENUINE",
  "score": 87.5,
  "details": {
    "drugName": "Aspirin 500mg",
    "nafdacStatus": "✓ Valid Registration",
    "barcodeStatus": "✓ Verified",
    "expiryStatus": "✓ Valid",
    "siftSimilarity": 92.3
  }
}
```

**Possible Status Values**:

- `GENUINE` (score > 75)
- `SUSPICIOUS` (score 50-75)
- `COUNTERFEIT` (score < 50)

**Response (Error - 400/500)**:

```json
{
  "error": "OCR identification failed"
}
```

---

##  Configuration

### Environment Variables

| Variable                  | Description                | Example                          |
| ------------------------- | -------------------------- | -------------------------------- |
| `PORT`                    | Server port                | `3000`                           |
| `NODE_ENV`                | Environment mode           | `production` or `development`    |
| `ROBOFLOW_API_KEY`        | Roboflow API key           | `obtained from Roboflow`         |
| `ROBOFLOW_WORKSPACE_NAME` | Roboflow workspace         | `your-workspace`                 |
| `OCR_WORKFLOW_ID`         | OCR workflow ID            | `workflow-id-xxx`                |
| `SIFT_WORKFLOW_ID`        | SIFT workflow ID           | `workflow-id-yyy`                |
| `SUPABASE_URL`            | Supabase project URL       | `https://xxx.supabase.co`        |
| `SUPABASE_ANON_KEY`       | Supabase anon key          | `eyJhbGc...`                     |
| `REFERENCE_IMAGES_PATH`   | Local reference images dir | `src/assets/reference-images`    |
| `REFERENCE_INDEX_FILE`    | Reference index file       | `index.json`                     |
| `LOG_LEVEL`               | Logging level              | `debug`, `info`, `warn`, `error` |

### Reference Images Setup

See [SUPABASE_STORAGE_SETUP.md](./SUPABASE_STORAGE_SETUP.md) for detailed instructions on uploading reference images to Supabase Storage.

---

##  Performance Considerations

- **OCR timeout**: 45 seconds (Roboflow)
- **SIFT timeout**: 60 seconds (Roboflow)
- **NAFDAC timeout**: 15 seconds (parallel, non-blocking)
- **Barcode lookup timeout**: 10 seconds
- **Retry strategy**: 3 attempts with exponential backoff for transient failures

---

##  Project Structure

```
PharmVeri/
├── src/
│   ├── index.ts                 # Express app entry point
│   ├── config/
│   │   └── environment.ts       # Env variable validation
│   ├── controllers/
│   │   └── verification.controller.ts  # Request handlers
│   ├── routes/
│   │   ├── verification.routes.ts     # API routes
│   │   └── test.routes.ts
│   ├── services/
│   │   ├── roboflow.service.ts        # OCR & SIFT
│   │   ├── barcodeScanner.service.ts  # Quagga2 barcode extraction
│   │   ├── barcodeAPI.service.ts      # Barcode lookup
│   │   ├── nafdacScraper.service.ts   # NAFDAC validation
│   │   ├── referenceImage.service.ts  # Reference image management
│   │   ├── supabaseStorage.service.ts # Supabase Storage integration
│   │   └── scoring.service.ts         # Authenticity scoring
│   ├── types/
│   │   └── verification.types.ts      # TypeScript interfaces
│   └── utils/
│       ├── logger.ts            # Winston logger
│       └── imageProcessing.ts   # Base64 & file conversions
├── .env.example            # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

---

##  Security Notes

- **API Keys**: Never commit `.env` files; use environment variables
- **Base64 Images**: Validate size limits on the frontend (< 5MB recommended)
- **Rate Limiting**: Consider adding rate limiting for production
- **CORS**: Configure CORS appropriately for your frontend domain
- **Supabase Keys**: Use read-only keys where possible

---

##  Troubleshooting

### Issue: Barcode scanning fails with "ENOENT: no such file or directory"

- **Cause**: Hardcoded `/tmp` path on Windows
- **Fix**: Code uses `os.tmpdir()` for cross-platform support 

### Issue: NAFDAC lookup times out

- **Cause**: Slow API response or network delay
- **Fix**: NAFDAC runs in parallel; timeout is 15 seconds, non-blocking

### Issue: Supabase Storage returns 403 Unauthorized

- **Cause**: Incorrect SUPABASE_ANON_KEY or bucket permissions
- **Fix**: Verify credentials in `.env` and bucket is publicly readable

### Issue: Images not found in reference storage

- **Cause**: Images stored in wrong path or bucket
- **Fix**: Images can be in bucket root or `reference/` folder; code checks both

---

## Testing

Run test endpoints:

```bash
# Test barcode scanning
curl -X POST http://localhost:3000/api/test/barcode \
  -H "Content-Type: application/json" \
  -d '{"imagePath": "path/to/image.jpg"}'

# Full verification test
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"imagePath": "path/to/image.jpg"}'
```

---

##  Next Steps

1. Upload reference images to Supabase Storage
2. Test the verification API with sample product images
3. Integrate frontend application
4. Set up monitoring and error logging
5. Implement rate limiting
6. Add user authentication if needed

---

## License

ISC

---

##  Author

PharmVeri Development Team

---

## Support

For issues, feature requests, or deployment help, check the troubleshooting section or review service logs in the Render dashboard.

---

**Last Updated**: May 2026
