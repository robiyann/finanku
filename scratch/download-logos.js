const fs = require('fs');
const path = require('path');
const https = require('https');

const iconMap = {
  'bca': 'bca.svg',
  'mandiri': 'mandiri.svg',
  'bni': 'bni.svg',
  'bri': 'bri.svg',
  'jago': 'jago.svg',
  'seabank': 'seabank.svg',
  'blu-by-bca-digital': 'blu.svg',
  'bca-digital': 'bca-digital.svg',
  'gopay': 'gopay.svg',
  'ovo': 'ovo.svg',
  'dana': 'dana.svg',
  'shopeepay': 'shopeepay.svg',
  'linkaja': 'linkaja.svg',
  'jenius': 'jenius.svg',
  'indomaret': 'indomaret.svg',
  'alfamart': 'alfamart.svg',
  'pln': 'pln.svg',
  'tokopedia': 'tokopedia.svg',
  'shopee': 'shopee.svg',
  'cimb-niaga': 'cimb-niaga.svg',
  'permata': 'permata.svg',
  'bsi': 'bsi.svg',
  'danamon': 'danamon.svg',
  'ocbc-nisp': 'ocbc.svg',
  'akulaku': 'akulaku.svg',
  'kredivo': 'kredivo.svg',
  'indihome': 'indihome.svg',
  'biznet': 'biznet.svg'
};

const dirs = [
  path.join(process.cwd(), 'ico'),
  path.join(process.cwd(), 'apps', 'web', 'public', 'ico')
];

dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

async function download(slug, targetFileName) {
  return new Promise((resolve) => {
    const url = `https://cdn.jsdelivr.net/npm/idn-finlogos@2/dist/icons/${slug}.svg`;
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.log(`❌ Failed ${slug} (${targetFileName}): HTTP ${res.statusCode}`);
        resolve(false);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        dirs.forEach(d => {
          fs.writeFileSync(path.join(d, targetFileName), data);
        });
        console.log(`✅ Official SVG saved: ${targetFileName} (${data.length} bytes)`);
        resolve(true);
      });
    }).on('error', (err) => {
      console.error(`❌ Error ${slug}:`, err.message);
      resolve(false);
    });
  });
}

async function run() {
  console.log('Downloading official authentic Indonesian logos...');
  for (const [slug, targetFileName] of Object.entries(iconMap)) {
    await download(slug, targetFileName);
  }
  console.log('Done downloading official logos!');
}

run();
