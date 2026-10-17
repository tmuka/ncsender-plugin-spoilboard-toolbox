# Macro Wiz

An ncSender plugin with wizards that check your grblHAL setup and write ncSender macros for you.

## Wizard: Z zero on the spoilboard

Probe a block sitting on the spoilboard once, and the wizard's macros remember the spoilboard height
for a zero-length tool. After that, with any tool whose length offset is measured (for example with a
tool setter) and no probing, one macro puts work Z0 on the spoilboard, another on top of stock of a
known thickness, and a third puts your own (probed) Z0 back.

1. **Check the controller.** The wizard sends `$G`, `$#` and `#1=[1+1]` (nothing moves) and reports:
   - whether the controller accepts expressions (the macros need them);
   - whether a tool length offset is active (`G43.1` / `G43`, not `G49`) and its value;
   - whether the storage slot is already in use;
   - which work offset you're in.
2. **Settings.** Probe block thickness, probe feed, max probe travel, retract, stock thickness, the
   work offset to set (G54 to G59), where to keep the height, and where to save your old Z0 (two
   different spare offsets: G59.3, G59.2 or G59.1 Z).
3. **Macros.** Creates the ncSender macros, or updates the ones it made before:
   - **Record spoilboard height**: probes down onto the block and stores the height.
   - **G54 Z0 on spoilboard**: saves the current Z0, then sets Z0 on the spoilboard.
   - **G54 Z0 on stock top** (only with a stock thickness): saves the current Z0, then sets Z0 that
     far above the spoilboard.
   - **G54 Z0 back to saved**: puts the saved Z0 back (does nothing if none was saved).
4. **Try it once** with a paper feeler before trusting it.

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

The spoilboard macro then sets `G10 L2 P1 Z[#5383]` (the stock-top one adds the thickness): grblHAL
adds the loaded tool's length offset itself.

### Switching Z0 and back

Before setting Z0, the spoilboard and stock-top macros save the current G54 Z in a second spare offset
(G59.2 Z by default), but only when it isn't already the spoilboard or stock-top value, so running
them repeatedly can't overwrite your probed Z0:

```
G10 L2 P8 Z[#5363 + [#5223 - #5363] * [[ABS[#5223 - #5383] GT 0.001] AND [ABS[#5223 - #5383 - 18.000] GT 0.001]]]
```

A comparison is 1 or 0 in grblHAL, so this keeps the saved value or replaces it with plain arithmetic,
without `o`-word flow control. **Back to saved** is `G10 L2 P1 Z[#5223 + [#5363 - #5223] * [#5363 NE 0]]`,
which leaves Z0 alone if nothing was saved. Saved values stay valid across tool changes, because work
offsets are relative to the reference tool. The work offset is changed in place, so programs that
hard-code `G54` (most CAM output) use whichever Z0 you last set.

### Units

grblHAL returns stored work offsets (`#5221`…) and the tool length offset (`#5403`) in mm whatever the
units mode, but the probe result (`#5063`) and `G10` values in the current units. All the macros
therefore switch to `G21` while they work, and imperial setups get `G20` back at the end.

### Requirements

- grblHAL built with parameter and expression support (the check tells you).
- Tool length offsets for every tool measured against the same reference tool, and active when you
  run either macro. A `G43.1` offset is cleared by a reset.
- A spare work offset for storage.

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
