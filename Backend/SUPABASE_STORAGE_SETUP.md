# Supabase Storage Setup - Reference Images Only

## Overview

PharmVeri uses **Supabase Storage** to store and retrieve reference images for SIFT visual verification. This replaces Firebase Storage (which requires a paid plan).

## Why Supabase?

- ✅ **Free tier** with generous storage limits
- ✅ **Simple REST API** for uploads/downloads
- ✅ **Automatic backups** and redundancy
- ✅ **No pro plan required** (unlike Firebase)
- ✅ **Hybrid mode**: Falls back to local images if Supabase is unavailable

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new account or sign in
3. Create a new project (select a region close to your deployment)
4. Wait for project initialization

### 2. Create a Storage Bucket

1. In your Supabase dashboard, go to **Storage** (left sidebar)
2. Click **Create a new bucket**
3. Name it: `reference-images`
4. Set it to **Public** (so images are accessible without authentication)
5. Click **Create bucket**

### 3. Get Your API Credentials

1. Go to **Settings → API**
2. Copy your `Project URL` (looks like `https://xxxxx.supabase.co`)
3. Copy your `Anon Key` (public, safe to commit)
4. Add them to your `.env` file:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   ```

### 4. Upload Reference Images

You can upload reference images either:

#### Option A: Using Supabase Dashboard

1. Open **Storage → reference-images** in dashboard
2. Click **Upload**
3. Upload images named: `{NAFDAC_NUMBER}-reference.jpg`
   - Example: `B4-6953-reference.jpg`

#### Option B: Using Node Script

Create `upload-reference.ts`:

```typescript
import { supabaseStorageService } from "./src/services/supabaseStorage.service";
import fs from "fs";

async function uploadImage(nafdacNumber: string, imagePath: string) {
  const buffer = fs.readFileSync(imagePath);
  const result = await supabaseStorageService.uploadReferenceImage(
    nafdacNumber,
    buffer,
    "image/jpeg",
  );
  console.log("Upload result:", result);
}

uploadImage("B4-6953", "./path/to/image.jpg");
```

## How It Works

### Image Retrieval Flow

When verification runs:

1. **Step 1**: Try to fetch from Supabase Storage
2. **Step 2**: If not found, fall back to local filesystem
3. **Step 3**: Return base64 image for SIFT verification

This hybrid approach means:

- New images can be uploaded to Supabase without code changes
- Existing local images continue to work
- No downtime if one storage system fails

### API Methods (supabaseStorageService)

```typescript
// Upload a reference image
await supabaseStorageService.uploadReferenceImage(
  "B4-6953",
  imageBuffer,
  "image/jpeg",
);

// Download as buffer
const buffer = await supabaseStorageService.downloadReferenceImage("B4-6953");

// Get public URL
const url = await supabaseStorageService.getReferenceImageUrl("B4-6953");

// Check if image exists
const exists = await supabaseStorageService.imageExists("B4-6953");

// Delete image
await supabaseStorageService.deleteReferenceImage("B4-6953");
```

## Storage Bucket Structure

```
reference-images/
└── reference/
    ├── B4-6953-reference.jpg
    ├── A4-100068-reference.jpg
    └── ...
```

## Verification Endpoint (No Changes)

```bash
POST /api/verify
{
  "imagePath": "path/to/drug-package.jpg"
}
```

The endpoint automatically handles:

- Checking Supabase first
- Falling back to local images
- SIFT comparison
- Authentication verdict

## Free Tier Limits

- **Storage**: 1 GB (plenty for reference images)
- **Bandwidth**: 2 GB/month (more than enough)
- **API calls**: Unlimited

## Production Checklist

- ✅ Supabase project created
- ✅ `reference-images` bucket created (public)
- ✅ `SUPABASE_URL` and `SUPABASE_ANON_KEY` added to `.env`
- ✅ Reference images uploaded for your products
- ✅ Test verification with `/api/verify`

## Fallback & Reliability

If Supabase is down:

1. Logs will show warning about Supabase unavailable
2. System automatically falls back to local images
3. Verification continues normally
4. No data loss (all images exist locally + Supabase)

## Troubleshooting

### Images not found in Supabase

- Verify bucket name is `reference-images`
- Check image naming: `{NAFDAC_NUMBER}-reference.jpg`
- Ensure bucket is set to **Public**
- Check SUPABASE_URL and SUPABASE_ANON_KEY in .env

### "Missing required environment variables"

- Add both `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`
- Get credentials from **Settings → API** in Supabase dashboard

### Slow image downloads

- First download may be slower (0.5-1s)
- Subsequent downloads are cached by client
- Consider uploading optimized JPEG images (< 500KB)

## Cost Estimate

- **Reference images**: ~200KB-500KB each
- **100 products**: ~20-50MB storage
- **Monthly bandwidth**: ~50-100MB (during dev/testing)
- **Cost**: **FREE** (well within free tier)

## Next Steps

1. Create Supabase project
2. Create `reference-images` bucket
3. Add credentials to `.env`
4. Upload your reference images
5. Test with POST `/api/verify`

Done! Your PharmVeri backend now uses Supabase for reliable image storage. 🚀
