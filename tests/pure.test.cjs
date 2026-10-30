// Runs the pure block of config.html (between the BEGIN/END pure markers)
// so the tests check the code ncSender actually loads.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'config.html'), 'utf8');
const after = html.split('// BEGIN pure')[1];
const block = after.slice(after.indexOf('\n') + 1).split('// END pure')[0];
const { buildMacros, parseHashReport, parseGcState, offsetZParam, storeThicknessCommand, holeGrid, travelDirs, insetFromPosition, holeCommands, holeGotoCommands, keepoutZones, holeKeepout, targetProblem, trackBands, holeOriginOffset, parseHoleList, formatHoleList, convertHoleList, remapListKeys, holeLabel, axisTicks, nearestHole, parseUnitValue, setupFields, putProfile, stockRect, rectPoint, stockCornerFor, allHoles, zAboveSpoilLines, holeCutMethod, holesToCut, cutOrder, lineCrossesZone, holeCutProblems, holeCutProgram, programMinutes, textStrokes, textWidth, labelPlacements, engraveProgram, chamferProgram, fitTestHoles, fitGrid, probedCenter, surfacingDone, zoomWindow, labelEvery, trackSlots, trackProgram, stockHoleCandidates, stockBoltHoles, holeSpan, flipPins, flipRect, fixturePins, squareCenters, stopHole, insertGridRaw, calPlan, surfaceSpot, gridLineSegments, laserTestPattern, strokesProgram, clipToPlate, STROKE_FONT } =
  new Function(block + '\nreturn { buildMacros, parseHashReport, parseGcState, offsetZParam, storeThicknessCommand, holeGrid, travelDirs, insetFromPosition, holeCommands, holeGotoCommands, keepoutZones, holeKeepout, targetProblem, trackBands, holeOriginOffset, parseHoleList, formatHoleList, convertHoleList, remapListKeys, holeLabel, axisTicks, nearestHole, parseUnitValue, setupFields, putProfile, stockRect, rectPoint, stockCornerFor, allHoles, zAboveSpoilLines, holeCutMethod, holesToCut, cutOrder, lineCrossesZone, holeCutProblems, holeCutProgram, programMinutes, textStrokes, textWidth, labelPlacements, engraveProgram, chamferProgram, fitTestHoles, fitGrid, probedCenter, surfacingDone, zoomWindow, labelEvery, trackSlots, trackProgram, stockHoleCandidates, stockBoltHoles, holeSpan, flipPins, flipRect, fixturePins, squareCenters, stopHole, insertGridRaw, calPlan, surfaceSpot, gridLineSegments, laserTestPattern, strokesProgram, clipToPlate, STROKE_FONT };')();

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
      .replace(/ GT /g, ' > ').replace(/ GE /g, ' >= ').replace(/ LT /g, ' < ').replace(/ LE /g, ' <= ').replace(/ NE /g, ' != ').replace(/ EQ /g, ' == ').replace(/ AND /g, ' && ').replace(/ OR /g, ' || ');
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
    '#1=[1 / [#<_tool_offset> OR [ABS[#5403] GT 0.0005]]]',
    'G21',
    'G54',
    'G91 G38.2 Z-30.000 F100.000',
    'G90',
    'G10 L2 P9 Z[[#5063 + #5223 - 15.000 - #5403] / [#<_homed_state> AND [#<_tool_offset> OR [ABS[#5403] GT 0.0005]]]]',
    'G91 G0 Z5.000',
    'G90'
  ]);
  // The stop lines say why in their comments.
  assert.match(buildMacros(base).record.body, /^#1=\[1 \/ #<_homed_state>\] \(SBT stop: home the machine first\)$/m);
});

test('names start SBT:, descriptions are the first comment line after its prefix', () => {
  const m = buildMacros(Object.assign({}, base, { extras: allExtras }));
  assert.equal(m.record.name, 'SBT: Record spoilboard height');
  assert.equal(m.record.description, 'record spoilboard height');
  assert.equal(m.restore.description, 'put back the Z0 saved in G59.2 Z');
  assert.equal(m.midX.description, 'lift to Safe Z, then move halfway to X0');
  assert.equal(m.center.name, 'SBT: Set XY0 to Midpoint');
  assert.equal(m.center.description, 'set X0 Y0 halfway to here, no move');
  assert.deepEqual(m.center.aliases, ['Center X0 Y0 here']);
  for (const k of Object.keys(m)) {
    assert.ok(m[k].name.startsWith('SBT: '), k);
    assert.ok(m[k].description && !/SBT|MW|Macro Wiz|[()]/.test(m[k].description), k + ': ' + m[k].description);
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
  assert.match(m.measure.body, /^G10 L2 P7 Z\[\[#5063 \+ #5223 - 15\.000 - #5403 - #5383\] \/ \[#<_homed_state> AND \[#<_tool_offset> OR \[ABS\[#5403\] GT 0\.0005\]\] AND \[#5383 NE 0\]\]\]$/m);
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
  assert.match(m.set.body, /^G10 L2 P2 Z\[#5363 \/ \[#<_homed_state> AND \[#<_tool_offset> OR \[ABS\[#5403\] GT 0\.0005\]\] AND \[#5363 NE 0\] AND \[ABS\[#5213\] LT 0\.0005\]\]\]$/m);
  assert.match(m.set.body, /^G10 L2 P7 Z\[#5343 \+ \[#5243 - #5343\]/m);
  assert.equal(m.set.name, 'SBT: G55 Z0 on spoilboard');
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
    ['no tool length offset', { _homed_state: 1, _tool_offset: 0, 5403: 0 }, 'no tool length offset active']
  ];
  for (const k of ['record', 'measure', 'set', 'stock']) {
    for (const [what, state, why] of cases) {
      const p = run(m[k].body, Object.assign({}, start, state));
      assert.ok(p._error, k + ' stops when ' + what);
      assert.ok(m[k].body.includes(p._error + ' (SBT stop: ' + why + ')'), k + ': says why');
      assert.deepEqual([p[5223], p[5383], p[5343], p[5363]], [-77.5, -95, 18, 0], k + ' changes nothing when ' + what);
    }
  }
  // After a soft reset grblHAL turns G43.1 off but keeps the offset applied.
  for (const k of ['record', 'measure', 'set', 'stock']) {
    const p = run(m[k].body, Object.assign({}, start, { _homed_state: 1, _tool_offset: 0, 5403: -55.173 }));
    assert.ok(!p._error || !m[k].body.includes(p._error + ' (SBT stop: no tool length offset active)'), k + ' takes a kept offset as active');
  }
  // No spoilboard height recorded yet.
  for (const k of ['measure', 'set', 'stock']) {
    const p = run(m[k].body, Object.assign({}, start, ready, { 5383: 0 }));
    assert.ok(m[k].body.includes(p._error + ' (SBT stop: record the spoilboard height first)'), k);
    assert.deepEqual([p[5223], p[5343], p[5363]], [-77.5, 18, 0], k + ' changes nothing');
  }
  // No stock thickness stored.
  const p = run(m.stock.body, Object.assign({}, start, ready, { 5343: 0 }));
  assert.ok(m.stock.body.includes(p._error + ' (SBT stop: store a stock thickness first)'));
  assert.deepEqual([p[5223], p[5363]], [-77.5, 0]);
  // Back to saved needs none of it, only no G92 Z.
  assert.deepEqual(m.restore.body.match(/SBT stop: [^)]*/g), ['SBT stop: a G92 Z offset is active; G92.1 clears it']);
  // A G92 Z offset stops the three that set Z0, changing nothing.
  for (const k of ['set', 'stock', 'restore']) {
    const q = run(m[k].body, Object.assign({}, start, ready, { 5213: 3, 5363: -50 }));
    assert.ok(m[k].body.includes(q._error + ' (SBT stop: a G92 Z offset is active; G92.1 clears it)'), k);
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
  // Named like a fixture table from machine zero's corner: A1 nearest machine X0 Y0.
  assert.deepEqual(g[0], { col: 1, row: 1, x: 48, y: 30, tag: 'A1' });
  assert.deepEqual(g[g.length - 1], { col: 8, row: 13, x: 720, y: 1182, tag: 'M8' });
  const neg = holeGrid({ sxMm: 100, syMm: 100, insetXMm: 50, insetYMm: 50, travelXMm: 300, travelYMm: 200, dirX: -1, dirY: -1 });
  assert.deepEqual(neg.map(h => [h.x, h.y]), [[-50, -50], [-150, -50], [-250, -50], [-50, -150], [-150, -150], [-250, -150]]);
  // Homing back right: A1 is the back right hole, nearest machine zero.
  assert.deepEqual(neg.map(h => h.tag), ['A1', 'A2', 'A3', 'B1', 'B2', 'B3']);
  assert.deepEqual(neg.map(holeLabel), ['A1', 'A2', 'A3', 'B1', 'B2', 'B3']);
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
  // The last holes before any turn, as the app takes them from axisPositions.
  const grid = holeGrid(Object.assign({}, o, { turnDeg: 0 }));
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
  assert.match(m.setHole.name, /Set XY0 at nearest hole \(no move\)$/);
  assert.deepEqual(m.setHole.aliases, ['XY0 on nearest hole']);
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

test('remapListKeys keeps suppressed and favorite listed holes on their hole', () => {
  const was = 'A: 0, 0\n10, 10\n20, 20\nD: 30, 30';
  assert.deepStrictEqual(remapListKeys(['#2', '#3', '#4', '3,2', 'g2:#1'], was, 'A: 0, 0\n# 10, 10\n20, 20\nD: 30, 30', false), ['#2', '#3', '3,2', 'g2:#1']);
  assert.deepStrictEqual(remapListKeys(['#3'], was, 'A: 0, 0\n# 10, 10\n20, 20\nD: 30, 30', false), ['#2']);
  assert.deepStrictEqual(remapListKeys(['#2'], was, 'A: 0, 0\n10, 10\n20, 20\nD: 30, 30', false), ['#2']);
  assert.deepStrictEqual(remapListKeys(['#4'], was, 'A: 0, 0\n10, 10\n20, 20\nD: 31, 30', false), ['#4']);
  assert.deepStrictEqual(remapListKeys(['#2'], was, 'A: 0, 0\n5, 5\n10, 10\n20, 20\nD: 30, 30', false), ['#3']);
});
test('parseHoleList skips lines commented out with #, ; or (', () => {
  const r = parseHoleList('A: 0, 0\n# B: 10, 10\n  #20, 20\n; 30, 30\n(40, 40)\nC: 50, 50', false);
  assert.deepStrictEqual(r.holes.map(h => h.name), ['A', 'C']);
  assert.deepStrictEqual(r.bad, []);
  assert.deepStrictEqual(r.lines, [1, 6]);
  assert.strictEqual(convertHoleList('# 25.4, 50.8\n25.4, 50.8', false, true), '# 25.4, 50.8\n1, 2');
});
test('parseHoleList reads names, mixed units and skips comments; formatHoleList writes it back', () => {
  const r = parseHoleList('A: 0, 0\n( locating pins )\n\nB: 300, 12.5\n12-1/2", 6"\n1: 2in, 50.8mm\nnot a hole\n5, 6, 7, 8, 9\npin: 5, 6, 1/4"\n7, 8, -2', false);
  assert.deepEqual(r.bad, [7, 8, 10]);
  assert.deepEqual(r.holes[4], { name: 'pin', xMm: 5, yMm: 6, diaMm: 6.35 });
  assert.equal(formatHoleList([r.holes[4]], false), 'pin: 5, 6, 6.35');
  r.holes.pop();
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
  // Past Z, rows go on AA, AB...
  const tall = holeGrid({ sxMm: 10, syMm: 10, insetXMm: 5, insetYMm: 5, travelXMm: 20, travelYMm: 300, dirX: 1, dirY: 1 });
  assert.deepEqual([tall[0].tag, tall[25 * 2].tag, tall[26 * 2].tag, tall[tall.length - 1].tag], ['A1', 'Z1', 'AA1', 'AD2']);
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

test('holeGrid marks suppressed holes by column and row; nearestHole skips them', () => {
  const o = { sxMm: 100, syMm: 100, insetXMm: 50, insetYMm: 50, travelXMm: 300, travelYMm: 200, dirX: 1, dirY: 1, suppressed: ['2,1', '9,9'] };
  const grid = holeGrid(o);
  assert.deepEqual(grid.filter((p) => p.suppressed).map((p) => [p.col, p.row]), [[2, 1]]);
  assert.equal(grid.length, 6, 'suppressed holes stay in the grid, so indices don\'t shift');
  assert.deepEqual(grid[nearestHole(grid, 150, 50).index], { col: 1, row: 1, x: 50, y: 50, tag: 'A1' });
});

test('nearest-hole macros skip suppressed holes, matching the XY0 Picker', () => {
  const grids = [
    { name: 'scattered', sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1, suppressed: ['1,1', '4,6', '8,13', '5,1'] },
    { name: 'a block of 3 x 3, homes to max', sxMm: 50, syMm: 40, insetXMm: 20, insetYMm: 15, travelXMm: 800, travelYMm: 600, dirX: -1, dirY: -1,
      suppressed: ['5,5', '6,5', '7,5', '5,6', '6,6', '7,6', '5,7', '6,7', '7,7'] },
    { name: 'a missing row across T-track panels', sxMm: 50, syMm: 50, insetXMm: 25, insetYMm: 25, travelXMm: 500, travelYMm: 500, dirX: 1, dirY: 1,
      trackAxis: 'x', panelHoles: 4, panelPitchMm: 235, suppressed: Array.from({ length: 10 }, (_, i) => (i + 1) + ',5') }
  ];
  for (const g0 of grids) {
    const g = macroGrid(Object.assign({ diaMm: 20, origin: 'center' }, g0));
    const m = buildMacros(Object.assign({}, base, { safeZMm: -5, extras: { holes: true }, holes: g }));
    const grid = holeGrid(g);
    assert.ok(grid.some((p) => p.suppressed), g.name);
    const minX = g.dirX > 0 ? 0 : -g.travelXMm, minY = g.dirY > 0 ? 0 : -g.travelYMm;
    for (let i = 0; i <= 50; i++) {
      for (let j = 0; j <= 50; j++) {
        const x = minX + g.travelXMm * i / 50, y = minY + g.travelYMm * j / 50;
        const want = grid[nearestHole(grid, x, y).index];
        const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: x, _abs_y: y }));
        assert.equal(p._error, undefined, g.name + ' at ' + x + ',' + y);
        const dWant = Math.hypot(want.x - x, want.y - y);
        assert.ok(Math.abs(Math.hypot(p.P0_x - x, p.P0_y - y) - dWant) < 1e-3, g.name + ' at ' + x + ',' + y + ': got ' + p.P0_x + ',' + p.P0_y + ' want ' + want.x + ',' + want.y);
        const hit = grid.find((h) => Math.abs(h.x - p.P0_x) < 1e-3 && Math.abs(h.y - p.P0_y) < 1e-3);
        assert.ok(hit && !hit.suppressed, g.name + ': not a real hole at ' + x + ',' + y);
      }
    }
  }
});

test('suppressed holes: short macro without any, a stop when nothing near is usable', () => {
  const plain = { diaMm: 20, origin: 'center', sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 };
  const without = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: macroGrid(plain) }));
  const outside = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: macroGrid(Object.assign({ suppressed: ['40,40'] }, plain)) }));
  assert.equal(without.setHole.body, outside.setHole.body, 'a suppression off the grid changes nothing');
  assert.ok(!/#11/.test(without.setHole.body));
  // One suppressed hole adds its check and a scan of its 8 neighbours.
  const one = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: macroGrid(Object.assign({ suppressed: ['3,3'] }, plain)) }));
  // 2 index lines per axis, #11 start, one run, #9, 2 position reads, 8 neighbours x 5, the stop.
  assert.equal(code(one.setHole.body).length - code(without.setHole.body).length, 4 + 1 + 1 + 1 + 2 + 8 * 5 + 2);
  // Hole 2,2 (144, 144) suppressed and every hole around it in a keepout
  // zone that stops short of it: stop rather than pick something far.
  const zones = [{ name: 'ATCi', minX: 0, maxX: 250, minY: 0, maxY: 250 }];
  const g = macroGrid(Object.assign({}, plain, { suppressed: ['2,2'], zones }));
  const blocked = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: g }));
  const p = run(blocked.setHole.body, Object.assign({}, ready, { _abs_x: 144, _abs_y: 144 }));
  assert.ok(p._error && p.P0_x === undefined);
});

