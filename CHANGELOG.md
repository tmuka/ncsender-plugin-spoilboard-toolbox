# Changelog

What's new in each release of Spoilboard Toolbox (Zero Swapper before 0.3.36). Install or update from
[Releases](https://github.com/tmuka/ncsender-plugin-spoilboard-toolbox/releases).

## Unreleased

### ✨ New
- **Lock Position** (XY0 Picker, Stock): keeps the stock where it's drawn while you pick other holes to
  go to. Picks then aim at the hole itself; tap a stock dot to aim at the stock again. The lock is kept
  when you reopen the plugin; untick Stock or press Unlock Position to let it follow picks again.
- **Stock tab diagram:** a side view of the stock on the spoilboard with your numbers: Z0 on the
  stock's top, how deep the holes go (T + Break Through), the counterbore and stop depths, and Z0's
  height as measured against the recorded spoilboard.
- **Depth** (Stock tab): leave it blank to drill through as before, or give a depth for blind holes
  that stop that far below Z0 (less than the stock's thickness). Break Through is greyed out then.
- Stock tab, **Every one inside**: the summary counts the holes, and how many along X and along Y.
- **Drill Pecks** (Bit and depth): holes the bit's size are drilled straight down, pecking a Depth per
  Pass at a time. Pick **Clear chips** (up to 2 mm above the top and back, as before), **Break chips**
  (back off 0.5 mm, as QuickCut's Drill), or **None** (one plunge). The Stock tab's summary says how the
  holes will be cut.
- **Math in length and feed boxes**, as CAD tools allow: `8mm*2`, `12/6`, `4+6`, `1in+4mm`, with
  brackets. It's worked out when you leave the box.

### 🐛 Fixes
- The "Z0 is ... above the spoilboard" warning now says where the height comes from, what to touch off
  to check it, and what to do if Z0 is right but the recorded spoilboard height isn't.
- A false "Safe Z puts this tool's tip less than 5 mm above Z0" problem, which also disabled Generate:
  the tool length offset counted as 0 until Generate had read it, and after a soft reset (G49 in `$G`,
  though grblHAL keeps the offset applied) even then. Set Z0, recording the spoilboard height and the
  controller check list now count an offset kept through a reset too.
- Stepover is only required when a hole will be cleared in rings, so 0 no longer blocks drilling.

## 0.4.5

### ✨ New
- XY0 Picker on wide screens: the controls column is wider (300 px), so the Stock size, Z0 and corner
  fit without crowding, and the map's card ends with the controls instead of leaving a gap.

## 0.4.4

**Nearly full screen, like ncCAM.**

### ✨ New
- The dialog fills the screen, 24 px clear all round, in landscape and portrait. Tabs stop at 1200 px
  wide so the forms don't stretch on big screens.
- XY0 Picker: on a wide screen the controls sit right beside the map; on a portrait screen they go
  under it, so the map fills the width.

### 🐛 Fixes
- On narrow screens the Setup Lock button and the Set button no longer run off the right edge.

## 0.4.3

**Fixture plates that bolt down between the dog holes.**

### ✨ New
- **+ Inserts** (XY0 Picker Setup): adds a grid of threaded inserts on the grid lines, halfway between
  your holes along X or Y, at the insert's hole size. The dog holes stay free for pins. Cut Holes drills
  the inserts; T-track panels and a turned grid are handled; Pick Nearest Hole leaves them out.
- **Fixture plate** (Stock tab): one program for a plate that comes off and goes back square. Two pin
  holes over dog holes as far apart as fit, bolt holes over the insert grid (counterbored if you like),
  and an optional **corner stop** hole in the middle of the grid square nearest a corner. The stop's
  hole stops short of the plate's bottom. Holes that would run together are refused.

## 0.4.2

**Safety stops that trust a kept tool offset, and smaller fixes from the shop floor.**

### 🐛 Fixes
- **Programs and Z0 macros no longer stop with "no tool length offset active" after a reset.**
  grblHAL's soft reset (ncSender sends one after an error or an abort) turns G43.1 off but keeps the
  measured offset applied, so the check now accepts a kept offset. The stop still catches a
  controller restart, which clears the offset. To pick this up, generate programs again and press
  **Create macros** in the Z0 macros tab.
- **Add Current Position says "already listed" beside the button**, with the line it's on,
  instead of in the status line at the top that you may have scrolled away from.
- **XY0 Picker warns after a jog.** Set always uses the picked hole's grid position, never the
  spindle's. If you jog after picking a hole (or after Go to Selected), the picker now says how far
  the spindle is from the picked point, and that ncSender's XY0 is the way to zero where the spindle is.
- **Holes through the stock: a Counterbore of 0 means none**, as blank does, instead of an error.
  Counterbore Depth is greyed out when there's no counterbore, since it isn't used.

### ✨ New
- **Comment out a listed hole** with `#` at the start of its line (`;` and `(` already worked):
  it's skipped everywhere but stays in the list for later. Stars and suppressed marks on listed
  holes now stay with their hole when lines are commented out, added or deleted, instead of
  sliding onto the next one.

## 0.4.1

**Removable fixture plates that match your spoilboard.**

### ✨ New
- **Fixture plate** (Spoilboard tab): confine the dog holes, T-tracks, grid lines, chamfers and labels
  to the XY0 Picker's Stock, to make a removable plate that matches the spoilboard. Nothing goes past
  its edges or deeper than its thickness, and Z0 goes on its top: with the spoilboard height recorded,
  Generate checks Z0 is the plate's thickness above it, the program stops if Z0 moves, and it lifts to
  Safe Z between holes, over the clamps.

### 🐛 Fixes
- The **Bit and depth** card no longer has a blank strip at the bottom.

## 0.4.0

**A new plugin ID, moved over for you.** The plugin's ID is now `com.tmuka.spoilboard-toolbox` (it was
`com.tmuka.zeroswapper`, from the Zero Swapper days). Update as usual from the Plugins tab; the first
time you open the new one it copies your Setup, profiles and settings across, moves its keyboard shortcut,
and uninstalls the old copy, then says what it did. The old settings stay on disk as a backup, and the
SBT: macros and their shortcuts aren't touched. If you see two Spoilboard Toolbox buttons after updating,
open the new one (0.4.0): it does the move and the old button goes away.

### ✨ New
- **Grid lines** (Spoilboard tab): laser or V-bit engrave the grid instead of drilling it, a line along
  every row and column crossing where the holes would be, clear of zones and broken at T-tracks.
- **Laser test** (Spoilboard tab): a labelled cross for every power and feed on scrap, to pick the
  settings for crisp grid lines and labels.
- **Read more help** at the bottom of the welcome screen.

### 📖 Docs
- **What you need** says a plain spoilboard is fine: the plugin cuts the holes.
- **Help is a set of short pages**: each tab's Help opens on an index of topics, grouped (Start here, Set up
  your board, Using the map...), each a tile with an icon and one line. A tile opens its page, with
  Previous and Next; the longest pages are now short paragraphs and lists. **Getting started** and the
  README link are at the top, and Field tips is a page of its own with the names in a narrow column.

### 🐛 Fixes
- **Easier to read, light or dark (WCAG AA contrast):** accent-colored text, links and lines, warnings,
  errors and status notes are darker in light mode and lighter in dark; input and chip borders, the map's
  edge, suppressed and blocked holes and the keepout outline stand out; primary buttons are a deeper green
  under their white text; and every control shows a clear outline when reached with the keyboard.
- In by-eye mode, Measure Holes no longer shows the probe-only **Also record the spoilboard height** box.

## 0.3.37

**Measure your holes without hunting for them, and a welcome that asks where you're starting.**

### 🎯 Easier to use
- **A welcome screen** on a fresh install: pick **No holes yet** (lay out and cut a new board) or
  **Holes already there** (map them), and it takes you to Setup with the next steps. Help's **Getting
  started** opens it again.
- **Measure Holes** has a **Measure with** menu, a pin by eye (to start) or a 3D touch probe, and shows only
  that way's button, so a pin in a hole can't be sent probing into the wall by mistake.
- **Apply to Setup** waits for two measured holes.
- **Measure Holes suggests which holes:** the one nearest A1, the far end of its row and the top of its
  column, clear of keepout zones, Exclude Picks areas and the stock, and holding **Go to** moves over the
  next one at Safe Z.
- **Probe Suggested Holes:** with a 3D probe, one hold measures them all: Safe Z between holes, 6 mm
  down into each (it stops if it touches the spoilboard's top instead of finding the hole), and two
  rounds of wall touches so it centers itself. Tick **Also record the spoilboard height** and it touches
  the top beside the first hole and stores the height for the Z0 macros (refused without the probe's tool
  length offset active, and not stored when it's over 2 mm from the recorded one). **Feedback wanted:**
  not yet tried on a real 3D probe, so stay by the stop button and tell us how it went.
- **Nothing typed is lost on close:** fields save half a second after you stop typing, not only when you
  leave them, so closing the plugin right after typing a number keeps it.

## 0.3.36

**Cut the spoilboard, measure it, zero on it: one plugin, from the first hole to every job after.**

**Zero Swapper is now Spoilboard Toolbox**, since it cuts the holes as well as zeroing on them. It's the
same plugin: updates and settings carry over. Its macros are now named **SBT:** (for Spoilboard
Toolbox) instead of ZS:. Your ZS: macros keep working; press **Create macros** once and they're renamed in
place, keeping their numbers, so keyboard shortcuts on them still work. Generated programs' comments and
file names start SBT too. Its GitHub page is now
[tmuka/ncsender-plugin-spoilboard-toolbox](https://github.com/tmuka/ncsender-plugin-spoilboard-toolbox); the old link still works.

### ✨ New
- **Spoilboard:** a new tab writes the program that cuts the dog holes you set up, every grid and each
  hole at its own size, and opens it in ncSender's visualizer. Holes the bit's size are drilled, up to
  twice its size spiralled down, bigger ones cleared in rings (QuickCut's circle milling). Suppressed,
  hidden and keepout holes are left out; it hops 5 mm between holes and lifts to Safe Z over keepout
  zones and Exclude Picks areas; Hole Depth can't pass the spoilboard's thickness; and it stops before
  moving if the work offset's X0 Y0 changed since you generated it, or if Z0 came from the Z0 macros but
  no tool length offset is active.

- **Dowel fit test, chamfers and labels** (Spoilboard tab): a row of test holes in scrap to find the size
  your dowels fit; a V-bit chamfer round each hole's top edge; and the fixture table's names engraved
  beside the holes with a V-bit or a laser.
- **Tool change from the loaded tool:** click Bit Diameter to take ncSender's loaded tool and the hole
  programs start with `M6` to it; a typed diameter means you load the bit.
- **Cut the T-tracks** (Spoilboard tab): just the T-track slots in a sacrificial top layer, so the tracks
  and threaded inserts live in a lower layer that's never cut, and the top can be surfaced off or
  replaced. Through the top layer, or dados to set new track in.
- **Stock** (a new tab): drill the stock right over spoilboard holes, either bolt
  holes (with an optional counterbore) to bolt it to threaded inserts, or two flip pins so a stock
  flipped for its second side drops back exactly where it was.
- **Measure Holes:** probe a few real holes, or center a pin in them by eye (jogging with the keyboard,
  a gamepad or the pendant), and Setup's spacing and insets are fitted to them, with how far the
  spoilboard is turned.
- **Turned spoilboards:** a grid's **Turn** (degrees, from Measure Holes) turns its holes about the first
  one, for the map, Pick Nearest Hole, Set, the keyboard macros (press **Create macros** again after
  changing it) and the Spoilboard and Stock programs. On an 8 ft bed, 0.1° is about 4 mm at the far end.
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
- **The menu** runs XY0 Picker, Spoilboard (dog holes, T-tracks, fit test, chamfers and labels, one at a
  time with chips), Stock, then Z0 macros.
- **The Bit and depth card** fits in two rows of five, Mist and Flood included.
- **Grab any hole:** pick a hole on the map, jog over it, and **Grab B3 Center** sets the insets so that
  hole is under the bit, instead of guessing from the first hole.
- **SBT: Set XY0 at nearest hole (no move)** is the new name of XY0 on nearest hole, so it's not mistaken
  for Go to nearest hole (which moves); Create macros renames it in place.
- **Dowel fit test:** an **Edge Distance** (10 mm to start) keeps the test holes off the scrap's edges.
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
