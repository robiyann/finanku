const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  baseURL: 'http://43.157.208.172:20128/v1',
  apiKey: 'sk-6b3ac6ef8e3b70c9-sh90f3-dae0f9fb',
});

async function run() {
  const imgBuf = fs.readFileSync('nota-test.webp');
  const base64Img = imgBuf.toString('base64');

  try {
    const res = await client.chat.completions.create({
      model: 'kr/claude-sonnet-4',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Kamu adalah parser struk belanja. Analisis foto nota ini dan ekstrak JSON: {"is_receipt": true, "merchant": "nama toko", "total": 10000, "tanggal": "YYYY-MM-DD", "kategori_saran": "Belanja", "items": [{"name": "item", "qty": 1, "price": 10000}]}',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/webp;base64,${base64Img}` },
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    console.log('REPLY FROM kr/claude-sonnet-4:');
    console.log(res.choices[0]?.message?.content);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

run();