test('setupFields reads saved Setup in today\'s units; putProfile replaces by name', () => {
  const saved = { units: 'metric', holeDia: '20', holeSx: '96', holeSy: '96', holeIx: '48', holeIy: '50.8', holeTrack: 'x', holePanelHoles: '5',
    holePanelPitch: '', holeLayout: 'grid', holeList: 'A: 25.4, 0', holeOrigin: 'back-right', holeSuppressed: ['2,2', 'junk'] };
  assert.deepEqual(setupFields({ holeFavorites: ['3,4', '#2', 'x'] }, false).favorites, ['3,4', '#2']);
  const mm = setupFields(saved, false);
  assert.deepEqual(mm, { dia: 20, sx: 96, sy: 96, ix: 48, iy: 50.8, layout: 'grid', name1: '', turn1: '', nearest1: true, grids: [], list: 'A: 25.4, 0', track: 'x', panelHoles: '5', pitch: '', origin: 'back-right', suppressed: ['2,2'], favorites: [] });
  const two = setupFields({ units: 'metric', holeLayout: 'both', holeGridName: 'Dogs', holeNearest: false, holeSuppressed: ['g2:3,4', 'g2:#1'],
    holeGrids: [{ name: 'Pins', dia: '6.35', sx: '25.4', sy: '25.4', ix: '12.7', iy: '0', track: 'q', pn: '', pp: '0', nearest: false }] }, true);
  assert.deepEqual([two.layout, two.name1, two.nearest1, two.suppressed], ['both', 'Dogs', false, ['g2:3,4', 'g2:#1']]);
  assert.deepEqual(two.grids, [{ name: 'Pins', dia: 0.25, sx: 1, sy: 1, ix: 0.5, iy: 0, track: '', pn: '5', pp: '', nearest: false, turn: '' }]);
  const inch = setupFields(Object.assign({}, saved, { holePanelPitch: '254' }), true);
  assert.deepEqual([inch.dia, inch.ix, inch.iy, inch.pitch, inch.list], [0.7874, 1.8898, 2, 10, 'A: 1, 0']);
  const empty = setupFields({}, true);
  assert.deepEqual([empty.dia, empty.layout, empty.track, empty.panelHoles, empty.pitch, empty.origin, empty.suppressed], [null, 'grid', '', null, '', 'center', []]);
  let list = putProfile([], ' Spoilboard ', { holeDia: '20' });
  list = putProfile(list, 'Airweights', { holeDia: '19' });
  list = putProfile(list, 'spoilboard', { holeDia: '21' });
  assert.deepEqual(list, [{ name: 'Airweights', holeDia: '19' }, { name: 'spoilboard', holeDia: '21' }]);
});

test('stock: the corner on the picked point, runs away from the hole; zero on any point of it', () => {
  assert.equal(stockCornerFor('back-right'), 'front-left');
  assert.equal(stockCornerFor('front-left'), 'back-right');
  assert.equal(stockCornerFor('left-center'), 'front-right');
  assert.equal(stockCornerFor('front-center'), 'back-left');
  assert.equal(stockCornerFor('center'), 'front-left');
  const r = stockRect(100, 200, 600, 400, 'front-left');
  assert.deepEqual(r, { minX: 100, maxX: 700, minY: 200, maxY: 600 });
  assert.deepEqual(stockRect(100, 200, 600, 400, 'back-right'), { minX: -500, maxX: 100, minY: -200, maxY: 200 });
  assert.deepEqual(rectPoint(r, 'center'), { x: 400, y: 400 });
  assert.deepEqual(rectPoint(r, 'back-right'), { x: 700, y: 600 });
  assert.deepEqual(rectPoint(r, 'left-center'), { x: 100, y: 400 });
  assert.deepEqual(rectPoint(r, 'front-center'), { x: 400, y: 200 });
});

test('excluded areas read as such; targetProblem names them', () => {
  const travel = { xMm: 800, yMm: 600, dirX: 1, dirY: 1 };
  assert.equal(targetProblem(50, 50, travel, [{ block: true, name: 'Blocked', minX: 0, maxX: 100, minY: 0, maxY: 100 }]), 'in an excluded area');
  assert.equal(targetProblem(50, 50, travel, [{ name: 'ATCi', minX: 0, maxX: 100, minY: 0, maxY: 100 }]), 'in the ATCi keepout zone');
});

test('suppressed: a real neighbour in a keepout zone stops the macro, never a far hole', () => {
  const plain = { diaMm: 20, origin: 'center', sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 };
  const zones = [{ name: 'ATCi', minX: 0, maxX: 250, minY: 0, maxY: 250 }];
  for (const suppressed of [['2,2'], ['2,2', '8,12']]) {
    const m = buildMacros(Object.assign({}, base, { safeZMm: -5, extras: { holes: true }, holes: macroGrid(Object.assign({}, plain, { suppressed, zones })) }));
    let p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: 144, _abs_y: 144 }));
    assert.ok(p._error && p.P0_x === undefined, JSON.stringify(suppressed) + ': XY0 must stop');
    p = run(m.goHole.body, Object.assign({}, ready, { _abs_x: 144, _abs_y: 144, _abs_z: -30 }));
    assert.ok(p._error && p._mx === undefined, JSON.stringify(suppressed) + ': Go must stop');
  }
});

