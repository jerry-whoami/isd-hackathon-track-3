import assert from 'node:assert/strict';
import test from 'node:test';

import { liabilityClauseWindow, paragraphChunks, paymentClauseWindow } from '../src/ingest.ts';

test('extracts proposal clauses without depending on their final wording', () => {
  const text = [
    'CLÁUSULA 7. FORMA DE PAGO. El proponente acepta el pago dentro de los treinta (30) días calendario.',
    '',
    'CLÁUSULA 12. RESPONSABILIDAD. La responsabilidad será equivalente al cien por ciento (100%) del valor del contrato y no quedará limitada por debajo de dicho porcentaje.'
  ].join('\n');
  const chunks = paragraphChunks(text);

  assert.match(paymentClauseWindow(chunks[0]!)?.text ?? '', /treinta \(30\) días/);
  assert.match(liabilityClauseWindow(chunks[1]!)?.text ?? '', /cien por ciento \(100%\)/);
});
