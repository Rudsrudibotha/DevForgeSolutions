'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const vendorDir = path.join(root, 'public', 'vendor');
const fontsDir = path.join(vendorDir, 'fonts');
fs.mkdirSync(vendorDir, { recursive: true });
fs.mkdirSync(fontsDir, { recursive: true });

const files = [
  { from: path.join(root, 'node_modules', 'htmx.org', 'dist', 'htmx.min.js'), to: path.join(vendorDir, 'htmx.min.js') },
  { from: path.join(root, 'node_modules', 'alpinejs', 'dist', 'cdn.min.js'), to: path.join(vendorDir, 'alpine.min.js') },
  { from: path.join(root, 'node_modules', '@fontsource-variable', 'inter', 'files', 'inter-latin-wght-normal.woff2'), to: path.join(fontsDir, 'inter-latin-wght-normal.woff2') }
];

for (const file of files) {
  if (!fs.existsSync(file.from)) {
    console.warn(`[copy-vendor] Skipping ${path.basename(file.to)}: source not found (${file.from})`);
    continue;
  }
  fs.copyFileSync(file.from, file.to);
  const stat = fs.statSync(file.to);
  console.log(`[copy-vendor] ${path.basename(file.to)} (${(stat.size / 1024).toFixed(1)} KB)`);
}
