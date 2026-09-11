import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

import { documentTypeSchema, policyCorpusSchema, type DocumentType, type PolicyCorpus, type PolicySection } from './schemas.ts';

export async function loadCorpus(directory: string): Promise<PolicyCorpus> {
  const files = await yamlFiles(directory);
  const sections: unknown[] = [];
  for (const file of files) {
    const parsed = YAML.parse(await readFile(file, 'utf8')) as { sections?: unknown[] };
    if (!Array.isArray(parsed.sections)) throw new Error(`Corpus file ${file} has no sections array.`);
    sections.push(...parsed.sections);
  }
  return policyCorpusSchema.parse({ sections });
}

async function yamlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return yamlFiles(file);
    return entry.isFile() && entry.name.endsWith('.yaml') ? [file] : [];
  }));
  return nested.flat().sort();
}

export function parseCorpus(corpus: unknown): PolicyCorpus {
  return policyCorpusSchema.parse(corpus);
}

export function applicableSections(corpus: PolicyCorpus, documentType: DocumentType): PolicySection[] {
  return corpus.sections.filter((section) => section.applies_to.includes(documentType));
}

export function parseDocumentType(value: string): DocumentType {
  return documentTypeSchema.parse(value);
}
