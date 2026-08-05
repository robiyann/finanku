const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  });
}

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET || 'finance';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('❌ Cloudflare R2 credentials missing in env!');
  process.exit(1);
}

const r2 = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: 'auto',
});

const icoDir = path.join(__dirname, '..', 'apps', 'web', 'public', 'ico');
const rootIcoDir = path.join(__dirname, '..', 'ico');

async function syncAndClean() {
  const files = fs.readdirSync(icoDir).filter(f => f.endsWith('.svg'));
  console.log(`Found ${files.length} local SVG icons to sync to Cloudflare R2 bucket "${bucketName}"...`);

  let successCount = 0;

  for (const f of files) {
    const filePath = path.join(icoDir, f);
    let content = fs.readFileSync(filePath, 'utf8');

    // Ensure W3C xmlns namespace
    if (!content.includes('xmlns=')) {
      content = content.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }

    const r2Key = `ico/${f}`;

    try {
      await r2.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        Body: Buffer.from(content, 'utf8'),
        ContentType: 'image/svg+xml; charset=utf-8',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      console.log(`✅ Uploaded to R2: ${r2Key}`);
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to upload ${r2Key} to R2:`, err.message);
    }
  }

  console.log(`\n🎉 Successfully synced ${successCount}/${files.length} icons to Cloudflare R2!`);

  // Now delete local SVG files
  console.log('\nDeleting local SVG directories...');
  if (fs.existsSync(icoDir)) {
    fs.rmSync(icoDir, { recursive: true, force: true });
    console.log(`🗑️ Deleted directory: ${icoDir}`);
  }
  if (fs.existsSync(rootIcoDir)) {
    fs.rmSync(rootIcoDir, { recursive: true, force: true });
    console.log(`🗑️ Deleted directory: ${rootIcoDir}`);
  }

  console.log('\n✨ Local icons deleted! Total transition to Cloudflare R2 complete.');
}

syncAndClean();