test('suppressed: whole missing columns cost a line each, and still pick the nearest real hole', () => {
  const g0 = { diaMm: 10, origin: 'center', sxMm: 25, syMm: 25, insetXMm: 12.5, insetYMm: 12.5, travelXMm: 1000, travelYMm: 1000, dirX: 1, dirY: 1 };
  const cols = Math.floor((1000 - 12.5) / 25) + 1, rows = cols, suppressed = [];
  for (let c = 4; c <= cols; c += 4) for (let r = 1; r <= rows; r++) suppressed.push(c + ',' + r);
  const g = macroGrid(Object.assign({}, g0, { suppressed }));
  const m = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: g }));
  const runs = code(m.setHole.body).filter((l) => /^#11=\[#11 \+/.test(l)).length;
  assert.equal(runs, Math.floor(cols / 4));
  const grid = holeGrid(g);
  for (const [x, y] of [[87.5, 500], [100, 12], [990, 990], [312.5, 700.2]]) {
    const want = grid[nearestHole(grid, x, y).index];
    const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: x, _abs_y: y }));
    assert.equal(p._error, undefined);
    assert.ok(Math.abs(Math.hypot(p.P0_x - x, p.P0_y - y) - Math.hypot(want.x - x, want.y - y)) < 1e-3, x + ',' + y);
  }
});

test('config.html has no duplicate element ids', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dup, []);
});

// The macro's pick against the picker's, over a sweep of spindle positions.
function sweep(g, label, n = 30) {
  const m = buildMacros(Object.assign({}, base, { safeZMm: -5, extras: { holes: true }, holes: g }));
  const holes = allHoles(g).filter((p) => !p.suppressed && !(p.layer && g.grids[p.layer - 1].nearest === false));
  const minX = g.dirX > 0 ? 0 : -g.travelXMm, minY = g.dirY > 0 ? 0 : -g.travelYMm;
  let checked = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    const x = minX + g.travelXMm * i / n, y = minY + g.travelYMm * j / n;
    const want = holes[nearestHole(holes, x, y).index];
    const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: x, _abs_y: y }));
    const r = (want.diaMm != null ? want.diaMm : g.diaMm) / 2, o = holeOriginOffset(g.origin, r);
    const tx = want.x + o.dx, ty = want.y + o.dy;
    const inside = tx >= minX - 1e-6 && tx <= minX + g.travelXMm + 1e-6 && ty >= minY - 1e-6 && ty <= minY + g.travelYMm + 1e-6;
    if (!inside) continue;
    assert.equal(p._error, undefined, label + ' at ' + x + ',' + y);
    // Ties (equally near holes) may go either way; compare distances, then the side offset.
    const got = holes.find((h) => { const rr = (h.diaMm != null ? h.diaMm : g.diaMm) / 2, oo = holeOriginOffset(g.origin, rr); return Math.abs(h.x + oo.dx - p.P0_x) < 1e-3 && Math.abs(h.y + oo.dy - p.P0_y) < 1e-3; });
    assert.ok(got, label + ': not a hole\'s side at ' + x + ',' + y + ' got ' + p.P0_x + ',' + p.P0_y);
    assert.ok(Math.abs(Math.hypot(got.x - x, got.y - y) - Math.hypot(want.x - x, want.y - y)) < 1e-3, label + ' at ' + x + ',' + y);
    checked++;
  }
  return checked;
}

test('grid + extra holes with their own diameters: the nearest of both, side offset by its own radius', () => {
  const list = [{ name: 'pin', xMm: 130, yMm: 40, diaMm: 6 }, { name: 'big', xMm: 500, yMm: 700 }, { name: 'A', xMm: 20, yMm: 300, diaMm: 8 }];
  for (const origin of ['center', 'back-right', 'front-left']) {
    const g = macroGrid({ layout: 'both', list, diaMm: 20, origin, sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 });
    assert.ok(sweep(g, 'both ' + origin) > 500);
  }
  // Pin at reference + (130, 40) = (178, 88): back-right side is 3 mm out each way.
  const g = macroGrid({ layout: 'both', list, diaMm: 20, origin: 'back-right', sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1 });
  const m = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: g }));
  const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: 179, _abs_y: 87 }));
  assert.deepEqual([p.P0_x, p.P0_y], [181, 91]);
});

test('several grids: dog holes and a pin grid, suppressed holes in each, one left out of Nearest', () => {
  const dogs = { diaMm: 20, sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48 };
  const pins = { diaMm: 6, sxMm: 32, syMm: 32, insetXMm: 16, insetYMm: 600, trackAxis: null, panelHoles: 0, panelPitchMm: 0 };
  for (const [dirX, dirY] of [[1, 1], [-1, -1]]) {
    const g = macroGrid(Object.assign({ layout: 'grid', origin: 'back-right', travelXMm: 812, travelYMm: 1230, dirX, dirY, suppressed: ['2,2', '3,7', 'g2:1,1', 'g2:5,3'] }, dogs));
    g.grids = [pins];
    assert.ok(sweep(g, 'two grids ' + dirX) > 500);
    // The pins left out of Nearest: only dog holes.
    const g2 = Object.assign({}, g, { grids: [Object.assign({ nearest: false }, pins)] });
    const m = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: g2 }));
    const at = { x: dirX * (16 + 32 * 4), y: dirY * (600 + 32 * 2) };
    const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: at.x, _abs_y: at.y }));
    const dogsOnly = allHoles(Object.assign({}, g2, { grids: [] })).filter((h) => !h.suppressed);
    const want = dogsOnly[nearestHole(dogsOnly, at.x, at.y).index];
    assert.deepEqual([p.P0_x, p.P0_y], [want.x + 10, want.y + 10]);
  }
  // The first grid left out, with a second one: only its holes.
  const g3 = macroGrid(Object.assign({ layout: 'grid', origin: 'center', travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1, nearest: false }, dogs));
  g3.grids = [pins];
  const m3 = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: g3 }));
  const p3 = run(m3.setHole.body, Object.assign({}, ready, { _abs_x: 48, _abs_y: 48 }));
  assert.deepEqual([p3.P0_x, p3.P0_y], [48, 600]);
  assert.ok(code(m3.setHole.body).every((l) => l.length <= 200));
});

test('allHoles: keys for later grids start g2:, and keep their own diameter', () => {
  const g = { layout: 'grid', diaMm: 20, sxMm: 100, syMm: 100, insetXMm: 50, insetYMm: 50, travelXMm: 300, travelYMm: 200, dirX: 1, dirY: 1,
    suppressed: ['g2:1,1'], grids: [{ diaMm: 6, sxMm: 50, syMm: 50, insetXMm: 25, insetYMm: 25 }] };
  const h = allHoles(g);
  assert.equal(h.filter((p) => !p.layer).length, 6);
  const second = h.filter((p) => p.layer === 1);
  assert.equal(second.length, 6 * 4);
  assert.ok(second[0].suppressed && second[0].diaMm === 6 && !second[1].suppressed);
});

test('a listed hole near a keepout corner is left out the way the macro tests it, so the next one is used', () => {
  const list = [{ name: 'corner', xMm: 292, yMm: 292 }, { name: 'far', xMm: 100, yMm: 100 }];
  const g = Object.assign(macroGrid({ layout: 'list', list, insetXMm: 0, insetYMm: 0, diaMm: 20, origin: 'center', travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1,
    zones: [{ name: 'ATCi', minX: 300, maxX: 400, minY: 300, maxY: 400 }] }), { lastXMm: 0, lastYMm: 0 });
  const m = buildMacros(Object.assign({}, base, { extras: { holes: true }, holes: g }));
  const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: 290, _abs_y: 290 }));
  assert.equal(p._error, undefined);
  assert.deepEqual([p.P0_x, p.P0_y], [100, 100]);
});

test('list lines take a fourth value, the height above the spoilboard; a blank diameter keeps Hole Diameter', () => {
  const r = parseHoleList('vise: 400, 250, , 63.5\njig: 10, 20, 6, 2-1/2"\n5, 6, 7, 8, 9', false);
  assert.deepEqual(r.bad, [3]);
  assert.deepEqual(r.holes, [{ name: 'vise', xMm: 400, yMm: 250, zMm: 63.5 }, { name: 'jig', xMm: 10, yMm: 20, diaMm: 6, zMm: 63.5 }]);
  assert.equal(formatHoleList(r.holes, false), 'vise: 400, 250,, 63.5\njig: 10, 20, 6, 63.5');
  assert.deepEqual(parseHoleList(formatHoleList(r.holes, false), false).holes, r.holes);
  const g = holeGrid({ layout: 'list', list: r.holes, insetXMm: 0, insetYMm: 0, travelXMm: 800, travelYMm: 600, dirX: 1, dirY: 1 });
  assert.equal(g[0].zMm, 63.5);
});

test('Z0 above the spoilboard: spoilboard height + h for any tool, saved Z0 kept, guarded', () => {
  const o = { wcs: 2, slot: 9, backup: 8, thick: 7 };
  const lines = zAboveSpoilLines(o, 2, 63.5).join('\n');
  const base = { _homed_state: 1, _tool_offset: 1, 5383: -80, 5243: -40 };
  let p = run(lines, Object.assign({}, base));
  assert.equal(p._error, undefined);
  assert.equal(p[offsetZParam(2)], -80 + 63.5);
  assert.equal(p[offsetZParam(8)], -40, 'the old Z0 is saved for Z0 back to saved');
  assert.equal(run(lines, Object.assign({}, base, { _tool_offset: 0, 5403: -55.173 }))._error, undefined, 'an offset kept through a soft reset counts');
  for (const [k, v] of [['_homed_state', 0], ['_tool_offset', 0], [5383, 0], [5213, 1.5]]) {
    const q = runAll(lines, Object.assign({}, base, { [k]: v }));
    assert.equal(q[offsetZParam(2)], -40, k + ': Z0 unchanged even if every line is sent');
    assert.equal(q[offsetZParam(8)], undefined, k + ': nothing saved');
  }
  assert.ok(code(lines).every((l) => l.length < 200), 'lines fit grblHAL\'s buffer');
});

test('Set Z0 keeps a probed Z0 through repeats and the Z0 macros, and only for their own offset', () => {
  const o = { wcs: 1, slot: 9, backup: 8, thick: 7 };
  const Z = (p) => offsetZParam(p);
  const start = () => Object.assign({}, ready, { _homed_state: 1, [Z(9)]: -80, [Z(1)]: -40, [Z(7)]: 19 });
  // Set Z0 twice: the probed -40 survives.
  let p = run(zAboveSpoilLines(o, 1, 63.5).join('\n'), start());
  p = run(zAboveSpoilLines(o, 1, 63.5).join('\n'), p);
  assert.equal(p[Z(1)], -16.5);
  assert.equal(p[Z(8)], -40);
  // Set Z0 on a vise, then another height, then SBT: Z0 on spoilboard: still -40.
  p = run(zAboveSpoilLines(o, 1, 40).join('\n'), p);
  assert.equal(p[Z(8)], -40);
  const m = buildMacros(Object.assign({}, base, { wcs: 1, slot: 9, backup: 8, thick: 7 }));
  p = run(m.set.body, p);
  assert.equal(p[Z(1)], -80);
  assert.equal(p[Z(8)], -40, 'the Z0 macro sees the picker\'s last height as its own');
  p = run(m.restore.body, p);
  assert.equal(p[Z(1)], -40, 'back to saved returns the probed Z0');
  // On another offset: nothing is saved and no marker is written.
  const other = zAboveSpoilLines(o, 2, 63.5);
  assert.ok(!other.some((l) => /^G10 L2 P8|^G10 L2 P7/.test(l)));
  const q = run(other.join('\n'), Object.assign(start(), { [Z(2)]: -30 }));
  assert.equal(q[Z(2)], -16.5);
  assert.equal(q[Z(8)], undefined);
});

