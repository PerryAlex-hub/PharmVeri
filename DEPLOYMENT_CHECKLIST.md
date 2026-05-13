# PharmVeri Deployment Checklist

Complete this checklist before deploying to Render.

## Pre-Deployment (Local Testing)

- [ ] Clone repository and run `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all required environment variables:
  - [ ] `ROBOFLOW_API_KEY`
  - [ ] `ROBOFLOW_WORKSPACE_NAME`
  - [ ] `OCR_WORKFLOW_ID`
  - [ ] `SIFT_WORKFLOW_ID`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
- [ ] Run `npm run dev` locally and verify `/health` endpoint
- [ ] Test with a sample image: `POST /api/verify`

## Supabase Setup

- [ ] Create Supabase project at https://supabase.com
- [ ] Create bucket named `reference-images`
- [ ] Set bucket to public (if needed for public access)
- [ ] Upload reference product images to bucket root or `reference/` folder
- [ ] Format: `{NAFDAC_NUMBER}-reference.jpg` (e.g., `A2B3C4D5E6-reference.jpg`)
- [ ] Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`

## Roboflow Setup

- [ ] Create account at https://roboflow.com
- [ ] Create two workflows:
  1. **OCR Workflow**: Extracts drug name, NAFDAC registration, expiry from product image
  2. **SIFT Workflow**: Compares query image against reference images for authenticity
- [ ] Get API key from Roboflow account settings
- [ ] Note down Workspace Name, OCR Workflow ID, and SIFT Workflow ID

## Code Verification

- [ ] Verify TypeScript compiles: `npm run build`
- [ ] Check no console errors: `npm run dev` and view logs
- [ ] Verify `.gitignore` excludes:
  - `.env` (never commit secrets)
  - `node_modules/`
  - `dist/`
  - `logs/`
  - `.DS_Store`

## Git & Repository

- [ ] Initialize Git: `git init` (if not already done)
- [ ] Add all files: `git add .`
- [ ] Commit: `git commit -m "Initial PharmVeri setup"`
- [ ] Push to GitHub: `git push origin main`

## Render Deployment

### 1. Create Web Service

- [ ] Go to https://dashboard.render.com
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub account and select `PharmVeri` repository
- [ ] Set Name: `pharmveri-api`
- [ ] Set Region: Ohio (or closest to your users)
- [ ] Set Plan: **Free** (for testing) or **Starter** (for production)

### 2. Build & Start Commands

- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`

### 3. Environment Variables

In Render dashboard → **Environment**, add all variables from `.env.example`:

```
NODE_ENV=production
PORT=3000

ROBOFLOW_API_KEY=<value from Roboflow>
ROBOFLOW_WORKSPACE_NAME=<your workspace>
OCR_WORKFLOW_ID=<your OCR workflow ID>
SIFT_WORKFLOW_ID=<your SIFT workflow ID>

SUPABASE_URL=<your Supabase URL>
SUPABASE_ANON_KEY=<your Supabase anon key>

REFERENCE_IMAGES_PATH=src/assets/reference-images
REFERENCE_INDEX_FILE=index.json

LOG_LEVEL=info
```

- [ ] Copy-paste each variable exactly as shown
- [ ] Save environment variables

### 4. Deploy

- [ ] Click "Create Web Service"
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Check build logs for errors
- [ ] Verify deployment succeeded

## Post-Deployment Verification

- [ ] Check Render dashboard shows "Live" status
- [ ] Note your Render URL (e.g., `https://pharmveri-api.onrender.com`)
- [ ] Test health endpoint: `https://pharmveri-api.onrender.com/health`
- [ ] Test verification endpoint with sample image:
  ```bash
  curl -X POST https://pharmveri-api.onrender.com/api/verify \
    -H "Content-Type: application/json" \
    -d '{"base64Image": "..."}'
  ```
- [ ] Verify Supabase images are being downloaded correctly
- [ ] Check logs in Render dashboard for any errors

## Optional Enhancements (Post-Deployment)

- [ ] Add CORS middleware for frontend domain
- [ ] Implement rate limiting
- [ ] Add request/response logging
- [ ] Set up error tracking (Sentry, DataDog, etc.)
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Configure auto-restart on crashes
- [ ] Set up monitoring alerts

## Troubleshooting

### Build fails with "npm: command not found"

- Ensure Render detects Node environment (checks `package.json` in root)

### Start fails with "Cannot find module"

- Verify all dependencies are in `package.json` (not just `package-lock.json`)
- Run `npm install` locally to regenerate `package-lock.json`

### API returns 500 errors

- Check Render logs for detailed error messages
- Verify all environment variables are correctly set
- Test locally first before deploying

### ENOENT errors with temp files

- Fixed by using `os.tmpdir()` instead of hardcoded `/tmp`
- Already implemented in current codebase ✅

### Supabase connection fails

- Verify `SUPABASE_URL` format: `https://xxx.supabase.co`
- Verify `SUPABASE_ANON_KEY` is not empty or truncated
- Test locally with same credentials first

---

**Once all items are checked, you're ready to deploy! 🚀**
