# Plan: checks against the loaded program (later)

Ideas from 2026-11-01. **1 and 2 are done** (unreleased, see CHANGELOG): `programCuts`, `cutsPastStock`,
`cutsNear` in the pure block; the Stock mode line and map overlay; Stock Holes' **Clear of the loaded
program's cuts**. **3 is still an idea**, below. All three read the program loaded in ncSender
(`/api/gcode-files/current/download`, as `checkSurfacing` already does) and compare where it cuts
with the stock and the grid Spoilboard Toolbox already knows.

## Shared first step: the program's footprint

Where the bit cuts, on the spoilboard, in machine terms:

- Parse the loaded program with `lineWords`: G0/G1/G2/G3 (arcs as short lines), G20/G21, G90/G91,
  skipping G53 lines. Only moves below the stock's top (Z < 0) cut; rapids above it don't count.
- Put it on the board with the work offset's XY (the one the program runs in, G54 by default), the
  same offset Set XY writes.
- Widen it by the **bit radius**. Read the bit from the program's header where it says (QuickCut,
  Gears and Spoilboard Toolbox write "Bit … mm"); otherwise a Bit Diameter field, remembered.
- Keep it as segments in a cell grid (like `crowdedPair`), so "how close is the nearest cut to this
  point" is fast on the Pi. Programs can be 100k+ lines: parse once per loaded file (cache by name
  and size), in slices so the screen doesn't freeze, and measure it on the Pi (the testkit's
  `frozen`).
- Say what was read: "Program “x.nc”: cuts 412 × 230 mm, bit 6.35 mm (from its header)".

## 1. Stock too small for the program (done)

- Stock mode knows the stock's size (Width, Length) and where it sits against the pins.
- Warn when the cut, widened by the bit radius, comes within **Clamp Margin** (a new field, say
  10 mm by default) of the stock's edges, or runs off it: "The program cuts 6 mm past the stock's
  right edge" / "…within 4 mm of the front edge, inside the 10 mm clamp margin".
- Show the program's outline over the stock in the preview, with the stock edges and the margin
  marked; red where it's too close.

## 2. Stock bolt holes in the cut (done)

- On the Stock Holes screen, warn about any bolt hole whose bolt head or washer (a **Head
  Diameter** field) comes within the bit radius of the cut, at any depth that reaches the head
  (counterbore depth when the stock holes are counterbored).
- Mark those holes red in the preview, with the option to leave them out of the Stock Holes program
  (the bolt list already shows which holes are used).

## 3. Extra screws off the grid (idea, not started)

Where extra screws or nails can go to hold the stock, clear of every cut:

- **Edges first:** spots along a band just inside the stock's edges (inside the clamp margin), each
  at least a screw head plus the bit radius from any cut, spaced about every 150 mm with one near
  each corner. Show them on the preview with their positions.
- **Inside cut-outs, later:** a closed loop cut through the full depth without tabs leaves a loose
  piece (a slug, or a part); a screw inside it holds it. Finding those means spotting closed loops
  in the program and its stock thickness: harder, so a second step.
- How to use them: a list of positions, and a **Go to** to jog over each one to mark it (a hold
  button, like Set XY). Maybe a spot-drill program for pilot holes.

## Where it lives

1 and 2 fit here: they use the stock, pins, grid and bolt holes this plugin already has. 3 is
broader workholding (any stock, no grid needed). Start it here, on the Stock Holes screen, sharing
the footprint code. If it grows (loose pieces, clamps, other sizes of stock), move it with the
footprint code to its own plugin (for example "Workholding"), with the footprint in a shared
`lib/program-footprint.cjs` both use.

## Testing

- Unit tests on the footprint: arcs, G91, G20, offsets, the bit radius from the header, a program
  that never cuts below Z0.
- Programs from QuickCut, Gears and Spoilboard Toolbox itself as fixtures, plus a big one for speed.
- The testkit's local harness and Pi checks; time the parse on the Pi.
