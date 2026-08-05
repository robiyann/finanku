import { NextRequest, NextResponse } from 'next/server';
import { getR2Client } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const fileName = name.endsWith('.svg') ? name : `${name}.svg`;
  const r2Key = `ico/${fileName}`;

  const headers = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  };

  const ensureXmlns = (content: string) => {
    if (!content.includes('xmlns=')) {
      return content.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }
    return content;
  };

  // Stream directly from Cloudflare R2 Bucket
  try {
    const r2 = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET || 'finance',
      Key: r2Key,
    });

    const response = await r2.send(command);

    if (response.Body) {
      const svgText = await response.Body.transformToString();
      return new NextResponse(ensureXmlns(svgText), { headers });
    }
  } catch (err: any) {
    console.error(`[R2 Direct Stream] R2 fetch for ${r2Key} failed:`, err.message);
  }

  return NextResponse.json({ error: 'Icon tidak ditemukan di Cloudflare R2.' }, { status: 404 });
}
