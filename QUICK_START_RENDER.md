# Quick Render Deployment Guide

Deploy PharmVeri to Render in 5 minutes.

## Step 1: Verify Local Setup ✅

```bash
npm install
npm run build  # Should succeed
npm run dev    # Should start without errors
```

## Step 2: Prepare Environment Variables 📝

Get these values ready:

| Variable            | Where to Get                            |
| ------------------- | --------------------------------------- |
| `ROBOFLOW_API_KEY`  | https://roboflow.com → Settings → API   |
| `OCR_WORKFLOW_ID`   | Roboflow workspace → Workflows → OCR    |
| `SIFT_WORKFLOW_ID`  | Roboflow workspace → Workflows → SIFT   |
| `SUPABASE_URL`      | https://supabase.com → Project Settings |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API       |

## Step 3: Create Render Web Service 🚀

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Select your GitHub repository
4. Configure:

```
Name: pharmveri-api
Environment: Node
Region: Ohio
Build Command: npm install && npm run build
Start Command: npm start
```

## Step 4: Add Environment Variables 🔐

In Render dashboard → **Environment**, add:

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=*
ROBOFLOW_API_KEY=<your_api_key>
ROBOFLOW_WORKSPACE_NAME=<workspace>
OCR_WORKFLOW_ID=<ocr_id>
SIFT_WORKFLOW_ID=<sift_id>
SUPABASE_URL=<supabase_url>
SUPABASE_ANON_KEY=<supabase_key>
REFERENCE_IMAGES_PATH=src/assets/reference-images
REFERENCE_INDEX_FILE=index.json
```

## Step 5: Deploy 🎯

Click **"Create Web Service"** and wait 2-5 minutes.

Check logs for:

- ✅ "npm install" succeeded
- ✅ "npm run build" succeeded
- ✅ "Server running on..." message

## Step 6: Test 🧪

Once "Live" appears:

```bash
# Health check
curl https://pharmveri-api.onrender.com/health

# Test verification (with actual base64 image)
curl -X POST https://pharmveri-api.onrender.com/api/verify \
  -H "Content-Type: application/json" \
  -d '{"base64Image": "data:image/jpeg;base64,..."}'
```

## Common Issues

**Build fails**: Check npm logs for missing dependencies
**500 errors**: Verify all environment variables are set
**ENOENT errors**: Already fixed in codebase (uses `os.tmpdir()`)

---

**Done! Your backend is live. Now integrate it with your frontend.** 🎉
