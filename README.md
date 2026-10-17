# Macro Wiz

An ncSender plugin with wizards that check your grblHAL setup and write ncSender macros for you.

## Wizard: Z zero on the spoilboard

Probe a block sitting on the spoilboard once, and the wizard's macros remember the spoilboard height
for a zero-length tool. After that, with any tool whose length offset is measured (for example with a
tool setter) and no probing, one macro puts work Z0 on the spoilboard, another on top of the stock
(a stored or probed thickness), and a third puts your own (probed) Z0 back. Midpoint macros are
optional extras.

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
     them and turns into **Confirm delete**; a second press within a few seconds deletes.
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

Not yet run on a machine. The grblHAL behaviour above comes from its source (`ngc_params.c`), and the
ncSender API from ncSender's source; the wizard was tested in a browser against a stand-in ncSender.
