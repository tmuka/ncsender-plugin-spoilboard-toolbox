# Macro Wiz

An ncSender plugin with wizards that check your grblHAL setup and write ncSender macros for you.

## Wizard: Z zero on the spoilboard

Probe a block sitting on the spoilboard once, and the wizard's macros remember the spoilboard height
for a zero-length tool. After that, one macro puts work Z0 on the spoilboard with any tool whose
length offset is measured (for example with a tool setter), with no probing.

1. **Check the controller.** The wizard sends `$G`, `$#` and `#1=[1+1]` (nothing moves) and reports:
   - whether the controller accepts expressions (the macros need them);
   - whether a tool length offset is active (`G43.1` / `G43`, not `G49`) and its value;
   - whether the storage slot is already in use;
   - which work offset you're in.
2. **Settings.** Probe block thickness, probe feed, max probe travel, retract, the work offset to set
   (G54 to G59), and where to keep the height (G59.3, G59.2 or G59.1 Z).
3. **Macros.** Creates two ncSender macros, or updates the ones it made before:
   - **Record spoilboard height**: probes down onto the block and stores the height.
   - **G54 Z0 on spoilboard**: sets the work offset from the stored height.
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

The set macro is just `G10 L2 P1 Z[#5383]`: grblHAL adds the loaded tool's length offset itself.

### Units

grblHAL returns stored work offsets (`#5221`…) and the tool length offset (`#5403`) in mm whatever the
units mode, but the probe result (`#5063`) and `G10` values in the current units. Both macros
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
npm test         # node --test on the pure functions, read straight from config.html
npm run build    # dist/com.tmuka.macrowiz_v<version>.zip from the committed files
```

`config.html` is the whole plugin: ncSender runs a client-only plugin's page inline, so its script
can't load other files. The macro builder and the `$#` / `$G` parsers sit between `BEGIN pure` and
`END pure` markers, and the tests run that block directly, so there's no second copy to keep in step.

## Status

Not yet run on a machine. The grblHAL behaviour above comes from its source (`ngc_params.c`), and the
ncSender API from ncSender's source; the wizard was tested in a browser against a stand-in ncSender.
