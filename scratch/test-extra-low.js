const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  baseURL: 'http://43.134.41.152:20128/v1',
  apiKey: 'sk-d8e9d93f4cb07fbd-8eef48-54a2e539',
});

async function run() {
  console.log('Testing model ag/gemini-3.5-flash-extra-low...');
  console.time('Speed Test');

  const imgBuf = fs.readFileSync('nota-test.webp');
  const base64Img = imgBuf.toString('base64');

  try {
    const res = await client.chat.completions.create({
      model: 'ag/gemini-3.5-flash-extra-low',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Kamu adalah parser struk. Ekstrak data nota ke JSON: {"is_receipt": true, "merchant": "nama", "total": 10000, "tanggal": "YYYY-MM-DD", "kategori_saran": "Belanja", "items": [{"name": "item", "qty": 1, "price": 10000}]}',
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

    console.timeEnd('Speed Test');
    console.log('\n✅ RESPONSE FROM ag/gemini-3.5-flash-extra-low:');
    console.log(res.choices[0]?.message?.content);
  } catch (err) {
    console.error('\n❌ FAILED:', err.message);
  }
}

run();
