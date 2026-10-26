// Runs the pure block of config.html (between the BEGIN/END pure markers)
// so the tests check the code ncSender actually loads.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'config.html'), 'utf8');
const after = html.split('// BEGIN pure')[1];
const block = after.slice(after.indexOf('\n') + 1).split('// END pure')[0];
const { buildMacros, parseHashReport, parseGcState, offsetZParam, storeThicknessCommand, holeGrid, travelDirs, insetFromPosition, holeCommands, holeGotoCommands, holeOriginOffset, nearestHole, parseUnitValue } =
  new Function(block + '\nreturn { buildMacros, parseHashReport, parseGcState, offsetZParam, storeThicknessCommand, holeGrid, travelDirs, insetFromPosition, holeCommands, holeGotoCommands, holeOriginOffset, nearestHole, parseUnitValue };')();

const base = { blockMm: 15, feedMm: 100, travelMm: 30, retractMm: 5, wcs: 1, slot: 9, backup: 8, thick: 7, extras: {}, imperial: false };
const allExtras = { midX: true, midY: true, midXY: true, center: true, fixture: true };
const code = (body) => body.split('\n').filter(l => !l.startsWith('(')).map(l => l.replace(/\s*\([^)]*\)\s*$/, ''));
// A homed machine with a tool length offset active, as the macros need.
const ready = { _homed_state: 1, _tool_offset: 1 };

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
  // grblHAL rejects a division by zero (error 72).
  if (!isFinite(value)) throw new Error('error:72');
  return Math.round(value * 1e6) / 1e6;
}
// Runs G10 L2 Pn Z[...] (stored offsets), G0 X[...] Y[...] (moves, into
// params._x/_y), G10 L20 P0 X[...] Y[...] (records the asked-for values) and
// #n=[...] lines. Like ncSender, it stops at the first rejected line and
// notes it in params._error.
function run(body, params) {
  for (const line of code(body)) {
    try { step(line, params); } catch (e) { params._error = line; break; }
  }
  return params;
}
function step(line, params) {
  {
    let m = /^#(\d+)=\[(.*)\]$/.exec(line);
    if (m) { params[m[1]] = evalExpr(m[2], params); return; }
    m = /^G10 L2 P(\d) Z\[(.*)\]$/.exec(line);
    if (m) { params[offsetZParam(+m[1])] = evalExpr(m[2], params); return; }
    m = /^G10 L2 P(\d) X\[(.*)\] Y\[(.*)\]$/.exec(line);
    if (m) {
      const vx = evalExpr(m[2], params), vy = evalExpr(m[3], params);
      params[offsetZParam(+m[1]) - 2] = vx;
      params[offsetZParam(+m[1]) - 1] = vy;
      return;
    }
    m = /^(?:G90 )?(G0|G10 L20 P0) (.*)$/.exec(line);
    if (!m) return;
    for (const [, axis, expr] of m[2].matchAll(/([XY])\[([^\]]*)\]/g)) {
      params[(m[1] === 'G0' ? '_' : 'L20_') + axis.toLowerCase()] = evalExpr(expr, params);
    }
  }
}

test('offset Z parameters: G54 #5223, G55 #5243, G59.2 #5363, G59.3 #5383', () => {
  assert.equal(offsetZParam(1), 5223);
  assert.equal(offsetZParam(2), 5243);
  assert.equal(offsetZParam(8), 5363);
  assert.equal(offsetZParam(9), 5383);
});

