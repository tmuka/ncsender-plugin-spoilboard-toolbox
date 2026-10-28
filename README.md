# Spoilboard Toolbox

*Formerly **Zero Swapper**: same plugin, same settings and macros, a name for everything it does now.*

**Your spoilboard's holes are already a precision fixture. Spoilboard Toolbox turns them into work zero, and cuts them in the first place.**

- **X0 Y0 in seconds, no probe.** Jog roughly near a dog hole, tap **Pick Nearest Hole**, hold
  **Set**: work zero lands exactly on the hole's center or edge. No edge finder, no XY probe, no
  coordinates typed into the terminal, and the same holes give the same zero next time. Put it on a
  key and it's one press near any hole.
- **Zero anywhere on the stock, no tape measure.** Jog to the stock's far corner and press **Far
  Corner Here** (or type its size), then put X0 Y0 on its center or any corner or edge, drawn right on
  the map.
- **Z0 without re-probing.** Probe the spoilboard once. After that, any measured tool puts Z0 on the
  spoilboard or the stock top in one click, and another click puts your old Z0 back.
- **Full XYZ on a vise or fixture.** Give a fixture point its height and Set Z0 puts Z0 on the vise
  jaw or the stock top for any measured tool.
- **Fits the bed you actually have.** Missing holes, T-track panels, dog holes plus a pin grid, custom
  locating pins, lasered or V-carved grid lines, keepout zones, and a saved profile for every board.
- **Cut the holes from the same numbers.** Cut the dog holes, chamfer them, engrave their fixture
  table labels, and drill bolt or flip-pin holes through your stock right over them.

Spoilboard Toolbox is a plugin for [ncSender](https://github.com/siganberg/ncSender), the G-code sender for
grblHAL CNC routers. Its **XY0 Picker** shows your machine's bed with every hole on it, live as you jog,
and sets the work offset (G54–G59.3) without moving the machine. Its **Z0 macros** tab checks your
grblHAL controller, then writes ncSender macros you run from the Macros tab or, best of all, a
keyboard shortcut.

![Spoilboard Toolbox's XY0 Picker in ncSender: a map of the CNC bed's dog hole grid between T-tracks, a
hole picked with a sheet of stock drawn from it, the spindle, the ATCi tool rack's keepout zone in
red, and the Pick Nearest Hole, Go to Selected and Set G54 XY buttons](docs/xy0-picker.png)

## What a job looks like

**Zero on a stock corner, no probing.** Push the stock against bench dogs in your spoilboard holes,
jog roughly near the corner hole (a few mm off is fine), and press **Pick Nearest Hole** then hold **Set**, or
one key with the nearest-hole macro. X0 Y0 lands exactly on the hole's edge or center, with no edge
finder, no XY probe and nothing typed into the terminal. Use the same holes next time and you get the
same zero back.

**Zero anywhere on the stock, no measuring.** Tick **Stock** and type its size: the map draws it from
the picked hole, and a second box of dots puts X0 Y0 on its center or any corner or edge. Or, at the
machine: with X0 Y0 on one corner, jog roughly to the opposite corner and run **Set XY0 to Midpoint**
for the exact center (**Midpoint XY** moves the spindle there first, at Safe Z).

**New tool, same Z0.** Change to any measured tool and run **Z0 on stock top** (or **Z0 on
spoilboard** for through-cuts). No re-probing.

## Who it's for

The **XY0 Picker** works on any homed grblHAL machine with a grid on its spoilboard. You'll get the
most from the **Z0 macros** if:

- your machine **measures tool lengths** (a tool setter / tool length sensor, or an automatic tool
  changer (ATC) such as RapidChange), so each tool has a tool length offset (TLO), and
- your controller runs **grblHAL** (the wizard checks it can do the math the macros need).

Without measured tool lengths, every tool change needs a new Z probe anyway, and Spoilboard Toolbox can't
save you that.

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

## First time

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
overlap. Hidden holes can't be picked on the map or by Pick Nearest Hole, but the keyboard macros still
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
macros recorded, with no probing at the fixture. With **Stock** ticked, its thickness fills in from **SBT: Measure stock
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
Y) into the machine's travel, the same way the grid's insets are. Easiest: set the reference, then jog
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
turned; **Apply to Setup** writes them in.

