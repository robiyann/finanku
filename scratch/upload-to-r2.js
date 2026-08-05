const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Parse apps/web/.env.local manually
const envPath = path.join(process.cwd(), 'apps', 'web', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET || 'finance';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('❌ Cloudflare R2 credentials missing in .env.local!');
  process.exit(1);
}

const s3Client = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: 'auto',
});

const icoDir = path.join(process.cwd(), 'ico');
const files = fs.readdirSync(icoDir).filter(f => f.endsWith('.svg'));

async function uploadFiles() {
  console.log(`🚀 Starting Cloudflare R2 Upload for ${files.length} SVG icons to bucket "${bucketName}"...`);

  let successCount = 0;

  for (const file of files) {
    const filePath = path.join(icoDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    const r2Key = `ico/${file}`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: 'image/svg+xml',
        CacheControl: 'public, max-age=31536000, immutable',
      });

      await s3Client.send(command);
      console.log(`✅ Uploaded to R2: ${r2Key} (${fileBuffer.length} bytes)`);
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to upload ${r2Key}:`, err.message);
    }
  }

  console.log(`\n🎉 Upload Complete! Successfully uploaded ${successCount}/${files.length} icons to Cloudflare R2!`);
}

uploadFiles();