test('record macro probes, then stores trigger + offset - block - TLO in the slot', () => {
  assert.deepEqual(code(buildMacros(base).record.body), [
    '#1=[1 / #<_homed_state>]',
    '#1=[1 / #<_tool_offset>]',
    'G21',
    'G54',
    'G91 G38.2 Z-30.000 F100.000',
    'G90',
    'G10 L2 P9 Z[[#5063 + #5223 - 15.000 - #5403] / [#<_homed_state> AND #<_tool_offset>]]',
    'G91 G0 Z5.000',
    'G90'
  ]);
  // The stop lines say why in their comments.
  assert.match(buildMacros(base).record.body, /^#1=\[1 \/ #<_homed_state>\] \(ZS stop: home the machine first\)$/m);
});

test('names start ZS:, descriptions are the first comment line after its prefix', () => {
  const m = buildMacros(Object.assign({}, base, { extras: allExtras }));
  assert.equal(m.record.name, 'ZS: Record spoilboard height');
  assert.equal(m.record.description, 'record spoilboard height');
  assert.equal(m.restore.description, 'put back the Z0 saved in G59.2 Z');
  assert.equal(m.midX.description, 'lift to Safe Z, then move halfway to X0');
  assert.equal(m.center.name, 'ZS: Set XY0 to Midpoint');
  assert.equal(m.center.description, 'set X0 Y0 halfway to here, no move');
  assert.deepEqual(m.center.aliases, ['Center X0 Y0 here']);
  for (const k of Object.keys(m)) {
    assert.ok(m[k].name.startsWith('ZS: '), k);
    assert.ok(m[k].description && !/ZS|MW|Macro Wiz|[()]/.test(m[k].description), k + ': ' + m[k].description);
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
  assert.match(m.measure.body, /^G10 L2 P7 Z\[\[#5063 \+ #5223 - 15\.000 - #5403 - #5383\] \/ \[#<_homed_state> AND #<_tool_offset> AND \[#5383 NE 0\]\]\]$/m);
  // G54 Z -77.5; tool with TLO 12; block (15) on 18 mm stock on a spoilboard at -95
  // (zero-length tool): the tip touches the block at machine -95 + 18 + 15 + 12 = -50,
  // which is -50 - (-77.5) = 27.5 in G54.
  const p = Object.assign({ 5223: -77.5, 5383: -95, 5403: 12, 5063: 27.5 }, ready);
  run(m.measure.body, p);
  assert.equal(p._error, undefined);
  assert.equal(p[5343], 18);
});

test('switching: probed Z0 is saved once, survives repeats, and comes back', () => {
  const m = buildMacros(base);
  // Spoilboard recorded at -95, 18 mm stored, probed top-of-stock Z0 at -77.5.
  const p = Object.assign({ 5383: -95, 5343: 18, 5223: -77.5, 5363: 0 }, ready);
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
  let p = run(m.midX.body, Object.assign({ _x: 120, _y: 80 }, ready));
  assert.deepEqual([p._x, p._y], [60, 80]);
  p = run(m.midY.body, Object.assign({ _x: 120, _y: 80 }, ready));
  assert.deepEqual([p._x, p._y], [120, 40]);
  p = run(m.midXY.body, Object.assign({ _x: -30, _y: 50 }, ready));
  assert.deepEqual([p._x, p._y], [-15, 25]);
  // L20: the current spot reads as half, so X0 Y0 lands halfway.
  p = run(m.center.body, { _x: 120, _y: 80 });
  assert.deepEqual([p.L20_x, p.L20_y], [60, 40]);
  // Every midpoint move needs a homed machine, then lifts to Safe Z first,
  // in mm; center doesn't move.
  for (const k of ['midX', 'midY', 'midXY']) {
    const c = code(m[k].body);
    assert.deepEqual(c.slice(0, 3), ['#1=[1 / #<_homed_state>]', 'G21', 'G53 G0 Z0'], k);
    assert.match(c[3], /^G90 G0 /, k);
    const unhomed = run(m[k].body, { _x: 120, _y: 80, _tool_offset: 1 });
    assert.deepEqual([unhomed._x, unhomed._y, unhomed._error], [120, 80, '#1=[1 / #<_homed_state>]'], k + ' stops unhomed');
  }
  assert.ok(!/G0|G53/.test(m.center.body));
  const withSafe = buildMacros(Object.assign({}, base, { extras: allExtras, safeZMm: -5, imperial: true }));
  assert.deepEqual(code(withSafe.midXY.body), ['#1=[1 / #<_homed_state>]', 'G21', 'G53 G0 Z-5.000', 'G90 G0 X[#<_x> / 2] Y[#<_y> / 2]', 'G20']);
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
  assert.match(m.record.body, /G10 L2 P8 Z\[\[#5063 \+ #5243 - 15\.000 - #5403\]/);
  assert.match(m.set.body, /^G10 L2 P2 Z\[#5363 \/ \[#<_homed_state> AND #<_tool_offset> AND \[#5363 NE 0\]\]\]$/m);
  assert.match(m.set.body, /^G10 L2 P7 Z\[#5343 \+ \[#5243 - #5343\]/m);
  assert.equal(m.set.name, 'ZS: G55 Z0 on spoilboard');
  const p = Object.assign({ 5363: -90, 5243: -70, 5343: 0 }, ready);
  run(m.set.body, p);
  assert.deepEqual([p[5243], p[5343]], [-90, -70]);
});

test('imperial: values in mm, G21 first and G20 last in every Z macro', () => {
  const m = buildMacros(Object.assign({}, base, { blockMm: 0.5 * 25.4, imperial: true, extras: allExtras }));
  assert.match(m.record.body, /- 12\.700 - #5403\]/);
  for (const k of ['record', 'measure', 'set', 'stock', 'restore']) {
    const c = code(m[k].body);
    assert.ok(c.includes('G21'), k);
    assert.equal(c[c.length - 1], 'G20', k);
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

test('guards: nothing changes unless homed, an offset is active and the values exist', () => {
  const m = buildMacros(base);
  const start = { 5223: -77.5, 5383: -95, 5343: 18, 5363: 0, 5403: 12, 5063: 27.5 };
  const cases = [
    ['not homed', { _homed_state: 0, _tool_offset: 1 }, 'home the machine first'],
    ['no tool length offset', { _homed_state: 1, _tool_offset: 0 }, 'no tool length offset active']
  ];
  for (const k of ['record', 'measure', 'set', 'stock']) {
    for (const [what, state, why] of cases) {
      const p = run(m[k].body, Object.assign({}, start, state));
      assert.ok(p._error, k + ' stops when ' + what);
      assert.ok(m[k].body.includes(p._error + ' (ZS stop: ' + why + ')'), k + ': says why');
      assert.deepEqual([p[5223], p[5383], p[5343], p[5363]], [-77.5, -95, 18, 0], k + ' changes nothing when ' + what);
    }
  }
  // No spoilboard height recorded yet.
  for (const k of ['measure', 'set', 'stock']) {
    const p = run(m[k].body, Object.assign({}, start, ready, { 5383: 0 }));
    assert.ok(m[k].body.includes(p._error + ' (ZS stop: record the spoilboard height first)'), k);
    assert.deepEqual([p[5223], p[5343], p[5363]], [-77.5, 18, 0], k + ' changes nothing');
  }
  // No stock thickness stored.
  const p = run(m.stock.body, Object.assign({}, start, ready, { 5343: 0 }));
  assert.ok(m.stock.body.includes(p._error + ' (ZS stop: store a stock thickness first)'));
  assert.deepEqual([p[5223], p[5363]], [-77.5, 0]);
  // Back to saved needs none of it.
  assert.ok(!/ZS stop/.test(m.restore.body));
});

test('guards: the stored value itself is guarded too, if a stop line were skipped', () => {
  const m = buildMacros(base);
  for (const k of ['record', 'measure', 'set', 'stock']) {
    const g10 = code(m[k].body).filter(l => /^G10 L2 P(9|7|1) Z\[\[?#(5063|5383)/.test(l)).pop();
    assert.ok(g10, k);
    const p = Object.assign({ 5223: -77.5, 5383: -95, 5343: 18, 5403: 12, 5063: 27.5 }, { _homed_state: 0, _tool_offset: 1 });
    assert.throws(() => step(g10, p), /error:72/, k);
  }
});

const HOMING_FORMAT = 'Enable,Enable single axis commands,Homing on startup required,Set machine origin to 0,Two switches shares one input,Allow manual,Override locks,N/A,N/A,Per axis feedrates,Run startup scripts only on homing completed';

test('travel direction from $22 / $23', () => {
  // The author's machine: homes X and Y to min, origin set there: travel runs positive.
  assert.deepEqual(travelDirs({ 22: { value: '623', format: HOMING_FORMAT }, 23: { value: '3' } }), { dirX: 1, dirY: 1 });
  // grbl's default, homing to max: travel runs negative.
  assert.deepEqual(travelDirs({ 22: { value: '623', format: HOMING_FORMAT }, 23: { value: '0' } }), { dirX: -1, dirY: -1 });
  // Origin not set at home: negative, as grbl.
  assert.deepEqual(travelDirs({ 22: { value: '1', format: HOMING_FORMAT }, 23: { value: '3' } }), { dirX: -1, dirY: -1 });
  assert.equal(travelDirs({}), null);
  assert.equal(travelDirs({ 22: { value: '0', format: HOMING_FORMAT }, 23: { value: '3' } }), null, 'homing off');
});

test('hole grid: as many as fit in the travel, from the inset, in machine coordinates', () => {
  const g = holeGrid({ sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 30, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 });
  // X: 48, 144, ... 816 is past 812, so 8 columns (48 + 7 * 96 = 720); Y: 30 + 12 * 96 = 1182, 13 rows.
  assert.equal(g.length, 8 * 13);
  assert.deepEqual(g[0], { col: 1, row: 1, x: 48, y: 30 });
  assert.deepEqual(g[g.length - 1], { col: 8, row: 13, x: 720, y: 1182 });
  const neg = holeGrid({ sxMm: 100, syMm: 100, insetXMm: 50, insetYMm: 50, travelXMm: 300, travelYMm: 200, dirX: -1, dirY: -1 });
  assert.deepEqual(neg.map(h => [h.x, h.y]), [[-50, -50], [-150, -50], [-250, -50], [-50, -150], [-150, -150], [-250, -150]]);
  assert.deepEqual(holeGrid({ sxMm: 0, syMm: 96, insetXMm: 0, insetYMm: 0, travelXMm: 800, travelYMm: 800, dirX: 1, dirY: 1 }), [], 'no spacing, no holes');
});

test('inset from the current position over any hole', () => {
  assert.equal(insetFromPosition(336, 96, 1), 48);
  assert.equal(insetFromPosition(-336, 96, -1), 48);
  assert.equal(insetFromPosition(30, 96, 1), 30);
  assert.equal(insetFromPosition(192, 96, 1), 0);
});

test('X0 Y0 on a hole: G10 L2 on the work offset, in mm', () => {
  assert.deepEqual(holeCommands(1, 144, 222, false), ['G21', 'G10 L2 P1 X144.000 Y222.000']);
  assert.deepEqual(holeCommands(2, -150.5, -50, true), ['G21', 'G10 L2 P2 X-150.500 Y-50.000', 'G20']);
});

test('nearest hole to a rough position', () => {
  const g = holeGrid({ sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 30, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 });
  const n = nearestHole(g, 243.1, 122.5);
  assert.deepEqual([g[n.index].col, g[n.index].row, g[n.index].x, g[n.index].y], [3, 2, 240, 126]);
  assert.ok(Math.abs(n.distanceMm - Math.hypot(3.1, 3.5)) < 1e-9);
  assert.equal(nearestHole([], 0, 0), null);
});

// Typing mm or inches in any unit field (the same parser as QuickCut).
const METRIC = false, IMPERIAL = true;

test('plain numbers pass through untouched in either unit system', () => {
  assert.equal(parseUnitValue('6.35', METRIC, 'length'), 6.35);
  assert.equal(parseUnitValue('.25', IMPERIAL, 'length'), 0.25);
  assert.equal(parseUnitValue(' -30 ', METRIC, 'length'), -30);
  assert.equal(parseUnitValue('3.14159', METRIC, 'length'), 3.14159);
});

test('inch input converts to mm on a metric machine', () => {
  assert.equal(parseUnitValue('.25in', METRIC, 'length'), 6.35);
  assert.equal(parseUnitValue('.25"', METRIC, 'length'), 6.35);
  assert.equal(parseUnitValue('0.25 inch', METRIC, 'length'), 6.35);
  assert.equal(parseUnitValue('1/4"', METRIC, 'length'), 6.35);
  assert.equal(parseUnitValue('1-1/2"', METRIC, 'length'), 38.1);
  // Fractions over 1 work too.
  assert.equal(parseUnitValue('5/4"', METRIC, 'length'), 31.75);
  assert.equal(parseUnitValue('5/4"', IMPERIAL, 'length'), 1.25);
  assert.equal(parseUnitValue('1 1/2 in', METRIC, 'length'), 38.1);
  assert.equal(parseUnitValue('1/4”', METRIC, 'length'), 6.35);
});

test('mm/cm input converts to inches on an imperial machine', () => {
  assert.equal(parseUnitValue('6.35mm', IMPERIAL, 'length'), 0.25);
  assert.equal(parseUnitValue('6.35 MM', IMPERIAL, 'length'), 0.25);
  assert.equal(parseUnitValue('2.54cm', IMPERIAL, 'length'), 1);
  assert.equal(parseUnitValue('3mm', IMPERIAL, 'length'), 0.1181);
});

test('fractions with no unit stay in the active units', () => {
  assert.equal(parseUnitValue('1/4', IMPERIAL, 'length'), 0.25);
  assert.equal(parseUnitValue('-1-1/2', IMPERIAL, 'length'), -1.5);
});

test('feed fields accept per-minute units', () => {
  assert.equal(parseUnitValue('100ipm', METRIC, 'feed'), 2540);
  assert.equal(parseUnitValue('100 in/min', METRIC, 'feed'), 2540);
  assert.equal(parseUnitValue('2540 mm/min', IMPERIAL, 'feed'), 100);
  assert.equal(parseUnitValue('600mm', IMPERIAL, 'feed'), 23.622);
  assert.equal(parseUnitValue('100ipm', METRIC, 'length'), null, 'ipm is a feed unit only');
});

test('feed fields accept /m as per minute and per-second units', () => {
  assert.equal(parseUnitValue('1500mm/m', IMPERIAL, 'feed'), 59.0551);
  assert.equal(parseUnitValue('1500 mm/m', METRIC, 'feed'), 1500);
  assert.equal(parseUnitValue('60in/m', METRIC, 'feed'), 1524);
  assert.equal(parseUnitValue('25mm/s', IMPERIAL, 'feed'), 59.0551);
  assert.equal(parseUnitValue('25 mm/sec', METRIC, 'feed'), 1500);
  assert.equal(parseUnitValue('1ips', METRIC, 'feed'), 1524);
  assert.equal(parseUnitValue('1 in/s', IMPERIAL, 'feed'), 60);
  assert.equal(parseUnitValue('0.5in/sec', IMPERIAL, 'feed'), 30);
  assert.equal(parseUnitValue('25mm/s', METRIC, 'length'), null, 'per-second units are feed-only');
  assert.equal(parseUnitValue('25mm/h', METRIC, 'feed'), null);
});

test('unreadable text returns null', () => {
  for (const bad of ['', 'abc', '1/0', '1.5/2', '1-1/0', '6.35 furlongs', '1..2', '--1', '1/4/2']) {
    assert.equal(parseUnitValue(bad, METRIC, 'length'), null, JSON.stringify(bad));
  }
});

test('holeOriginOffset puts X0 Y0 a hole radius out in machine X and Y', () => {
  assert.deepEqual(holeOriginOffset('center', 10), { dx: 0, dy: 0 });
  assert.deepEqual(holeOriginOffset('back-right', 10), { dx: 10, dy: 10 });
  assert.deepEqual(holeOriginOffset('front-left', 10), { dx: -10, dy: -10 });
  assert.deepEqual(holeOriginOffset('left-center', 10), { dx: -10, dy: 0 });
  assert.deepEqual(holeOriginOffset('back-center', 10), { dx: 0, dy: 10 });
  assert.deepEqual(holeOriginOffset(undefined, 10), { dx: 0, dy: 0 });
});

test('holeGotoCommands lifts to Safe Z, then moves in machine coordinates', () => {
  assert.deepEqual(holeGotoCommands(346, 250, -5, false), ['G21', 'G53 G0 Z-5.000', 'G53 G0 X346.000 Y250.000']);
  assert.deepEqual(holeGotoCommands(-10.5, 20, null, true), ['G21', 'G53 G0 Z0.000', 'G53 G0 X-10.500 Y20.000', 'G20']);
});