test('parseHoleList gives each hole its line number', () => {
  const r = parseHoleList('( fixtures )\npin: 1, 2\n\nbad line\nvise: 400, 250, , 6350', false);
  assert.deepEqual(r.lines, [2, 5]);
  assert.deepEqual(r.bad, [4]);
});

// ---------- Cutting the holes ----------

const cutBase = (over) => Object.assign({
  holes: [{ x: 100, y: 100, diaMm: 20, label: 'A1' }],
  bitMm: 6.35, depthMm: 18, stepMm: 3, stepoverPct: 40, feed: 1500, plunge: 500, rpm: 18000, delayS: 3,
  wcs: { p: 1, x: 10, y: -20.5 }, safeZMm: -5, zones: [], imperial: false, thickMm: 19.05
}, over);

// Every point the bit's centre passes while cutting (below Z0), from the
// program's moves, plus the deepest Z reached.
function cutTrace(lines) {
  let p = { x: 0, y: 0, z: 0 }; const pts = []; let deepest = 0;
  for (const line of lines) {
    const g = /^G([0-3])\b/.exec(line); if (!g) continue;
    const v = (k, d) => { const m = new RegExp('(?:^|\\s)' + k + '(-?[\\d.]+)').exec(line); return m ? +m[1] : d; };
    const q = { x: v('X', p.x), y: v('Y', p.y), z: v('Z', p.z) };
    if (g[1] !== '0' && Math.max(p.z, q.z) < 0) {
      if (g[1] === '1') { for (let i = 0; i <= 20; i++) pts.push([p.x + (q.x - p.x) * i / 20, p.y + (q.y - p.y) * i / 20]); }
      else {
        const cx = p.x + v('I', 0), cy = p.y + v('J', 0), r = Math.hypot(p.x - cx, p.y - cy);
        let a0 = Math.atan2(p.y - cy, p.x - cx), a1 = Math.atan2(q.y - cy, q.x - cx);
        if (a1 <= a0) a1 += 2 * Math.PI;
        for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      }
    }
    deepest = Math.min(deepest, q.z);
    p = q;
  }
  return { pts, deepest };
}

test('cut holes: drill, helix or clear by the bit and hole size', () => {
  assert.equal(holeCutMethod(6.35, 6.35), 'drill');
  assert.equal(holeCutMethod(6.38, 6.35), 'drill');
  assert.equal(holeCutMethod(6, 6.35), 'too-small');
  assert.equal(holeCutMethod(12.7, 6.35), 'helix');
  assert.equal(holeCutMethod(20, 6.35), 'clear');
});

test('cut holes: skips suppressed, hidden and blocked holes and fixtures; listed holes when asked', () => {
  const grid = [{ col: 1, row: 1 }, { col: 2, row: 1, suppressed: true }, { col: 3, row: 1, hidden: true }, { col: 4, row: 1, blocked: true },
    { index: 1, name: 'pin' }, { index: 2, name: 'vise', zMm: 63.5 }];
  assert.deepEqual(holesToCut(grid, false).map(p => p.col), [1]);
  assert.deepEqual(holesToCut(grid, true).map(p => p.name || p.col), [1, 'pin']);
});

test('cut holes: rows back and forth, grids in turn, then listed holes nearest first', () => {
  const g = [];
  for (let r = 1; r <= 2; r++) for (let c = 1; c <= 3; c++) g.push({ col: c, row: r, x: c * 10, y: r * 10 });
  g.push({ col: 1, row: 1, layer: 1, x: 500, y: 0 }, { index: 1, x: 0, y: 0 }, { index: 2, x: 480, y: 0 });
  assert.deepEqual(cutOrder(g).map(p => p.index != null ? '#' + p.index : (p.layer ? 'g2:' : '') + p.col + ',' + p.row),
    ['1,1', '2,1', '3,1', '3,2', '2,2', '1,2', 'g2:1,1', '#2', '#1']);
});

test('cut holes: a line over a zone, grown by the bit radius', () => {
  const z = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  assert.equal(lineCrossesZone({ x: -5, y: 5 }, { x: 15, y: 5 }, z, 0), true);
  assert.equal(lineCrossesZone({ x: -5, y: 12 }, { x: 15, y: 12 }, z, 0), false);
  assert.equal(lineCrossesZone({ x: -5, y: 12 }, { x: 15, y: 12 }, z, 3), true);
  assert.equal(lineCrossesZone({ x: 20, y: 20 }, { x: 30, y: 30 }, z, 1), false);
});

test('cut holes: problems stop it', () => {
  assert.deepEqual(holeCutProblems(cutBase()), []);
  assert.match(holeCutProblems(cutBase({ depthMm: 20 })).join(), /more than the spoilboard/);
  assert.match(holeCutProblems(cutBase({ bitMm: 25 })).join(), /bigger than A1/);
  assert.match(holeCutProblems(cutBase({ holes: [] })).join(), /no holes/);
  assert.match(holeCutProblems(cutBase({ stepMm: 0 })).join(), /Depth per Pass/);
  assert.match(holeCutProblems(cutBase({ stepoverPct: 0 })).join(), /Stepover/);
  assert.deepEqual(holeCutProblems(cutBase({ stepoverPct: 0, holes: [{ x: 100, y: 100, diaMm: 6.35, label: 'A1' }, { x: 120, y: 100, diaMm: 10, label: 'A2' }] })), []);
});

