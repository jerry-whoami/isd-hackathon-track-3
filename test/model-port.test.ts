import assert from 'node:assert/strict';
import test from 'node:test';

import { qvacModelConfig } from '../src/model-port.ts';

test('offloads all model layers when GPU inference is requested', () => {
  const config = qvacModelConfig('gpu');

  assert.equal(config.device, 'gpu');
  assert.equal(config.gpu_layers, 99);
});

test('does not request GPU layer offload for CPU inference', () => {
  const config = qvacModelConfig('cpu');

  assert.equal(config.device, 'cpu');
  assert.equal(config.gpu_layers, undefined);
});
