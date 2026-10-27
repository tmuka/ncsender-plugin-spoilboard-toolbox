# Zero Swapper: notes for working on this plugin

Zero Swapper (`com.tmuka.zeroswapper`; called Macro Wiz before 0.3.1, with id `com.tmuka.macrowiz` before 0.3.3) is a
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

### `config.html`

- **Pure block**, between `// BEGIN pure` and `// END pure`, has no DOM use; the tests `eval` it, so there's
  no second copy to keep in step.
  - `buildMacros(o)`: every macro from settings in mm. Returns `{record, measure, set, stock, restore}`, plus
    extras when ticked: `midX`, `midY`, `midXY`, `saveXY` / `restoreXY` (the "fixture" extra), `center`.
  - `offsetZParam(p)`: `5203 + 20p`, the Z parameter of work offset P (G54 = #5223, G59.3 = #5383).
  - `parseHashReport` (`$#`, both `[TLO:z]` and four-axis `[TLO:x,y,z,a]`) and `parseGcState` (`$G`: units, TLO
    on/off, active work offset).
  - `storeThicknessCommand`, `MACRO_PREFIX` (`ZS: `), `OLD_PREFIXES` (`MW: `, `Macro Wiz: `, the names earlier versions used).
  - Spoilboard holes: `holeGrid`, `travelDirs`, `insetFromPosition`, `nearestHole`, `holeOriginOffset` (where X0 Y0
    goes on a hole, one radius out in machine X / Y), `holeCommands`; and `parseUnitValue`.
  - Suppressed grid holes (`holeKey` "col,row", saved as `holeSuppressed`) stay in `holeGrid` marked
    `suppressed`, so indices don't shift. The grid macro keeps its FIX/ROUND math and, only when that
    lands on a suppressed hole, scans the usable holes next to any suppressed one (`suppressedLines`):
    the nearest real hole is always one of those, so the macro stays short (lines go one at a time).
  - Map tools (UI only, not in the macros): Edit Holes / Block Area modes (`setMapMode`, pointer
    handlers `mapDown`/`mapMove`/`mapUp`, `mapPoint` inverts `holes.view`); blocked areas are zones with
    `block: true` (`uiZones`, `zoneText`); Stock (`stockRect`, `rectPoint`, `stockCornerFor`; `holeTarget`
    is the stock point when on); favorites (`holeKey`, in the profile, saved without marking it
    changed); live position (`startLive`: 'server-state-update' messages plus a 500 ms poll,
    `renderHoles(true)` when `liveKey` changes, which leaves the profile menu alone).
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
  - Names are `ZS: <name>`.
  - Each description is the text of the macro's first comment line after its `ZS:` prefix.
  - Saving updates macros in place by name: the current name, an alias (`Center X0 Y0 here`), or the
    old `MW: ` or `Macro Wiz: ` prefixes.

### Rules the macro lines follow

- **No o-word flow control.** Choices are arithmetic: a grblHAL comparison evaluates to 1 or 0.
- **Units:** `#5221…` (work offsets) and `#5403` (TLO) are **always mm**; `#5063` (probe result) and
  `G10` values follow G20/G21. So every macro that reads stored values runs in `G21`, and
  imperial setups get `G20` back at the end.
- **Safety stops:** record, measure, spoilboard and stock-top start with `#1=[1 / <cond>] (ZS stop: why)`
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
- Plugin settings: `/api/plugins/com.tmuka.zeroswapper/settings`.
- `GET /api/server-state`: `machineState` (`MPos`, `g54`…`g59`, `workspace`, `homed`, `status`, `connected`).
- `GET /api/firmware`: grblHAL settings (`$130`/`$131` travel, `$22`/`$23` homing, `$683`-`$687` ATCi keepout).
- **Keyboard shortcuts:** every macro is registered as shortcut action `Macro:<id>`; plugins can't register
  shortcuts. So deleting a macro breaks any shortcut on it (recreated macros get new ids). That's why
  **Delete** asks twice and warns, and **Create macros** updates in place instead.
- **Dev install:** `POST /api/plugins/install` with the zip installs a build, but it **wipes** ncSender's
  `settings.json`; back it up and restore it around a dev install.

## Develop, test, build

```
npm test         # node --test tests/*.cjs: the pure block plus the expression simulator
npm run build    # dist/com.tmuka.zeroswapper_v<version>.zip from the last commit (commit first)
```

- Bump `version` in both `manifest.json` and `package.json` for a release build.
- The UI was checked in headless Chrome against a stand-in for the ncSender API that stubs `fetch` and
  posts `cnc-data` replies. The harness isn't in the repo; a fresh one only needs to stub the APIs above.
- Install a build from ncSender's Plugin Manager. The wizard opens from **Zero Swapper** in the plugin tool menu.

## How it was built

(As Macro Wiz; renamed Zero Swapper in 0.3.1, with the `ZS:` macro prefix.)

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
  - If proposed upstream, Zero Swapper is the working prototype.

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
    Z0 on the spoilboard comes from the stored spoilboard height (the `ZS: … Z0 on spoilboard` macro), so
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
- Keep `README.md` in step with any change to what the macros do. The comment block above `buildMacros`
  explains the reasoning; keep it current too.
