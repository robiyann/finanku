const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  baseURL: 'http://43.157.208.172:20128/v1',
  apiKey: 'sk-6b3ac6ef8e3b70c9-sh90f3-dae0f9fb',
});

async function run() {
  const modelsRes = await fetch('http://43.157.208.172:20128/v1/models', {
    headers: { Authorization: 'Bearer sk-6b3ac6ef8e3b70c9-sh90f3-dae0f9fb' },
  });
  const data = await modelsRes.json();
  const allModels = data.data.map((m) => m.id);

  console.log(`Found ${allModels.length} models. Testing text/vision prompt on each...`);

  const imgBuf = fs.readFileSync('nota-test.webp');
  const base64Img = imgBuf.toString('base64');

  for (const model of allModels) {
    try {
      const res = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analisis foto ini. Apakah ini nota/struk? Balas JSON: {"is_receipt": true}' },
              { type: 'image_url', image_url: { url: `data:image/webp;base64,${base64Img}` } },
            ],
          },
        ],
        temperature: 0.1,
      });

      const reply = res.choices[0]?.message?.content;
      console.log(`\n✅ WORKING MODEL FOUND: [${model}]`);
      console.log('REPLY:', reply);
      return;
    } catch (err) {
      console.log(`❌ [${model}]: ${err.message.substring(0, 80)}`);
    }
  }
}

run();