test('cut holes: stop lines before anything moves, and the work offset must not have moved', () => {
  const L = holeCutProgram(cutBase());
  const firstMove = L.findIndex(l => /^(G0|G1|G2|G3|M3|G53)\b/.test(l));
  const stops = L.map((l, i) => [l, i]).filter(([l]) => /SBT stop/.test(l));
  assert.equal(stops.length, 3);
  assert.ok(stops.every(([, i]) => i < firstMove));
  // Units and the work offset only after the stops, so a stop leaves the units alone.
  const units = L.indexOf('G21 G17 G90 G94');
  assert.ok(stops.every(([, i]) => i < units));
  assert.equal(L[units + 1], 'G54');
  const check = stops[2][0].replace(/\s*\(.*$/, '').replace(/^#1=/, '');
  // Its own X0 Y0 (G54 X 10, Y -20.5) passes; moved by a hair it stops (error 72).
  assert.equal(evalExpr(check, { 5221: 10, 5222: -20.5 }), 1);
  assert.throws(() => evalExpr(check, { 5221: 10.01, 5222: -20.5 }), /error:72/);
  assert.match(stops[2][0], /#5222 \+ 20\.500/);
  for (const l of L) assert.ok(l.length < 190, l);
});

test('cut holes: the bit stays inside each hole and reaches its edge and depth', () => {
  for (const [dia, method] of [[20, 'clear'], [10, 'helix'], [6.35, 'drill']]) {
    const o = cutBase({ holes: [{ x: 100, y: 100, diaMm: dia, label: 'A1' }] }), L = holeCutProgram(o);
    assert.ok(L.some(l => l.endsWith(', ' + method + ')')), method);
    const { pts, deepest } = cutTrace(L), cx = 90, cy = 120.5, pr = dia / 2 - 6.35 / 2;
    const far = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    assert.ok(far <= pr + 1e-4, method + ' stays inside: ' + far);
    if (method !== 'drill') assert.ok(Math.abs(far - pr) < 1e-4, method + ' reaches the edge');
    assert.equal(deepest, -18);
  }
});

test('cut holes: hops 5 mm between holes, lifting to Safe Z over a keepout', () => {
  const holes = [{ x: 0, y: 0, diaMm: 20, label: 'A1' }, { x: 100, y: 0, diaMm: 20, label: 'A2' }, { x: 100, y: 100, diaMm: 20, label: 'B2' }];
  const zones = [{ minX: 40, maxX: 60, minY: -10, maxY: 10 }];
  const L = holeCutProgram(cutBase({ holes, zones, wcs: { p: 1, x: 0, y: 0 } }));
  const holeAt = (n) => L.findIndex(l => l.startsWith('(SBT hole ' + n + '/'));
  assert.equal(L[holeAt(2) + 1], 'G53 G0 Z-5.000', 'lifts before crossing the zone');
  assert.match(L[holeAt(3) + 1], /^G0 X/, 'hops to the next one');
  assert.equal(L[L.length - 1], 'M30');
  assert.deepEqual(L.slice(-3), ['G53 G0 Z-5.000', 'M5', 'M30']);
  assert.ok(holeCutProgram(cutBase({ imperial: true })).includes('G20'));
  // No pause: ncSender shows no prompt for M0.
  assert.ok(!holeCutProgram(cutBase()).some(l => /^M0/.test(l)));
});

test('cut holes: minutes from moves and dwells', () => {
  assert.ok(Math.abs(programMinutes(['G4 P30', 'G1 X100 F1000', 'G0 X0'], 5000) - (0.5 + 0.1 + 0.02)) < 1e-9);
  assert.ok(Math.abs(programMinutes(['G1 X10 Y0 F100', 'G3 X-10 Y0 I-10 J0'], 1000) - (10 + Math.PI * 10) / 100) < 1e-9);
});

// ---------- Labels, chamfers, a fit test, calibration ----------

test('stroke font: every letter and digit, inside its 4 x 6 box', () => {
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-') {
    assert.ok(STROKE_FONT[ch] && STROKE_FONT[ch].length, ch);
    for (const line of STROKE_FONT[ch]) for (const [x, y] of line) assert.ok(x >= 0 && x <= 4 && y >= 0 && y <= 6, ch);
  }
  assert.equal(textWidth('B12', 6), 16);
  const s = textStrokes('A1', 10, 20, 6);
  assert.deepEqual(s[0][0], { x: 10, y: 20 });
  assert.ok(s.every(st => st.every(p => p.x >= 10 && p.x <= 26 && p.y >= 20 && p.y <= 26)));
});

const labelGrid = () => holeGrid({ sxMm: 48.6, syMm: 48.6, insetXMm: 6.858, insetYMm: 21.846, travelXMm: 300, travelYMm: 200, dirX: 1, dirY: 1, diaMm: 8 });
const labelOpts = (g, over) => Object.assign({ textMm: 5, gapMm: 2, travel: { xMm: 300, yMm: 200, dirX: 1, dirY: 1 }, zones: [], holeR: () => 4, all: g }, over);

test('labels: every hole beside it toward the next column, or the edges only', () => {
  const g = labelGrid(), every = labelPlacements(g, 'every', labelOpts(g));
  assert.equal(every.labels.length, g.length);
  const a1 = every.labels.find(l => l.tag === 'A1');
  assert.deepEqual([a1.text, +a1.x.toFixed(3), +a1.y.toFixed(3)], ['A1', 6.858 + 4 + 2, 21.846 - 2.5]);
  const edges = labelPlacements(g, 'edges', labelOpts(g));
  // 7 columns, 4 rows: A1 at the corner, numbers 2-7 along row A, letters B-D up column 1.
  assert.deepEqual(edges.labels.map(l => l.text).sort(), ['2', '3', '4', '5', '6', '7', 'A1', 'B', 'C', 'D']);
  // Homing to the right (columns count up along -X): labels go on the -X side.
  const neg = holeGrid({ sxMm: 48.6, syMm: 48.6, insetXMm: 6.858, insetYMm: 21.846, travelXMm: 300, travelYMm: 200, dirX: -1, dirY: 1, diaMm: 8 });
  const n1 = labelPlacements(neg, 'every', labelOpts(neg, { travel: { xMm: 300, yMm: 200, dirX: -1, dirY: 1 } })).labels.find(l => l.tag === 'A1');
  assert.ok(n1.x + textWidth('A1', 5) <= -6.858 - 4 - 2 + 1e-9);
});

test('labels: too big for the gap, in a zone, or off the travel are left out', () => {
  const g = labelGrid();
  assert.equal(labelPlacements(g, 'every', labelOpts(g, { textMm: 30 })).labels.length, 0);
  const z = labelPlacements(g, 'every', labelOpts(g, { zones: [{ minX: 0, maxX: 30, minY: 0, maxY: 40 }] }));
  assert.deepEqual(z.skipped.map(s => s.tag + ' ' + s.why), ['A1 in a keepout zone or Exclude Picks area']);
  // The last column's labels go on its other side.
  const last = labelPlacements(g, 'every', labelOpts(g)).labels.find(l => l.tag === 'A7'), a7 = g.find(p => p.tag === 'A7');
  assert.ok(last.x + textWidth('A7', 5) <= a7.x - 4 - 2 + 1e-9);
});

test('engraving: V-bit strokes at depth, a laser without Z moves', () => {
  const base = { labels: [{ text: 'A1', x: 20, y: 30 }], textMm: 6, depthMm: 0.4, feed: 800, plunge: 300, rpm: 18000, delayS: 2,
    wcs: { p: 1, x: 10, y: 10 }, safeZMm: -5, zones: [], imperial: false };
  const v = engraveProgram(base);
  assert.ok(v.includes('G1 Z-0.400 F300'));
  assert.ok(v.includes('G0 X10.000 Y20.000'), 'A starts at its bottom left, in G54');
  assert.ok(v.some(l => /^M3 S18000/.test(l)));
  const laser = engraveProgram(Object.assign({}, base, { laser: true, power: 600 }));
  assert.ok(laser.includes('M4 S600'));
  assert.ok(!laser.some(l => /Z/.test(l.replace(/\(.*\)/, '')) && !/^#1=/.test(l)), 'no Z moves');
  assert.ok(!laser.some(l => /^M3 /.test(l)));
  assert.deepEqual(laser.slice(-2), ['M5', 'M30']);
});

test('chamfer: the V-bit’s flank on each hole’s edge', () => {
  const o = { holes: [{ x: 50, y: 50, diaMm: 8, label: 'A1' }, { x: 100, y: 50, diaMm: 0.4, label: 'pin' }], vAngleDeg: 90, chamferMm: 0.8,
    feed: 1000, plunge: 300, rpm: 18000, delayS: 0, wcs: { p: 1, x: 0, y: 0 }, safeZMm: null, zones: [], imperial: false };
  const L = chamferProgram(o);
  // 90 degrees: tip 0.8 + 0.5 deep, 0.5 inside the edge (radius 3.5); the cone meets the surface 0.8 out.
  assert.ok(L.includes('G0 X53.500 Y50.000'));
  assert.ok(L.includes('G1 Z-1.300 F300'));
  const tipR = 3.5, depth = 1.3; assert.ok(Math.abs(tipR + depth * Math.tan(Math.PI / 4) - (4 + 0.8)) < 1e-9);
  // A hole too small for that is countersunk at its middle: (0.2 + 0.8) deep at 90 degrees.
  assert.ok(L.includes('G1 Z-1.000 F300'));
});

test('fit test: a row of sizes from the scrap’s corner, smallest first', () => {
  const t = fitTestHoles(8, 0.05, 5);
  assert.deepEqual(t.map(h => h.diaMm), [7.9, 7.95, 8, 8.05, 8.1]);
  // 10 mm from the scrap's edges to the biggest hole's edge, 6 mm of wall between holes.
  assert.deepEqual([t[0].x, t[0].y, +(t[1].x - t[0].x).toFixed(3)], [14.05, 14.05, 14.1]);
  const e = fitTestHoles(8, 0.05, 5, 3);
  assert.deepEqual([e[0].x, e[0].y], [7.05, 7.05]);
  const L = holeCutProgram({ holes: t.map(h => Object.assign({}, h, { x: h.x + 100, y: h.y + 50 })), bitMm: 6.35, depthMm: 10, stepMm: 3, stepoverPct: 40,
    feed: 1500, plunge: 500, rpm: 18000, delayS: 0, wcs: { p: 1, x: 100, y: 50 }, safeZMm: null, zones: [], zWhat: 'the scrap', title: 'dowel fit test' });
  assert.match(L[0], /dowel fit test/);
  assert.match(L[1], /Z0 must be on the scrap/);
});

test('calibration: spacing, insets and turn from probed holes', () => {
  // A 48.6 grid at insets 6.9 / 21.8, turned 0.1 degree, probed at three holes.
  const turn = 0.1 * Math.PI / 180, at = (c, r) => {
    const x = 6.9 + (c - 1) * 48.6, y = 21.8 + (r - 1) * 48.6;
    return { col: c, row: r, x: x * Math.cos(turn) - y * Math.sin(turn), y: x * Math.sin(turn) + y * Math.cos(turn) };
  };
  const f = fitGrid([at(1, 1), at(15, 1), at(1, 20)], 1, 1, 48, 48);
  assert.ok(Math.abs(f.sx - 48.6) < 0.01 && Math.abs(f.sy - 48.6) < 0.01, JSON.stringify(f));
  assert.ok(Math.abs(f.turnDeg - 0.1) < 1e-6 && f.turnMeasured);
  // Turned, the grid fits every measured hole.
  assert.ok(f.missMm < 1e-6, String(f.missMm));
  // The insets are where the first hole really is, and holeGrid with them and the turn puts every hole back.
  assert.ok(Math.abs(f.ix - at(1, 1).x) < 1e-6 && Math.abs(f.iy - at(1, 1).y) < 1e-6);
  const g = holeGrid({ sxMm: f.sx, syMm: f.sy, insetXMm: f.ix, insetYMm: f.iy, turnDeg: f.turnDeg, travelXMm: 1300, travelYMm: 1300, dirX: 1, dirY: 1 });
  for (const [c, r] of [[1, 1], [15, 1], [1, 20], [9, 13]]) {
    const h = g.find((p) => p.col === c && p.row === r), w = at(c, r);
    assert.ok(Math.hypot(h.x - w.x, h.y - w.y) < 1e-6, c + ',' + r);
  }
  // Measured from a hole that isn't the first, the turn still comes out about the first hole.
  const f2 = fitGrid([at(4, 3), at(10, 3), at(4, 9)], 1, 1, 48.6, 48.6);
  assert.ok(Math.abs(f2.ix - at(1, 1).x) < 1e-6 && Math.abs(f2.iy - at(1, 1).y) < 1e-6 && f2.missMm < 1e-6);
  // One hole can't show a turn: Setup's is kept.
  const kept = fitGrid([at(3, 2)], 1, 1, 48.6, 48.6, 0.1);
  assert.ok(!kept.turnMeasured && Math.abs(kept.turnDeg - 0.1) < 1e-9 && Math.abs(kept.ix - at(1, 1).x) < 1e-6 && kept.missMm < 1e-6);
  // One hole: the inset only, spacing kept.
  const one = fitGrid([{ col: 3, row: 2, x: 6.9 + 2 * 48.6 + 0.3, y: 21.8 + 48.6 }], 1, 1, 48.6, 48.6);
  assert.deepEqual([+one.ix.toFixed(3), +one.sx.toFixed(3), one.fittedX], [7.2, 48.6, false]);
  const pc = probedCenter(10, 18, 30, 38.2);
  assert.deepEqual([pc.x, pc.y, pc.diaX, +pc.diaY.toFixed(6)], [14, 34.1, 8, 8.2]);
});

test('surfacing: a finished Wasteboard Surfacing job, and how much it took off', () => {
  const head = '(QuickCut: Planer)\n(Mode: Wasteboard Surfacing)\n(Depth: 0.5mm, Step: 0.5mm)';
  const job = { filename: 'QuickCut-Planer_x.nc', status: 'completed', jobEndTime: '2026-10-28T03:00:00Z' };
  assert.deepEqual(surfacingDone(job, head), { key: 'QuickCut-Planer_x.nc@2026-10-28T03:00:00Z', depthMm: 0.5 });
  assert.equal(surfacingDone(Object.assign({}, job, { status: 'stopped' }), head), null);
  assert.equal(surfacingDone(job, head.replace('Wasteboard Surfacing', 'Target Depth')), null);
  assert.equal(surfacingDone(job, '(Mode: Wasteboard Surfacing)\n(Depth: 0.02inch, Step: 0.02inch)').depthMm, 0.508);
});

test('program comments are plain ASCII', () => {
  const L = chamferProgram({ holes: [{ x: 50, y: 50, diaMm: 8, label: 'Pins \u00b7 A1' }], vAngleDeg: 90, chamferMm: 0.8, feed: 1000, plunge: 300,
    rpm: 0, delayS: 0, wcs: { p: 1, x: 0, y: 0 }, safeZMm: null, zones: [], imperial: false });
  for (const l of L) assert.match(l, /^[\x20-\x7e]*$/, l);
  assert.ok(L.some(l => /90 deg V-bit/.test(l)) && L.some(l => /Pins - A1/.test(l)));
});

test('cut holes: a hole whose cut would go past the travel is a problem', () => {
  const o = cutBase({ holes: [{ x: 798, y: 100, diaMm: 20, label: 'A9' }], wcs: { p: 1, x: 0, y: 0 }, travel: { xMm: 800, yMm: 1200, dirX: 1, dirY: 1 } });
  assert.match(holeCutProblems(o).join(), /A9 reaches outside the machine.s travel/);
  assert.deepEqual(holeCutProblems(cutBase({ holes: [{ x: 790, y: 100, diaMm: 20, label: 'A9' }], travel: { xMm: 800, yMm: 1200, dirX: 1, dirY: 1 } })), []);
});

test('cut holes: a spiral down a hole just bigger than the bit goes no faster than Plunge in Z', () => {
  const L = holeCutProgram(cutBase({ holes: [{ x: 100, y: 100, diaMm: 6.5, label: 'A1' }] }));
  let p = { x: 0, y: 0, z: 0 }, worst = 0;
  for (const line of L) {
    const g = /^G([0-3])\b/.exec(line); if (!g) continue;
    const v = (k, d) => { const m = new RegExp('(?:^|\\s)' + k + '(-?[\\d.]+)').exec(line); return m ? +m[1] : d; };
    const q = { x: v('X', p.x), y: v('Y', p.y), z: v('Z', p.z) }, F = v('F', null);
    if (g[1] === '3' && q.z < p.z) {
      const r = Math.hypot(v('I', 0), v('J', 0)), len = Math.hypot(Math.PI * r, p.z - q.z);
      worst = Math.max(worst, F * (p.z - q.z) / len);
    }
    p = q;
  }
  assert.ok(worst <= 500 + 1, 'Z speed ' + worst);
});

// A 6 x 4 grid 50 apart from (50, 50), and a 300 x 200 stock from (20, 30).
const stockGrid = () => {
  const g = [];
  for (let r = 1; r <= 4; r++) for (let c = 1; c <= 6; c++) g.push({ col: c, row: r, x: c * 50, y: r * 50, tag: String.fromCharCode(64 + r) + c });
  return g;
};
const stockBox = { minX: 20, maxX: 320, minY: 30, maxY: 230 };

test('stock holes: only holes whose edge is the margin inside the stock', () => {
  const c = stockHoleCandidates(stockGrid(), stockBox, 4, 10);
  assert.equal(c.length, 24);
  // 3 mm more drops the last column (300 + 21 > 320) and the first row (50 - 21 < 30).
  assert.equal(stockHoleCandidates(stockGrid(), stockBox, 4, 17).length, 15);
  // A wider margin drops the first column (50 - 20 = 30 < 4 + 30) and the top row.
  assert.deepEqual(stockHoleCandidates(stockGrid(), stockBox, 4, 30).map(p => p.tag), ['B2', 'B3', 'B4', 'B5', 'C2', 'C3', 'C4', 'C5']);
});

test('stock holes: bolts nearest each corner, or every one', () => {
  const c = stockHoleCandidates(stockGrid(), stockBox, 4, 10);
  assert.deepEqual(stockBoltHoles(c, stockBox, 'corners').map(p => p.tag), ['A1', 'A6', 'D6', 'D1']);
  assert.equal(stockBoltHoles(c, stockBox, 'all').length, 24);
  // One hole inside: it's the only bolt.
  assert.deepEqual(stockBoltHoles([c[0]], stockBox, 'corners').map(p => p.tag), ['A1']);
});

test('stock holes: flip pins on the line nearest the middle, as far apart as fit', () => {
  const c = stockHoleCandidates(stockGrid(), stockBox, 4, 10);
  // The stock's middle is at Y 130: rows B (100) and C (150) are 30 and 20 off.
  const fx = flipPins(c, stockBox, 'x');
  assert.deepEqual(fx.pins.map(p => p.tag), ['C1', 'C6']);
  assert.equal(fx.lineMm, 150);
  assert.equal(fx.offMm, -20);
  // Across X the middle is 170: column 3 (150) is 20 off, column 4 (200) 30.
  const fy = flipPins(c, stockBox, 'y');
  assert.deepEqual(fy.pins.map(p => p.tag), ['A3', 'D3']);
  assert.equal(fy.offMm, 20);
  assert.equal(flipPins([c[0]], stockBox, 'x'), null);
  // Flipped over the line, the stock moves by twice how far its middle is off.
  assert.deepEqual(flipRect(stockBox, 'x', 150), { minX: 20, maxX: 320, minY: 70, maxY: 270 });
  assert.deepEqual(flipRect(stockBox, 'y', 170), stockBox);
});

test('stock holes: each hole can have its own depth (a counterbore, then the hole through)', () => {
  const L = holeCutProgram(cutBase({ holes: [{ x: 100, y: 100, diaMm: 12, depthMm: 4, label: 'A1 counterbore' }, { x: 100, y: 100, diaMm: 6.35, depthMm: 20, label: 'A1' }] }));
  const depths = [], at = [];
  let hole = -1;
  for (const l of L) {
    if (/^\(SBT hole/.test(l)) { hole++; depths[hole] = 0; }
    const z = /Z(-[\d.]+)/.exec(l);
    if (hole >= 0 && z && /^G[13]/.test(l)) depths[hole] = Math.min(depths[hole], +z[1]);
  }
  assert.deepEqual(depths, [-4, -20]);
});

test('map zoom: the window stays inside the travel', () => {
  const t = { xMm: 2440, yMm: 1525, dirX: 1, dirY: 1 };
  assert.deepEqual(zoomWindow(t, 1, 0, 0), { x0: 0, y0: 0, w: 2440, h: 1525 });
  assert.deepEqual(zoomWindow(t, 4, 1220, 700), { x0: 915, y0: 509.375, w: 610, h: 381.25 });
  // Near a corner it stops at the edge.
  assert.deepEqual(zoomWindow(t, 4, 10, 2000), { x0: 0, y0: 1143.75, w: 610, h: 381.25 });
  // A machine running in negative space.
  const n = zoomWindow({ xMm: 800, yMm: 800, dirX: -1, dirY: -1 }, 2, 0, 0);
  assert.deepEqual([n.x0, n.y0], [-400, -400]);
});

test('map labels: every second, fifth... so they never crowd', () => {
  assert.equal(labelEvery(30, 12), 1);
  // Two-digit columns 7 px apart: every third would do, so every fifth.
  assert.equal(labelEvery(7.2, 12), 5);
  assert.equal(labelEvery(1, 400), 100);
});

test('stock holes: Safe Z between holes, not between a counterbore and its hole, and a Z0 stop line', () => {
  const holes = [{ x: 100, y: 100, diaMm: 14, depthMm: 6, label: 'A1 counterbore' }, { x: 100, y: 100, diaMm: 6.9, depthMm: 20, label: 'A1' },
    { x: 200, y: 100, diaMm: 14, depthMm: 6, label: 'A2 counterbore' }, { x: 200, y: 100, diaMm: 6.9, depthMm: 20, label: 'A2' }];
  const L = holeCutProgram(cutBase({ holes, safeEach: true, zStop: -12.5 }));
  const first = L.findIndex(l => /^\(SBT hole 1\//.test(l));
  const lifts = L.slice(first).map((l, i) => [l, i]).filter(([l]) => /^G53 G0 Z/.test(l)).length;
  // One between A1 and A2, and the one at the end.
  assert.equal(lifts, 2);
  const stop = L.find(l => /Z0 moved/.test(l));
  assert.match(stop, /#5223 \+ 12\.500/);
  const check = stop.replace(/\s*\(.*$/, '').replace(/^#1=/, '');
  assert.equal(evalExpr(check, { 5223: -12.5 }), 1);
  assert.throws(() => evalExpr(check, { 5223: -12.4 }), /error:72/);
  // Dog holes are unchanged: no Z0 stop line, no Safe Z between holes.
  assert.ok(!holeCutProgram(cutBase()).some(l => /Z0 moved/.test(l)));
});

test('a turned grid: holes turned about the first hole, ones the turn takes off the travel left out', () => {
  const o = { sxMm: 50, syMm: 40, insetXMm: 2, insetYMm: 15, travelXMm: 800, travelYMm: 600, dirX: 1, dirY: 1 };
  const flat = holeGrid(o), turned = holeGrid(Object.assign({}, o, { turnDeg: 0.5 })), a = 0.5 * Math.PI / 180;
  const h11 = turned.find((p) => p.col === 1 && p.row === 1), h21 = turned.find((p) => p.col === 2 && p.row === 1);
  assert.deepEqual([h11.x, h11.y], [2, 15]);
  assert.ok(Math.abs(h21.x - (2 + 50 * Math.cos(a))) < 1e-9 && Math.abs(h21.y - (15 + 50 * Math.sin(a))) < 1e-9);
  // The first column leans left as it goes back, 2 mm from X0: its back holes fall off the travel.
  assert.ok(turned.length < flat.length && turned.every((p) => p.x >= 0 && p.x <= 800 && p.y >= 0 && p.y <= 600));
  // Negative space: still about the first hole.
  const n = holeGrid(Object.assign({}, o, { dirX: -1, dirY: -1, turnDeg: -1 }));
  assert.deepEqual([n.find((p) => p.col === 1 && p.row === 1).x, n[0].y], [-2, -15]);
});

test('nearest-hole macros on a turned grid find the same hole as the XY0 Picker', () => {
  const grids = [
    { name: 'plain, turned 0.3', sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 812, travelYMm: 1230, dirX: 1, dirY: 1, turnDeg: 0.3 },
    { name: 'homes to max, turned -0.7', sxMm: 50, syMm: 40, insetXMm: 20, insetYMm: 15, travelXMm: 800, travelYMm: 600, dirX: -1, dirY: -1, turnDeg: -0.7 },
    { name: 'T-tracks along X, turned 0.2', sxMm: 48.6, syMm: 48.6, insetXMm: 8.001, insetYMm: 28.265, travelXMm: 2440, travelYMm: 1525, dirX: 1, dirY: 1, trackAxis: 'x', panelHoles: 5, panelPitchMm: 0, turnDeg: 0.2 }
  ];
  for (const g0 of grids) {
    const g = macroGrid(Object.assign({ diaMm: 20, origin: 'center' }, g0));
    const m = buildMacros(Object.assign({}, base, { safeZMm: -5, extras: { holes: true }, holes: g }));
    for (const l of m.setHole.body.split('\n')) assert.ok(l.length < 200, l);
    const grid = holeGrid(g);
    const minX = g.dirX > 0 ? 0 : -g.travelXMm, minY = g.dirY > 0 ? 0 : -g.travelYMm;
    // Inside the travel, away from its edges (where the turn leaves holes out).
    for (let i = 2; i <= 38; i++) {
      for (let j = 2; j <= 38; j++) {
        const x = minX + g.travelXMm * i / 40, y = minY + g.travelYMm * j / 40;
        const want = grid[nearestHole(grid, x, y).index];
        const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: x, _abs_y: y, _abs_z: -20 }));
        assert.equal(p._error, undefined, g.name + ' at ' + x + ',' + y);
        const got = { x: p.P0_x, y: p.P0_y };
        assert.ok(Math.abs(Math.hypot(got.x - x, got.y - y) - Math.hypot(want.x - x, want.y - y)) < 1e-3,
          g.name + ' at ' + x + ',' + y + ': got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want));
      }
    }
    // Anywhere, edges too: it stops, or snaps to a hole the XY0 Picker has (never one the turn took off the travel).
    for (let i = 0; i <= 40; i++) {
      for (const y of [minY, minY + g.travelYMm * i / 40, minY + g.travelYMm]) {
        for (const x of [minX, minX + g.travelXMm * i / 40, minX + g.travelXMm]) {
          const p = run(m.setHole.body, Object.assign({}, ready, { _abs_x: x, _abs_y: y, _abs_z: -20 }));
          if (p._error) continue;
          assert.ok(grid.some((h) => Math.abs(h.x - p.P0_x) < 1e-3 && Math.abs(h.y - p.P0_y) < 1e-3), g.name + ': not a hole at ' + x + ',' + y);
        }
      }
    }
  }
});

test('cut programs: M6 to the tool Bit Diameter came from, after Safe Z and before the spindle; none when typed', () => {
  const L = holeCutProgram(cutBase({ tool: 3, rpm: 18000 }));
  const m6 = L.indexOf('M6 T3'), safe = L.findIndex(l => /^G53 G0 Z/.test(l)), m3 = L.findIndex(l => /^M3 /.test(l)), stop = L.map((l, i) => /SBT stop/.test(l) ? i : -1).filter(i => i >= 0).pop();
  assert.ok(stop < safe && safe < m6 && m6 < m3, JSON.stringify([stop, safe, m6, m3]));
  assert.ok(!L.some(l => /^M0/.test(l)));
  assert.ok(!holeCutProgram(cutBase()).some(l => /^M6/.test(l)));
  assert.ok(!engraveProgram(Object.assign(cutBase({ tool: 3 }), { labels: [], textMm: 5, laser: true, power: 100 })).some(l => /^M6/.test(l)));
});

// The Onefinity QCW layout on an 800 x 1200 travel: T-tracks along X every 5 rows.
const qcw = (over) => Object.assign({ sxMm: 48.6004, syMm: 48.6004, insetXMm: 6.858, insetYMm: 21.846, travelXMm: 800, travelYMm: 1200,
  dirX: 1, dirY: 1, trackAxis: 'x', panelHoles: 5, panelPitchMm: 0 }, over);

test('T-track slots: centered between panels, the whole travel less the bit, split by zones', () => {
  const slots = trackSlots([qcw()], 19.05 / 2, 3.175, []);
  const mid = 21.846 + 4 * 48.6004 + 48.6004 / 2;
  assert.ok(slots.length >= 3);
  assert.ok(Math.abs(slots[0].a.y - mid) < 1e-6 && Math.abs(slots[0].b.y - mid) < 1e-6, JSON.stringify(slots[0]));
  assert.ok(Math.abs(slots[0].a.x - 3.175) < 1e-6 && Math.abs(slots[0].b.x - (800 - 3.175)) < 1e-6);
  // A zone across the first slot splits it, the slot's half width and the bit clear of it.
  const z = { minX: 300, maxX: 400, minY: mid - 5, maxY: mid + 5 };
  const cut = trackSlots([qcw()], 19.05 / 2, 3.175, [z]).filter(sl => Math.abs(sl.a.y - mid) < 1e-6);
  assert.equal(cut.length, 2);
  assert.ok(Math.abs(cut[0].b.x - (300 - 3.175 - 19.05 / 2)) < 1e-6 && Math.abs(cut[1].a.x - (400 + 3.175 + 19.05 / 2)) < 1e-6);
  // A turned grid's slots turn with it, about the first hole.
  const t = trackSlots([qcw({ turnDeg: 0.5 })], 19.05 / 2, 3.175, [])[0], a = 0.5 * Math.PI / 180;
  assert.ok(Math.abs(Math.atan2(t.b.y - t.a.y, t.b.x - t.a.x) - a) < 1e-9);
});

test('T-track program: never deeper than asked, every pass inside the slot and the travel', () => {
  const slots = trackSlots([qcw()], 19.05 / 2, 3.175, []);
  const o = cutBase({ slots, widthMm: 19.05, depthMm: 12.7, stepMm: 3, wcs: { p: 1, x: 0, y: 0 } });
  const L = trackProgram(o), { pts, deepest } = cutTrace(L);
  assert.equal(deepest, -12.7);
  const spare = (19.05 - 6.35) / 2;
  for (const [x, y] of pts) {
    const near = slots.some(sl => {
      const ux = sl.b.x - sl.a.x, uy = sl.b.y - sl.a.y, len = Math.hypot(ux, uy), t = ((x - sl.a.x) * ux + (y - sl.a.y) * uy) / len / len;
      const d = Math.abs((x - sl.a.x) * sl.nx + (y - sl.a.y) * sl.ny);
      return t >= -1e-6 && t <= 1 + 1e-6 && d <= spare + 1e-3;
    });
    assert.ok(near, x + ',' + y);
    assert.ok(x >= 3.175 - 1e-6 && x <= 800 - 3.175 + 1e-6 && y >= 0 && y <= 1200);
  }
  // A bit the track's width: one pass down the middle.
  const one = trackProgram(cutBase({ slots: slots.slice(0, 1), widthMm: 6.35, depthMm: 6, stepMm: 3, wcs: { p: 1, x: 0, y: 0 } }));
  assert.equal(one.filter(l => /^G1 X/.test(l)).length, 2);
  for (const l of L) assert.ok(l.length < 190, l);
});

test('a turned Grid + List: grid holes turn, listed holes stay where they were captured', () => {
  const g = holeGrid({ layout: 'both', sxMm: 50, syMm: 50, insetXMm: 20, insetYMm: 20, travelXMm: 2000, travelYMm: 1000, dirX: 1, dirY: 1, turnDeg: 0.5,
    list: [{ xMm: 1780, yMm: 880 }] });
  const listed = g.find((p) => p.col == null);
  assert.deepEqual([listed.x, listed.y], [1800, 900]);
  const far = g.find((p) => p.col === 30 && p.row === 15);
  assert.ok(Math.abs(far.y - (20 + 14 * 50) - Math.sin(0.5 * Math.PI / 180) * 29 * 50) < 0.1);
});

test('cut programs: a Z0 the Z0 macros set needs a tool length offset', () => {
  const L = holeCutProgram(cutBase({ zMacro: { spoil: 5343, thick: 5383 } }));
  const line = L.find(l => /SBT stop: no tool length offset active/.test(l));
  assert.ok(line && line.length < 255, line);
  assert.ok(L.indexOf(line) < L.findIndex(l => /^G[0-3] /.test(l)));
  const check = line.replace(/\s*\(.*$/, '').replace(/^#1=/, '');
  const at = (tlo, z, spoil = -80, thick = 19, mark = 0, kept = 0) => () => evalExpr(check, { _tool_offset: tlo, 5223: z, 5343: spoil, 5383: thick, 5381: mark, 5403: kept });
  assert.equal(at(1, -80)(), 1);                       // offset active: fine
  assert.equal(at(0, -61, -80, 19, 0, -55.173)(), 1);  // G43.1 off by a soft reset, offset kept
  assert.throws(at(0, -80), /error:72/);               // Z0 on the spoilboard, no offset
  assert.throws(at(0, -61), /error:72/);               // Z0 on the stock top
  assert.throws(at(0, -55, -80, 19, 25), /error:72/);  // a fixture's height Set Z0 put down
  assert.equal(at(0, -42.5)(), 1);                     // a Z0 touched off another way
  assert.equal(at(0, -80, 0)(), 1);                    // spoilboard never recorded
  assert.ok(!holeCutProgram(cutBase({ zMacro: { spoil: 5343, thick: 5383 }, laser: true })).some(l => /SBT stop: no tool length offset active/.test(l)));
});

test('labels: none over a T-track', () => {
  const holes = [{ tag: 'A1', col: 1, row: 1, x: 10, y: 10 }, { tag: 'A2', col: 2, row: 1, x: 60, y: 10 }];
  const base = { textMm: 6, gapMm: 2.4, travel: { xMm: 200, yMm: 200, dirX: 1, dirY: 1 }, zones: [], all: holes, holeR: () => 4 };
  assert.equal(labelPlacements(holes, 'every', base).labels.length, 2);
  // A 19 mm track along Y at x 25 sits where A1's label would go, and on its other side is the travel's edge.
  const pl = labelPlacements(holes, 'every', Object.assign({}, base, { tracks: [{ a: { x: 25, y: -50 }, b: { x: 25, y: 250 }, halfMm: 9.5 }] }));
  assert.deepEqual(pl.skipped.map(s => s.tag + ': ' + s.why), ['A1: over a T-track']);
});

test('fit test: sizes next to the bit are each cut as themselves', () => {
  assert.equal(holeCutMethod(7.95, 8), 'drill');
  assert.equal(holeCutMethod(7.95, 8, 0.005), 'too-small');
  assert.equal(holeCutMethod(8.05, 8, 0.005), 'helix');
  assert.equal(holeCutMethod(8, 8, 0.005), 'drill');
});

test('measure holes: suggests the hole nearest A1, the far end of its row and the top of its column', () => {
  const g = [];
  for (let r = 1; r <= 5; r++) for (let c = 1; c <= 8; c++) g.push({ col: c, row: r, x: c * 50, y: r * 50 });
  const tags = (pl) => pl.map(q => q.col + ',' + q.row);
  assert.deepEqual(tags(calPlan(g, 0)), ['1,1', '8,1', '1,5']);
  // A1 suppressed, the row's end in a keepout zone, the column's top under the stock.
  g.find(q => q.col === 1 && q.row === 1).suppressed = true;
  g.find(q => q.col === 8 && q.row === 2).blocked = true;
  assert.deepEqual(tags(calPlan(g, 0, { minX: 0, maxX: 120, minY: 220, maxY: 300 })), ['2,1', '8,1', '2,4']);
  // Only holes on the asked grid.
  assert.deepEqual(calPlan(g.map(q => Object.assign({}, q, { layer: 1 })), 0), []);
  // One usable hole: just it.
  assert.deepEqual(tags(calPlan([{ col: 3, row: 3, x: 0, y: 0 }], 0)), ['3,3']);
});

test('spoilboard height: a spot on the top beside the hole, clear of holes, zones, tracks and edges', () => {
  const travel = { xMm: 500, yMm: 500, dirX: 1, dirY: 1 };
  const h = { x: 100, y: 100 }, others = [{ x: 150, y: 100, rMm: 4 }, { x: 100, y: 150, rMm: 4 }];
  assert.deepEqual(surfaceSpot(h, 4, others, [], [], travel), { x: 108, y: 100 });
  // +X under a keepout zone: -X.
  assert.deepEqual(surfaceSpot(h, 4, others, [{ minX: 105, maxX: 120, minY: 90, maxY: 110 }], [], travel), { x: 92, y: 100 });
  // A T-track along Y at x 92 and the zone: +Y.
  assert.deepEqual(surfaceSpot(h, 4, others, [{ minX: 105, maxX: 120, minY: 90, maxY: 110 }], [{ a: { x: 92, y: 0 }, b: { x: 92, y: 500 }, halfMm: 5 }], travel), { x: 100, y: 108 });
  // A hole right next to it on +X: not there.
  assert.deepEqual(surfaceSpot(h, 4, [{ x: 112, y: 100, rMm: 4 }], [], [], travel), { x: 92, y: 100 });
  // Hard against the travel's corner with every way blocked: none.
  assert.equal(surfaceSpot({ x: 3, y: 3 }, 4, [{ x: 11, y: 3, rMm: 4 }, { x: 3, y: 11, rMm: 4 }], [], [], travel), null);
});

test('grid lines: every row and column, half a spacing past the ends, clipped and broken by zones', () => {
  const travel = { xMm: 400, yMm: 300, dirX: 1, dirY: 1 }, g = [];
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 4; c++) g.push({ col: c, row: r, x: 50 * c, y: 50 * r });
  const segs = gridLineSegments(g, travel, [], 0.5);
  assert.equal(segs.filter(s => s.kind === 'row').length, 3);
  assert.equal(segs.filter(s => s.kind === 'col').length, 4);
  const r1 = segs[0], xs = [r1.a.x, r1.b.x].sort((a, b) => a - b);
  assert.deepEqual([xs[0], xs[1], r1.a.y], [25, 225, 50]);           // half a spacing past A1 and A4
  assert.ok(segs[1].a.x > segs[1].b.x);                               // the next one runs back
  // A keepout zone across the middle of row 2 splits it; nothing enters the zone.
  const z = { minX: 110, maxX: 140, minY: 90, maxY: 110 }, cut = gridLineSegments(g, travel, [z], 0.5);
  assert.equal(cut.filter(s => s.key === 'r0:2').length, 2);
  assert.ok(cut.every(s => !lineCrossesZone(s.a, s.b, z, 0)));
  // Hard against the travel's edge: clipped inside it.
  const edge = gridLineSegments([{ col: 1, row: 1, x: 2, y: 10 }, { col: 2, row: 1, x: 52, y: 10 }], travel, [], 0.5);
  assert.equal(Math.min(edge[0].a.x, edge[0].b.x), 0.5);
  // A T-track along X between rows 1 and 2 (y 75, 19 mm wide): each column line breaks there; row lines don't.
  const trk = gridLineSegments(g, travel, [], 0.5, [{ a: { x: 0, y: 75 }, b: { x: 400, y: 75 }, halfMm: 9.5 }]);
  assert.equal(trk.filter(s => s.kind === 'col').length, 8);
  assert.equal(trk.filter(s => s.kind === 'row').length, 3);
  assert.ok(trk.filter(s => s.kind === 'col').every(s => Math.max(s.a.y, s.b.y) <= 65 + 1e-9 || Math.min(s.a.y, s.b.y) >= 85 - 1e-9));
});

test('laser test: a cross per power and feed, labelled, then a program with each one\'s S and F', () => {
  const pat = laserTestPattern([200, 600, 1000], [500, 1500], 12, 5, 3);
  assert.equal(pat.groups.length, 3 * 2 + 1);
  const crosses = pat.groups.slice(0, 6);
  assert.deepEqual(crosses.map(g => g.power + '@' + g.feed), ['200@500', '600@500', '1000@500', '200@1500', '600@1500', '1000@1500']);
  assert.ok(pat.groups.flatMap(g => g.strokes.flat()).every(p => p.x >= 5 - 1e-9 && p.y >= 5 - 1e-9 && p.x <= pat.wMm && p.y <= pat.hMm));
  const o = { wcs: { p: 1, x: 0, y: 0 }, laser: true, power: 200, feed: 500, zones: [], safeZMm: -5 };
  const L = strokesProgram(o, 'laser test', pat.groups);
  assert.ok(L.includes('M4 S200'));
  assert.ok(L.some(l => / F1500 S1000$/.test(l)));
  assert.ok(!L.some(l => /Z-?\d/.test(l) && !/^G53|SBT|#1=/.test(l)), 'a laser never moves Z');
  assert.ok(L.indexOf('M5') > L.lastIndexOf('M4 S200'));
});

test('grid lines: a line broken at a T-track keeps its pieces in running order, every other line back', () => {
  const travel = { xMm: 400, yMm: 300, dirX: 1, dirY: 1 }, g = [];
  for (let r = 1; r <= 2; r++) for (let c = 1; c <= 4; c++) g.push({ col: c, row: r, x: 50 * c, y: 50 * r });
  const trk = [{ a: { x: 125, y: 0 }, b: { x: 125, y: 300 }, halfMm: 9.5 }];
  const rows = gridLineSegments(g, travel, [], 0.5, trk).filter(s => s.kind === 'row');
  assert.equal(rows.length, 4);
  assert.ok(rows[0].a.x < rows[0].b.x && rows[0].b.x <= rows[1].a.x, 'row 1: left piece, then right piece, forward');
  assert.ok(rows[2].a.x > rows[2].b.x && rows[2].b.x >= rows[3].a.x, 'row 2: right piece, then left piece, back');
});

test('laser test: columns widen for 5-digit powers, and feeds are labelled in the given units', () => {
  const pat = laserTestPattern([1000, 12000, 24000], [508, 1524], 12, 5, 3, f => String(Math.round(f / 25.4)));
  const xs = pat.groups.slice(0, 3).map(g => g.strokes[0][0].x);
  assert.ok(xs[1] - xs[0] >= 14 + 3 - 1e-9, 'a 5-digit power fits its column');
  assert.equal(pat.groups[0].feed, 508);                 // the program's feed stays mm/min
  const labels = pat.groups[pat.groups.length - 1].strokes;
  assert.ok(labels.length > 0);
});

test('fixture plate: lines and slots cut to the plate less a margin, short leftovers dropped', () => {
  const plate = { minX: 100, maxX: 300, minY: 50, maxY: 150 };
  const segs = [{ a: { x: 0, y: 100 }, b: { x: 400, y: 100 }, kind: 'row' }, { a: { x: 200, y: 0 }, b: { x: 200, y: 300 }, kind: 'col' },
    { a: { x: 0, y: 10 }, b: { x: 400, y: 10 }, kind: 'row' }, { a: { x: 102.5, y: 0 }, b: { x: 102.5, y: 300 }, kind: 'col' }];
  const out = clipToPlate(segs, plate, 3);
  assert.equal(out.length, 2);
  assert.deepEqual([out[0].a.x, out[0].b.x, out[0].kind], [103, 297, 'row']);
  assert.deepEqual([out[1].a.y, out[1].b.y, out[1].lenMm], [53, 147, 94]);
  assert.deepEqual(clipToPlate(segs, { minX: 0, maxX: 5, minY: 0, maxY: 5 }, 3), []);
});

test('fixture plate: two pins far apart, a stop in the nearest square middle, inserts between holes', () => {
  const g = holeGrid({ diaMm: 20, sxMm: 100, syMm: 100, insetXMm: 50, insetYMm: 50, travelXMm: 600, travelYMm: 600, dirX: 1, dirY: 1 });
  const rect = { minX: 30, maxX: 380, minY: 30, maxY: 280 };
  const cands = stockHoleCandidates(g, rect, 4, 10);
  const pins = fixturePins(cands, rect);
  assert.deepStrictEqual(pins.map(p => [p.x, p.y]).sort((a, b) => a[0] - b[0]), [[50, 50], [350, 250]], 'opposite corners');
  const centers = squareCenters(g, 100, 100);
  assert.ok(centers.every(c => (c.x - 100) % 100 === 0 && (c.y - 100) % 100 === 0), 'middles of squares');
  const st = stopHole(centers, rect, 'front-left', 4, 10);
  assert.deepStrictEqual([st.x, st.y, st.from.tag], [100, 100, 'A1']);
  assert.deepStrictEqual([stopHole(centers, rect, 'back-right', 4, 10).x, stopHole(centers, rect, 'back-right', 4, 10).y], [300, 200]);
  assert.equal(stopHole(centers, { minX: 0, maxX: 60, minY: 0, maxY: 60 }, 'front-left', 4, 10), null);
  // T-tracks along X make panels of 3 rows: no square across a track.
  const t = holeGrid({ diaMm: 20, sxMm: 100, syMm: 100, insetXMm: 50, insetYMm: 50, travelXMm: 300, travelYMm: 900, dirX: 1, dirY: 1, trackAxis: 'x', panelHoles: 3, panelPitchMm: 400 });
  const tc = squareCenters(t, 100, 100);
  assert.ok(tc.length > 0 && tc.every(c => [100, 200, 500, 600].includes(c.y)), JSON.stringify(tc.map(c => c.y)));
});

test('insertGridRaw: half a spacing over, panels one fewer, turned about the first hole', () => {
  const r = { dia: '20', sx: '96', sy: '96', ix: '48', iy: '48', track: '', pn: '', pp: '', turn: '', name: 'Dogs', nearest: true };
  assert.deepStrictEqual(insertGridRaw(r, 'x', '10', false), Object.assign({}, r, { ix: '96', iy: '48', dia: '10', name: 'Inserts', nearest: false }));
  assert.equal(insertGridRaw(r, 'y', '10', false).iy, '96');
  const tr = Object.assign({}, r, { track: 'x', pn: '3', pp: '400' });
  assert.equal(insertGridRaw(tr, 'x', '10', false).pn, '3', 'along the track: panels unchanged');
  const ty = insertGridRaw(tr, 'y', '10', false);
  assert.deepStrictEqual([ty.iy, ty.pn], ['96', '2'], 'across the track: one fewer per panel');
  assert.equal(insertGridRaw(Object.assign({}, tr, { pn: '1' }), 'y', '10', false), null);
  assert.equal(insertGridRaw(Object.assign({}, r, { sx: 'x' }), 'x', '10', false), null);
  // Turned 90 degrees: half a spacing along X ends up along Y.
  const turned = insertGridRaw(Object.assign({}, r, { turn: '90' }), 'x', '10', false);
  assert.deepStrictEqual([+(+turned.ix).toFixed(3), +(+turned.iy).toFixed(3)], [48, 96]);
  // Travel toward minus X: the inset still grows into the travel.
  assert.equal(insertGridRaw(r, 'x', '10', false, { dirX: -1, dirY: 1 }).ix, '96');
  // The inserts land midway between the dog holes.
  const base = { diaMm: 20, sxMm: 96, syMm: 96, insetXMm: 48, insetYMm: 48, travelXMm: 500, travelYMm: 300, dirX: 1, dirY: 1, turnDeg: 3 };
  const dogs = holeGrid(base), ins = insertGridRaw(Object.assign({}, r, { turn: '3' }), 'x', '10', false);
  const ig = holeGrid(Object.assign({}, base, { insetXMm: +ins.ix, insetYMm: +ins.iy }));
  const a = dogs.find(p => p.tag === 'B2'), b = dogs.find(p => p.tag === 'B3'), m = ig.find(p => p.tag === 'B2');
  assert.ok(Math.hypot(m.x - (a.x + b.x) / 2, m.y - (a.y + b.y) / 2) < 1e-3, JSON.stringify([m, a, b]));
});

test('holeSpan: holes, columns and rows, by grid or by position', () => {
  const g = (col, row, layer) => ({ col, row, layer, x: col * 96, y: row * 96 });
  assert.deepEqual(holeSpan([g(0, 0), g(1, 0), g(2, 0), g(0, 1), g(1, 1), g(2, 1)]), { n: 6, cols: 3, rows: 2 });
  assert.deepEqual(holeSpan([g(0, 0), g(0, 0, 1)]), { n: 2, cols: 2, rows: 2 });
  assert.deepEqual(holeSpan([{ x: 10, y: 5 }, { x: 10, y: 50 }, { x: 10.001, y: 5 }]), { n: 3, cols: 1, rows: 2 });
  assert.deepEqual(holeSpan([]), { n: 0, cols: 0, rows: 0 });
});

test('cut holes: drill pecks clear chips, break them, or plunge once', () => {
  const drill = (peck) => {
    const L = holeCutProgram(cutBase({ holes: [{ x: 100, y: 100, diaMm: 6.35, label: 'A1' }], depthMm: 9, stepMm: 3, peck }));
    const i = L.findIndex(l => /, drill\)$/.test(l)) + 4;
    return L.slice(i, L.findIndex((l, k) => k > i && l === 'G0 Z5.000'));
  };
  assert.deepEqual(drill(undefined), ['G1 Z-3.000 F500', 'G0 Z2.000', 'G0 Z-2.500', 'G1 Z-6.000 F500', 'G0 Z2.000', 'G0 Z-5.500', 'G1 Z-9.000 F500']);
  assert.deepEqual(drill('clear'), drill(undefined));
  assert.deepEqual(drill('break'), ['G1 Z-3.000 F500', 'G0 Z-2.500', 'G1 Z-6.000 F500', 'G0 Z-5.500', 'G1 Z-9.000 F500']);
  assert.deepEqual(drill('none'), ['G1 Z-9.000 F500']);
});
