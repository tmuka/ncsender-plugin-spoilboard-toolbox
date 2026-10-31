# Spoilboard Toolbox (formerly Zero Swapper): notes for working on this plugin

Spoilboard Toolbox (`com.tmuka.spoilboard-toolbox` from 0.4.0, `com.tmuka.zeroswapper` before that, whose settings and shortcuts `migrateFromOldId` moves over once and whose copy it uninstalls; Zero Swapper before 0.3.36, Macro Wiz before 0.3.1, with id `com.tmuka.macrowiz` before 0.3.3) is a
client-only ncSender plugin. It runs a wizard that checks a
grblHAL controller, then writes ncSender macros (M98 macros) that put work Z0 on the spoilboard or the
stock top with any measured tool, without probing each time. README.md is the user guide; this file
is how it's built, why, and how to work on it.

## The idea

With a tool length offset (TLO) active, grblHAL computes `work Z = machine Z - work offset Z - TLO`.
Probe a block on the spoilboard once and store the spoilboard height as a zero-length tool sees it:

```
spoilboard = trigger Z (machine) - block thickness - TLO
```

From then on, `G10 L2 P1 Z[spoilboard]` puts G54 Z0 on the spoilboard for any tool whose TLO is
measured against the same reference (e.g. a tool setter); grblHAL adds the loaded tool's TLO itself.
Stock top is `spoilboard + thickness`, with the thickness typed or measured by probing on the stock.

## Layout

| File | What |
| --- | --- |
| `config.html` | The whole plugin: markup, styles, script. ncSender runs a client-only plugin's page inline, so the script can't load other files. |
| `tests/pure.test.cjs` | Runs the pure block of `config.html` directly, plus a small grblHAL expression simulator that executes the generated `G10` lines. |
| `manifest.json` | Plugin id, version, tool-menu entry (`clientOnly: true`). |
| `icon.svg`, `icon.png` | The plugin icon (Plugins panel, tool menu, registry): the hole grid with X0 Y0 on ncSender's green. Edit the SVG and re-render the 512 px PNG. |
| `.scripts/build.sh` | `dist/<id>_v<version>.zip` from the committed files (`git archive`), under a `<id>/` folder as the Plugin Manager expects; tests, scripts, `docs/` (README images) and this file left out. |
| `README.md` | User guide: the wizard steps, how the macros work, units, requirements. |
| `docs/` | README images (not in the zip). The feature diagrams are hand-written SVGs (`*.svg`) rendered to the PNGs the README shows; edit the SVG and re-render at 1200 px wide with headless Chrome. `spoilboard-tab.png` and `xy0-picker.png` are screenshots. |
| `CHANGELOG.md` | User-facing notes per release (ships in the zip); the GitHub release notes are drawn from it. |

### `config.html`

