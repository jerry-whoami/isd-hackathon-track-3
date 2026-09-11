import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function extractPdf(pdfPath: string): Promise<string> {
  const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
  return stdout;
}

export type Chunk = { id: string; start: number; end: number; text: string };

export function paragraphChunks(extractedText: string): Chunk[] {
  const chunks: Chunk[] = [];
  for (const match of extractedText.matchAll(/\S[\s\S]*?(?=\n\s*\n|$)/g)) {
    const text = match[0];
    const start = match.index;
    if (start === undefined) continue;
    chunks.push({ id: `chunk-${chunks.length + 1}`, start, end: start + text.length, text });
  }
  return chunks;
}

export type ClauseWindow = { start: number; end: number; text: string; words: string[]; anchoredText: string };

export function paymentClauseWindow(chunk: Chunk): ClauseWindow | undefined {
  const clause = /CL[ÁA]USULA\s+7\.[\s\S]*?(?:factura\.)/i.exec(chunk.text);
  if (!clause || clause.index === undefined) return undefined;
  const start = chunk.start + clause.index;
  const text = clause[0];
  const words = Array.from(text.matchAll(/\S+/g), (word) => word[0]);
  return {
    start,
    end: start + text.length,
    text,
    words,
    anchoredText: words.map((word, index) => `⟦${index}⟧${word}`).join(' ')
  };
}

export function liabilityClauseWindow(chunk: Chunk): ClauseWindow | undefined {
  const clause = /CL[ÁA]USULA\s+12\.[\s\S]*?(?:contrato\.)/i.exec(chunk.text);
  if (!clause || clause.index === undefined) return undefined;
  const start = chunk.start + clause.index;
  const text = clause[0];
  const words = Array.from(text.matchAll(/\S+/g), (word) => word[0]);
  return {
    start,
    end: start + text.length,
    text,
    words,
    anchoredText: words.map((word, index) => `⟦${index}⟧${word}`).join(' ')
  };
}

export function spanFromWordAnchor(window: ClauseWindow, anchor: { start: number; end: number }): { start: number; end: number } | undefined {
  if (anchor.start > anchor.end || anchor.end >= window.words.length) return undefined;
  const positions = Array.from(window.text.matchAll(/\S+/g));
  const first = positions[anchor.start];
  const last = positions[anchor.end];
  if (!first || !last || first.index === undefined || last.index === undefined) return undefined;
  return { start: window.start + first.index, end: window.start + last.index + last[0].length };
}
