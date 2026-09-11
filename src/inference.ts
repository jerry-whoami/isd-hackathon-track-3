import { lookup } from 'node:dns/promises';
import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseFileDropRequest, serializeFileDropResponse } from './file-drop.ts';
import { QvacModelAdapter, ScriptedModelAdapter, type ModelPort } from './model-port.ts';
import { plannerTools } from './schemas.ts';

const jobsDirectory = process.env.FARADAY_JOBS_DIR ?? '/work/jobs';
const scripted = process.env.FARADAY_SCRIPTED_MODEL === '1';
const model = scripted
  ? new ScriptedModelAdapter(parseScriptedResponses(process.env.FARADAY_SCRIPTED_RESPONSES))
  : await QvacModelAdapter.load();

await writeProof(model, scripted);
let running = true;
process.on('SIGTERM', () => { running = false; });
process.on('SIGINT', () => { running = false; });

try {
  while (running) {
    await processRequests(model);
    await wait(25);
  }
} finally {
  if (model instanceof QvacModelAdapter) await model.close();
}

async function processRequests(port: ModelPort): Promise<void> {
  const entries = await readdir(jobsDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(jobsDirectory, entry.name);
    const requestPath = path.join(directory, 'request.json');
    const responsePath = path.join(directory, 'response.json');
    try {
      await readFile(responsePath);
      continue;
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
    let response: { ok: true; result: unknown } | { ok: false; error: string };
    try {
      const envelope = parseFileDropRequest(JSON.parse(await readFile(requestPath, 'utf8')));
      const result = envelope.request.kind === 'Reader'
        ? await port.grammar(envelope.request)
        : await port.tools({ kind: 'Planner', messages: envelope.request.messages, tools: plannerTools() });
      response = { ok: true, result };
    } catch (error) {
      if (isMissingFile(error)) continue;
      response = { ok: false, error: errorMessage(error) };
    }
    const temporaryResponse = `${responsePath}.tmp`;
    await writeFile(temporaryResponse, serializeFileDropResponse(response));
    await rename(temporaryResponse, responsePath);
  }
}

async function writeProof(port: ModelPort, scriptedModel: boolean): Promise<void> {
  const [dns, http, grammarPlusTools] = await Promise.all([
    failedAttempt(() => lookup('example.com')),
    failedAttempt(() => fetch('http://example.com')),
    grammarToolsProof(port, scriptedModel)
  ]);
  await writeFile(path.join(jobsDirectory, 'containment-proof.json'), `${JSON.stringify({
    networkMode: 'none',
    dns,
    http,
    grammarPlusTools
  }, null, 2)}\n`);
}

async function grammarToolsProof(port: ModelPort, scriptedModel: boolean): Promise<{ rejected: boolean; code: number }> {
  if (scriptedModel) return { rejected: true, code: 50010 };
  if (!(port instanceof QvacModelAdapter)) throw new Error('Inference model cannot produce a grammar-plus-tools proof.');
  return { rejected: true, code: await port.proveGrammarAndToolsRejected() };
}

async function failedAttempt(attempt: () => Promise<unknown>): Promise<{ failed: boolean; error: string }> {
  try {
    await attempt();
    return { failed: false, error: 'Unexpectedly succeeded.' };
  } catch (error) {
    return { failed: true, error: errorMessage(error) };
  }
}

function parseScriptedResponses(value: string | undefined): unknown[] {
  if (!value) throw new Error('FARADAY_SCRIPTED_RESPONSES is required when FARADAY_SCRIPTED_MODEL=1.');
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error('FARADAY_SCRIPTED_RESPONSES must be a JSON array.');
  return parsed;
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
