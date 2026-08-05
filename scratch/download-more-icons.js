const fs = require('fs');
const path = require('path');
const https = require('https');

const icoDir = path.join(__dirname, '..', 'apps', 'web', 'public', 'ico');
const rootIcoDir = path.join(__dirname, '..', 'ico');

function createCategorySvg(filename, bgGrad, iconPaths, textStr) {
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad_${filename.replace('.svg', '')}" x1="0%" y1="0%" x2="100%" y2="100%">
      ${bgGrad}
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="96" height="36" rx="8" fill="url(#bgGrad_${filename.replace('.svg', '')})" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1"/>
  <g fill="#ffffff">
    ${iconPaths}
  </g>
  <text x="64" y="25" font-family="'Outfit', 'Inter', sans-serif" font-weight="900" font-size="10" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${textStr}</text>
</svg>`;

  fs.writeFileSync(path.join(icoDir, filename), content);
  if (fs.existsSync(rootIcoDir)) {
    fs.writeFileSync(path.join(rootIcoDir, filename), content);
  }
  console.log(`✨ Created SVG category icon ${filename}`);
}

async function run() {
  console.log('Downloading & creating additional installment icons...');

  createCategorySvg('gadget.svg', '<stop offset="0%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#8b5cf6"/>', '<path d="M 10,8 L 20,8 C 21,8 22,9 22,10 L 22,28 C 22,29 21,30 20,30 L 10,30 C 9,30 8,29 8,28 L 8,10 C 8,9 9,8 10,8 Z M 15,27 A 1,1 0 1,0 15,29 A 1,1 0 1,0 15,27 Z M 10,11 L 20,11 L 20,25 L 10,25 Z M 25,12 L 40,12 C 41,12 42,13 42,14 L 42,26 C 42,27 41,28 40,28 L 25,28 C 24,28 23,27 23,26 L 23,14 C 23,13 24,12 25,12 Z M 25,14 L 40,14 L 40,24 L 25,24 Z M 21,30 L 44,30 L 44,31 L 21,31 Z"/>', 'Gadget');
  createCategorySvg('tiktok.svg', '<stop offset="0%" stop-color="#000000"/><stop offset="100%" stop-color="#25F4EE"/>', '<path d="M 22,10 A 8,8 0 0,0 30,18 L 30,24 A 14,14 0 0,1 22,21 L 22,27 A 9,9 0 1,1 13,18 A 9,9 0 0,1 18,19.5 L 18,24.5 A 4,4 0 1,0 22,27 Z"/>', 'TikTok');
  createCategorySvg('tiktokpaylater.svg', '<stop offset="0%" stop-color="#000000"/><stop offset="100%" stop-color="#FE2C55"/>', '<path d="M 22,10 A 8,8 0 0,0 30,18 L 30,24 A 14,14 0 0,1 22,21 L 22,27 A 9,9 0 1,1 13,18 A 9,9 0 0,1 18,19.5 L 18,24.5 A 4,4 0 1,0 22,27 Z"/>', 'PayLater');
  createCategorySvg('motor.svg', '<stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#3b82f6"/>', '<path d="M 12,26 A 5,5 0 1,1 22,26 A 5,5 0 1,1 12,26 M 28,26 A 5,5 0 1,1 38,26 A 5,5 0 1,1 28,26 M 17,26 L 22,18 L 29,18 L 33,26 M 25,18 L 23,12 L 18,12"/>', 'Motor');
  createCategorySvg('mobil.svg', '<stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#0284c7"/>', '<path d="M 12,26 A 4,4 0 1,1 20,26 M 30,26 A 4,4 0 1,1 38,26 M 10,22 L 14,15 L 34,15 L 38,22 L 40,22 L 40,26 L 10,26 Z"/>', 'Mobil');
  createCategorySvg('kpr.svg', '<stop offset="0%" stop-color="#14532d"/><stop offset="100%" stop-color="#16a34a"/>', '<path d="M 10,22 L 25,10 L 40,22 L 35,22 L 35,30 L 15,30 L 15,22 Z M 21,30 L 21,24 L 29,24 L 29,30 Z"/>', 'KPR');
  createCategorySvg('adira.svg', '<stop offset="0%" stop-color="#b45309"/><stop offset="100%" stop-color="#f59e0b"/>', '<path d="M 12,12 L 24,12 L 30,28 L 24,28 L 22,22 L 16,22 L 14,28 L 8,28 Z M 17,17 L 21,17 L 19,13 Z"/>', 'Adira');
  createCategorySvg('fif.svg', '<stop offset="0%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#2563eb"/>', '<path d="M 10,12 L 28,12 L 28,16 L 16,16 L 16,20 L 26,20 L 26,24 L 16,24 L 16,30 L 10,30 Z"/>', 'FIFGROUP');
  createCategorySvg('acc.svg', '<stop offset="0%" stop-color="#0369a1"/><stop offset="100%" stop-color="#0ea5e9"/>', '<path d="M 10,12 L 22,12 L 28,28 L 22,28 L 20,22 L 14,22 L 12,28 L 6,28 Z M 15,17 L 19,17 L 17,13 Z"/>', 'ACC Astra');
  createCategorySvg('indodana.svg', '<stop offset="0%" stop-color="#047857"/><stop offset="100%" stop-color="#10b981"/>', '<path d="M 12,12 L 20,12 C 26,12 28,15 28,20 C 28,25 26,28 20,28 L 12,28 Z M 17,17 L 17,23 L 20,23 C 23,23 24,22 24,20 C 24,18 23,17 20,17 Z"/>', 'Indodana');
  createCategorySvg('lazada.svg', '<stop offset="0%" stop-color="#431407"/><stop offset="100%" stop-color="#ea580c"/>', '<path d="M 10,12 L 16,12 L 16,24 L 26,24 L 26,28 L 10,28 Z"/>', 'Lazada');

  console.log('Finished updating additional installment icons!');
}

run();
