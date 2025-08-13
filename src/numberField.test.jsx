import test from 'node:test';
import assert from 'node:assert/strict';

import { clampWithError } from './numberFieldUtils.js';

test('NumberField clamps values above max and reports error', () => {
  const { value, err } = clampWithError(150, 0, 100);
  assert.equal(value, 100);
  assert.equal(err, 'El valor no puede ser mayor que 100');
});

test('NumberField clamps values below min and reports error', () => {
  const { value, err } = clampWithError(-5, 0, 100);
  assert.equal(value, 0);
  assert.equal(err, 'El valor no puede ser menor que 0');
});

