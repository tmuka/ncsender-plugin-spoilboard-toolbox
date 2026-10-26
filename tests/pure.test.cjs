// Runs the pure block of config.html (between the BEGIN/END pure markers)
// so the tests check the code ncSender actually loads.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'config.html'), 'utf8');
const after = html.split('// BEGIN pure')[1];
const block = after.slice(after.indexOf('\n') + 1).split('// END pure')[0];
const { buildMacros, parseHashReport, parseGcState, offsetZParam, storeThicknessCommand, holeGrid, travelDirs, insetFromPosition, holeCommands, holeGotoCommands, keepoutZones, holeKeepout, targetProblem, trackBands, holeOriginOffset, parseHoleList, formatHoleList, convertHoleList, holeLabel, axisTicks, nearestHole, parseUnitValue } =
  new Function(block + '\nreturn { buildMacros, parseHashReport, parseGcState, offsetZParam, storeThicknessCommand, holeGrid, travelDirs, insetFromPosition, holeCommands, holeGotoCommands, keepoutZones, holeKeepout, targetProblem, trackBands, holeOriginOffset, parseHoleList, formatHoleList, convertHoleList, holeLabel, axisTicks, nearestHole, parseUnitValue };')();

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
      .replace(/FIX\[/g, 'Math.floor(')
      .replace(/ROUND\[/g, 'gRound(')
      .replace(/\[/g, '(').replace(/\]/g, ')')
      .replace(/ GT /g, ' > ').replace(/ GE /g, ' >= ').replace(/ LT /g, ' < ').replace(/ LE /g, ' <= ').replace(/ NE /g, ' != ').replace(/ AND /g, ' && ').replace(/ OR /g, ' || ');
  // Comparisons and AND evaluate to 1 or 0 in grblHAL.
  js = js.replace(/\(([^()]*(?:>|<|!=|&&|\|\|)[^()]*)\)/g, '(+($1))');
  // grblHAL's ROUND: (int)(v + 0.5), or - 0.5 below zero.
  const gRound = (v) => Math.trunc(v + (v < 0 ? -0.5 : 0.5));
  let value = Function('gRound', 'return ' + js)(gRound);
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
    try { step(line, params); } catch (e) {
      if (e.unknown) throw e;
      params._error = line; break;
    }
  }
  return params;
}
// ncSender before 2.0.161: a rejected line is skipped and the rest still
// sent. Returns the params and how many lines were rejected.
function runAll(body, params) {
  let rejected = 0;
  for (const line of code(body)) {
    try { step(line, params); } catch (e) { if (e.unknown) throw e; rejected++; }
  }
  return Object.assign(params, { _rejected: rejected });
}
// Lines the stand-in doesn't evaluate but knows are plain G-code.
const PLAIN = /^(G2[01]|G90|G5[4-9](\.[1-3])?|G91 G38\.2 Z-[\d.]+ F[\d.]+|G91 G0 Z[\d.]+|G53 G0 Z-?[\d.]+|G20)$/;
// The X[...] / Y[...] words of a line, with nested brackets.
function words(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    if (!/[XY]/.test(text[i]) || text[i + 1] !== '[') continue;
    let depth = 0, j = i + 1;
    for (; j < text.length; j++) { if (text[j] === '[') depth++; else if (text[j] === ']' && --depth === 0) break; }
    out.push([text[i], text.slice(i + 2, j)]);
    i = j;
  }
  return out;
}
function step(line, params) {
  {
    let m = /^#(\d+)=\[(.*)\]$/.exec(line);
    if (m) { params[m[1]] = evalExpr(m[2], params); return; }
    m = /^G10 L2 P0 X\[(.*)\] Y\[(.*)\]$/.exec(line);
    if (m) { params.P0_x = evalExpr(m[1], params); params.P0_y = evalExpr(m[2], params); return; }
    m = /^G10 L2 P(\d) Z\[(.*)\]$/.exec(line);
    if (m) { params[offsetZParam(+m[1])] = evalExpr(m[2], params); return; }
    m = /^G10 L2 P(\d) X\[(.*)\] Y\[(.*)\]$/.exec(line);
    if (m) {
      const vx = evalExpr(m[2], params), vy = evalExpr(m[3], params);
      params[offsetZParam(+m[1]) - 2] = vx;
      params[offsetZParam(+m[1]) - 1] = vy;
      return;
    }
    m = /^G53 (?:G90 )?G0 Z\[(.*)\]$/.exec(line);
    if (m) { params._mz = evalExpr(m[1], params); return; }
    m = /^G53 G90 G0 X\[(.*)\] Y\[(.*)\]$/.exec(line);
    if (m) { params._mx = evalExpr(m[1], params); params._my = evalExpr(m[2], params); return; }
    m = /^(?:G90 )?(G0|G10 L20 P0) (.*)$/.exec(line);
    if (!m) {
      if (PLAIN.test(line)) return;
      // Anything else is a line the tests can't vouch for: fail loudly.
      throw Object.assign(new Error('stand-in doesn\'t know: ' + line), { unknown: true });
    }
    // Evaluate every word first, like grblHAL rejecting the whole block.
    const vals = words(m[2]).map(([axis, expr]) => [axis, evalExpr(expr, params)]);
    for (const [axis, v] of vals) params[(m[1] === 'G0' ? '_' : 'L20_') + axis.toLowerCase()] = v;
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
    assert.deepEqual(c.slice(0, 3), ['#1=[1 / #<_homed_state>]', 'G21', 'G53 G0 Z[0 / #<_homed_state>]'], k);
    assert.match(c[3], /^G90 G0 /, k);
    const unhomed = run(m[k].body, { _x: 120, _y: 80, _tool_offset: 1 });
    assert.deepEqual([unhomed._x, unhomed._y, unhomed._error], [120, 80, '#1=[1 / #<_homed_state>]'], k + ' stops unhomed');
  }
  assert.ok(!/G0|G53/.test(m.center.body));
  const withSafe = buildMacros(Object.assign({}, base, { extras: allExtras, safeZMm: -5, imperial: true }));
  assert.deepEqual(code(withSafe.midXY.body), ['#1=[1 / #<_homed_state>]', 'G21', 'G53 G0 Z[-5.000 / #<_homed_state>]', 'G90 G0 X[#<_x> / [2 * #<_homed_state>]] Y[#<_y> / [2 * #<_homed_state>]]', 'G20']);
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
  assert.match(m.set.body, /^G10 L2 P2 Z\[#5363 \/ \[#<_homed_state> AND #<_tool_offset> AND \[#5363 NE 0\] AND \[ABS\[#5213\] LT 0\.0005\]\]\]$/m);
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
  // Back to saved needs none of it, only no G92 Z.
  assert.deepEqual(m.restore.body.match(/ZS stop: [^)]*/g), ['ZS stop: a G92 Z offset is active; G92.1 clears it']);
  // A G92 Z offset stops the three that set Z0, changing nothing.
  for (const k of ['set', 'stock', 'restore']) {
    const q = run(m[k].body, Object.assign({}, start, ready, { 5213: 3, 5363: -50 }));
    assert.ok(m[k].body.includes(q._error + ' (ZS stop: a G92 Z offset is active; G92.1 clears it)'), k);
    assert.deepEqual([q[5223], q[5363]], [-77.5, -50], k + ' changes nothing with G92 Z');
  }
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
  assert.deepEqual(holeCommands(1, 144, 222), ['G21 G10 L2 P1 X144.000 Y222.000']);
  assert.deepEqual(holeCommands(2, -150.5, -50), ['G21 G10 L2 P2 X-150.500 Y-50.000']);
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
  assert.deepEqual(holeGotoCommands(346, 250, -5, -30), ['G53 G21 G90 G0 Z-5.000', 'G53 G21 G90 G0 X346.000 Y250.000']);
  assert.deepEqual(holeGotoCommands(-10.5, 20, null, NaN), ['G53 G21 G90 G0 Z0.000', 'G53 G21 G90 G0 X-10.500 Y20.000']);
  // Never down: above Safe Z it stays at the current height.
  assert.deepEqual(holeGotoCommands(1, 2, -5, -1)[0], 'G53 G21 G90 G0 Z-1.000');
  // Every motion or offset line says its own units.
  [holeGotoCommands(1, 2, -5, -9), holeCommands(3, 1, 2)].flat().forEach((l) => assert.match(l, /\bG21\b/));
});