- **Pure block**, between `// BEGIN pure` and `// END pure`, has no DOM use; the tests `eval` it, so there's
  no second copy to keep in step.
  - `buildMacros(o)`: every macro from settings in mm. Returns `{record, measure, set, stock, restore}`, plus
    extras when ticked: `midX`, `midY`, `midXY`, `saveXY` / `restoreXY` (the "fixture" extra), `center`.
  - `offsetZParam(p)`: `5203 + 20p`, the Z parameter of work offset P (G54 = #5223, G59.3 = #5383).
  - `parseHashReport` (`$#`, both `[TLO:z]` and four-axis `[TLO:x,y,z,a]`) and `parseGcState` (`$G`: units, TLO
    on/off, active work offset).
  - Cut Holes: `holeCutMethod`, `holesToCut`, `cutOrder`, `holeCutProblems`, `cutStart` / `cutEnd`, `holeCutProgram`
    (each hole may carry its own `depthMm`; `safeEach` lifts to Safe Z between hole centers; `zStop` adds a stop
    line for the work offset's Z0), `engraveProgram`, `chamferProgram`, `fitTestHoles`, `fitGrid`. Stock holes:
    `stockHoleCandidates`, `stockBoltHoles`, `flipPins`, `flipRect`. T-track slots: `clipToRect`, `trackSlots`, `trackProgram`. Map zoom: `zoomWindow`, `labelEvery`.
  - Turned grids: `turnHoles` (holeGrid turns a grid's holes about its first hole by `turnDeg`) and `turnLines` (the macros
    turn the spindle position into the grid's square frame in #22 / #23, run the grid math, and turn #6 / #7 back).
  - `storeThicknessCommand`, `MACRO_PREFIX` (`SBT: `), `OLD_PREFIXES` (`ZS: `, `MW: `, `Macro Wiz: `, the names earlier versions used; Create macros renames them in place by ID, so ncSender's `Macro:<id>` shortcuts survive).
  - Spoilboard holes: `holeGrid`, `travelDirs`, `insetFromPosition`, `nearestHole`, `holeOriginOffset` (where X0 Y0
    goes on a hole, one radius out in machine X / Y), `holeCommands`; and `parseUnitValue`.
  - Suppressed grid holes (`holeKey` "col,row", saved as `holeSuppressed`) stay in `holeGrid` marked
    `suppressed`, so indices don't shift. The grid macro keeps its FIX/ROUND math and, only when that
    lands on a suppressed hole, scans the usable holes next to any suppressed one (`suppressedLines`):
    the nearest real hole is always one of those, so the macro stays short (lines go one at a time).
  - Map tools (UI only, not in the macros): Edit Holes / Exclude Picks modes (`setMapMode`, pointer
    handlers `mapDown`/`mapMove`/`mapUp`, `mapPoint` inverts `holes.view`); excluded areas (`holes.blocks`, saved as `holeBlocks`) are zones with
    `block: true` (`uiZones`, `zoneText`); Stock (`stockRect`, `rectPoint`, `stockCornerFor`; `holeTarget`
    is the stock point when on); favorites (`holeKey`, in the profile, saved without marking it
    changed); live position (`startLive`: 'server-state-update' messages plus a 500 ms poll,
    `renderHoles(true)` when `liveKey` changes, which leaves the profile menu alone).
  - Layouts: 'grid', 'list', 'both' (grid + extra holes listed from grid 1's first hole). List lines take
    an optional third value, the hole's diameter (`diaMm`). Further grids live in `holeGrids` (grid 1
    keeps the old top-level keys, so old settings load as one grid); `allHoles` flattens them with
    `layer` 1, 2... and keys `g2:c,r`. The UI keeps every grid's typed values in `holes.gridRaw`; the
    fields show `holes.activeGrid` (`syncGrid`/`gridToDom`/`parseGrid`). `holes.hidden` (eye, by layer
    or 'list') is map-only; `nearest: false` leaves a grid out of Pick Nearest Hole and the macros.
    Macros: one grid (+ extras) keeps the single-grid math; several grids, a list alone, or grid 1 left
    out go to `severalGridLines` (best so far in #19-#21, side offset and radius in #14-#16).
  - Profiles (`holeProfiles`, `holeProfile`): `setupBody` is what one holds (not the origin dot);
    `sameSetup` ignores favorites; `showProfile` draws the menu and the changes bar.
- **Layout** follows QuickCut's: the dialog header is hidden, and a sidebar has the tabs (**XY0 Picker**, first;
  **Z0 macros**), **Help** (notes in `HELP_TOPICS` plus the tab's tooltips) and **Close** (`close-plugin-dialog`).
  Keep `HELP_TOPICS` in step with the README.
- **Everything else** is the UI and its calls:
  - `runChecks`: the controller check.
  - `readSettings`, `saveSettings`.
  - `storeThickness`: the **Store** button.
  - `saveMacros`: create or update.
  - `deleteMacros`: two-tap delete.
  - `render`.

## Macros and storage

Default storage (all three must be different, and not the work offset being set):

| Value | Offset | Parameter |
| --- | --- | --- |
| Spoilboard height | G59.3 Z | #5383 |
| Last height the XY0 Picker's Set Z0 put down (so the Z0 macros and Set Z0 don't save it over a probed Z0) | G59.1 X | #5341 |
| Saved (probed) Z0, and saved X/Y for the fixture extra | G59.2 Z, X, Y | #5363, #5361, #5362 |
| Stock thickness | G59.1 Z | #5343 |

Work offsets are kept in grblHAL's non-volatile storage, so the values survive power cycles.

- **Record spoilboard height:** `G21`, select the work offset, `G91 G38.2 Z-<travel> F<feed>`, `G90`, then
  `G10 L2 P9 Z[#5063 + #5223 - <block> - #5403]`, then back off upward.
  - `#5063` is relative to the active offset, so adding its Z gives machine Z.
- **Measure stock thickness:** same probe, stores `surface - #5383` in the thickness slot.
- **Z0 on spoilboard / on stock top:** first save the current Z0, but only if it isn't already one of
  the two values these macros set, so repeated runs can't overwrite the probed Z0:
  `G10 L2 P8 Z[#5363 + [#5223 - #5363] * [[ABS[#5223 - #5383] GT 0.001] AND [ABS[#5223 - #5383 - #5343] GT 0.001]]]`.
  Then `G10 L2 P1 Z[#5383]` (or `Z[#5383 + #5343]`).
- **Back to saved:** `G10 L2 P1 Z[#5223 + [#5363 - #5223] * [#5363 NE 0]]` (no-op if nothing saved).
- **Extras:**
  - **Midpoint X / Y / XY** lift to ncSender's Safe Z with `G53 G0 Z<safe>` (machine Z0 if unset), then
    move to `X[#<_x> / 2]` etc.
  - **Set XY0 to Midpoint** is `G10 L20 P0 X[#<_x> / 2] Y[#<_y> / 2]` with no move.
  - **Save / restore X/Y** use the saved-Z0 slot's X/Y.
- **Naming:**
  - Names are `SBT: <name>`.
  - Each description is the text of the macro's first comment line after its `SBT:` prefix.
  - Saving updates macros in place by name: the current name, an alias (`Center X0 Y0 here`, `XY0 on
    nearest hole`), or the old `ZS: `, `MW: ` or `Macro Wiz: ` prefixes.
  - Turned grids turn only grid holes; listed holes stay where they were typed or captured.

### Rules the macro lines follow

- **No o-word flow control.** Choices are arithmetic: a grblHAL comparison evaluates to 1 or 0.
- **Units:** `#5221…` (work offsets) and `#5403` (TLO) are **always mm**; `#5063` (probe result) and
  `G10` values follow G20/G21. So every macro that reads stored values runs in `G21`, and
  imperial setups get `G20` back at the end.
- **Safety stops:** record, measure, spoilboard and stock-top start with `#1=[1 / <cond>] (SBT stop: why)`
  lines for homed (`#<_homed_state>`), a tool length offset (`#<_tool_offset>`) and the stored values
  they need; midpoints check homed. A division by zero is grblHAL error 72, and ncSender's
  `ExpandedCommandSender` sends nothing after a rejected macro line (one line in flight at a time).
  The same conditions divide every offset and move line, so they hold even if lines kept coming
  (ncSender before 2.0.161 kept sending after a rejected line): the Z0 `G10`s also include no G92 Z;
  the midpoint lift and move divide by homed; the nearest-hole macros keep a running "all clear" in
  `#10` (homed, keepout, travel, and no G92 X/Y for XY0) and divide their `G53` moves and `G10 L2 P0`
  by it. The manifest needs ncSender 2.0.163 (the first that enforces `minAppVersion`). The check
  confirms the named parameters exist; the tests' `runAll` sends every line like old ncSender.
  - Verified on the author's grblHAL (2026-10-25): `#1=[1 / 0]` gives error 72; `#<_homed_state>` and
    `#<_tool_offset>` read fine.
  - After an error grblHAL repeats it for every line until an empty line, a `$` command (jogs, `$H`) or a
    reset. ncSender sends an empty line before each terminal and macro line, so it clears itself; a job
    started straight after a stop, with nothing in between, could stop at its first line (safe, but
    confusing).
- **No sideways move without lifting first:** midpoint moves lift to Safe Z; probing macros only move
  straight down from where the user put the bit, then back off up.
- **Lines stay short** for grblHAL, and comments aren't nested (a test checks both).
- **Safe Z and block thickness are baked into the macros** when they're created, so changing either in
  ncSender means pressing **Create macros** again (the README says so).

## ncSender APIs used

- `GET /api/settings`:
  - `unitsPreference`;
  - `safeZHeight` (a machine Z in mm);
  - `probe['standard-block'].zThickness` (mm), which pre-fills the block thickness.
- `POST /api/send-command`: `{ status: 'success' | 'error' }`. Replies arrive as `cnc-data` window messages,
  collected for a short wait (`ask`) to read `$G`, `$#` and the expression test `#1=[1+1]`.
- `/api/m98-macros`:
  - `GET` lists;
  - `POST` with `id: 0` auto-assigns an id;
  - `PUT` updates;
  - `DELETE` removes.
- Plugin settings: `/api/plugins/com.tmuka.spoilboard-toolbox/settings` (the old ID's at `/api/plugins/com.tmuka.zeroswapper/settings` stay on disk).
- `GET /api/server-state`: `machineState` (`MPos`, `g54`…`g59`, `workspace`, `homed`, `status`, `connected`).
- `GET /api/firmware`: grblHAL settings (`$130`/`$131` travel, `$22`/`$23` homing, `$683`-`$687` ATCi keepout).
- **Keyboard shortcuts:** every macro is registered as shortcut action `Macro:<id>`; plugins can't register
  shortcuts. So deleting a macro breaks any shortcut on it (recreated macros get new ids). That's why
  **Delete** asks twice and warns, and **Create macros** updates in place instead.
- **Dev install:** `POST /api/plugins/install` with the zip installs a build. It replaces only the
  plugin's folder and its `plugins.json` entry; ncSender's `settings.json` and the plugin's saved
  settings (`plugin-config/<id>/config.json`) are kept.

## Develop, test, build

```
npm test         # node --test tests/*.cjs: the pure block plus the expression simulator
npm run build    # dist/com.tmuka.spoilboard-toolbox_v<version>.zip from the last commit (commit first)
```

- Bump `version` in both `manifest.json` and `package.json` for a release build.
- The UI was checked in headless Chrome against a stand-in for the ncSender API that stubs `fetch` and
  posts `cnc-data` replies. The harness isn't in the repo; a fresh one only needs to stub the APIs above.
- Install a build from ncSender's Plugin Manager. The wizard opens from **Spoilboard Toolbox** in the plugin tool menu.

## How it was built

(As Macro Wiz; renamed Zero Swapper in 0.3.1, with the `ZS:` macro prefix; renamed Spoilboard Toolbox in 0.3.36, keeping the ID
`com.tmuka.zeroswapper` so updates and settings carry over; the prefix became `SBT:` then, with `ZS:` kept as an old prefix.)

Built in one Claude Code session (2026-10-16), version 0.1 to 0.2.8, driven by requests from the author:

1. **Design question:** can a macro set work Z0 from a known machine Z minus the TLO? That came from
   reading grblHAL's `ngc_params.c` / `ngc_expr.c` and ncSender's macro and probe code. It confirmed the
   parameter numbers, the mm-vs-current-units split, and that comparisons are 1 or 0.
2. **Wizard and the record / spoilboard macros.** Then:
   - stock top, with the old Z0 saved and restorable;
   - measure / store thickness;
   - midpoint extras (the author finds round-stock centres one axis at a time, so midpoint *moves*);
   - fixture X/Y save / restore;
   - a note on when to re-record.
   - A park macro was skipped because ncSender already has Park.
3. **Polish:**
   - block thickness from ncSender's probe settings;
   - "Try it once" steps that name the actual macros;
   - a delete button with a two-tap confirm;
   - shorter `MW:` names, descriptions from the first comment line;
   - Safe Z lift before every move;
   - "Set XY0 to Midpoint" naming;
   - the shortcut warning.

Each change came with tests first or alongside, then a browser check of the UI, then a zip build.

## Status and ideas

- **In use on the author's machine.** The grblHAL behaviour comes from its source, and the ncSender API
  from ncSender's source.
- **README** opens with what the plugin does and who it's for; the mechanics follow. Keep that order.
- **Idea, not started:** the same logic as a core ncSender feature, a button that toggles Z0 between
  stock top and spoilboard. In core it would be simpler and safer:
  - the server can read `$#` and send literal numbers, so it needs no expressions or spare offsets;
  - the button could show which Z0 is active;
  - "Save as spoilboard height" / "Measure stock thickness" could sit in the Probe dialog after a
    Standard Block Z probe.
  - Guard rails: only when the machine is idle and homed with a TLO active, and a warning when the
    stored height may be stale.
  - If proposed upstream, Spoilboard Toolbox is the working prototype.

- **Idea, not started: unit-aware input as a native ncSender library.** Typing mm or inches in any
  field and converting to the machine's units (`parseUnitValue`, from QuickCut's `lib/unit-input.cjs`)
  is copied into each plugin. Ideally ncSender would provide it, so every plugin and ncSender's own
  fields could use one shared, tested version.

- **Idea, planned only: machine labels onto the spoilboard** (V-bit or laser), so the holes the map
  names can be found on the bed.
  - **What gets labeled.** Default: chessboard-style edge labels, column letters along the front and row
    numbers along the left, so there's little to cut and it still reads at a glance. Option: a short label
    beside every hole (`B3`), placed in the quarter the user picks so it clears the hole and its stop pins.
    The map and the picked-hole line would switch to the same names (`B3` instead of "column 2, row 3").
  - **Text.** A single-line (stroke) font, e.g. Hershey Simplex, cut down to digits and capitals and kept
    in the pure block as polylines; no outline fonts. A pure `labelPaths(text, heightMm, x, y)` returns
    polylines in machine mm and gets tests like the rest.
  - **V-bit.** The angle, line width and depth (depth = half the width / tan(half the angle)), feed and
    plunge. Keep the depth well under what a surfacing pass takes, so labels survive one or two passes.
    Z0 on the spoilboard comes from the stored spoilboard height (the `SBT: … Z0 on spoilboard` macro), so
    no new probing.
  - **Laser.** Power (S), feed, `M4` dynamic power, a fixed Z for focus, and a check that `$32` (laser
    mode) is on; no plunges. Lines only, no fill.
  - **Coordinates.** The holes are machine positions. Either cut each move with `G53` (grblHAL takes
    G53 with G1), or set a spare work offset to machine X0 Y0 for the program and name it in the header;
    pick one when building it, with the controller check covering it.
  - **Output.** Save a program to ncSender's File Manager (as QuickCut does) and let the user run it with
    ncSender's normal job controls, instead of streaming moves from the plugin. Show the labels on the hole
    map first; leave out anything over a hole, outside the travel, or in a keepout zone.
  - **Where it lives.** Zero Swapper owns the hole grid, so start here. QuickCut already generates and
    saves programs (and knows the travel for Wasteboard Surfacing), so lift its program-saving code, or
    later share the text and saving code between the two.

## Conventions

- Commits use the author's GitHub noreply address; check `git config user.email` before committing on a
  new machine.
- **Starting feeds come from ncCAM.** The tool-aware material selector (`MATERIALS` and `startingFeeds`
  in `config.html`) uses [ncCAM](https://github.com/siganberg/ncsender-plugin-nccam)'s formula from
  `src/core/tools.js`: the chip each tooth takes grows with the bit up to a cap per material, and feed =
  RPM x flutes x chip. QuickCut has the same table (`lib/starting-feeds.cjs`). Change a material in all
  three rather than inventing a new formula, and credit ncCAM when it's reused elsewhere.
- Keep `README.md` in step with any change to what the macros do. The comment block above `buildMacros`
  explains the reasoning; keep it current too.
