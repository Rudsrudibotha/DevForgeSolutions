'use strict';

const { execSync } = require('child_process');
const path = require('path');

const input = path.resolve(__dirname, '..', 'src', 'styles', 'app.css');
const output = path.resolve(__dirname, '..', 'public', 'styles', 'app.css');

try {
  execSync(`npx tailwindcss -i "${input}" -o "${output}" --minify`, { stdio: 'inherit' });
  console.log(`[build:css] wrote ${output}`);
} catch (err) {
  console.error('[build:css] failed:', err.message);
  process.exit(1);
}
