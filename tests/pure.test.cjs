// Runs the pure block of config.html (between the BEGIN/END pure markers)
// so the tests check the code ncSender actually loads.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'config.html'), 'utf8');
const after = html.split('// BEGIN pure')[1];
const block = after.slice(after.indexOf('\n') + 1).split('// END pure')[0];
const { buildMacros, parseHashReport, parseGcState, offsetZParam } =
  new Function(block + '\nreturn { buildMacros, parseHashReport, parseGcState, offsetZParam };')();

const base = { blockMm: 15, feedMm: 100, travelMm: 30, retractMm: 5, wcs: 1, slot: 9, imperial: false };

test('offset Z parameters: G54 #5223, G55 #5243, G59.3 #5383', () => {
  assert.equal(offsetZParam(1), 5223);
  assert.equal(offsetZParam(2), 5243);
  assert.equal(offsetZParam(9), 5383);
  assert.equal(offsetZParam(7), 5343);
});

test('record macro probes, then stores trigger + offset - block - TLO in the slot', () => {
  const lines = buildMacros(base).record.body.split('\n');
  assert.deepEqual(lines.filter(l => !l.startsWith('(')), [
    'G21',
    'G54',
    'G91 G38.2 Z-30.000 F100.000',
    'G90',
    'G10 L2 P9 Z[#5063 + #5223 - 15.000 - #5403]',
    'G91 G0 Z5.000',
    'G90'
  ]);
});

test('set macro copies the slot into the work offset, adding nothing', () => {
  const lines = buildMacros(base).set.body.split('\n').filter(l => !l.startsWith('('));
  assert.deepEqual(lines, ['G21', 'G10 L2 P1 Z[#5383]']);
});

test('other work offset and slot', () => {
  const m = buildMacros(Object.assign({}, base, { wcs: 2, slot: 8 }));
  assert.match(m.record.body, /^G55$/m);
  assert.match(m.record.body, /G10 L2 P8 Z\[#5063 \+ #5243 - 15\.000 - #5403\]/);
  assert.match(m.set.body, /G10 L2 P2 Z\[#5363\]/);
  assert.equal(m.set.name, 'Macro Wiz: G55 Z0 on spoilboard');
});

test('imperial: values in mm, G20 restored at the end of both', () => {
  const m = buildMacros(Object.assign({}, base, { blockMm: 0.5 * 25.4, imperial: true }));
  assert.match(m.record.body, /- 12\.700 - #5403\]/);
  assert.match(m.record.body, /\nG20 \(back to inches\)$/);
  assert.match(m.set.body, /\nG20 \(back to inches\)$/);
  assert.match(m.set.body, /^G21$/m);
});

test('macro comments have no nested parentheses (grblHAL comment rules)', () => {
  const m = buildMacros(base);
  for (const line of (m.record.body + '\n' + m.set.body).split('\n')) {
    const opens = (line.match(/\(/g) || []).length;
    assert.ok(opens <= 1 || /^G20/.test(line) === false, line);
    assert.ok(!/\([^)]*\(/.test(line), 'nested: ' + line);
  }
});

test('$# report: offsets and TLO (four-axis and single-value forms)', () => {
  const r = parseHashReport(['[G54:0.000,0.000,-80.250]', '[G59.3:0.000,0.000,-95.125]', '[TLO:0.000,0.000,12.345,0.000]', '[PRB:1.000,2.000,-3.000:1]', 'ok']);
  assert.deepEqual(r.G54, [0, 0, -80.25]);
  assert.deepEqual(r['G59.3'], [0, 0, -95.125]);
  assert.equal(r.TLO, 12.345);
  assert.equal(parseHashReport(['[TLO:7.5]']).TLO, 7.5);
});

test('$G state: units, tool length offset on/off, active work offset', () => {
  assert.deepEqual(parseGcState(['[GC:G0 G54 G17 G21 G90 G94 G49 G98 G50 M5 M9 T0 F0 S0]', 'ok']),
    { imperial: false, tloActive: false, wcs: 'G54' });
  assert.deepEqual(parseGcState(['[GC:G0 G55 G17 G20 G90 G94 G43.1 M5 M9 T3 F0 S0]']),
    { imperial: true, tloActive: true, wcs: 'G55' });
  assert.equal(parseGcState(['ok']), null);
});
