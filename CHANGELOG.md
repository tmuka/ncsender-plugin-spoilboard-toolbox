# Changelog

What's new in each release of Spoilboard Toolbox (Zero Swapper before 0.3.36). Install or update from
[Releases](https://github.com/tmuka/ncsender-plugin-zero-swapper/releases).

## Unreleased

**Zero Swapper is now Spoilboard Toolbox**, since it cuts the holes as well as zeroing on them. It's the
same plugin: updates, settings and macros carry over, and the macros keep their `ZS:` names.

### ✨ New
- **Cut Holes:** a new tab writes the program that cuts the dog holes you set up, every grid and each
  hole at its own size, and opens it in ncSender's visualizer. Holes the bit's size are drilled, up to
  twice its size spiralled down, bigger ones cleared in rings (QuickCut's circle milling). Suppressed,
  hidden and keepout holes are left out; it hops 5 mm between holes and lifts to Safe Z over keepout
  zones and Exclude Picks areas; Hole Depth can't pass the spoilboard's thickness; and it stops before
  moving if the work offset's X0 Y0 changed since you generated it.

- **Dowel fit test, chamfers and labels** (Cut Holes tab): a row of test holes in scrap to find the size
  your dowels fit; a V-bit chamfer round each hole's top edge; and the fixture table's names engraved
  beside the holes with a V-bit or a laser.
- **Holes through the stock** (Cut Holes tab): drill the stock right over spoilboard holes, either bolt
  holes (with an optional counterbore) to bolt it to threaded inserts, or two flip pins so a stock
  flipped for its second side drops back exactly where it was.
- **Measure Holes:** probe a few real holes and Setup's spacing and insets are fitted to them, with how
  far the spoilboard is turned.
- **Turned spoilboards:** a grid's **Turn** (degrees, from Measure Holes) turns its holes about the first
  one, for the map, Pick Nearest Hole, Set, the keyboard macros (press **Create macros** again after
  changing it) and Cut Holes. On an 8 ft bed, 0.1° is about 4 mm at the far end.
- **Presets:** load a shared grid layout (Onefinity QCW first) from the Profiles menu; you grab or
  measure the insets.
- **After surfacing:** when a wasteboard surfacing job finishes, a note says to re-record the
  spoilboard's height.

### 🎯 Easier to use
- **Zoom the map** for big machines: **+** / **−**, the mouse wheel or a pinch, drag to look around,
  **Fit** for the whole travel and **Follow** to keep the spindle in view. Only the holes in view are
  drawn.
- Two-letter row names (AA on) fit beside the map, and column numbers thin out so they never run
  together. Holes right on the edge of the travel show whole, with room before the row letters.
- **The menu** runs XY0 Picker, Cut Holes, then Z0 macros.
- **Holes are named like a fixture table**: a row letter and a column number (**B3**), like a
  Fireball fixture table, counted from machine zero's corner: **A1** is the hole nearest machine X0 Y0
  (front left on a machine that homes there). The column numbers run along the top of the map and the row letters
  down its left. (Thanks, Francis.)

## 0.3.35

**Z0 on a vise, a fixture or the stock top, and stock measured with the spindle, not a tape.**

### ✨ New
- **Set Z0 on a fixture or the stock.** Give a listed point a fourth value, the height of its surface
  above the spoilboard (`vise: 400, 250, , 63.5mm`), and pick it: a **Set Z0** hold button puts Z0
  on that surface for any measured tool, from the spoilboard height the Z0 macros recorded. Stock
  gains a thickness and a **Z0: spoilboard / stock top** menu, so Z0 can go on the stock's bottom or
  top too. Guarded like the Z0 macros (homed, tool length offset active, spoilboard recorded, no G92
  Z). On the Z0 macros' work offset a probed Z0 is kept for **Z0 back to saved**, and holding Set
  Z0 again or running a Z0 macro after it doesn't replace it (press **Create macros** once so the Z0
  macros know about it).
- **Stock size without a tape.** Jog the bit over the stock's opposite corner and press **Far
  Corner Here**: width, length and which corner sits on the point come from the spindle.
- **Thick follows Measure stock thickness.** The stock's thickness fills in from what the measure
  macro (or Store) recorded, until you type one, and Set Z0 says whether it used a measured, typed
  or last-time thickness.
- **Heights are checked**: one below the spoilboard or more than the machine's Z travel (a unit typo,
  say) is flagged on its line in the list, and Set Z0 refuses it.

