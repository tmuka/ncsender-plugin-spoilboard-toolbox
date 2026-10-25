# Macro Wiz

**Probe your spoilboard once. After that, with any measured tool, one click puts Z0 on the
spoilboard or on top of your stock — no probing, no math. Another click puts your old Z0 back.**

Macro Wiz is an ncSender plugin. A short wizard checks your grblHAL controller, then writes the
ncSender macros that do this, which you run from the Macros tab or a keyboard shortcut.

## Who it's for

You'll get the most from it if:

- your machine **measures tool lengths** (a tool setter, or an ATC such as RapidChange), so each tool
  has a tool length offset, and
- your controller runs **grblHAL** (the wizard checks it can do the math the macros need).

Without measured tool lengths, every tool change needs a new Z probe anyway, and Macro Wiz can't
save you that.

## What you get

| Macro | Does |
| --- | --- |
| **Record spoilboard height** | Probes a block on the spoilboard once and remembers the height. |
| **Z0 on spoilboard** | Sets work Z0 on the spoilboard, for any measured tool. For through-cuts and parts zeroed from the bottom. |
| **Z0 on stock top** | Sets work Z0 on top of the stock: the spoilboard plus a stored stock thickness (typed in, or probed with **Measure stock thickness**). |
| **Z0 back to saved** | Puts back the Z0 you had before, e.g. one you probed on the stock. |

In ncSender's Macros tab they're named **MW: …**, with the work offset they set (e.g.
**MW: G54 Z0 on spoilboard**).

Nothing has to be re-probed when you change tools: the controller adds each tool's length offset
itself. The values are kept in the controller, so they survive power cycles.

Optional extras for setting X/Y: move to the **midpoint** between X0 and where you are (finding the
center of round or square stock), set X0 Y0 at that midpoint, and save / restore X/Y for a fixture.

## First time

1. Open **Macro Wiz** from the plugin tool menu, run the check, and press **Create macros**.
2. With a measured tool loaded, put your probe block on the spoilboard, jog the bit just above it,
   and run **Record spoilboard height**. It probes straight down.
3. Check it once against ncSender's own probe. With the block still on the spoilboard, run ncSender's
   **Probe → Standard Block → Z**, which sets Z0 on the spoilboard by probing. Then run
   **Z0 on spoilboard**: work Z shouldn't change by more than a few hundredths of a mm. (After this,
   **Z0 back to saved** may return to the probed Z0 rather than your earlier one.) Or, without probing:
   run **Z0 on spoilboard**, jog down until the bit just touches the block with a paper feeler, and work
   Z should read the block's thickness; **Z0 back to saved** then puts your earlier Z0 back.

   If the two disagree, don't use the macros until they match: check the tool length offset is
   active and measured for this tool, and that the block thickness matches ncSender's
   **Standard Block → Z Thickness**.

Re-record after surfacing the spoilboard.

## Each new job

- **Same stock thickness as last time:** load any measured tool and run **Z0 on stock top**. No
  probing.
- **New stock thickness:** tell Macro Wiz once, then run **Z0 on stock top**. Either:
  - put the block on the stock and run **Measure stock thickness** (one probe, good for every tool in
    the job), or
  - type the thickness in the wizard and press **Store**, if you trust the material's nominal size
    (sheet goods often vary by a few tenths of a mm, so measure when depth matters).
