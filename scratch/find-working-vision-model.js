const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  baseURL: 'http://43.157.208.172:20128/v1',
  apiKey: 'sk-6b3ac6ef8e3b70c9-sh90f3-dae0f9fb',
});

const modelsToTest = [
  'kr/claude-haiku-4.5',
  'kr/deepseek-3.2',
  'kr/minimax-m2.5',
  'kr/glm-5',
  'kr/auto',
  'kr/claude-sonnet-4',
  'IKONA/qd/qmodel',
];

async function run() {
  const imgBuf = fs.readFileSync('nota-test.webp');
  const base64Img = imgBuf.toString('base64');

  for (const model of modelsToTest) {
    console.log(`Testing vision model: ${model}...`);
    try {
      const res = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Apakah ini nota? Jawab JSON: {"is_receipt": true}' },
              { type: 'image_url', image_url: { url: `data:image/webp;base64,${base64Img}` } },
            ],
          },
        ],
      });
      console.log(`SUCCESS [${model}]:`, res.choices[0]?.message?.content);
      return;
    } catch (err) {
      console.error(`FAILED [${model}]:`, err.message);
    }
  }
}

run();
