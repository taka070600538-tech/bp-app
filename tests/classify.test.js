import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBP, CATEGORIES } from '../js/classify.js';

test('正常血圧: 120未満かつ80未満', () => {
  assert.equal(classifyBP(119, 79).id, 'normal');
  assert.equal(classifyBP(100, 60).id, 'normal');
});

test('正常高値血圧: 収縮期120-129かつ拡張期80未満', () => {
  assert.equal(classifyBP(120, 79).id, 'normalHigh');
  assert.equal(classifyBP(129, 79).id, 'normalHigh');
});

test('高値血圧: 収縮期130-139または拡張期80-89', () => {
  assert.equal(classifyBP(130, 79).id, 'elevated');
  assert.equal(classifyBP(139, 89).id, 'elevated');
  assert.equal(classifyBP(120, 80).id, 'elevated'); // 拡張期だけで高値
});

test('I度高血圧: 収縮期140-159または拡張期90-99', () => {
  assert.equal(classifyBP(140, 80).id, 'grade1');
  assert.equal(classifyBP(159, 99).id, 'grade1');
  assert.equal(classifyBP(120, 95).id, 'grade1'); // 拡張期だけでI度
});

test('II/III度高血圧: 収縮期160以上または拡張期100以上', () => {
  assert.equal(classifyBP(160, 80).id, 'grade2plus');
  assert.equal(classifyBP(120, 100).id, 'grade2plus');
  assert.equal(classifyBP(180, 110).id, 'grade2plus');
});

test('収縮期と拡張期で分類が異なる場合は重い方を採用する', () => {
  assert.equal(classifyBP(119, 92).id, 'grade1');
  assert.equal(classifyBP(165, 60).id, 'grade2plus');
});

test('CATEGORIESは軽い順に5分類でラベルと色を持つ', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.id), ['normal', 'normalHigh', 'elevated', 'grade1', 'grade2plus']);
  for (const c of CATEGORIES) {
    assert.ok(c.label.length > 0);
    assert.match(c.color, /^#[0-9A-Fa-f]{6}$/);
  }
});
