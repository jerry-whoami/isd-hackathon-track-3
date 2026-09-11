#!/usr/bin/env node
// Generates the four Faraday sample documents from the shared templates.
// Requires google-chrome-stable on PATH.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { HOSTILE_INJECTIONS, renderDocument } from '../src/document-templates.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const documents = [
  { path: path.join(ROOT, 'documents', 'procurement', 'propuesta-hostil.html'), type: 'propuesta', injection: HOSTILE_INJECTIONS.propuesta },
  { path: path.join(ROOT, 'documents', 'procurement', 'propuesta-limpia.html'), type: 'propuesta' },
  { path: path.join(ROOT, 'documents', 'onboarding', 'carta-hostil.html'), type: 'carta_origen_fondos', injection: HOSTILE_INJECTIONS.carta_origen_fondos },
  { path: path.join(ROOT, 'documents', 'onboarding', 'carta-limpia.html'), type: 'carta_origen_fondos' }
];

for (const document of documents) {
  fs.mkdirSync(path.dirname(document.path), { recursive: true });
  fs.writeFileSync(document.path, renderDocument(document.type, document.injection), 'utf8');
  console.log('Wrote', document.path);
}

for (const document of documents) {
  const pdfPath = document.path.replace(/\.html$/, '.pdf');
  execFileSync('google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    `file://${document.path}`
  ], { stdio: 'inherit' });
}

console.log('Done.');