test('keepoutZones reads ncSender\'s zone and the ATCi one when on', () => {
  const settings = { advanced: { keepoutZone: { enabled: true, min: { x: 700, y: 0 }, max: { x: 600, y: 120 } } } };
  const fw = { 683: { name: 'ATCi Keepout: Enable', value: '1' }, 684: { name: 'ATCi Keepout X min', value: '0' },
    685: { name: 'ATCi Keepout Y min', value: '1100' }, 686: { name: 'ATCi Keepout X max', value: '812' }, 687: { name: 'ATCi Keepout Y max', value: '1230' } };
  assert.deepEqual(keepoutZones(settings, fw), [
    { name: 'ncSender', minX: 600, maxX: 700, minY: 0, maxY: 120 },
    { name: 'ATCi', minX: 0, maxX: 812, minY: 1100, maxY: 1230 }]);
  assert.deepEqual(keepoutZones({ advanced: { keepoutZone: { enabled: false, min: { x: 0, y: 0 }, max: { x: 1, y: 1 } } } },
    Object.assign({}, fw, { 683: { name: 'ATCi Keepout: Enable', value: '0' } })), []);
  assert.deepEqual(keepoutZones({}, { 683: { name: 'Something else', value: '1' } }), []);
});

test('holeKeepout catches holes reaching into a zone; nearestHole skips them', () => {
  const zones = [{ name: 'ATCi', minX: 0, maxX: 812, minY: 1100, maxY: 1230 }];
  assert.equal(holeKeepout(48, 1104, 10, zones).name, 'ATCi');
  assert.equal(holeKeepout(48, 1091, 10, zones).name, 'ATCi');
  assert.equal(holeKeepout(48, 1089, 10, zones), null);
  const grid = [{ x: 0, y: 0, blocked: true }, { x: 96, y: 0 }];
  assert.deepEqual(nearestHole(grid, 1, 1).index, 1);
});