- **Zeroing from the bottom** (set the job's Z origin to the bottom of the stock in your CAM): run
  **Z0 on spoilboard**. No stock probing at all, and through-cuts come out exact.

So you probe once per new stock, not once per tool.

## The wizard, step by step

1. **Check the controller.** The wizard sends `$G`, `$#` and `#1=[1+1]` (nothing moves) and reports:
   - whether the controller accepts expressions (the macros need them);
   - whether a tool length offset is active (`G43.1` / `G43`, not `G49`) and its value;
   - whether the storage slot is already in use;
   - which work offset you're in.
2. **Settings.** Probe block thickness (filled in from ncSender's probe screen, **Standard Block →
   Z Thickness**, when it's set there; re-run **Create macros** after changing it, since the macros keep
   the number), probe feed, max probe travel, retract, the work offset to set
   (G54 to G59), and three different spare offsets (G59.3, G59.2, G59.1 Z) for the spoilboard height,
   your saved Z0 and the stock thickness. **Store** writes a typed stock thickness (e.g. a sheet) to
   the controller straight away.
3. **Extras** (tick the ones you want):
   - **Midpoint X** / **Midpoint Y**: lift to ncSender's Safe Z (machine Z0 if none is set), then move
     halfway back to X0 (or Y0) along that axis only. For round stock: touch one side and zero X, touch
     the other side, run Midpoint X. Safe Z is written into the macro, so re-run **Create macros**
     after changing it.
   - **Midpoint XY**: the same lift, then move halfway to X0 Y0, e.g. from the opposite corner of square
     stock.
   - **Set XY0 to Midpoint**: put X0 Y0 halfway to the current spot without moving
     (`G10 L20 P0 X[#<_x> / 2] Y[#<_y> / 2]`).
   - **Save / restore X/Y**: save the work offset's X and Y (e.g. a fixture or jig) and put them back
     later. They're kept in the saved-Z0 slot's X/Y, which that slot doesn't otherwise use; restore
     does nothing if nothing was saved.
4. **Macros.** Creates the ncSender macros, or updates the ones it made before:
   Every ncSender macro can have a keyboard shortcut (ncSender's shortcut settings, **Macros** group).
   Their names start with **MW:**, and each description is the macro's first comment line (e.g.
   "record spoilboard height"). Macros from earlier versions, named "Macro Wiz: …", are renamed in
   place.
   - **Record spoilboard height**: probes down onto the block and stores the height.
   - **Measure stock thickness**: with the block on the stock, probes down and stores
     stock top minus the spoilboard height.
   - **G54 Z0 on spoilboard**: saves the current Z0, then sets Z0 on the spoilboard.
   - **G54 Z0 on stock top**: saves the current Z0, then sets Z0 the stored thickness above the
     spoilboard.
   - **G54 Z0 back to saved**: puts the saved Z0 back (does nothing if none was saved).
   - The extras you ticked.
   - **Delete Macro Wiz macros** removes every macro whose name starts with "MW:" or the older "Macro Wiz:" (for example
     ones left over from older settings or another work offset) and nothing else. The first press lists
     them and turns into **Confirm delete**; a second press within a few seconds deletes. Keyboard
     shortcuts set on deleted macros stop working (recreated macros get new numbers), so to change
     settings use **Create macros**, which updates the macros in place and keeps their numbers.
5. **Try it once** with a paper feeler before trusting it.

### How it works

With a tool length offset active, grblHAL works out work Z as

```
work Z = machine Z - work offset Z - tool length offset
```

The record macro selects the work offset, probes, and stores

```
G10 L2 P9 Z[#5063 + #5223 - <block> - #5403]
```

- `#5063` is the probe trigger point, relative to the active work offset; adding that offset's Z
  (`#5223` for G54) gives the machine Z at the trigger.
- Subtracting the block thickness and the active tool length offset (`#5403`) gives the spoilboard
  height as a zero-length tool would see it, so the stored number doesn't depend on which tool probed.
- `G10 L2 P9` keeps it in G59.3's Z, which grblHAL saves in non-volatile storage.

The spoilboard macro then sets `G10 L2 P1 Z[#5383]` and the stock-top one `Z[#5383 + #5343]` (the
thickness, in G59.1 Z): grblHAL adds the loaded tool's length offset itself. The measure macro probes
the same way as the record macro and stores `trigger - block - TLO - #5383`, the stock thickness.

### Switching Z0 and back

Before setting Z0, the spoilboard and stock-top macros save the current G54 Z in a second spare offset
(G59.2 Z by default), but only when it isn't already the spoilboard or stock-top value, so running
them repeatedly can't overwrite your probed Z0:

```
G10 L2 P8 Z[#5363 + [#5223 - #5363] * [[ABS[#5223 - #5383] GT 0.001] AND [ABS[#5223 - #5383 - #5343] GT 0.001]]]
```

A comparison is 1 or 0 in grblHAL, so this keeps the saved value or replaces it with plain arithmetic,
without `o`-word flow control. **Back to saved** is `G10 L2 P1 Z[#5223 + [#5363 - #5223] * [#5363 NE 0]]`,
which leaves Z0 alone if nothing was saved. Saved values stay valid across tool changes, because work
offsets are relative to the reference tool. The work offset is changed in place, so programs that
hard-code `G54` (most CAM output) use whichever Z0 you last set.

### Safety stops

The record, measure, spoilboard and stock-top macros check first, and stop without changing
anything, when:

- the machine isn't homed (the stored heights are machine positions, which only mean something
  once homed),
- no tool length offset is active, or
- the spoilboard height (or, for the stock top, the thickness) hasn't been stored yet.

The midpoint moves stop too when the machine isn't homed, since their Safe Z lift is a machine
position. **Back to saved** needs none of these.

grblHAL macros have no if/else here, so a stop is a deliberate division by zero, for example
`#1=[1 / #<_homed_state>] (MW stop: home the machine first)`: grblHAL rejects the line with
`error:72`, and ncSender sends nothing after a rejected line of a macro. The same check also
divides the value each `G10` line stores, so a wrong Z0 can't be set even if a stop line were
skipped. The wizard's check confirms your grblHAL reads `#<_homed_state>` and `#<_tool_offset>`.

### When to re-record

The stored spoilboard height is only as current as the last recording. Run **Record spoilboard
height** again after surfacing the spoilboard (for example with QuickCut's Wasteboard Surfacing),
after moving or replacing it, or if your reference tool changes.

### Units

grblHAL returns stored work offsets (`#5221`…) and the tool length offset (`#5403`) in mm whatever the
units mode, but the probe result (`#5063`) and `G10` values in the current units. The macros that
read stored offsets therefore switch to `G21` while they work, and imperial setups get `G20` back at
the end. The midpoint extras switch too, so the Safe Z height (`G53 G0 Z…`, a machine Z in mm) is
read as mm; `#<_x>` / `#<_y>` are then also in mm, which keeps the move right.

No macro moves sideways without lifting first: the midpoint moves lift to Safe Z, and the probing
macros only move straight down from where you put the bit, then back off upward.

### Requirements

- grblHAL built with parameter and expression support (the check tells you).
- Tool length offsets for every tool measured against the same reference tool, and active when you
  run either macro. A `G43.1` offset is cleared by a reset.
- Three spare work offsets for storage.

## Install

Build the zip (below) and install it from ncSender's Plugin Manager. The wizard opens from the
**Macro Wiz** entry in the plugin tool menu.

## Development

```
npm test         # pure functions from config.html, plus a stand-in for grblHAL running the G10 lines
npm run build    # dist/com.tmuka.macrowiz_v<version>.zip from the committed files
```

`config.html` is the whole plugin: ncSender runs a client-only plugin's page inline, so its script
can't load other files. The macro builder and the `$#` / `$G` parsers sit between `BEGIN pure` and
`END pure` markers, and the tests run that block directly, so there's no second copy to keep in step.

## Status

In use on the author's grblHAL machine. The grblHAL behaviour above comes from its source
(`ngc_params.c`), and the ncSender API from ncSender's source; the wizard is also tested in a
browser against a stand-in ncSender.
