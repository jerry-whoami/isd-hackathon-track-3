import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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

test('the selected workflow tab highlight stays inside the tab', async () => {
  const css = await readFile('src/web.css', 'utf8');
  const activeHighlight = css.match(/\.steps a\.active::after\s*\{[^}]*\}/s)?.[0] ?? '';
  assert.doesNotMatch(activeHighlight, /bottom:\s*-/);
});

test('the expediente explains failed checks and action reasons in plain language', async () => {
  const source = await readFile('src/web.ts', 'utf8');
  assert.match(source, /Qué falló/);
  assert.match(source, /Resultado del Reader/);
  assert.match(source, /Regla aplicada/);
  assert.match(source, /Motivo de la decisión/);
  assert.match(source, /Ver registro técnico/);
});

test('the expediente remains openable and exposes policy documents', async () => {
  const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'faraday-web-'));
  const server = spawn(process.execPath, ['--import', 'tsx', 'src/web.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), FARADAY_UPLOADS_DIR: uploadDirectory },
    stdio: 'ignore'
  });

  try {
    await waitForServer();

    const sessionResponse = await fetch(`${baseUrl}/`);
    const cookie = sessionResponse.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);
    const upload = new FormData();
    upload.set('type', 'propuesta');
    upload.set('document', new Blob([Uint8Array.from(await readFile('documents/procurement/propuesta-limpia.pdf'))], { type: 'application/pdf' }), 'expediente-cliente.pdf');
    const uploadResponse = await fetch(`${baseUrl}/uploads`, {
      method: 'POST',
      headers: { cookie },
      body: upload,
      redirect: 'manual'
    });
    assert.equal(uploadResponse.status, 303);
    const uploadedLocation = uploadResponse.headers.get('location');
    assert.ok(uploadedLocation);
    const uploadedId = new URL(uploadedLocation, baseUrl).searchParams.get('doc');
    assert.ok(uploadedId);

    const inbox = await (await fetch(`${baseUrl}/`, { headers: { cookie } })).text();
    assert.match(inbox, /expediente-cliente/);
    assert.match(inbox, new RegExp(`action="/uploads/${uploadedId}/delete"`));
    assert.doesNotMatch(inbox, /action="\/uploads\/propuesta-hostil\/delete"/);
    const uploadedPdf = await fetch(`${baseUrl}/uploads/${uploadedId}.pdf`, { headers: { cookie } });
    assert.equal(uploadedPdf.status, 200);
    assert.equal(uploadedPdf.headers.get('content-type'), 'application/pdf');
    const uploadedPage = await (await fetch(new URL(uploadedLocation, baseUrl), { headers: { cookie } })).text();
    assert.match(uploadedPage, new RegExp(`iframe src="/uploads/${uploadedId}\\.pdf"`));
    assert.match(uploadedPage, /treinta \(30\) días/);

    const otherSessionResponse = await fetch(`${baseUrl}/`);
    const otherCookie = otherSessionResponse.headers.get('set-cookie')?.split(';')[0];
    assert.ok(otherCookie);
    assert.doesNotMatch(await otherSessionResponse.text(), /expediente-cliente/);
    assert.equal((await fetch(`${baseUrl}/uploads/${uploadedId}.pdf`, { headers: { cookie: otherCookie } })).status, 404);

    const oversizedUpload = new FormData();
    oversizedUpload.set('type', 'propuesta');
    oversizedUpload.set('document', new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'application/pdf' }), 'demasiado-grande.pdf');
    const oversizedResponse = await fetch(`${baseUrl}/uploads`, { method: 'POST', headers: { cookie }, body: oversizedUpload });
    assert.equal(oversizedResponse.status, 400);
    assert.match(await oversizedResponse.text(), /10 MB/);

    const invalidUpload = new FormData();
    invalidUpload.set('type', 'propuesta');
    invalidUpload.set('document', new Blob(['not a PDF'], { type: 'text/plain' }), 'notas.txt');
    const invalidResponse = await fetch(`${baseUrl}/uploads`, { method: 'POST', headers: { cookie }, body: invalidUpload });
    assert.equal(invalidResponse.status, 400);
    assert.match(await invalidResponse.text(), /Solo se permiten archivos PDF/);

    const protectedDelete = await fetch(`${baseUrl}/uploads/propuesta-hostil/delete`, {
      method: 'POST',
      headers: { cookie },
      redirect: 'manual'
    });
    assert.equal(protectedDelete.status, 404);

    const deleteResponse = await fetch(`${baseUrl}/uploads/${uploadedId}/delete`, {
      method: 'POST',
      headers: { cookie },
      redirect: 'manual'
    });
    assert.equal(deleteResponse.status, 303);
    const afterDelete = await (await fetch(`${baseUrl}/`, { headers: { cookie } })).text();
    assert.doesNotMatch(afterDelete, /expediente-cliente/);
    assert.match(afterDelete, /Propuesta hostil/);
    assert.equal((await fetch(`${baseUrl}/uploads/${uploadedId}.pdf`, { headers: { cookie } })).status, 404);

    const page = await (await fetch(`${baseUrl}/?doc=propuesta-hostil&step=expediente`, { headers: { cookie } })).text();
    assert.match(page, /class="skip-link" href="#workspace"/);
    assert.match(page, /<main id="workspace" tabindex="-1">/);
    assert.match(page, /class="stepbar"/);
    assert.match(page, /class="pager"/);
    assert.ok(page.indexOf('class="pager"') < page.indexOf('class="review-slot"'));
    assert.match(page, /aria-current="step"/);
    assert.match(page, /aria-busy="true"/);
    assert.match(page, /hx-swap="outerHTML"/);
    assert.doesNotMatch(page, /unpkg\.com|fonts\.googleapis\.com/);

    await fetch(`${baseUrl}/review?doc=propuesta-hostil`);
    const completedReview = await (await fetch(`${baseUrl}/review?doc=propuesta-hostil`)).text();
    assert.match(completedReview, /^<section class="review-slot">/);
    assert.doesNotMatch(completedReview, /hx-trigger=/);
    assert.match(completedReview, /<details class="trace"><summary>Ver rastro<\/summary>/);
    assert.match(completedReview, /class="finding"[^>]+aria-controls="evidence-record"[^>]+aria-pressed="false"/);
    assert.match(completedReview, /data-evidence="span-1" tabindex="-1"/);
    assert.match(completedReview, /Documentos de política/);
    assert.match(completedReview, /class="policy-workspace"/);
    assert.match(completedReview, /class="policy-choice active"[^>]+aria-current="true"/);
    assert.match(completedReview, /Pliego de cargos/);
    assert.match(completedReview, /Manual de debida diligencia/);

    await fetch(`${baseUrl}/review?doc=propuesta-limpia`);
    const cleanReview = await (await fetch(`${baseUrl}/review?doc=propuesta-limpia`)).text();
    assert.match(cleanReview, /<strong>Aprobado<\/strong>/);
    assert.match(cleanReview, /No se emitieron hallazgos/);
    assert.match(cleanReview, /Comprobaciones que requieren atención/);
    assert.match(cleanReview, /Todas las comprobaciones requeridas fueron verificadas/);
    const cleanEvidence = cleanReview.match(/<section class="evidence"[\s\S]*?<\/section>/)?.[0] ?? '';
    assert.doesNotMatch(cleanEvidence, /<mark/);

    let cleanDuel = '';
    for (let attempt = 0; attempt < 20 && !cleanDuel.includes('duel-slot complete'); attempt += 1) {
      cleanDuel = await (await fetch(`${baseUrl}/duel?doc=propuesta-limpia&runs=1`)).text();
      if (!cleanDuel.includes('duel-slot complete')) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.match(cleanDuel, /class="duel-path naive"[\s\S]*?<dt>Aprobado<\/dt><dd>1<\/dd>/);
    assert.match(cleanDuel, /class="duel-path contained"[\s\S]*?<dt>Aprobado<\/dt><dd>1<\/dd>/);

    const policy = await (await fetch(`${baseUrl}/policy?policy=manual-dd`)).text();
    assert.match(policy, /POL-JUR-01/);
    assert.match(policy, /CONFIDENCIAL/);
    assert.match(policy, /Descargar fuente YAML/);

    const font = await fetch(`${baseUrl}/assets/fonts/OpenSansCondensed-Regular.ttf`);
    assert.equal(font.status, 200);
    assert.equal(font.headers.get('content-type'), 'font/ttf');

    const invalidStep = await (await fetch(`${baseUrl}/?step=unexpected`)).text();
    assert.match(invalidStep, /aria-current="step"[^>]*><span>1<\/span>Documento/);
  } finally {
    server.kill('SIGTERM');
    await rm(uploadDirectory, { recursive: true, force: true });
  }
});