test('targetProblem refuses points outside the travel or in a keepout zone', () => {
  const travel = { xMm: 812, yMm: 1230, dirX: 1, dirY: 1 };
  const zones = [{ name: 'ATCi', minX: 690, maxX: 812, minY: 700, maxY: 1230 }];
  assert.equal(targetProblem(100, 100, travel, zones), null);
  assert.equal(targetProblem(-2, 100, travel, zones), 'outside the machine\u2019s travel');
  assert.equal(targetProblem(812, 1230.5, travel, []), 'outside the machine\u2019s travel');
  assert.equal(targetProblem(690, 700, travel, zones), 'in the ATCi keepout zone');
  // A corner origin a hole radius out from a hole whose circle clears the zone.
  const r = 10, hx = 690 - 8, hy = 700 - 8;
  assert.equal(holeKeepout(hx, hy, r, zones), null);
  assert.equal(targetProblem(hx + r, hy + r, travel, zones), 'in the ATCi keepout zone');
  // Homing to max: travel runs negative.
  const neg = { xMm: 800, yMm: 600, dirX: -1, dirY: -1 };
  assert.equal(targetProblem(-799, -1, neg, []), null);
  assert.equal(targetProblem(1, -1, neg, []), 'outside the machine\u2019s travel');
});

test('holeOriginOffset covers all nine origins', () => {
  const want = { 'back-left': [-1, 1], 'back-center': [0, 1], 'back-right': [1, 1], 'left-center': [-1, 0], center: [0, 0],
    'right-center': [1, 0], 'front-left': [-1, -1], 'front-center': [0, -1], 'front-right': [1, -1], bogus: [0, 0] };
  for (const [o, [x, y]] of Object.entries(want)) assert.deepEqual(holeOriginOffset(o, 4), { dx: 4 * x || 0, dy: 4 * y || 0 }, o);
});

