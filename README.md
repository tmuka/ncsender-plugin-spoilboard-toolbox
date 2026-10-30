# Spoilboard Toolbox

**Your spoilboard's holes are already a precision fixture. Spoilboard Toolbox cuts them, measures them,
and turns every one into a work zero you can hit again tomorrow.**

- **X0 Y0 in two taps, no probe.** Jog roughly near any dog hole, tap **Pick Nearest Hole**, hold
  **Set**: work zero lands on the hole's exact center or edge, from the grid's numbers, not your eye.
  Same hole, same zero, every job. Put it on a key and it's one press.
- **Z0 for every tool, probed once.** Record the spoilboard height once. After that any measured tool
  puts Z0 on the spoilboard or the stock top in one click, and one more puts your old Z0 back.
- **Zero on stock pushed against pins, worked out, not guessed.** Push the stock against pins in two
  or three dog holes and tap those holes: the stock's corner is a pin radius off the pins, exact, and
  X0 Y0 goes on that corner, an edge or its center. A line beside **Set** says where, with the numbers,
  and flags a move that's exactly a hole or pin radius: the classic wrong-dot mistake.
- **A whole spoilboard from one Generate.** Every dog hole drilled, spiralled or cleared at its own
  size, in one program you check in ncSender's 3D visualizer before it cuts. Then chamfer every hole and
  engrave fixture-table labels (A1, B3…) with a V-bit or a laser. The board and the map come from the
  same numbers, so they agree.
- **Fit the grid to the real board, probe or no probe.** **Measure Holes** finds a few hole centers
  with a 3D probe, or by eye: center a pin in each, jogging with the keyboard, a gamepad or the
  pendant. One press fits the spacing, the insets and even a board mounted a fraction of a degree off
  square (0.1° is 4 mm at the far end of an 8 ft bed).
- **A spoilboard that lasts.** Cut just the T-tracks in a sacrificial top layer over a permanent layer
  of tracks and threaded inserts: surface or replace the top, never the inserts.
- **Stock that bolts down, locates and flips true.** Drill bolt holes right over threaded inserts, a
  plate with two locating pins (one round, one slotted) that goes back exactly where it was, or two
  flip pins so a part flipped for its second side drops back where it was.
- **Pictures where the words get close.** Live diagrams show what Inset, Spacing, Hole Ø and Pin Ø
  measure, how deep each hole goes and what's left under it, and where X0 Y0 lands on a hole or
  against the pins, with your numbers as you type. Starting feeds and speeds by material (MDF,
  plywood, hardwood, HDPE, acrylic, aluminum) are a click away.
- **Every bed, any size.** Missing holes, T-track panels, dog holes plus a pin grid, custom pins,
  lasered grid lines, keepout zones, a saved profile for every board, and zoom for an 8 × 5 ft bed.

Spoilboard Toolbox is a plugin for [ncSender](https://github.com/siganberg/ncSender), the G-code sender for
grblHAL CNC routers. Its **XY0 Picker** shows your machine's bed with every hole on it, live as you jog,
and sets the work offset (G54–G59.3) without moving the machine. Its **Z0 macros** tab checks your
grblHAL controller, then writes ncSender macros you run from the Macros tab or, best of all, a
keyboard shortcut. Its **Cut Board** tab writes the programs that cut the board's own pattern (or
copy it onto a plate), and **Stock Holes** the ones that drill a workpiece so it bolts down, locates
or flips, from the same grid.

![Spoilboard Toolbox's XY0 Picker in ncSender, in Stock mode: a map of the CNC bed's dog hole grid
between T-tracks, a stock pushed against pins in M8, M10 and N7, X0 Y0 on its front left corner with
the numbers beside Set and a zoomed view of the pins, and the Go to Stock Center, Go to Stock Front
Left and Set G54 XY buttons](docs/xy0-picker.png)

## What a job looks like

![X0 Y0 on a dog hole in two taps: jog roughly near a hole, tap Pick Nearest Hole and it takes the
grid's exact position, then hold Set and G54 X0 Y0 lands on the hole's center](docs/two-taps.png)

