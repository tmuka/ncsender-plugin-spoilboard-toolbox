# Zero Swapper

**Probe your spoilboard once. After that, with any measured tool, one click puts Z0 on the
spoilboard or on top of your stock — no probing, no math. Another click puts your old Z0 back.**

**Set X0 Y0 on your spoilboard's dog hole grid (or a lasered / engraved grid) in two taps:** pick a
hole on a map of your CNC's bed, or jog near one and let the plugin snap to the grid, and the work
offset lands exactly on it. Extras find X/Y zero at a midpoint and save / restore it for fixtures.

Zero Swapper is a plugin for [ncSender](https://github.com/siganberg/ncSender), the G-code sender for
grblHAL CNC routers. Its **XY0 Picker** tab sets the XY work origin (G54–G59.3) on a hole or grid line
without moving the machine; its **Z0 macros** tab checks your grblHAL controller, then writes ncSender
macros you run from the Macros tab or, best of all, a keyboard shortcut.

![Zero Swapper's XY0 Picker in ncSender: a map of the CNC bed's dog hole grid with a hole picked,
the ATCi tool rack's keepout zone in red, and the Select Nearest, Go to Selected and Set G54 XY
buttons](docs/xy0-picker.png)

## Who it's for

The **XY0 Picker** works on any homed grblHAL machine with a grid on its spoilboard. You'll get the
most from the **Z0 macros** if:

- your machine **measures tool lengths** (a tool setter / tool length sensor, or an automatic tool
  changer (ATC) such as RapidChange), so each tool has a tool length offset (TLO), and
- your controller runs **grblHAL** (the wizard checks it can do the math the macros need).

Without measured tool lengths, every tool change needs a new Z probe anyway, and Zero Swapper can't
save you that.

## What you get

**XY0 Picker:** repeatable XY zero from your spoilboard grid. Use it for bench-dog stops and fences,
fixtures and jigs that register in the holes, or to get back to the same work origin job after job,
without an edge finder or XY probe. It shows the keepout zones (ncSender's, or the ATCi tool rack's)
and won't pick a hole inside one. Optional macros snap to the nearest dog hole from a keyboard shortcut.

**Z0 macros:** switch work Z zero between the spoilboard (wasteboard) and the stock top, for every
tool, without re-probing after a tool change:

| Macro | Does |
| --- | --- |
| **Record spoilboard height** | Probes a block on the spoilboard once and remembers the height. |
| **Z0 on spoilboard** | Sets work Z0 on the spoilboard, for any measured tool. For through-cuts and parts zeroed from the bottom. |
| **Z0 on stock top** | Sets work Z0 on top of the stock: the spoilboard plus a stored stock thickness (typed in, or probed with **Measure stock thickness**). |
| **Z0 back to saved** | Puts back the Z0 you had before, e.g. one you probed on the stock. |

In ncSender's Macros tab they're named **ZS: …**, with the work offset they set (e.g.
**ZS: G54 Z0 on spoilboard**).

### Put them on keys

This is where the macros really pay off: **ncSender lets you assign any macro to a keyboard
shortcut** (or a gamepad button), so switching Z0, snapping X0 Y0 to the nearest dog hole, or
finding a midpoint is one keypress at the machine, with no menus and no plugin window open.

1. Open ncSender's **Settings → Controls** (keyboard control has to be on).
2. Type **ZS** in **Search Actions…**; the macros are listed in the **Macros** group.
3. Click the pencil next to one and press the key combination you want.

For example: one key for **Z0 on stock top**, another for **Z0 on spoilboard**, and one for **XY0 on
nearest hole** after jogging roughly over a hole. Press **Create macros** again after changing settings
rather than deleting and recreating: it updates the macros in place, so your shortcuts keep working.

Nothing has to be re-probed when you change tools: the controller adds each tool's length offset
itself. The values are kept in the controller, so they survive power cycles.

Optional extras for setting X/Y: move to the **midpoint** between X0 and where you are (finding the
center of round or square stock), set X0 Y0 at that midpoint, and save / restore X/Y for a fixture.

## First time

1. Open **Zero Swapper** from the plugin tool menu, run the check, and press **Create macros**.
2. With a measured tool loaded, put your probe block (touch plate) on the spoilboard, jog the bit just above it,
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
- **New stock thickness:** tell Zero Swapper once, then run **Z0 on stock top**. Either:
  - put the block on the stock and run **Measure stock thickness** (one probe, good for every tool in
    the job), or
  - type the thickness in the wizard and press **Store**, if you trust the material's nominal size
    (sheet goods often vary by a few tenths of a mm, so measure when depth matters).
- **Zeroing from the bottom** (set the job's Z origin to the bottom of the stock in your CAM): run
  **Z0 on spoilboard**. No stock probing at all, and through-cuts come out exact.

So you probe once per new stock, not once per tool.

Every length and feed box takes mm or inches, whichever you have to hand, and converts it to the
machine's units when you leave the box: `1/4"`, `5/4"`, `.25in`, `1-1/2"`, `6.35mm`, and for feeds
`100ipm`, `2540mm/min`, `25mm/s`.

## XY0 Picker: X0 Y0 on a dog hole or grid line

Set your CNC's work zero (X0 Y0) to a spoilboard dog hole, a bench-dog hole, a threaded-insert grid,
or a crossing of lines lasered or V-carved into the spoilboard. Because the grid is at known machine
coordinates, the work origin is exact and repeatable, with no edge finding, touch plate or XY probe.

The plugin opens on its **XY0 Picker** tab; the Z0 macros are on the **Z0 macros** tab, and
**Help** in the sidebar explains whichever tab you're on.

Describe your spoilboard's grid once under **Setup** on that tab: **Hole Diameter**, **X Spacing**
and **Y Spacing** (center to center), and **Inset X** / **Inset Y** (from machine X0 Y0 to the center
of the first hole, into the machine's travel). Or jog the bit to the center of the first hole and press
**Grab First Hole Center** to fill the insets in (with the machine connected and homed; any hole
works when the first one is less than one spacing from machine X0 Y0). Once saved,
Setup opens locked so a stray tap can't change the grid; press **Locked** to unlock it for editing
(changes save as you go).

**From the keyboard, without opening the plugin:** tick **Nearest hole** under the Z0 macros tab's
**Extras** and press **Create macros**. You get **ZS: Go to nearest hole** and **ZS: XY0 on nearest
hole**: the controller works out the nearest hole to the spindle (grblHAL expressions with the grid
built in), so you can jog roughly and press a key (see [Put them on keys](#put-them-on-keys)). Go to
lifts to Safe Z first and never moves down; XY0 sets the active work offset on the side picked with the
dots. Both stop without changing anything if the machine isn't homed and, on a grid, if the nearest
hole is in a keepout zone or that side of it is outside the travel (with a list, such holes are left
out when the macros are made, so the nearest usable one is used). They read and write in whatever
units the controller is in, so they never switch between G20 and G21. XY0 (and the picker's **Set**) also stop while a **G92 offset**
is active, since grblHAL adds it on top and X0 Y0 would land away from the hole; send `G92.1` to clear
it. Go to moves in machine coordinates, which G92 doesn't affect. They use the grid, side and keepout zones as they were when
created, so press **Create macros** again after changing any of them.

**Holes that aren't a regular grid?** Locating holes, fixture pins, or a custom layout: set the
**Layout** menu at the top of Setup to **List** and enter one hole per line, as `x, y` or
`name: x, y` (e.g. `A: 0, 0`, `pin: 12-1/2", 6"`), measured from a **reference point** (Reference X /
Y) into the machine's travel, the same way the grid's insets are. Easiest: set the reference, then jog
over each hole and press **Add Current Position**. Positions are relative so that if the board or the
machine's homing ever shifts, jogging to the first listed hole and pressing **Grab First Hole Center**
moves the reference and the whole list follows. The map, Select Nearest, the dots, Go to Selected,
Set, keepout zones and the nearest-hole macros all work the same.

**T-tracks between panels?** Pick **T-tracks: Along X** (tracks between rows) or **Along Y** (between
columns) and set **Holes per Panel**. Leave **Panel Pitch** blank when the hole spacing carries straight
on across a track; if a track pushes the next panel over, measure from the first hole of one panel to
the first hole of the next. The tracks show as grey bands on the map.

**No holes, just a lasered or engraved grid?** Treat each line crossing as a hole: set **Hole
Diameter** to the line's width (the laser line's width, or the V-bit's kerf width at the surface; 0 for
a hairline), and the spacings and insets to the lines' centers. The center dot then puts X0 Y0 on the
middle of a crossing, and a corner dot on the edges of the two lines (back right for the +X +Y edges).

A map of your machine's travel then shows every hole, where the work offset's X0 Y0 is now, and the
spindle, with machine-coordinate rulers along the bottom (X) and right (Y) in ncSender's units. Keepout zones that are on (ncSender's in Settings › Advanced, and the ATCi tool rack's,
`$684`–`$687`) show in red; holes that reach into one are dimmed and can't be picked. Click a hole,
or jog roughly over one and press **Select Nearest** (it picks the hole closest
to the spindle and says how far off it is, so you get the grid's exact position without centering
the bit). The dots beside the Set button pick where on the hole X0 Y0 goes: the center, or an edge
or corner one hole radius out (back is +Y, right is +X), e.g. back right for a stop pin's +X +Y side.
**Go to Selected** moves the spindle over that point, lifting to ncSender's Safe Z first (machine Z0
when none is set; it never moves down, so a spindle already above Safe Z stays there). Like ncSender's
XY0, hold it for a second, since it moves the machine. A side of a hole that would land in a keepout
zone or outside the travel can't be used.
**Set G54 XY** sends `G21 G10 L2 P1 X… Y…`, which sets that work offset without moving anything. The
menu beside it picks the offset: **Active** (the default) asks the controller which one is in use, so
G59.1–G59.3 work too, or pick any of G54–G59.3; the spare offsets the Z0 macros store values in are
left out. It needs a homed, idle machine, since the holes are machine positions. The travel and its
direction come from grblHAL's `$130`/`$131` and homing settings
(`$22`/`$23`).

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
3. **Extras** (tick the ones you want; untick one and press **Create macros** to remove its macros):
   - **Midpoint X** / **Midpoint Y**: lift to ncSender's Safe Z (machine Z0 if none is set), then move
     halfway back to X0 (or Y0) along that axis only. For round stock: touch one side and zero X, touch
     the other side, run Midpoint X. Safe Z is written into the macro, so re-run **Create macros**
     after changing it.
   - **Midpoint XY**: the same lift, then move halfway to X0 Y0, e.g. from the opposite corner of square
     stock.
   - **Set XY0 to Midpoint**: put X0 Y0 halfway to the current spot without moving
     (`G10 L20 P0 X[#<_x> / 2] Y[#<_y> / 2]`).
   - **Nearest hole**: **Go to nearest hole** and **XY0 on nearest hole**, keyboard versions of the
     XY0 Picker's buttons (see the XY0 Picker section above).
   - **Save / restore X/Y**: save the work offset's X and Y (e.g. a fixture or jig) and put them back
     later. They're kept in the saved-Z0 slot's X/Y, which that slot doesn't otherwise use; restore
     does nothing if nothing was saved.
4. **Macros.** Creates the ncSender macros, or updates the ones it made before:
   Every ncSender macro can have a keyboard shortcut (**Settings → Controls**, **Macros** group; see
   [Put them on keys](#put-them-on-keys)).
   Their names start with **ZS:**, and each description is the macro's first comment line (e.g.
   "record spoilboard height").
   - **Record spoilboard height**: probes down onto the block and stores the height.
   - **Measure stock thickness**: with the block on the stock, probes down and stores
     stock top minus the spoilboard height.
   - **G54 Z0 on spoilboard**: saves the current Z0, then sets Z0 on the spoilboard.
   - **G54 Z0 on stock top**: saves the current Z0, then sets Z0 the stored thickness above the
     spoilboard.
   - **G54 Z0 back to saved**: puts the saved Z0 back (does nothing if none was saved).
   - The extras you ticked.
   - **Delete Zero Swapper macros** removes every macro whose name starts with "ZS:" (for example
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

The three macros that set Z0 (spoilboard, stock top, back to saved) also stop while a **G92 Z offset**
is active: grblHAL adds it on top of the work offset, so Z0 would land that far above or below where
it should. `G92.1` clears it. (The probing in record and measure isn't affected: grblHAL reports the
probe point relative to the work offset only.)

grblHAL macros have no if/else here, so a stop is a deliberate division by zero, for example
`#1=[1 / #<_homed_state>] (ZS stop: home the machine first)`: grblHAL rejects the line with
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

1. Download the latest `com.tmuka.zeroswapper_v….zip` from this repository's
   [Releases](https://github.com/tmuka/ncsender-plugin-zero-swapper/releases).
2. In ncSender: **Settings → Plugins → Install Plugin → ZIP**, pick the file and press **Install from
   File**, or paste the zip's link and press **Install from URL**.
3. Open **Zero Swapper** from the plugin tool menu.

Later versions show up under ncSender's plugin **Update** button. To build the zip yourself, see
Development below.

## Development

```
npm test         # pure functions from config.html, plus a stand-in for grblHAL running the G10 lines
npm run build    # dist/com.tmuka.zeroswapper_v<version>.zip from the committed files
```

`config.html` is the whole plugin: ncSender runs a client-only plugin's page inline, so its script
can't load other files. The macro builder and the `$#` / `$G` parsers sit between `BEGIN pure` and
`END pure` markers, and the tests run that block directly, so there's no second copy to keep in step.

## License

Zero Swapper is licensed under the [GNU General Public License v3.0](LICENSE), the same license as
ncSender's open-source edition. Copyright (c) 2026 tmuka.

## Status

In use on the author's grblHAL machine. The grblHAL behaviour above comes from its source
(`ngc_params.c`), and the ncSender API from ncSender's source; the wizard is also tested in a
browser against a stand-in ncSender.
