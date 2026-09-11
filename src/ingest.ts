import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function extractPdf(pdfPath: string): Promise<string> {
  const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
  return stdout;
}

export type Chunk = { id: string; start: number; end: number; text: string };

export type OwnershipRow = {
  id: string;
  line: string;
  name: string;
  country: string;
  start: number;
  end: number;
  text: string;
};

export type OwnershipTable = { start: number; end: number; rows: OwnershipRow[] };

export function ownershipTable(extractedText: string): OwnershipTable | undefined {
  const lines = physicalLines(extractedText);
  const annexIndex = lines.findIndex(({ text }) => /^\s*Anexo A\b/i.test(text));
  if (annexIndex === -1) return undefined;
  const headerIndex = lines.findIndex(({ text }, index) => index > annexIndex && /^\s*Accionista\b/i.test(text));
  if (headerIndex === -1) return undefined;

  const rows: OwnershipRow[] = [];
  let end = lines[headerIndex]!.end;
  for (const sourceLine of lines.slice(headerIndex + 1)) {
    const match = /^\s*(.+?)\s{2,}(.+?)\s{2,}(\d{1,3})\s*$/.exec(sourceLine.text);
    if (!match) {
      if (rows.length > 0 && sourceLine.text.trim() !== '') break;
      continue;
    }
    const [, name, country] = match;
    if (!name || !country) continue;
    const row = {
      id: `party-${rows.length + 1}`,
      line: `[L${rows.length + 1}]`,
      name,
      country,
      start: sourceLine.start,
      end: sourceLine.end,
      text: sourceLine.text
    };
    rows.push(row);
    end = row.end;
  }
  return rows.length > 0 ? { start: lines[annexIndex]!.start, end, rows } : undefined;
}

export function declaredBeneficialOwnerSentence(extractedText: string): { start: number; end: number; text: string } | undefined {
  return paragraphChunks(extractedText).find(({ text }) => /\bbeneficiari[ao]\s+final\b/i.test(text));
}

function physicalLines(text: string): { start: number; end: number; text: string }[] {
  const lines: { start: number; end: number; text: string }[] = [];
  let start = 0;
  for (const line of text.split('\n')) {
    lines.push({ start, end: start + line.length, text: line });
    start += line.length + 1;
  }
  return lines;
}

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
