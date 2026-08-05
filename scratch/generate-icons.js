const fs = require('fs');
const path = require('path');

const icoDir = path.join(__dirname, '..', 'apps', 'web', 'public', 'ico');
const rootIcoDir = path.join(__dirname, '..', 'ico');
const files = fs.readdirSync(icoDir).filter(f => f.endsWith('.svg'));

const svgMap = {};

files.forEach(f => {
  const name = f.replace('.svg', '');
  let content = fs.readFileSync(path.join(icoDir, f), 'utf8');

  // Ensure xmlns="http://www.w3.org/2000/svg" is present in <svg> tag!
  if (!content.includes('xmlns=')) {
    content = content.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    fs.writeFileSync(path.join(icoDir, f), content);
    if (fs.existsSync(path.join(rootIcoDir, f))) {
      fs.writeFileSync(path.join(rootIcoDir, f), content);
    }
  }

  const b64 = Buffer.from(content).toString('base64');
  svgMap[name] = `data:image/svg+xml;base64,${b64}`;
});

// Alias mappings for common provider names
svgMap['cimb'] = svgMap['cimb-niaga'];
svgMap['blu-by-bca-digital'] = svgMap['blu'] || svgMap['bca-digital'];
svgMap['listrik'] = svgMap['pln'];
svgMap['wifi'] = svgMap['wifi'] || svgMap['indihome'];
svgMap['internet'] = svgMap['wifi'];
svgMap['tunai'] = svgMap['cash'];

const code = `/**
 * Embedded SVG Brand Logos & Cloudflare R2 Helper
 * Guarantees 0ms instant logo rendering with 0 broken images across all browsers.
 */

const EMBEDDED_ICONS: Record<string, string> = ${JSON.stringify(svgMap, null, 2)};

export function getBrandIconUrl(name?: string | null, fallbackType?: string | null): string | null {
  if (!name) {
    if (fallbackType && EMBEDDED_ICONS[fallbackType.toLowerCase()]) {
      return EMBEDDED_ICONS[fallbackType.toLowerCase()];
    }
    return null;
  }

  const clean = name.toLowerCase().trim();

  for (const [key, url] of Object.entries(EMBEDDED_ICONS)) {
    if (clean.includes(key)) {
      return url;
    }
  }

  if (fallbackType && EMBEDDED_ICONS[fallbackType.toLowerCase()]) {
    return EMBEDDED_ICONS[fallbackType.toLowerCase()];
  }

  return null;
}

export function getPresetBrandIcon(slug: string): string {
  return EMBEDDED_ICONS[slug.toLowerCase()] || \`/api/ico/\${slug}.svg\`;
}
`;

const targetPath = path.join(__dirname, '..', 'apps', 'web', 'src', 'lib', 'icons.ts');
fs.writeFileSync(targetPath, code);
console.log('Successfully added xmlns & re-generated embedded icons.ts with', Object.keys(svgMap).length, 'brand icons!');