**A spoilboard that isn't square to the machine:** **Turn** is how far it's turned, in degrees
(counterclockwise seen from above), about the grid's first hole. Measure Holes fills it in. On a big bed
it matters: 0.1° over 2.4 m is about 4 mm at the far end. The map, Pick Nearest Hole, Set, the keyboard
macros and every Spoilboard and Stock program use the turned positions; holes the turn takes outside the travel
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
**Go to Selected** moves the spindle over that point, lifting to ncSender's Safe Z first (machine Z0
when none is set; it never moves down, so a spindle already above Safe Z stays there). Like ncSender's
XY0, hold it for a second, since it moves the machine. A side of a hole that would land in a keepout
zone or outside the travel can't be used.
**Set G54 XY** (hold it for a second too, so a stray tap can't move your zero) sends
`G21 G10 L2 P1 X… Y…`, which sets that work offset without moving anything. The
menu beside it picks the offset: **Active** (the default) asks the controller which one is in use, so
G59.1–G59.3 work too, or pick any of G54–G59.3; the spare offsets the Z0 macros store values in are
left out. It needs a homed, idle machine, since the holes are machine positions. The travel and its
direction come from grblHAL's `$130`/`$131` and homing settings
(`$22`/`$23`).

### Map tools

- **Zoom** for a big bed (an 8 × 5 ft machine's holes are a few pixels apart on a small screen): **+**
  zooms in on the spindle, the mouse wheel on the spot under it, or pinch with two fingers. Drag the
  zoomed map to look around, and **Fit** shows the whole travel again. **Follow** keeps the spindle in
  the middle as you jog. Pick Nearest Hole and favorites bring the hole they pick into view.
- **Live position:** while you jog, the spindle (a silver ring, as ncSender's Top view shows it) moves and the hole nearest it gets a dashed ring,
  with its name and distance under the map, so you can see which hole Pick Nearest Hole will take.
- **Stock:** tick it and type the stock's width (X) and length (Y). The stock is drawn from the picked
  point of the picked hole, running away from the hole (the back right side of a hole takes the
  stock's front left corner; **Corner** overrides that). The second box of dots picks where X0 Y0 goes
  on the stock: its center, a corner or an edge. **Go to Selected** and **Set** then use that point.
  With no hole picked, the stock is drawn from the work offset's X0 Y0 as it was when you ticked
  Stock (its front left corner there, unless **Corner** says otherwise), so you can zero on a corner,
  tick Stock, and hold Set for its center. It stays put when X0 Y0 changes; **From X0 Y0 now** takes
  X0 Y0 again, and picking a hole replaces it. Reopening the plugin keeps the stock where it was. No
  tape measure? Jog the bit over the stock's opposite corner and press **Far Corner Here** for its width
  and length; its thickness fills in from **SBT: Measure stock thickness** until you type one. The
  keyboard macros always use the hole itself.
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

## Spoilboard: cut the dog holes, T-tracks, chamfers and labels

The **Spoilboard** tab writes the programs that make (or remake) the spoilboard from the XY0 Picker's
holes, so the board and the map come from the same numbers. Pick what to cut with the chips at its top
(**Dog holes**, **T-tracks**, **Fit test**, **Chamfers**, **Labels**). Load the bit, put Z0 on the
spoilboard's top (**SBT: Z0 on spoilboard** does it, or touch off), set the depth and feeds in the shared
**Bit and depth** card, and press **Generate**: the program opens in ncSender's visualizer to check and
run.

**Surfacing isn't here, on purpose.** Flattening the spoilboard is left to the
[QuickCut](https://github.com/siganberg/ncsender-plugin-quickcut) plugin's **Wasteboard Surfacing**, which
already does it well. Surface first, then cut the holes. When a surfacing job finishes, a note at the top of
the plugin reminds you to re-record the spoilboard height.

- **Which holes:** every grid, each hole its own size, row by row and back and forth. Suppressed holes,
  hidden grids and holes in a keepout zone or Exclude Picks area are left out. Listed holes are cut when
  ticked; points with a height (a vise, a fixture) never are.
- **How:** drilled when the bit is the hole's size (pecking), spiralled down when the hole is up to twice
  the bit, else cleared in rings out from a spiral in its middle. Climb milling, as QuickCut does; the
  circle milling is QuickCut's.
- **Where:** the active work offset (G54–G59), with its X0 Y0 written into the program. It stops before
  moving if the machine isn't homed, a G92 offset is active, or X0 Y0 has moved since it was generated.
- **The bit:** click **Bit Diameter** to take the loaded tool's diameter from ncSender's tool table, and
  the program starts with a tool change to that tool (`M6 T3`, say), which ncSender runs like any other
  tool change. Type a diameter instead and there's no tool change: load that bit yourself before running
  it. The T-track, stock-hole and fit-test programs work the same way; chamfers and labels never change tools.
- **Safety:** Hole Depth can't be more than the Spoilboard Thickness (0.75" to start). Between holes it hops
  5 mm, and lifts to Safe Z to pass over a keepout zone or an Exclude Picks area such as a clamp. There's
  no pause to check the bit (ncSender shows no prompt for one, so the job would just look stuck), so
  check the bit and Z0 before pressing Start.

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
- **Depth** blank goes the **Spoilboard Thickness**, which must be the top layer's thickness alone; a
  smaller Depth cuts dados to set new track into the layer itself. It can never go deeper than the
  Spoilboard Thickness, so the lower layer and its inserts are safe.
- Slots wider than the bit are cut in passes side by side, a Depth per Pass at a time; they stop short of
  the travel's ends, keepout zones and Exclude Picks areas, and follow a turned grid.

**A setup that works:** a grid of 8 mm holes with
[8 mm wooden dowel pins](https://www.amazon.com/dp/B0DJ5GZR9H) as dogs: cheap, and a bit that clips
one is unharmed. [Flanged 1/4-20 threaded inserts](https://www.amazon.com/dp/B091L3Y6VJ) installed from the back, behind the holes, give clamps
something to screw into.

## Stock: bolt holes and flip pins

The **Stock** tab drills the stock right over spoilboard holes, with Z0 on the stock's top and
the stock clamped some other way while it drills. The stock is the XY0 Picker's (tick **Stock**, with its
size and thickness); the holes come from the grid picked in Setup.
- **Bolts:** a clearance hole (6.9 mm, 0.272", for 1/4-20) over the spoilboard hole nearest each corner
  of the stock, or every one under it, with an optional counterbore for the head. Bolt the stock to
  threaded inserts in the spoilboard; keep the bolts out of the part's toolpaths.
- **Flip pins:** two holes for dowels on the grid row (or column) nearest the stock's middle. Flip the
  stock over that line for its second side and the pins drop it back exactly where it was. The summary
  gives the line to mirror the second side's toolpaths across in your CAM, and, when the stock isn't
  centered on it, how far the flipped stock lands from where it was.
- Each hole goes **Break Through** (1 mm) below the stock into the spoilboard hole, and can't be bigger
  than that hole, so the spoilboard isn't cut. Threaded inserts must sit at least that far below the
  surface (installed from the back, they do).
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
   - **Delete SBT: macros** removes every macro whose name starts with "SBT:" (or "ZS:", "MW:" or "Macro Wiz:", its names before; for example
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

### Requirements

- ncSender 2.0.163 or later (it stops a macro at its first rejected line, and checks this).
- grblHAL built with parameter and expression support (the check tells you).
- Tool length offsets for every tool measured against the same reference tool, and active when you
  run either macro. A `G43.1` offset is cleared by a reset.
- Three spare work offsets for storage.

## Install

1. Download the latest `com.tmuka.zeroswapper_v….zip` from this repository's
   [Releases](https://github.com/tmuka/ncsender-plugin-zero-swapper/releases).
2. In ncSender: **Settings → Plugins → Install Plugin → ZIP**, pick the file and press **Install from
   File**, or paste the zip's link and press **Install from URL**.
3. Open **Spoilboard Toolbox** from the plugin tool menu.

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

Spoilboard Toolbox is licensed under the [GNU General Public License v3.0](LICENSE), the same license as
ncSender's open-source edition. Copyright (c) 2026 tmuka.

## Status

In use on the author's grblHAL machine. The grblHAL behaviour above comes from its source
(`ngc_params.c`), and the ncSender API from ncSender's source; the wizard is also tested in a
browser against a stand-in ncSender.