test('holeGrid edge cases: inset past the travel, the cap, diameter 0', () => {
  const base = { sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 };
  assert.equal(holeGrid(Object.assign({}, base, { insetXMm: 900 })).length, 0);
  const tiny = holeGrid(Object.assign({}, base, { sxMm: 1, syMm: 1, insetXMm: 0, insetYMm: 0 }));
  assert.equal(tiny.length, 200 * 200);
  assert.equal(holeGrid(Object.assign({}, base, { diaMm: 0 })).length, 8 * 13);
});

test('travelDirs with one axis homing to min, and an unknown format', () => {
  const fmt = 'Enable,Enable single axis commands,Homing on startup required,Set machine origin to 0';
  assert.deepEqual(travelDirs({ 22: { value: '9', format: fmt }, 23: { value: '1' } }), { dirX: 1, dirY: -1 });
  assert.deepEqual(travelDirs({ 22: { value: '9', format: fmt }, 23: { value: '2' } }), { dirX: -1, dirY: 1 });
  assert.equal(travelDirs({ 22: { value: '9', format: 'Enable,Something else' }, 23: { value: '3' } }), null);
});

test('insetFromPosition with a negative direction and an off-grid position', () => {
  assert.equal(insetFromPosition(-150, 96, -1), 54);
  assert.ok(Math.abs(insetFromPosition(250.5, 96, 1) - 58.5) < 1e-9);
});

test('holeKeepout with a zero radius and a point on the zone edge', () => {
  const zones = [{ name: 'Z', minX: 0, maxX: 10, minY: 0, maxY: 10 }];
  assert.equal(holeKeepout(10, 5, 0, zones).name, 'Z');
  assert.equal(holeKeepout(10.001, 5, 0, zones), null);
});

test('holeGrid with T-track panels: unbroken spacing, and a track that shifts the next panel', () => {
  const base = { sxMm: 48.6, syMm: 48.6, insetXMm: 8, insetYMm: 28.265, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 };
  const plain = holeGrid(base);
  const unbroken = holeGrid(Object.assign({}, base, { trackAxis: 'x', panelHoles: 5, panelPitchMm: 0 }));
  assert.equal(unbroken.length, plain.length);
  unbroken.forEach((p, i) => assert.ok(Math.abs(p.x - plain[i].x) < 1e-9 && Math.abs(p.y - plain[i].y) < 1e-9));
  const shifted = holeGrid(Object.assign({}, base, { trackAxis: 'x', panelHoles: 5, panelPitchMm: 5 * 48.6 + 30 }));
  const ys = [...new Set(shifted.map((p) => p.y))];
  assert.ok(Math.abs(ys[4] - (28.265 + 4 * 48.6)) < 1e-9);
  assert.ok(Math.abs(ys[5] - (28.265 + 5 * 48.6 + 30)) < 1e-9);
  assert.ok(Math.abs(ys[6] - ys[5] - 48.6) < 1e-9);
  assert.ok(ys[ys.length - 1] <= 1230);
  // Columns untouched by tracks along X.
  assert.deepEqual([...new Set(shifted.map((p) => p.x))], [...new Set(plain.map((p) => p.x))]);
});

