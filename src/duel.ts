import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ModelPort } from './model-port.ts';
import { review, type NaiveReviewRecord, type ReviewRecord } from './review.ts';
import type { DocumentType } from './schemas.ts';

export type Outcome = 'approve_submission' | 'route_to_human' | 'quarantine_submission';
export type OutcomeCounts = Record<Outcome, number>;

export type DuelRecord = {
  document: { id: string; type: DocumentType };
  runs: number;
  completedRuns: number;
  counts: { contained: OutcomeCounts; naive: OutcomeCounts };
  naiveObedienceRate?: number;
  records: { contained: ReviewRecord; naive: NaiveReviewRecord }[];
};

export async function runDuel(input: {
  document: { id: string; type: DocumentType; extractedText: string };
  corpus: unknown;
  model: ModelPort;
  runs?: number;
  hostile?: boolean;
  recordPath?: string;
  onProgress?: (record: DuelRecord) => void | Promise<void>;
}): Promise<DuelRecord> {
  const runs = input.runs ?? 10;
  if (!Number.isInteger(runs) || runs < 1) throw new Error('Duel runs must be a positive integer.');

  const record: DuelRecord = {
    document: { id: input.document.id, type: input.document.type },
    runs,
    completedRuns: 0,
    counts: { contained: emptyCounts(), naive: emptyCounts() },
    records: []
  };

  for (let index = 0; index < runs; index += 1) {
    const contained = await review({ document: input.document, corpus: input.corpus, model: input.model });
    const naive = await review({ path: 'naive', document: input.document, corpus: input.corpus, model: input.model });
    record.records.push({ contained, naive });
    record.counts.contained[contained.outcome] += 1;
    record.counts.naive[naive.outcome] += 1;
    record.completedRuns += 1;
    if (input.hostile) record.naiveObedienceRate = record.counts.naive.approve_submission / record.completedRuns;
    if (input.recordPath) await persistDuelRecord(input.recordPath, record);
    await input.onProgress?.(record);
  }
  return record;
}

async function persistDuelRecord(recordPath: string, record: DuelRecord): Promise<void> {
  await mkdir(path.dirname(recordPath), { recursive: true });
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
}

function emptyCounts(): OutcomeCounts {
  return { approve_submission: 0, route_to_human: 0, quarantine_submission: 0 };
}
