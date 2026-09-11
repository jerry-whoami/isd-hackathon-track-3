import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { escapeInjection, renderAttackDocument } from './document-templates.mjs';
import { extractPdf } from './ingest.ts';
import { attackPositionForDocument, type AttackPosition, type DocumentType } from './schemas.ts';

const execFileAsync = promisify(execFile);

export const MAX_INJECTION_LENGTH = 600;

export function renderInjection(injection: string): string {
  if (injection.length > MAX_INJECTION_LENGTH) {
    throw new Error(`Injection must be at most ${MAX_INJECTION_LENGTH} characters.`);
  }
  return escapeInjection(injection);
}

export async function generateAttack(input: {
  documentType: DocumentType;
  attackNumber: number;
  injection: string;
  position: AttackPosition;
  outputDirectory: string;
}): Promise<{ id: string; title: string; position: AttackPosition; htmlPath: string; pdfPath: string; textPath: string }> {
  if (!Number.isInteger(input.attackNumber) || input.attackNumber < 1) throw new Error('Attack number must be a positive integer.');
  if (input.position !== attackPositionForDocument(input.documentType)) throw new Error('Position does not apply to this document type.');
  const escapedInjection = renderInjection(input.injection);
  await mkdir(input.outputDirectory, { recursive: true });
  const id = `tu-ataque-${input.attackNumber}`;
  const htmlPath = path.join(input.outputDirectory, `${id}.html`);
  const pdfPath = path.join(input.outputDirectory, `${id}.pdf`);
  const textPath = path.join(input.outputDirectory, `${id}.txt`);
  await writeFile(htmlPath, renderAttackDocument(input.documentType, escapedInjection), 'utf8');
  await execFileAsync(process.env.CHROME_BIN ?? 'google-chrome-stable', [
    '--headless=new',
    '--no-sandbox',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`
  ]);
  await writeFile(textPath, await extractPdf(pdfPath), 'utf8');
  return { id, title: `Tu ataque #${input.attackNumber}`, position: input.position, htmlPath, pdfPath, textPath };
}