test('trackBands sit between panels, along the right axis and direction', () => {
  const base = { sxMm: 50, syMm: 50, insetXMm: 25, insetYMm: 25, travelXMm: 800, travelYMm: 600, dirX: 1, dirY: 1, trackAxis: 'x', panelHoles: 5 };
  const bands = trackBands(base);
  // Panels of rows at 25..225, 275..475, 525..: bands centered at 250 and 500, 25 wide.
  assert.deepEqual(bands, [{ from: 237.5, to: 262.5 }, { from: 487.5, to: 512.5 }]);
  assert.deepEqual(trackBands(Object.assign({}, base, { dirY: -1 }))[0], { from: -262.5, to: -237.5 });
  assert.deepEqual(trackBands(Object.assign({}, base, { trackAxis: null })), []);
  const wide = trackBands(Object.assign({}, base, { panelPitchMm: 280 }));
  // Last row 225, next panel at 305: gap 80, band 80 - 25 = 55 wide around 265.
  assert.deepEqual(wide[0], { from: 237.5, to: 292.5 });
});

// The grid as config.html's holeMacroGrid builds it.
function macroGrid(o) {
  const grid = holeGrid(o);
  const xs = [...new Set(grid.map((p) => o.dirX * p.x))].sort((a, b) => a - b);
  const ys = [...new Set(grid.map((p) => o.dirY * p.y))].sort((a, b) => a - b);
  const off = holeOriginOffset(o.origin || 'center', o.diaMm / 2);
  return Object.assign({}, o, { lastXMm: xs[xs.length - 1], lastYMm: ys[ys.length - 1], dx: off.dx, dy: off.dy, originName: o.origin || 'center', zones: o.zones || [] });
}

test('nearest-hole macros find the same hole as the XY0 Picker, on the controller', () => {
  const grids = [
    { name: 'plain, homes to min', sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 },
    { name: 'homes to max', sxMm: 50, syMm: 40, insetXMm: 20, insetYMm: 15, travelXMm: 800, travelYMm: 600, dirX: -1, dirY: -1 },
    { name: 'T-tracks along X, unbroken', sxMm: 48.6, syMm: 48.6, insetXMm: 8.001, insetYMm: 28.265, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1, trackAxis: 'x', panelHoles: 5, panelPitchMm: 0 },
    { name: 'T-tracks along Y, shifted', sxMm: 50, syMm: 50, insetXMm: 25, insetYMm: 25, travelXMm: 900, travelYMm: 500, dirX: 1, dirY: -1, trackAxis: 'y', panelHoles: 4, panelPitchMm: 235 }
  ];
  for (const g0 of grids) {
    const g = macroGrid(Object.assign({ diaMm: 20, origin: 'back-right' }, g0));
    const m = buildMacros(Object.assign({}, base, { safeZMm: -5, extras: { holes: true }, holes: g }));
    const grid = holeGrid(g);
    const minX = g.dirX > 0 ? 0 : -g.travelXMm, minY = g.dirY > 0 ? 0 : -g.travelYMm;
    for (let i = 0; i <= 40; i++) {
      for (let j = 0; j <= 40; j++) {
        const x = minX + g.travelXMm * i / 40, y = minY + g.travelYMm * j / 40;
        const want = grid[nearestHole(grid, x, y).index];
        const inside = (v, lo, span) => v >= lo - 1e-6 && v <= lo + span + 1e-6;
        const ok = inside(want.x + 10, minX, g.travelXMm) && inside(want.y + 10 * 1, minY, g.travelYMm);
        const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: x, _abs_y: y, _abs_z: -20 }));
        if (!ok) { assert.ok(p._error, g.name + ': should stop outside the travel at ' + x + ',' + y); continue; }
        assert.equal(p._error, undefined, g.name + ' at ' + x + ',' + y);
        // Ties (exactly halfway) may go either way; anything else must match.
        const dWant = Math.hypot(want.x - x, want.y - y);
        const got = { x: p.P0_x - 10, y: p.P0_y - 10 };
        assert.ok(Math.abs(Math.hypot(got.x - x, got.y - y) - dWant) < 1e-3, g.name + ' at ' + x + ',' + y + ': got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want));
        assert.ok(grid.some((h) => Math.abs(h.x - got.x) < 1e-3 && Math.abs(h.y - got.y) < 1e-3), g.name + ': not a hole');
      }
    }
  }
});

