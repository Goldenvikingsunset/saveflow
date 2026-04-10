/**
 * generate-icons.js
 * Generates all required icon sizes for the VS Code Marketplace from assets/icon.png
 *
 * Usage:  node scripts/generate-icons.js
 * Prereq: npm install --save-dev sharp
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SOURCE  = path.join(__dirname, '..', 'assets', 'icon.png');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'icons');

// VS Code Marketplace requires 128x128 as the primary icon (set in package.json).
// Additional sizes for OVSX, high-DPI displays, and any future store requirements.
const SIZES = [
  { size: 16,  name: 'icon-16.png'  },
  { size: 32,  name: 'icon-32.png'  },
  { size: 48,  name: 'icon-48.png'  },
  { size: 64,  name: 'icon-64.png'  },
  { size: 128, name: 'icon-128.png' },
  { size: 256, name: 'icon-256.png' },
];

async function run() {
  if (!fs.existsSync(SOURCE)) {
    console.error('ERROR: Source icon not found:', SOURCE);
    console.error('Expected: assets/icon.png (your master icon file)');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const { size, name } of SIZES) {
    const outPath = path.join(OUT_DIR, name);
    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outPath);
    console.log(`OK  ${size}x${size}  ->  assets/icons/${name}`);
  }

  console.log('\nAll icons generated in assets/icons/');
  console.log('package.json points to assets/icon.png (128x128) — no change needed.');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
