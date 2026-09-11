#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const project = `faraday-check-${process.pid}`;
const environmentFile = path.join(mkdtempSync(path.join(tmpdir(), 'faraday-compose-')), '.env');
const responses = JSON.stringify([
  { topic: 'PAYMENT_TERMS' },
  { toolCalls: [{ name: 'route_to_human', arguments: { finding_ids: [], reason: 'Prueba.' } }] },
  ...Array.from({ length: 17 }, (_, index) => ({ topic: index === 10 ? 'PAYMENT_TERMS' : 'NONE' })),
  { found: true, days: 60, anchor: { start: 15, end: 17 } },
  { toolCalls: [{ name: 'route_to_human', arguments: { finding_ids: ['finding-1'], reason: 'Plazo excedido.' } }] }
]);
writeFileSync(environmentFile, `FARADAY_SCRIPTED_MODEL=1\nFARADAY_SCRIPTED_RESPONSES='${responses}'\nFARADAY_PORT=0\n`);

function compose(args, options = {}) {
  return execFileSync('docker', ['compose', '--project-name', project, '--env-file', environmentFile, ...args], {
    encoding: 'utf8',
    stdio: options.quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
}

try {
  compose(['up', '--build', '--detach']);
  const inferenceId = compose(['ps', '-q', 'inference'], { quiet: true }).trim();
  if (!inferenceId) throw new Error('Inference container did not start.');
  const networkMode = execFileSync('docker', ['inspect', '--format', '{{.HostConfig.NetworkMode}}', inferenceId], { encoding: 'utf8' }).trim();
  if (networkMode !== 'none') throw new Error(`Inference network mode was ${networkMode}, not none.`);

  const proof = JSON.parse(compose(['exec', '-T', 'web', 'cat', '/work/jobs/containment-proof.json'], { quiet: true }));
  if (!proof.dns.failed || !proof.http.failed || !proof.grammarPlusTools.rejected || proof.grammarPlusTools.code !== 50010) {
    throw new Error(`Containment proof was incomplete: ${JSON.stringify(proof)}`);
  }

  compose(['exec', '-T', 'web', 'sh', '-c', 'command -v pdftotext && command -v chromium']);
  compose(['exec', '-T', 'web', 'node', '--import', 'tsx', 'scripts/container-client-check.ts']);
  compose(['exec', '-T', 'web', 'npm', 'run', 'review', '--', 'documents/procurement/propuesta-hostil.pdf', 'propuesta', '/work/jobs/review']);
  const record = JSON.parse(compose(['exec', '-T', 'web', 'cat', '/work/jobs/review/review-record.json'], { quiet: true }));
  if (record.claims?.[0]?.days !== 60 || record.outcome !== 'route_to_human') {
    throw new Error(`Review command did not complete through the file drop: ${JSON.stringify(record)}`);
  }
  console.log('Containment check passed: no network, startup proofs, file-drop round trip and review command.');
} finally {
  try {
    compose(['down', '--volumes'], { quiet: true });
  } finally {
    rmSync(path.dirname(environmentFile), { recursive: true, force: true });
  }
}