test('nearest-hole macros: Go lifts (never down), then moves; stops for keepouts and unhomed', () => {
  const g = macroGrid({ diaMm: 20, origin: 'center', sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1,
    zones: [{ name: 'ATCi', minX: 690, maxX: 812, minY: 700, maxY: 1230 }] });
  const m = buildMacros(Object.assign({}, base, { safeZMm: -5, extras: { holes: true }, holes: g }));
  let p = run(m.goHole.body, Object.assign({}, ready, { _abs_x: 150, _abs_y: 230, _abs_z: -30 }));
  assert.deepEqual([p._mz, p._mx, p._my], [-5, 144, 240]);
  p = run(m.goHole.body, Object.assign({}, ready, { _abs_x: 150, _abs_y: 230, _abs_z: -2 }));
  assert.equal(p._mz, -2);
  p = run(m.goHole.body, Object.assign({}, ready, { _abs_x: 720, _abs_y: 1008, _abs_z: -30 }));
  assert.ok(p._error && p._mx === undefined, 'keepout stops before moving');
  p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: 720, _abs_y: 1008 }));
  assert.ok(p._error && p.P0_x === undefined);
  p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: 150, _abs_y: 230, 5211: 2.49, 5212: 258 }));
  assert.ok(p._error && p.P0_x === undefined, 'a G92 offset stops XY0');
  p = run(m.goHole.body, Object.assign({}, ready, { _abs_x: 150, _abs_y: 230, _abs_z: -30, 5211: 2.49, 5212: 258 }));
  assert.equal(p._mx, 144, 'Go to ignores G92 (machine coordinates)');
  p = run(m.setHole.body, { _homed_state: 0, _abs_x: 150, _abs_y: 230 });
  assert.ok(p._error && p.P0_x === undefined, 'unhomed stops');
  assert.match(m.setHole.name, /XY0 on nearest hole$/);
  // Inch mode: no unit switch at all; reads and writes inches.
  const imperial = buildMacros(Object.assign({}, base, { imperial: true, safeZMm: -5, extras: { holes: true }, holes: g }));
  assert.ok(!code(imperial.setHole.body).some((l) => /G2[01]/.test(l)) && !code(imperial.goHole.body).some((l) => /G2[01]/.test(l)));
  p = run(imperial.setHole.body, Object.assign({}, ready, { _imperial: 1, _abs_x: 150 / 25.4, _abs_y: 230 / 25.4 }));
  assert.ok(Math.abs(p.P0_x - 144 / 25.4) < 1e-5 && Math.abs(p.P0_y - 240 / 25.4) < 1e-5);
  p = run(imperial.goHole.body, Object.assign({}, ready, { _imperial: 1, _abs_x: 150 / 25.4, _abs_y: 230 / 25.4, _abs_z: -30 / 25.4 }));
  assert.ok(Math.abs(p._mz - -5 / 25.4) < 1e-5 && Math.abs(p._mx - 144 / 25.4) < 1e-5);
  assert.ok(code(imperial.setHole.body).every((l) => l.length <= 200), 'lines fit grblHAL\'s buffer');
  // Without a grid it only stops.
  const none = buildMacros(Object.assign({}, base, { extras: { holes: true } }));
  assert.ok(run(none.setHole.body, Object.assign({}, ready))._error);
});