**Zero on a stock corner, no probing.** Push the stock against pins in your dog holes, two along one
edge and one along the other. In the XY0 Picker's **Stock** mode, tap those three holes: the stock's
corner is worked out a pin radius off the pins' row and column, and the line beside **Set** says so
("X0 Y0 → the stock's front left corner, 4.000 mm right and 4.000 mm back from where column 3 and
row B cross, pins Ø 8.000"). Hold **Set**: no edge finder, no XY probe, nothing typed. Use the same
holes next time and you get the same zero back.

**Zero anywhere on the stock, no measuring.** Type its size (or jog over the far corner and press
**Far Corner Here**), and the stock's dots put X0 Y0 on its center or any corner or edge. Or, at the
machine: with X0 Y0 on one corner, jog roughly to the opposite corner and run **Set XY0 to Midpoint**
for the exact center (**Midpoint XY** moves the spindle there first, at Safe Z).

**Zero on a hole.** In **Hole** mode, jog roughly near a hole and press **Pick Nearest Hole**, or tap
it, and hold **Set**: X0 Y0 lands on its center, or a side or corner of the hole (one hole radius
out), for a part on a pin, a jig's home hole, or a flip pin.

**New tool, same Z0.** Change to any measured tool and run **Z0 on stock top** (or **Z0 on
spoilboard** for through-cuts). No re-probing.

## What you need

**For the basics, nothing beyond a homed grblHAL machine and ncSender.** The extras each light up
features when you have them; nothing else stops working without them.

**Basic: every user**
- **ncSender** 2.0.163 or later, driving a **grblHAL** controller.
- **Homing switches**, used every session: the holes are machine positions, so most actions wait for a
  homed machine. The travel comes from grblHAL's `$130`/`$131` and homing settings.
- **A spoilboard.** A plain one is fine: the plugin cuts the dog holes into it (path A below). Or one that
  already has a hole grid, a grid lasered or V-carved on it, or fixture holes, which you map (path B).

That's enough for:
- the **XY0 Picker**: Pick Nearest Hole, Set, Go to, stock, favorites, profiles, zoom;
- **Measure Holes by eye**, with a pin or dowel in the spindle (or a V-bit);
- the **nearest-hole keyboard macros**;
- **cutting the board**: dog holes, T-tracks, fit test, and chamfers and labels with a V-bit;
- drilling **stock holes** (bolts, locating pins and flip pins).

Put Z0 on the spoilboard (or the stock) any way you like for these: paper, a touch plate, or the Z0 macros.

**Extras, and what each one adds**

| If you have | You also get |
| --- | --- |
| **Measured tool lengths:** a tool setter (tool length sensor) or an ATC, so each tool's length offset is active | The **Z0 macros**: Z0 on spoilboard, Z0 on stock top and Z0 back to saved, for any tool without re-probing, and **Set Z0** on a vise or fixture |
| **A touch plate** (ncSender's Standard Block, on the probe input), with measured tool lengths | **Record spoilboard height** and **Measure stock thickness**, which the Z0 macros need once |
| **Tools in ncSender's tool table** | Click **Bit Diameter** to take the loaded tool's size, and the programs start with a tool change (`M6`) to it |
| **A 3D touch probe** | **Probe This Hole** and **Probe Suggested Holes** in Measure Holes; with its tool length offset measured, **Also record the spoilboard height**. *Feedback wanted: not yet tried on a real probe.* |
| **A laser** with grblHAL's laser mode on (`$32=1`) | **Grid lines** and the hole labels lasered instead of cut with a V-bit, and the **Laser test** to find its power and speed |
| **Keepout zones** (ncSender's, or the ATCi tool rack's `$684`–`$687`) | The map shows them, picks avoid them, and the programs lift over them |
| **The [QuickCut](https://github.com/siganberg/ncsender-plugin-quickcut) plugin** | Spoilboard surfacing (left to QuickCut on purpose), and a reminder to re-record the height after it |

**Without measured tool lengths**, every tool change needs a new Z touch-off anyway, so the Z0 macros
can't save you anything; the rest of the plugin works the same.

## Two ways to start

The plugin asks this itself the first time it opens (and Help's **Getting started** brings it back).

**A. No holes yet: lay out a new spoilboard and cut it.** The board and the map come from the same
numbers, so they agree from the first hole.
1. Surface the board (QuickCut's Wasteboard Surfacing) and put Z0 on its top: touch off, or
   **SBT: Z0 on spoilboard**.
2. In the XY0 Picker's **Setup**, describe the grid you want: hole size, spacing, and the insets from
   machine X0 Y0 to the first hole; T-tracks between panels if you have them. Or load a preset from the
   Profiles menu. The map shows the result over your machine's travel.
3. **Cut Board → Fit test:** cut a row of test holes in scrap and set Hole Diameter to the one your
   dowels fit.
4. **Cut Board → Dog holes → Generate**, check it in ncSender's visualizer, and run it. Then
   chamfers and labels if you like, and T-tracks for a two-layer board.
5. Save Setup as a profile (**New profile…**). From now on, zeroing is path B's last step.

**B. Holes already there: map them, then zero in two taps.**
1. In **Setup**, type the grid's hole size and spacing (and T-tracks), or load a preset.
2. Pick a hole on the map, jog the bit over that hole's real center, and press **Grab … Center**: the
   insets fill in so the map lines up with the board.
3. **Measure Holes** (by eye with a pin, or a 3D probe) on the three holes it suggests, then **Apply to
   Setup**: spacing, insets and how far the board is turned, fitted to the real holes.
4. **Edit Holes** to suppress any the board doesn't have, and add fixture pins or a vise as listed holes.
5. Check it: **Pick Nearest Hole** near a far hole, hold **Go to Selected**, and the bit should sit
   right over it. Save Setup as a profile.
6. Every job after: jog near a hole, **Pick Nearest Hole**, hold **Set**. Tick the nearest-hole macros
   and put them on keys to make it one keypress.

Either way, the Z0 macros are a separate, optional step for machines with measured tool lengths: see
[First time with the Z0 macros](#first-time-with-the-z0-macros).

## What you get

**XY0 Picker:** repeatable XY zero from your spoilboard grid. Use it for bench-dog stops and fences,
fixtures and jigs that register in the holes, or to get back to the same work origin job after job,
without an edge finder or XY probe. It shows the keepout zones (ncSender's, or the ATCi tool rack's)
and won't pick a hole inside one. Grids with holes left out, T-tracks between panels, and custom hole
lists are covered too. Optional macros snap to the nearest dog hole from a keyboard shortcut.

**Z0 macros:** switch work Z zero between the spoilboard (wasteboard) and the stock top, for every
tool, without re-probing after a tool change:

| Macro | Does |
| --- | --- |
| **Record spoilboard height** | Probes a block on the spoilboard once and remembers the height. |
| **Z0 on spoilboard** | Sets work Z0 on the spoilboard, for any measured tool. For through-cuts and parts zeroed from the bottom. |
| **Z0 on stock top** | Sets work Z0 on top of the stock: the spoilboard plus a stored stock thickness (typed in, or probed with **Measure stock thickness**). |
| **Z0 back to saved** | Puts back the Z0 you had before, e.g. one you probed on the stock. |

In ncSender's Macros tab they're named **SBT: …**, with the work offset they set (e.g.
**SBT: G54 Z0 on spoilboard**).

### Put them on keys

This is where the macros really pay off: **ncSender lets you assign any macro to a keyboard
shortcut** (or a gamepad button), so switching Z0, snapping X0 Y0 to the nearest dog hole, or
finding a midpoint is one keypress at the machine, with no menus and no plugin window open.

1. Open ncSender's **Settings → Controls** (keyboard control has to be on).
2. Type **SBT** in **Search Actions…**; the macros are listed in the **Macros** group.
3. Click the pencil next to one and press the key combination you want.

For example: one key for **Z0 on stock top**, another for **Z0 on spoilboard**, and one for **XY0 on
nearest hole** after jogging roughly over a hole. Press **Create macros** again after changing settings
rather than deleting and recreating: it updates the macros in place, so your shortcuts keep working.

Nothing has to be re-probed when you change tools: the controller adds each tool's length offset
itself. The values are kept in the controller, so they survive power cycles.

Optional extras for setting X/Y: move to the **midpoint** between X0 and where you are (finding the
center of round or square stock), set X0 Y0 at that midpoint, and save / restore X/Y for a fixture.

## First time with the Z0 macros

1. Open **Spoilboard Toolbox** from the plugin tool menu, run the check, and press **Create macros**.
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
- **New stock thickness:** tell Spoilboard Toolbox once, then run **Z0 on stock top**. Either:
  - put the block on the stock and run **Measure stock thickness** (one probe, good for every tool in
    the job), or
  - type the thickness in the wizard and press **Store**, if you trust the material's nominal size
    (sheet goods often vary by a few tenths of a mm, so measure when depth matters).
- **Zeroing from the bottom** (set the job's Z origin to the bottom of the stock in your CAM): run
  **Z0 on spoilboard**. No stock probing at all, and through-cuts come out exact.

So you probe once per new stock, not once per tool.

Every length and feed box takes mm or inches, whichever you have to hand, and converts it to the
machine's units when you leave the box: `1/4"`, `5/4"`, `.25in`, `1-1/2"`, `6.35mm`, and for feeds
`100ipm`, `2540mm/min`, `25mm/s`. They also do simple math, as CAD tools do: `8mm*2`, `12/6`, `4+6`,
`1in+4mm`, `(1/4"+2mm)/2`. A number without a unit is in the machine's units when it's added or
subtracted, and a plain factor when it multiplies or divides.

## XY0 Picker: X0 Y0 on a dog hole or grid line

Set your CNC's work zero (X0 Y0) to a spoilboard dog hole, a bench-dog hole, a threaded-insert grid,
or a crossing of lines lasered or V-carved into the spoilboard. Because the grid is at known machine
coordinates, the work origin is exact and repeatable, with no edge finding, touch plate or XY probe.

The plugin opens on its **XY0 Picker** tab; the Z0 macros are on the **Z0 macros** tab, and
**Help** in the sidebar explains whichever tab you're on.

Describe your spoilboard's grid once under **Setup** on that tab: **Hole Diameter**, **Pin Ø** (the
pins you put in the holes, where the stock touches them; blank for the hole's), **X Spacing** and
**Y Spacing** (center to center), and **Inset X** / **Inset Y** (from machine X0 Y0 to the center of
the first hole, into the machine's travel). A small picture under the fields shows which is which,
with your numbers. Or jog the bit to the center of the first hole and press
**Grab First Hole Center** to fill the insets in (with the machine connected and homed; any hole
works when the first one is less than one spacing from machine X0 Y0). Better: **pick any hole on the
map** first (one that's easy to reach, say), jog the bit over its real center, and press the button,
which then reads **Grab B3 Center**: the insets are set so that hole is exactly under the bit, with no
guessing which hole you meant. It warns when the bit is more than half a spacing from where Setup had
that hole (probably the wrong one). Then pick a far hole and **Go to Selected** to check. Once saved,
Setup opens locked so a stray tap can't change the grid; press **Locked** to unlock it for editing
(changes save as you go).

**Profiles: one per board, and a safety net for experiments.** The menu beside Setup's title keeps
a profile for each spoilboard, fixture plate or grid you use (*Spoilboard*, *Airweights sheet*...).
**New profile…** saves what's in Setup under a name; pick another to load it. Change a number and a
bar says the profile has changed: **Save** keeps it, **Revert** puts it back, so trying other numbers
never loses yours. A profile holds the layout, numbers, T-tracks, hole list and suppressed holes; the
dot (where X0 Y0 goes on the hole) is picked per job. Press **Create macros** after switching if you
use the nearest-hole macros.

**From the keyboard, without opening the plugin:** tick **Nearest hole** under the Z0 macros tab's
**Extras** and press **Create macros**. You get **SBT: Go to nearest hole** and **SBT: Set XY0 at nearest
hole (no move)**: the controller works out the nearest hole to the spindle (grblHAL expressions with the grid
built in), so you can jog roughly and press a key (see [Put them on keys](#put-them-on-keys)). Go to
lifts to Safe Z first and never moves down; XY0 sets the active work offset on the side picked with the
dots. Suppressed holes are skipped, so the nearest real hole is used. Both stop without changing anything if
the machine isn't homed and, on a grid, if the nearest hole is in a keepout zone or that side of it is outside the travel (with a list, such holes are left
out when the macros are made, so the nearest usable one is used). They read and write in whatever
units the controller is in, so they never switch between G20 and G21. XY0 (and the picker's **Set**) also stop while a **G92 offset**
is active, since grblHAL adds it on top and X0 Y0 would land away from the hole; send `G92.1` to clear
it. Go to moves in machine coordinates, which G92 doesn't affect. They use the grid, side and keepout zones as they were when
created, so press **Create macros** again after changing any of them.

**Which layout?** Use **Grid** whenever your holes are on a regular spacing, even with holes missing
or T-tracks in between: it's five numbers to set up, and its keyboard macros are short and fast,
whatever the size of the bed. **Grid + List** adds a few extra holes to a grid (locating pins, a
fixture's holes), and **List** alone is for holes with no regular spacing. Two regular patterns, like
large dog holes and a small pin grid? Press **+ Grid** for a second grid rather than listing every pin.

**More than one grid.** The chips under Setup's heading list your grids; press one to edit it in the
fields below, and **+ Grid** (with Setup unlocked) to add another, starting as a copy of the one
you're on. Each grid has its own name, hole diameter, spacing, insets, T-tracks and suppressed holes.
**Use for Nearest** decides whether Pick Nearest Hole and the keyboard macros snap to its holes (untick
it for a pin grid you only ever pick on the map), and **Remove Grid** deletes it. The eye on each chip
shows or hides that grid's holes on the map, handy for picking or suppressing holes where two grids
overlap. **+ Inserts** is for a board whose threaded inserts are a grid of their own, halfway between
the dog holes (along X or Y): it adds that grid at the insert's hole size. Cut Holes drills it, Stock
Holes can bolt to it, and Pick Nearest Hole leaves it out. Inserts behind the dog holes themselves need
no extra grid. Hidden holes can't be
picked on the map or by Pick Nearest Hole, but the keyboard macros still
use them (untick Use for Nearest to leave a grid out of those too). More than one grid makes the macros
about 50 lines longer, plus about 30 per further grid.

**Extra holes with their own size.** With **Grid + List**, list extra holes one per line, measured
from the first grid's first hole (so **Grab First Hole Center**, with the first grid selected, moves
them with it). A third
value is that hole's own diameter, e.g. `pin: 130, 40, 6mm`; without one it's the first grid's Hole
Diameter. The map draws each hole at its size, and the dots put X0 Y0 on each hole's own edge (a back
right point on a 6 mm pin is 3 mm out each way). Extra holes can be suppressed too.

**Holes missing from the grid?** If your spoilboard leaves some holes out (under a clamp rail, say,
or a pattern with gaps), unlock Setup and press **Edit Holes**, then tap each missing hole on the map,
or drag a box around several to do them at once (a box around only suppressed holes restores them).
Press **Done** when finished. Suppressed holes are hidden while Setup is locked and shown as faint
solid circles while it's unlocked; **Restore All** brings them all back. Pick Nearest Hole, Go to, Set and the nearest-hole macros
skip them and use the nearest real hole. Each gap lengthens the nearest-hole macros, which check the
real holes around it; a few gaps add a few dozen lines, and Setup shows how many lines they'll be and
warns when they'd be slow to run. They're kept by column and row, so they stay put if you fine-tune the
spacing or insets; a change that renumbers the holes (a different first hole) moves them too.

**Fixtures with a height: X, Y and Z in one go.** A vise or a vertical jig sits at a fixed height on
the bed. Give a listed point a fourth value, its reference surface's height above the spoilboard:
`vise: 400, 250, , 63.5mm` (a blank third value keeps Hole Diameter). Pick it, hold **Set** for X0 Y0,
and hold **Set Z0**: Z0 lands on the vise jaw for any measured tool, from the spoilboard height the Z0
macros recorded, with no probing at the fixture. With a stock placed (the picker's **Stock** mode), its thickness fills in from **SBT: Measure stock
thickness** (or type it), and **Z0: spoilboard** or **Z0: stock top** puts Z0 on the stock's bottom or top (on the fixture,
or on the spoilboard when no fixture is picked). Set Z0 needs the spoilboard height recorded
(**SBT: Record spoilboard height**) and a tool length offset active, stops while a G92 Z offset is
active, and, on the Z0 macros' work offset, keeps a probed Z0 for **SBT: Z0 back to saved** (holding it
again, or running a Z0 macro after it, doesn't replace that). A height below the spoilboard or more
than the machine's Z travel (`$132`), a unit typo say, is flagged in the list and refused. Re-measure a fixture's height if you
move it or resurface the spoilboard. The keyboard macros only ever set X and Y.

**Holes that aren't a regular grid?** Locating holes, fixture pins, or a custom layout: set the
**Layout** menu at the top of Setup to **List** and enter one hole per line, as `x, y` or
`name: x, y` (e.g. `A: 0, 0`, `pin: 12-1/2", 6"`, with an optional third value for that hole's
diameter), measured from a **reference point** (Reference X /
Y) into the machine's travel, the same way the grid's insets are. Start a line with `#` or `;` to
comment it out: that hole is skipped but stays in the list. Easiest: set the reference, then jog
over each hole and press **Add Current Position**. Positions are relative so that if the board or the
machine's homing ever shifts, jogging to the first listed hole and pressing **Grab First Hole Center**
moves the reference and the whole list follows. The map, Pick Nearest Hole, the dots, Go to Selected,
Set, keepout zones and the nearest-hole macros all work the same.

**T-tracks between panels?** Pick **T-tracks: Along X** (tracks between rows) or **Along Y** (between
columns) and set **Holes per Panel**. Leave **Panel Pitch** blank when the hole spacing carries straight
on across a track; if a track pushes the next panel over, measure from the first hole of one panel to
the first hole of the next. The tracks show as grey bands on the map.

**Example: Onefinity QCW (Journeyman X-50).** One layout that comes out even over every panel and T-track
on its quick-change wasteboard: 8 mm holes (for 8 mm dowel dogs) **48.6004 mm** (1.9134") apart both
ways, **T-tracks: Along X**, **Holes per Panel 5**, and **Panel Pitch** blank, since that spacing carries
straight on across each track. The insets depend on where your bed sits, so jog over your first hole and
press **Grab First Hole Center** rather than copying someone else's (6.858 and 21.846 mm on the machine
this was worked out on).

**Share your layout.** If your spoilboard has a layout that works well, open an issue with its hole size,
spacing, T-track direction, holes per panel and panel pitch. The plan, once there are a few, is to ship
them as presets to load from the Profiles menu: everything but the insets, which you'd still grab on your
own machine.

**Measure Holes** fits the grid to the real thing with a probe: put a touch probe in the spindle (wood
doesn't conduct, so a plain probe pin can't trigger), jog its tip into a hole below the top, and press
**Probe This Hole**. It touches the sides in X and Y and finds the center. Two or more holes far apart
(along a row and up a column) fit the spacing as well as the insets, and how far the spoilboard is
turned; **Apply to Setup** writes them in once two holes are measured. It suggests three to measure (the
hole nearest A1, the far end of its row and the top of its column, clear of keepout zones, Exclude Picks
areas and the stock), and holding **Go to** moves over the next one at Safe Z, so there's no hunting on
the map; any other hole works too.

With a 3D probe it can do all three on its own: jog the tip to 1 to 4 mm above the spoilboard and hold
**Probe Suggested Holes**. It lifts to Safe Z, moves over each hole, goes 6 mm down into it (and stops
if it touches the spoilboard's top instead, since Setup is then off by about a hole there), touches the
walls twice to center itself, and records it. It ends back at Safe Z.

Tick **Also record the spoilboard height** and it also touches the spoilboard's top beside the first hole
and stores the height the Z0 macros use (the touch's machine Z less the probe's tool length offset), so
there's no separate trip with the touch plate after surfacing. Only tick it when the probe's tool length
offset is measured on the tool setter like your bits': every Z0 the macros set comes from this height. It
refuses without an active tool length offset or with a G92 Z offset, and it won't store a height more
than 2 mm from the one already recorded (it says both, so you can check the probe's offset).

> **Feedback wanted:** Probe Suggested Holes and recording the height with a 3D probe haven't been tried
> on a real probe yet, only in a simulation. Stay by the stop button the first time, and please
> [open an issue](https://github.com/tmuka/ncsender-plugin-spoilboard-toolbox/issues) with how it went, good or bad.

![Measure Holes: a 3D probe touches a hole's four sides, or a pin is centered by eye with an even gap;
measuring three holes far apart fits Setup's grid, spacing, insets and Turn, to the real
holes](docs/measure-holes.png)

No probe? Measure **by eye** instead (the panel's **Measure with** menu starts there, and only shows the
chosen way's button, so a pin is never sent probing into a hole's wall): put a pin, a dowel or a V-bit in the spindle, jog it with the
keyboard, a gamepad or the pendant down into the hole's mouth until the gap is even all round, and press
**Centered by Eye**. It records where the bit is, without moving. A pin that just fits the hole centers
itself; with a V-bit, lower its tip until the cone touches the rim evenly.

**A spoilboard that isn't square to the machine:** **Turn** is how far it's turned, in degrees
(counterclockwise seen from above), about the grid's first hole. Measure Holes fills it in. On a big bed
it matters: 0.1° over 2.4 m is about 4 mm at the far end. The map, Pick Nearest Hole, Set, the keyboard
macros and every Cut Board and Stock Holes program use the turned positions; holes the turn takes outside the travel
are left out. With a turn, pick the hole before grabbing (with none picked, Grab uses the hole Setup puts
nearest the bit, so Setup must be close already). The Profiles menu can also **load a
preset** layout (an Onefinity QCW, say): everything but the insets, which you then grab or measure.

**No holes, just a lasered or engraved grid?** Treat each line crossing as a hole: set **Hole
Diameter** to the line's width (the laser line's width, or the V-bit's kerf width at the surface; 0 for
a hairline), and the spacings and insets to the lines' centers. The center dot then puts X0 Y0 on the
middle of a crossing, and a corner dot on the edges of the two lines (back right for the +X +Y edges).

A map of your machine's travel then shows every hole, where the work offset's X0 Y0 is now, and the
spindle, with machine-coordinate rulers along the bottom (X) and right (Y) in ncSender's units. Grid
holes are named like a fixture table, a row letter and a column number (**B3**), counted from machine
zero's corner: **A1** is the hole nearest machine X0 Y0 (front left on a machine that homes there). The column numbers
run along the top and the row letters down the left. Keepout zones that are on (ncSender's in Settings › Advanced, and the ATCi tool rack's,
`$684`–`$687`) show in red; holes that reach into one are dimmed and can't be picked. Click a hole,
or jog roughly over one and press **Pick Nearest Hole** (it picks the hole closest
to the spindle and says how far off it is, so you get the grid's exact position without centering
the bit). The dots beside the Set button pick where on the hole X0 Y0 goes: the center, or an edge
or corner one hole radius out (back is +Y, right is +X), e.g. back right for a stop pin's +X +Y side.
**Go to Selected** (its label names the point: **Go to B4**, **Go to B4 · back right**, **Go to Stock Front
Left**, and Set's does too) moves the spindle over that point, lifting to ncSender's Safe Z first (machine Z0
when none is set; it never moves down, so a spindle already above Safe Z stays there). Like ncSender's
XY0, hold it for a second, since it moves the machine. A side of a hole that would land in a keepout
zone or outside the travel can't be used. In **Stock** mode, **Go to Stock Center** beside it moves over
the stock's center the same way (hold it), whichever dot X0 Y0 is on.
**Set G54 XY** (hold it for a second too, so a stray tap can't move your zero) sends
`G21 G10 L2 P1 X… Y…`, which sets that work offset without moving anything. The
menu beside it picks the offset: **Active** (the default) asks the controller which one is in use, so
G59.1–G59.3 work too, or pick any of G54–G59.3; the spare offsets the Z0 macros store values in are
left out. It needs a homed, idle machine, since the holes are machine positions. The travel and its
direction come from grblHAL's `$130`/`$131` and homing settings
(`$22`/`$23`).

### Map tools

- **Zoom** for a big bed, with **Map view** under the map (an 8 × 5 ft machine's holes are a few pixels apart on a small screen): **+**
  zooms in on the spindle, the mouse wheel on the spot under it, or pinch with two fingers. Drag the
  zoomed map to look around, and **Fit** shows the whole travel again. **Follow** keeps the spindle in
  the middle as you jog. Pick Nearest Hole and favorites bring the hole they pick into view.
- **Live position:** while you jog, the spindle (a silver ring, as ncSender's Top view shows it) moves and the hole nearest it gets a dashed ring,
  with its name and distance under the map, so you can see which hole Pick Nearest Hole will take.
- **Hole or Stock:** the switch at the top of the controls picks what X0 Y0 goes on. **Hole**: the
  dots pick the hole's center, a side or a corner. **Stock**: the stock is placed, and its dots pick its
  center, a corner or an edge. A placed stock stays put while you pick holes in Hole mode.
- **Stock, Against Pins:** push the stock against pins in dog holes, two along one edge and one along
  the other (an L), and tap those holes. Each edge is a pin radius off its pins' row or column
  (Setup's **Pin Ø**, blank for the hole's), so the corner is exact, on a turned grid too. Two pins on
  a diagonal can hold the stock either way, so it asks which. A pin at the corner itself touches nothing
  and is ignored; a pin under the stock (a wrong tap, or the size too big) is refused. The first time
  the pins place it, X0 Y0 goes on the pinned corner: the one point that doesn't hang on the size you
  typed.
- **Stock, Corner on X0 Y0:** zero on a corner by touch or probe, press **Use Current X0 Y0**, and pick
  which corner it is. It stays put when X0 Y0 changes.
- **Stock size:** type its width (X) and length (Y), or jog over the far corner and press **Far Corner
  Here**; its thickness fills in from **SBT: Measure stock thickness** until you type one.
- **Before you Set:** one line says where X0 Y0 goes, with the numbers; the next how far Set moves the
  work offset and from where (a hole's dot or the stock's, when it's on one). A move of exactly a hole
  or pin radius or diameter from somewhere unnamed is flagged. A small view beside it shows the hole,
  or the pins and the stock's corner, zoomed in. Reopening the plugin keeps the mode and the stock. The
  keyboard macros always use a hole.
- **Exclude Picks:** a clamp or fixture in the way for this job? Press **Exclude Picks** and drag a
  rectangle over it. This map then won't pick its holes, Pick Nearest Hole skips them, and Go to and Set
  won't target a point inside it. **That's all it does: it's a note for the picker, not a keepout
  zone.** You can still jog into it, G-code jobs still run there, the keyboard macros don't know about
  it, and Go to Selected only checks where it ends up, not what it passes over at Safe Z. Tap an
  excluded area to remove it, or **Clear Exclusions**. Excluded areas stay until you clear them, but they
  belong to the job, not the board's profile.
- **Favorites:** tap the star beside the picked hole's name to keep it as a favorite, e.g. your jig's
  home hole. Favorites are ringed on the map and listed under it; tap one to pick it. They're kept
  in the board's profile.

## Cut Board: the dog holes, T-tracks, chamfers and labels

The **Cut Board** tab (Spoilboard before 0.5) writes the programs that make (or remake) the spoilboard from the XY0 Picker's
holes, so the board and the map come from the same numbers. Pick what to cut with the chips at its top
(**Dog holes**, **T-tracks**, **Grid lines**, **Fit test**, **Laser test**, **Chamfers**, **Labels**). Load the bit, put Z0 on the
spoilboard's top (**SBT: Z0 on spoilboard** does it, or touch off), set the depth and feeds in the shared
**Bit and depth** card, and press **Generate**: the program opens in ncSender's visualizer to check and
run.

![The Cut Board tab: chips for Dog holes, T-tracks, Grid lines, Fit test, Laser test, Chamfers and
Labels, the Bit and depth card with starting feeds for MDF, a side view of one hole's depth and passes,
and 425 holes ready to generate, starting with a tool change to T18](docs/spoilboard-tab.png)

**Surfacing isn't here, on purpose.** Flattening the spoilboard is left to the
[QuickCut](https://github.com/siganberg/ncsender-plugin-quickcut) plugin's **Wasteboard Surfacing**, which
already does it well. Surface first, then cut the holes. When a surfacing job finishes, a note at the top of
the plugin reminds you to re-record the spoilboard height.

- **Which holes:** every grid, each hole its own size, row by row and back and forth. Suppressed holes,
  hidden grids and holes in a keepout zone or Exclude Picks area are left out. Listed holes are cut when
  ticked; points with a height (a vise, a fixture) never are.
- **How:** drilled when the bit is the hole's size (within 0.05 mm), pecking a Depth per Pass at a time:
  **Drill Pecks** picks **Clear chips** (up to 2 mm above the top and back), **Break chips** (back off
  0.5 mm to snap the chip, as QuickCut's Drill) or **None** (one plunge). Spiralled down when the hole is up to twice
  the bit, else cleared in rings out from a spiral in its middle. Climb milling, as QuickCut does; the
  circle milling is QuickCut's.
- **Starting feeds:** under Bit and depth, pick the material (MDF / plywood, softwood, hardwood, HDPE,
  acrylic, aluminum, foam) and the bit's flutes, and **Fill In** puts starting numbers in RPM, Feed,
  Plunge, Depth per Pass and Stepover: ncCAM's formula (the chip each tooth takes grows with the bit, up
  to a cap), within your machine's max feed (`$110`/`$111`) and spindle range (`$30`/`$31`). A start:
  listen, look at the chips, and adjust.
- **The picture** under Holes shows one hole in the board (or plate) with your numbers: how deep it
  goes, what's left under it, a step for every Depth per Pass, and how it'll be cut.
- **Where:** the active work offset (G54–G59), with its X0 Y0 written into the program. It stops before
  moving if the machine isn't homed, a G92 offset is active, X0 Y0 has moved since it was generated, or Z0 is one the
  Z0 macros set and no tool length offset is active (after a controller restart, say).
- **The bit:** click **Bit Diameter** to take the loaded tool's diameter from ncSender's tool table, and
  the program starts with a tool change to that tool (`M6 T3`, say), which ncSender runs like any other
  tool change. Type a diameter instead and there's no tool change: load that bit yourself before running
  it. The T-track, stock-hole and fit-test programs work the same way; chamfers and labels never change tools.
- **Safety:** Hole Depth can't be more than the Spoilboard Thickness (0.75" to start). Between holes it hops
  5 mm, and lifts to Safe Z to pass over a keepout zone or an Exclude Picks area such as a clamp. There's
  no pause to check the bit (ncSender shows no prompt for one, so the job would just look stuck), so
  check the bit and Z0 before pressing Start.

**Removable fixtures:** tick **Into a plate on top** and every Cut Board program is confined to the XY0
Picker's **Stock**, so you can make a plate (MDF, say) whose holes, slots or lines copy the spoilboard's
and lift it off when you're done. Dog holes, chamfers and labels use only the holes wholly on it, 3 mm in
from its edges; slots, grid lines, chamfers and labels stay at least 3 mm in too; nothing cuts deeper than
its thickness (T), and Z0 goes on its top. Once the spoilboard height is recorded, Generate refuses unless
Z0 is T above it (so a stale T is caught), and the program stops if Z0 moves after Generate; it lifts to
Safe Z between holes, over the clamps. Lay the plate over a sacrificial sheet for through holes, or keep them no bigger
than the spoilboard holes they line up over.

**No holes, just lines:** **Grid lines** lasers (grblHAL's laser mode, `$32=1`) or V-bit engraves a line
along every row and column of Setup's grids, crossing exactly where the holes would be, half a spacing past
the end ones. They stop short of the travel's edges and keepout zones, break at T-tracks, and run back and
forth (every other line runs back) so most moves between them are short. A laser moves between lines at
its focus height, over zones too, so keep tall clamps off the bed. Then set Hole Diameter to the line's width and zero on the
crossings. Not sure of the power and speed? The **Laser test** marks a small cross for every power
(columns) and feed (rows) on scrap, labelled, so you can pick the crispest before doing the whole bed.

**Before and after:**
- **Dowel fit test:** cut a row of test holes in scrap (X0 Y0 on its front left corner, Z0 on its top),
  **Edge Distance** (10 mm) in from its edges so none breaks out of the side, smallest on the left, find the one your dowels fit, and set Hole Diameter to it.
- **Chamfer the holes:** after cutting, a V-bit puts a small bevel round each hole's top edge, so dowels
  start easily and the edge doesn't crumble.
- **Engrave the labels:** the fixture table's names beside the holes (every hole, or the edges), with a
  V-bit or a laser (grblHAL's laser mode, `$32=1`, on; Z never moves), so the spoilboard reads like the map.

**Cut the T-tracks (a two-layer spoilboard):** install the T-tracks and threaded inserts once, in a lower
layer of MDF, and lay a thinner sacrificial layer over it. **Cut the T-tracks** cuts just the slots, along
each of Setup's T-tracks at your **Track Width** (19.05 mm, 3/4", to start), so the tracks below show;
then **Dog holes** cuts the holes through the same layer, over the inserts. When the top gets chewed up,
surface it off or replace it and cut it again, and the tracks and inserts are never touched.

![A two-layer spoilboard seen from the side: the top sacrificial layer has the T-track slots and dog
holes cut through it, over a base layer holding the T-tracks and threaded inserts, which are installed
once and never cut](docs/two-layer.png)
- **Depth** blank goes the **Spoilboard Thickness**, which must be the top layer's thickness alone; a
  smaller Depth cuts dados to set new track into the layer itself. It can never go deeper than the
  Spoilboard Thickness, so the lower layer and its inserts are safe.
- Slots wider than the bit are cut in passes side by side, a Depth per Pass at a time; they stop short of
  the travel's ends, keepout zones and Exclude Picks areas, and follow a turned grid.

**A setup that works:** a grid of 8 mm holes with
[8 mm wooden dowel pins](https://www.amazon.com/dp/B0DJ5GZR9H) as dogs: cheap, and a bit that clips
one is unharmed. [Flanged 1/4-20 threaded inserts](https://www.amazon.com/dp/B091L3Y6VJ) installed from the back, behind the holes, give clamps
something to screw into.

## Stock Holes: bolts, locating pins and flip pins

![Flip pins: two pin holes drilled through the stock over spoilboard holes on the middle row; flipped
onto dowel pins, side 2 drops back exactly where side 1 was, mirrored across the pin line](docs/flip-pins.png)

**Stock Holes** drills a workpiece or plate right over spoilboard holes so it holds on the board, with
Z0 on the stock's top and the stock clamped some other way while it drills. (To cut the board's own
pattern, use **Cut Board**.) The stock is the one placed in the XY0 Picker's **Stock** mode, with its
size and thickness; the holes come from the grid picked in Setup.
- **Bolts:** a clearance hole over the spoilboard hole nearest each corner of the stock, or every one
  under it (the summary counts them, along X and Y), with an optional counterbore for the head.
  **Bolt** fills the clearance hole for M6 (6.6 mm), M8 (9) or 1/4-20 (6.9), and, when a counterbore
  is set, room for a socket head (11, 14 or 10.5 mm; no washer). Bolt the stock to
  threaded inserts in the spoilboard; keep the bolts out of the part's toolpaths.
- **Locating Pins + Bolts:** a plate that comes off and goes back exactly, in one program. Two pin
  holes over dog holes, as far apart as fit (diagonally): the first round, so it locates, and the
  second a slot pointing at it (**Slot +** longer, half each way; 0.75 mm by default), so the plate can't bind when MDF moves with
  the seasons. Bolt holes go in the other holes of the same grid (inserts behind the dog holes) or in an
  insert grid of their own (**+ Inserts** in Setup), counterbored if you like.
- **Flip Pins:** two holes for dowels on the grid row (or column) nearest the stock's middle, the
  second slotted too. Flip the stock over that line for its second side and the pins drop it back
  exactly where it was. The summary gives the line to mirror the second side's toolpaths across in your
  CAM, and, when the stock isn't centered on it, how far the flipped stock lands; **Zero on the Flip
  Pin** opens the XY0 Picker on the round pin's center, which stays put when the stock turns over.
- **Take the pins out** of the holes under the stock before it runs: the bit goes into them.
- Each hole goes **Break Through** (1 mm) below the stock into the spoilboard hole, and can't be bigger
  than that hole, so the spoilboard isn't cut. Threaded inserts must sit at least that far below the
  surface (installed from the back, they do).
- **Depth** blank drills through like that. Give a depth for **blind holes** instead: they stop that far
  below Z0 (the stock's top), so it must be less than the stock's thickness, and Break Through doesn't
  apply. A diagram above the summary shows the depths with your numbers, and Z0's height as measured
  against the recorded spoilboard.
- **T** follows the thickness the Z0 macros stored (Measure stock thickness or Store) until you type
  one; type the stock's real thickness if it differs.
- It lifts to Safe Z between holes, over the clamps. Generate refuses when Z0 is on the spoilboard
  rather than the stock top (once the Z0 macros have recorded the spoilboard height), and the program
  stops before moving if Z0 changed since it was generated.

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
     (`G10 L20 P0 X[#<_x> / 2] Y[#<_y> / 2]`), e.g. zero on one corner, jog to the opposite corner,
     run it, and X0 Y0 is the stock's center.
   - **Nearest hole**: **Go to nearest hole** and **Set XY0 at nearest hole (no move)**, keyboard versions of the
     XY0 Picker's buttons (see the XY0 Picker section above).
   - **Save / restore X/Y**: save the work offset's X and Y (e.g. a fixture or jig) and put them back
     later. They're kept in the saved-Z0 slot's X/Y, which that slot doesn't otherwise use; restore
     does nothing if nothing was saved.
4. **Macros.** Creates the ncSender macros, or updates the ones it made before:
   Every ncSender macro can have a keyboard shortcut (**Settings → Controls**, **Macros** group; see
   [Put them on keys](#put-them-on-keys)).
   Their names start with **SBT:**, and each description is the macro's first comment line (e.g.
   "record spoilboard height").
   - **Record spoilboard height**: probes down onto the block and stores the height.
   - **Measure stock thickness**: with the block on the stock, probes down and stores
     stock top minus the spoilboard height.
   - **G54 Z0 on spoilboard**: saves the current Z0, then sets Z0 on the spoilboard.
   - **G54 Z0 on stock top**: saves the current Z0, then sets Z0 the stored thickness above the
     spoilboard.
   - **G54 Z0 back to saved**: puts the saved Z0 back (does nothing if none was saved).
   - The extras you ticked.
   - **Delete SBT: macros** removes every macro whose name starts with "SBT:" (or "ZS:", "MW:" or "Macro Wiz:", from older versions; for example
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
`#1=[1 / #<_homed_state>] (SBT stop: home the machine first)`: grblHAL rejects the line with
`error:72`, and ncSender (2.0.161 and later) sends nothing after a rejected line of a macro. As a
second line of defence, every line that sets an offset or moves is divided by the same checks too
(homed, tool length offset, stored values, no G92 offset, and for the nearest-hole macros the keepout
and travel checks), so even if a stop line were skipped, nothing is set or moved. The wizard's check
confirms your grblHAL reads `#<_homed_state>` and `#<_tool_offset>`.

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

### Requirements for the Z0 macros

See [What you need](#what-you-need) for the rest of the plugin.

- ncSender 2.0.163 or later (it stops a macro at its first rejected line, and checks this).
- grblHAL built with parameter and expression support (the check tells you).
- Tool length offsets for every tool measured against the same reference tool, and active when you
  run either macro. A `G43.1` offset is cleared by a reset.
- Three spare work offsets for storage.

## Install

1. Download the latest `com.tmuka.spoilboard-toolbox_v….zip` from this repository's
   [Releases](https://github.com/tmuka/ncsender-plugin-spoilboard-toolbox/releases).
2. In ncSender: **Settings → Plugins → Install Plugin → ZIP**, pick the file and press **Install from
   File**, or paste the zip's link and press **Install from URL**.
3. Open **Spoilboard Toolbox** from the plugin tool menu.

Later versions show up under ncSender's plugin **Update** button. To build the zip yourself, see
Development below.

## Development

```
npm test         # pure functions from config.html, plus a stand-in for grblHAL running the G10 lines
npm run build    # dist/com.tmuka.spoilboard-toolbox_v<version>.zip from the committed files
```

`config.html` is the whole plugin: ncSender runs a client-only plugin's page inline, so its script
can't load other files. The macro builder and the `$#` / `$G` parsers sit between `BEGIN pure` and
`END pure` markers, and the tests run that block directly, so there's no second copy to keep in step.

## License

Spoilboard Toolbox is licensed under the [GNU General Public License v3.0](LICENSE), the same license as
ncSender's open-source edition. Copyright (c) 2026 tmuka.

## Status

In use on the author's grblHAL machine. The grblHAL behaviour above comes from its source
(`ngc_params.c`), and the ncSender API from ncSender's source; the wizard is also tested in a
browser against a stand-in ncSender.
