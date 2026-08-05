const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  baseURL: 'http://43.134.41.152:20128/v1',
  apiKey: 'sk-d8e9d93f4cb07fbd-8eef48-54a2e539',
});

async function run() {
  console.log('Testing model gc/gemini-2.5-pro on router http://43.134.41.152:20128/v1...');
  const imgBuf = fs.readFileSync('nota-test.webp');
  const base64Img = imgBuf.toString('base64');

  try {
    const res = await client.chat.completions.create({
      model: 'gc/gemini-2.5-pro',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Kamu adalah parser struk belanja. Ekstrak data dari nota ini dan kembalikan JSON: {"is_receipt": true, "merchant": "nama toko", "total": 10000, "tanggal": "YYYY-MM-DD", "kategori_saran": "Belanja", "items": [{"name": "item", "qty": 1, "price": 10000}]}',
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

    console.log('\n✅ SUCCESS RESPONSE FROM gc/gemini-2.5-pro:');
    console.log(res.choices[0]?.message?.content);
  } catch (err) {
    console.error('\n❌ FAILED:', err.message);
  }
}

run();