test('parseHoleList reads names, mixed units and skips comments; formatHoleList writes it back', () => {
  const r = parseHoleList('A: 0, 0\n( locating pins )\n\nB: 300, 12.5\n12-1/2", 6"\n1: 2in, 50.8mm\nnot a hole\n5, 6, 7', false);
  assert.deepEqual(r.bad, [7, 8]);
  assert.deepEqual(r.holes, [
    { name: 'A', xMm: 0, yMm: 0 }, { name: 'B', xMm: 300, yMm: 12.5 },
    { name: '', xMm: 317.5, yMm: 152.4 }, { name: '1', xMm: 50.8, yMm: 50.8 }]);
  const inch = parseHoleList('1, 2\nC: 25.4mm, 0.5', true);
  assert.deepEqual(inch.holes, [{ name: '', xMm: 25.4, yMm: 50.8 }, { name: 'C', xMm: 25.4, yMm: 12.7 }]);
  assert.equal(formatHoleList(inch.holes, true), '1, 2\nC: 1, 0.5');
  assert.equal(formatHoleList(r.holes.slice(0, 2), false), 'A: 0, 0\nB: 300, 12.5');
});

test('holeGrid with a list: reference point plus x, y into the travel; outside dropped', () => {
  const list = [{ name: 'A', xMm: 0, yMm: 0 }, { name: '', xMm: 100, yMm: 50 }, { name: 'far', xMm: 900, yMm: 0 }];
  const o = { layout: 'list', list, insetXMm: 20, insetYMm: 30, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 };
  assert.deepEqual(holeGrid(o), [{ index: 1, name: 'A', x: 20, y: 30 }, { index: 2, name: '', x: 120, y: 80 }]);
  assert.deepEqual(holeGrid(Object.assign({}, o, { dirX: -1, dirY: -1 })).map((p) => [p.x, p.y]), [[-20, -30], [-120, -80]]);
  assert.deepEqual(holeGrid(o).map(holeLabel), ['A', 'Hole 2']);
  assert.equal(holeLabel({ col: 3, row: 2 }), 'Column 3, row 2');
});

test('nearest-hole macros with a list pick the nearest usable listed hole', () => {
  const list = [{ name: 'A', xMm: 0, yMm: 0 }, { name: 'B', xMm: 300, yMm: 10 }, { name: 'C', xMm: 155, yMm: 400 }, { name: 'D', xMm: 700, yMm: 700 }];
  const g0 = { layout: 'list', list, insetXMm: 20, insetYMm: 30, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1, diaMm: 20, origin: 'center',
    zones: [{ name: 'ATCi', minX: 690, maxX: 812, minY: 700, maxY: 1230 }] };
  const grid = holeGrid(g0);
  const g = Object.assign({}, g0, { dx: 0, dy: 0, originName: 'center', lastXMm: 0, lastYMm: 0 });
  const m = buildMacros(Object.assign({}, base, { safeZMm: -5, extras: { holes: true }, holes: g }));
  const usable = grid.filter((p) => p.name !== 'D');
  for (let i = 0; i <= 30; i++) for (let j = 0; j <= 30; j++) {
    const x = 812 * i / 30, y = 1230 * j / 30;
    const want = usable[nearestHole(usable, x, y).index];
    const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: x, _abs_y: y }));
    assert.equal(p._error, undefined);
    assert.ok(Math.abs(Math.hypot(p.P0_x - x, p.P0_y - y) - Math.hypot(want.x - x, want.y - y)) < 1e-3, 'at ' + x + ',' + y);
  }
  const none = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: Object.assign({}, g, { list: [list[3]] }) }));
  assert.ok(run(none.setHole.body, Object.assign({}, ready, { _abs_x: 1, _abs_y: 1 }))._error);
});

test('parseHoleList flags typos instead of reading them as 0; trailing comments are fine', () => {
  const r = parseHoleList('A: 3O0, 10\nB: 300, 12 ; note\nC: 300,\nD: , 5\nE: 1 2, 5\nF: 10, 20 (pin)', false);
  assert.deepEqual(r.bad, [1, 3, 4, 5]);
  assert.deepEqual(r.holes, [{ name: 'B', xMm: 300, yMm: 12 }, { name: 'F', xMm: 10, yMm: 20 }]);
});

