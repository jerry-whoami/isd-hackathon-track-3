import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3197;
const baseUrl = `http://127.0.0.1:${port}`;

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Faraday web server did not start.');
}

test('the expediente remains openable and exposes policy documents', async () => {
  const server = spawn(process.execPath, ['--import', 'tsx', 'src/web.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  });

  try {
    await waitForServer();

    const page = await (await fetch(`${baseUrl}/?doc=propuesta-hostil&step=expediente`)).text();
    assert.match(page, /class="stepbar"/);
    assert.match(page, /class="pager"/);
    assert.ok(page.indexOf('class="pager"') < page.indexOf('class="review-slot"'));
    assert.match(page, /hx-swap="outerHTML"/);

    await fetch(`${baseUrl}/review?doc=propuesta-hostil`);
    const completedReview = await (await fetch(`${baseUrl}/review?doc=propuesta-hostil`)).text();
    assert.match(completedReview, /^<section class="review-slot">/);
    assert.doesNotMatch(completedReview, /hx-trigger=/);
    assert.match(completedReview, /<details class="trace">/);
    assert.match(completedReview, /Documentos de política/);
    assert.match(completedReview, /Pliego de cargos/);
    assert.match(completedReview, /Manual de debida diligencia/);

    const policy = await (await fetch(`${baseUrl}/policy?policy=manual-dd`)).text();
    assert.match(policy, /POL-JUR-01/);
    assert.match(policy, /CONFIDENCIAL/);
    assert.match(policy, /Descargar fuente YAML/);
  } finally {
    server.kill('SIGTERM');
  }
});
