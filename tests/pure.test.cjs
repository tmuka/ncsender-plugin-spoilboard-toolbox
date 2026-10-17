// Runs the pure block of config.html (between the BEGIN/END pure markers)
// so the tests check the code ncSender actually loads.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'config.html'), 'utf8');
const after = html.split('// BEGIN pure')[1];
const block = after.slice(after.indexOf('\n') + 1).split('// END pure')[0];
const { buildMacros, parseHashReport, parseGcState, offsetZParam, storeThicknessCommand } =
  new Function(block + '\nreturn { buildMacros, parseHashReport, parseGcState, offsetZParam, storeThicknessCommand };')();

const base = { blockMm: 15, feedMm: 100, travelMm: 30, retractMm: 5, wcs: 1, slot: 9, backup: 8, thick: 7, extras: {}, imperial: false };
const allExtras = { midX: true, midY: true, midXY: true, center: true, fixture: true };
const code = (body) => body.split('\n').filter(l => !l.startsWith('('));

// A small stand-in for grblHAL running the macros' G10 L2 lines: work
// offset Z values in #5203 + 20 * P, expressions with [ ], ABS, GT, NE,
// AND, OR (comparisons give 1 or 0), as in grblHAL's ngc_expr.c.
function evalExpr(expr, params) {
  let js = expr
      .replace(/#<(_\w+)>/g, (_, n) => '(' + (params[n] || 0) + ')')
      .replace(/#(\d+)/g, (_, n) => '(' + (params[n] || 0) + ')')
      .replace(/ABS\[/g, 'Math.abs(')
      .replace(/\[/g, '(').replace(/\]/g, ')')
      .replace(/ GT /g, ' > ').replace(/ NE /g, ' != ').replace(/ AND /g, ' && ').replace(/ OR /g, ' || ');
  // Comparisons and AND evaluate to 1 or 0 in grblHAL.
  js = js.replace(/\(([^()]*(?:>|!=|&&|\|\|)[^()]*)\)/g, '(+($1))');
  let value = Function('return ' + js)();
  if (typeof value === 'boolean') value = +value;
  return Math.round(value * 1e6) / 1e6;
}
// Runs G10 L2 Pn Z[...] (stored offsets), G0 X[...] Y[...] (moves, into
// params._x/_y) and G10 L20 P0 X[...] Y[...] (records the asked-for values).
function run(body, params) {
  for (const line of code(body)) {
    let m = /^G10 L2 P(\d) Z\[(.*)\]$/.exec(line);
    if (m) { params[offsetZParam(+m[1])] = evalExpr(m[2], params); continue; }
    m = /^G10 L2 P(\d) X\[(.*)\] Y\[(.*)\]$/.exec(line);
    if (m) {
      const vx = evalExpr(m[2], params), vy = evalExpr(m[3], params);
      params[offsetZParam(+m[1]) - 2] = vx;
      params[offsetZParam(+m[1]) - 1] = vy;
      continue;
    }
    m = /^(?:G90 )?(G0|G10 L20 P0) (.*)$/.exec(line);
    if (!m) continue;
    for (const [, axis, expr] of m[2].matchAll(/([XY])\[([^\]]*)\]/g)) {
      params[(m[1] === 'G0' ? '_' : 'L20_') + axis.toLowerCase()] = evalExpr(expr, params);
    }
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

test('names start MW:, descriptions are the first comment line after its prefix', () => {
  const m = buildMacros(Object.assign({}, base, { extras: allExtras }));
  assert.equal(m.record.name, 'MW: Record spoilboard height');
  assert.equal(m.record.description, 'record spoilboard height');
  assert.equal(m.restore.description, 'put back the Z0 saved in G59.2 Z');
  assert.equal(m.midX.description, 'move halfway to X0, at this Z');
  for (const k of Object.keys(m)) {
    assert.ok(m[k].name.startsWith('MW: '), k);
    assert.ok(m[k].description && !/Macro Wiz|[()]/.test(m[k].description), k + ': ' + m[k].description);
  }
});

test('macros: the core five always, extras only when ticked', () => {
  assert.deepEqual(Object.keys(buildMacros(base)), ['record', 'measure', 'set', 'stock', 'restore']);
  assert.deepEqual(Object.keys(buildMacros(Object.assign({}, base, { extras: allExtras }))),
    ['record', 'measure', 'set', 'stock', 'restore', 'midX', 'midY', 'midXY', 'saveXY', 'restoreXY', 'center']);
  assert.deepEqual(Object.keys(buildMacros(Object.assign({}, base, { extras: { midX: true } }))).slice(5), ['midX']);
});

test('measure stores stock top minus the spoilboard in the thickness slot', () => {
  const m = buildMacros(base);
  assert.match(m.measure.body, /^G10 L2 P7 Z\[#5063 \+ #5223 - 15\.000 - #5403 - #5383\]$/m);
  // G54 Z -77.5; tool with TLO 12; block (15) on 18 mm stock on a spoilboard at -95
  // (zero-length tool): the tip touches the block at machine -95 + 18 + 15 + 12 = -50,
  // which is -50 - (-77.5) = 27.5 in G54.
  const p = { 5223: -77.5, 5383: -95, 5403: 12, 5063: 27.5 };
  run(m.measure.body, p);
  assert.equal(p[5343], 18);
});

test('switching: probed Z0 is saved once, survives repeats, and comes back', () => {
  const m = buildMacros(base);
  // Spoilboard recorded at -95, 18 mm stored, probed top-of-stock Z0 at -77.5.
  const p = { 5383: -95, 5343: 18, 5223: -77.5, 5363: 0 };
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

test('midpoint moves and center origin use the current work position', () => {
  const m = buildMacros(Object.assign({}, base, { extras: allExtras }));
  let p = run(m.midX.body, { _x: 120, _y: 80 });
  assert.deepEqual([p._x, p._y], [60, 80]);
  p = run(m.midY.body, { _x: 120, _y: 80 });
  assert.deepEqual([p._x, p._y], [120, 40]);
  p = run(m.midXY.body, { _x: -30, _y: 50 });
  assert.deepEqual([p._x, p._y], [-15, 25]);
  // L20: the current spot reads as half, so X0 Y0 lands halfway.
  p = run(m.center.body, { _x: 120, _y: 80 });
  assert.deepEqual([p.L20_x, p.L20_y], [60, 40]);
  // No unit switching: these work in whatever units the controller is in.
  assert.ok(!/G2[01]/.test(m.midX.body + m.center.body));
});

test('save and restore X/Y: kept in the saved-Z0 slot, Z untouched, nothing saved = no change', () => {
  const m = buildMacros(Object.assign({}, base, { extras: { fixture: true } }));
  assert.match(m.saveXY.body, /^G10 L2 P8 X\[#5221\] Y\[#5222\]$/m);
  const p = { 5221: 100, 5222: 50, 5223: -80, 5361: 0, 5362: 0, 5363: -77.5 };
  run(m.restoreXY.body, p);
  assert.deepEqual([p[5221], p[5222]], [100, 50], 'nothing saved yet');
  run(m.saveXY.body, p);
  assert.deepEqual([p[5361], p[5362], p[5363]], [100, 50, -77.5], 'saved, saved Z0 untouched');
  p[5221] = 300; p[5222] = 200;
  run(m.restoreXY.body, p);
  assert.deepEqual([p[5221], p[5222], p[5223]], [100, 50, -80], 'restored, Z untouched');
});

test('typed thickness is stored with one G10 line', () => {
  assert.equal(storeThicknessCommand(7, 18), 'G10 L2 P7 Z18.000');
});

test('restore with nothing saved leaves Z0 alone', () => {
  const p = { 5383: -95, 5223: -70, 5363: 0 };
  run(buildMacros(base).restore.body, p);
  assert.equal(p[5223], -70);
});

test('other work offset and slots', () => {
  const m = buildMacros(Object.assign({}, base, { wcs: 2, slot: 8, backup: 7, thick: 9 }));
  assert.match(m.record.body, /^G55$/m);
  assert.match(m.record.body, /G10 L2 P8 Z\[#5063 \+ #5243 - 15\.000 - #5403\]/);
  assert.match(m.set.body, /^G10 L2 P2 Z\[#5363\]$/m);
  assert.match(m.set.body, /^G10 L2 P7 Z\[#5343 \+ \[#5243 - #5343\]/m);
  assert.equal(m.set.name, 'MW: G55 Z0 on spoilboard');
  const p = { 5363: -90, 5243: -70, 5343: 0 };
  run(m.set.body, p);
  assert.deepEqual([p[5243], p[5343]], [-90, -70]);
});

test('imperial: values in mm, G21 first and G20 last in every Z macro', () => {
  const m = buildMacros(Object.assign({}, base, { blockMm: 0.5 * 25.4, imperial: true, extras: allExtras }));
  assert.match(m.record.body, /- 12\.700 - #5403\]/);
  for (const k of ['record', 'measure', 'set', 'stock', 'restore']) {
    const c = code(m[k].body);
    assert.ok(c.includes('G21'), k);
    assert.equal(c[c.length - 1], 'G20 (back to inches)', k);
  }
});

test('macro lines: no nested comments, and short enough for grblHAL', () => {
  const m = buildMacros(Object.assign({}, base, { extras: allExtras }));
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
