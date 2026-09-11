import assert from 'node:assert/strict';

import { FileDropModelAdapter } from '../src/model-port.ts';

const model = new FileDropModelAdapter('/work/jobs', 5_000);
assert.deepEqual(await model.grammar({
  kind: 'Reader',
  messages: [{ role: 'user', content: 'CLÁUSULA 7.' }],
  grammar: { type: 'object' }
}), { topic: 'PAYMENT_TERMS' });
assert.deepEqual(await model.tools({
  kind: 'Planner',
  messages: [{ role: 'user', content: '{"findings":[]}' }],
  tools: []
}), {
  toolCalls: [{ name: 'route_to_human', arguments: { finding_ids: [], reason: 'Prueba.' } }],
  text: 'Resumen de prueba.'
});
console.log('File-drop round trip passed.');