test('convertHoleList rewrites readable lines, keeps comments and unreadable lines', () => {
  const text = '( locating )\nA: 25.4, 50.8 ; front\nbad line\nB: 1in, 0';
  assert.equal(convertHoleList(text, false, true), '( locating )\nA: 1, 2 ; front\nbad line\nB: 1, 0');
  assert.equal(convertHoleList(text, true, true), text);
});

test('axisTicks picks round steps at least minPx apart', () => {
  // 812 mm at 0.45 px/mm, 56 px apart: 124 mm raw -> 200 mm steps.
  assert.deepEqual(axisTicks(0, 812, 0.45, 56), { step: 200, values: [0, 200, 400, 600, 800] });
  // Inches: 32 in at 11.4 px/in, 30 px apart: 2.6 in raw -> 5 in steps.
  assert.deepEqual(axisTicks(0, 31.97, 11.43, 30).values, [0, 5, 10, 15, 20, 25, 30]);
  // Homing to max: negative machine coordinates.
  assert.deepEqual(axisTicks(-800, 0, 0.5, 56).values, [-800, -600, -400, -200, 0]);
  assert.deepEqual(axisTicks(0, 1, 300, 56).values, [0, 0.2, 0.4, 0.6, 0.8, 1]);
});

test('guards hold even when a stop line is skipped (ncSender before 2.0.161)', () => {
  const g = macroGrid({ diaMm: 20, origin: 'center', sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1,
    zones: [{ name: 'ATCi', minX: 690, maxX: 812, minY: 700, maxY: 1230 }] });
  const m = buildMacros(Object.assign({}, base, { safeZMm: -5, extras: { holes: true, midX: true, midY: true, midXY: true }, holes: g }));
  const moved = (p) => p._mx !== undefined || p._my !== undefined || p._mz !== undefined || p._x !== undefined || p._y !== undefined;
  // Unhomed: nothing moves or changes.
  for (const k of ['goHole', 'setHole', 'midX', 'midY', 'midXY']) {
    const p = runAll(m[k].body, { _homed_state: 0, _tool_offset: 1, _abs_x: 150, _abs_y: 230, _abs_z: -30, _x: undefined, _y: undefined });
    assert.ok(!moved(p) && p.P0_x === undefined, k + ' unhomed');
  }
  // Keepout: Go and XY0 refuse the hole in the rack zone.
  let p = runAll(m.goHole.body, Object.assign({}, ready, { _abs_x: 720, _abs_y: 1008, _abs_z: -30 }));
  assert.ok(p._mx === undefined && p._mz === undefined, 'go keepout');
  p = runAll(m.setHole.body, Object.assign({}, ready, { _abs_x: 720, _abs_y: 1008 }));
  assert.equal(p.P0_x, undefined, 'set keepout');
  // G92 offsets: XY0 and the Z0 macros refuse.
  p = runAll(m.setHole.body, Object.assign({}, ready, { _abs_x: 150, _abs_y: 230, 5211: 2.49, 5212: 258 }));
  assert.equal(p.P0_x, undefined, 'set G92');
  const start = { 5223: -77.5, 5383: -95, 5343: 18, 5363: -60, 5213: 3 };
  for (const k of ['set', 'stock', 'restore']) {
    const q = runAll(m[k].body, Object.assign({}, start, ready));
    assert.equal(q[5223], -77.5, k + ' G92 Z');
  }
  // And all clear, they do their job.
  p = runAll(m.goHole.body, Object.assign({}, ready, { _abs_x: 150, _abs_y: 230, _abs_z: -30 }));
  assert.deepEqual([p._rejected, p._mz, p._mx, p._my], [0, -5, 144, 240]);
});
