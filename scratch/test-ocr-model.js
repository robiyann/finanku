const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  baseURL: 'http://43.157.208.172:20128/v1',
  apiKey: 'sk-6b3ac6ef8e3b70c9-sh90f3-dae0f9fb',
});

async function testModel(modelName) {
  console.log(`\n--- Testing model: ${modelName} ---`);
  try {
    const imgBuf = fs.readFileSync('nota-test.webp');
    const base64Img = imgBuf.toString('base64');
    
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Ekstrak data dari nota belanja ini. Balas HANYA dengan JSON valid format: {"is_receipt": true, "merchant": "nama toko", "total": 10000, "tanggal": "2026-08-01", "kategori_saran": "Belanja", "items": [{"name": "item", "qty": 1, "price": 10000}]}' },
            { type: 'image_url', image_url: { url: `data:image/webp;base64,${base64Img}` } },
          ],
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    console.log('Result for', modelName, ':');
    console.log(content);
  } catch (err) {
    console.error('Error testing', modelName, ':', err.message);
  }
}

async function run() {
  await testModel('kr/auto');
  await testModel('kr/claude-sonnet-4');
  await testModel('kr/claude-sonnet-4.5');
  await testModel('qd/auto');
  await testModel('qd/performance');
}

run();
