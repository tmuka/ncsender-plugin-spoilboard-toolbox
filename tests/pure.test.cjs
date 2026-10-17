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

const base = { blockMm: 15, feedMm: 100, travelMm: 30, retractMm: 5, stockMm: 0, wcs: 1, slot: 9, backup: 8, imperial: false };
const code = (body) => body.split('\n').filter(l => !l.startsWith('('));

// A small stand-in for grblHAL running the macros' G10 L2 lines: work
// offset Z values in #5203 + 20 * P, expressions with [ ], ABS, GT, NE,
// AND (comparisons give 1 or 0), as in grblHAL's ngc_expr.c.
function run(body, params) {
  for (const line of code(body)) {
    const m = /^G10 L2 P(\d) Z\[(.*)\]$/.exec(line);
    if (!m) continue;
    let js = m[2]
      .replace(/#(\d+)/g, (_, n) => '(' + (params[n] || 0) + ')')
      .replace(/ABS\[/g, 'Math.abs(')
      .replace(/\[/g, '(').replace(/\]/g, ')')
      .replace(/ GT /g, ' > ').replace(/ NE /g, ' != ').replace(/ AND /g, ' && ');
    // Comparisons and AND evaluate to 1 or 0 in grblHAL.
    js = js.replace(/\(([^()]*(?:>|!=|&&)[^()]*)\)/g, '(+($1))');
    let value = Function('return ' + js)();
    if (typeof value === 'boolean') value = +value;
    params[offsetZParam(+m[1])] = Math.round(value * 1e6) / 1e6;
  }
  return params;
}

test('offset Z parameters: G54 #5223, G55 #5243, G59.2 #5363, G59.3 #5383', () => {
  assert.equal(offsetZParam(1), 5223);
  assert.equal(offsetZParam(2), 5243);
  assert.equal(offsetZParam(8), 5363);
  assert.equal(offsetZParam(9), 5383);
});

test('record macro probes, then stores trigger + offset - block - TLO in the slot', () => {
  assert.deepEqual(code(buildMacros(base).record.body), [
    'G21',
    'G54',
    'G91 G38.2 Z-30.000 F100.000',
    'G90',
    'G10 L2 P9 Z[#5063 + #5223 - 15.000 - #5403]',
    'G91 G0 Z5.000',
    'G90'
  ]);
});

test('no stock thickness: no stock-top macro; with one, it is made', () => {
  assert.deepEqual(Object.keys(buildMacros(base)), ['record', 'set', 'restore']);
  const m = buildMacros(Object.assign({}, base, { stockMm: 18 }));
  assert.deepEqual(Object.keys(m), ['record', 'set', 'stock', 'restore']);
  assert.equal(m.stock.name, 'Macro Wiz: G54 Z0 on stock top');
  assert.match(m.stock.body, /G10 L2 P1 Z\[#5383 \+ 18\.000\]$/m);
});

test('switching: probed Z0 is saved once, survives repeats, and comes back', () => {
  const m = buildMacros(Object.assign({}, base, { stockMm: 18 }));
  // Spoilboard recorded at -95, probed top-of-stock Z0 at -77.5.
  const p = { 5383: -95, 5223: -77.5, 5363: 0 };
  run(m.set.body, p);
  assert.equal(p[5223], -95, 'Z0 on the spoilboard');
  assert.equal(p[5363], -77.5, 'probed Z0 saved');
  run(m.set.body, p);
  assert.equal(p[5363], -77.5, 'running it again keeps the saved Z0');
  run(m.stock.body, p);
  assert.equal(p[5223], -77, 'Z0 on 18 mm stock');
  assert.equal(p[5363], -77.5, 'stock-top macro keeps the saved Z0 too');
  run(m.restore.body, p);
  assert.equal(p[5223], -77.5, 'back to the probed Z0');
  // A new probed Z0 replaces the saved one the next time.
  p[5223] = -60;
  run(m.set.body, p);
  assert.equal(p[5363], -60);
});

test('restore with nothing saved leaves Z0 alone', () => {
  const p = { 5383: -95, 5223: -70, 5363: 0 };
  run(buildMacros(base).restore.body, p);
  assert.equal(p[5223], -70);
});

test('other work offset and slots', () => {
  const m = buildMacros(Object.assign({}, base, { wcs: 2, slot: 8, backup: 7 }));
  assert.match(m.record.body, /^G55$/m);
  assert.match(m.record.body, /G10 L2 P8 Z\[#5063 \+ #5243 - 15\.000 - #5403\]/);
  assert.match(m.set.body, /^G10 L2 P2 Z\[#5363\]$/m);
  assert.match(m.set.body, /^G10 L2 P7 Z\[#5343 \+ \[#5243 - #5343\]/m);
  assert.equal(m.set.name, 'Macro Wiz: G55 Z0 on spoilboard');
  const p = { 5363: -90, 5243: -70, 5343: 0 };
  run(m.set.body, p);
  assert.deepEqual([p[5243], p[5343]], [-90, -70]);
});

test('imperial: values in mm, G21 first and G20 last in every macro', () => {
  const m = buildMacros(Object.assign({}, base, { blockMm: 0.5 * 25.4, stockMm: 0.75 * 25.4, imperial: true }));
  assert.match(m.record.body, /- 12\.700 - #5403\]/);
  assert.match(m.stock.body, /\+ 19\.050\]/);
  for (const k of Object.keys(m)) {
    const c = code(m[k].body);
    assert.ok(c.includes('G21'), k);
    assert.equal(c[c.length - 1], 'G20 (back to inches)', k);
  }
});

test('macro lines: no nested comments, and short enough for grblHAL', () => {
  const m = buildMacros(Object.assign({}, base, { stockMm: 18 }));
  for (const k of Object.keys(m)) {
    for (const line of m[k].body.split('\n')) {
      assert.ok(!/\([^)]*\(/.test(line), 'nested: ' + line);
      assert.ok(line.length < 200, 'long: ' + line);
    }
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