### 🎯 Easier to use
- Listed points (pins, a vise) sit on top of the grids and their names are clickable, so they're
  easy to pick even right next to a dog hole.
- The stock comes back where it was when you reopen the plugin, on its hole or its X0 Y0.
- With Grid + List, the list says how many points fall outside the machine's travel.
- Stock thickness has its own line, so the narrow column never scrolls sideways, and the stock fields
  are wide enough for 4–5 digit sizes.

### 🐛 Fixes
- Set and Set Z0 put the controller back in inches only if it was in inches (asked with `$G`), not
  by ncSender's unit setting.

## 0.3.34

**Every kind of bed: more grids, pins with their own size, and controls that guide you.**

### ✨ New
- **More than one grid.** Large dog holes and a small pin grid? Press **+ Grid** under Setup's
  heading. Each grid has its own name, hole size, spacing, insets, T-tracks and suppressed holes. Pick
  a grid's chip to edit it, use the eye to show or hide its holes on the map (handy where grids
  overlap), and untick **Use for Nearest** to keep a grid out of Pick Nearest Hole and the keyboard
  macros.
- **Grid + List.** Add extra holes to a grid, such as locating pins or a fixture's holes, measured
  from the grid's first hole. Give any hole its own diameter as a third value (`pin: 130, 40, 6mm`).
  The map draws it at that size, and X0 Y0 goes on its own edge.
- **Stock from X0 Y0.** With no hole picked, ticking **Stock** draws it from your current X0 Y0:
  zero on a corner, tick Stock, and hold Set to move zero to its center. The stock stays put when
  X0 Y0 changes (for this session; picking a hole replaces it); **From X0 Y0 now** takes X0 Y0
  again.

### 🎯 Easier to use
- **Edit Holes works like a selection box.** Drag a box around holes to suppress them all, drag
  around suppressed ones to bring them back, or tap one. Suppressed holes show as faint discs.
- **Set is a hold button**, like Go to Selected, so a stray tap can't move your zero. It pulses after
  you pick a hole to show it's the next step.
- **Clearer buttons and labels.** Secondary buttons are tinted so they read as buttons; the dots are
  captioned "Where X0 Y0 goes on the hole"; the stock controls sit in their own panel; **Pick
  Nearest Hole** and **Go to Selected** sit side by side in the narrow column.
- **The spindle looks like ncSender's**: a top-down view of its cutter, with a dot at the bit's
  center.
- **Exclude Picks** (was Block Area) says plainly that it only guides this picker: jogging, jobs and
  the keyboard macros ignore it.
- The picked point's machine position fits on one line.

### 🐛 Fixes
- A work offset whose X0 Y0 is off the machine's travel no longer draws outside the map. It's pinned
  to the nearest edge in red, labelled "off the bed".
- The Z0 tab's macro preview updates as you edit Setup.
- Keyboard macros: an extra hole just outside a keepout zone's corner is skipped cleanly instead of
  stopping the macro, and Create macros says which grid to fix if one can't be read.

## 0.3.33

**Holes your board leaves out, profiles for every board, and zeroing anywhere on your stock.**

### ✨ New
- **Suppress missing holes** so the map, Pick Nearest Hole, Go to, Set and the keyboard macros skip
  them.
- **Profiles**: keep one Setup per spoilboard or fixture plate, with Save and Revert when you
  experiment.
- **Stock**: type its size to zero on its center, any corner or any edge.
- **Exclude areas** of the map for a job, such as a clamp or fixture.
- **Favorite holes**: starred, ringed on the map and one tap to pick.
- **Live position**: the spindle and the hole nearest it follow you as you jog.

## Earlier

- **0.3.32**: safety hardening; every move and offset line is guarded by the same checks as the
  macros' stop lines. Needs ncSender 2.0.163.
- **0.3.31**: plugin icon. **0.3.30**: map rulers. **0.3.28**: hole lists. **0.3.27**: nearest-hole
  keyboard macros and G92 guards. **0.3.23**: T-track panels. **0.3.21**: the XY0 Picker.
- **0.3.4**: first release as Zero Swapper: Z0 on the spoilboard or stock top for any measured tool.
