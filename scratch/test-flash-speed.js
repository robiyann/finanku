const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  baseURL: 'http://43.134.41.152:20128/v1',
  apiKey: 'sk-d8e9d93f4cb07fbd-8eef48-54a2e539',
});

async function run() {
  const imgBuf = fs.readFileSync('nota-test.webp');
  const base64Img = imgBuf.toString('base64');

  console.log('Testing gc/gemini-2.5-flash speed...');
  console.time('Gemini 2.5 Flash');

  try {
    const res = await client.chat.completions.create({
      model: 'gc/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Ekstrak nota ini ke JSON: {"is_receipt": true}' },
            { type: 'image_url', image_url: { url: `data:image/webp;base64,${base64Img}` } },
          ],
        },
      ],
      temperature: 0.1,
    });
    console.timeEnd('Gemini 2.5 Flash');
    console.log('FLASH RESPONSE:', res.choices[0]?.message?.content);
  } catch (err) {
    console.error('FLASH FAILED:', err.message);
  }
}

run();
