# Plan: the Z0 macros and a Z0 set elsewhere (2026-11-03)

The Z0 macros keep the spoilboard height and the stock thickness in spare work offsets (G59.1–G59.3 Z),
as machine heights a zero-length tool sees. Switching work offsets, or setting Z0 some other way,
doesn't change those numbers. Two things can still go wrong:

1. **Another work offset active.** Each macro is made for the one offset picked at Create macros
   (G54 by default). Run in G55, **SBT: G54 Z0 on stock top** quietly sets G54 and leaves the job's
   G55 alone; Record and Measure select G54 and leave you in it.
2. **A Z0 set outside the plugin.** Probe a new stock with ncSender's Probe dialog and the stored
   thickness is still the old stock's: a later **Z0 on stock top** replaces the good Z0 with one from
   the old thickness (Z0 back to saved recovers it, but it's a trap).

## 1. Macros stop on another work offset (build now)

- grblHAL reads the active offset as `#5220` (1 = G54 … 9 = G59.3; ngc_params.c `coord_system`).
- Every macro that reads or writes the macros' offset stops first when it isn't active:
  `#1=[1 / [#5220 EQ 1]] (SBT stop: G54 isn't active; select it first)`, and the same condition divides
  the value its G10 line stores, as the other guards do: Record, Measure, Z0 on spoilboard, Z0 on stock
  top, Z0 back to saved, Save X/Y, X/Y back to saved.
- Record and Measure no longer select the offset (`G54` line gone), so nothing switches it.
- Run checks: tries `#1=[#5220]`; a controller that rejects it gets a warning that the macros would
  stop. The "You're working in G55" note says the macros stop there.

## 2. Remember this Z0 as stock top (built instead of a question banner)

A first build asked, in a banner while the plugin was open, whether a Z0 set elsewhere was the stock top
or the spoilboard. Independent reviews (machinist, ncSender, code) said drop it: it asked late (whenever
the plugin next opened), missed the real danger (Z0 on stock top from a key with the plugin closed),
nagged after a re-probe a few hundredths off, could only check the tool length offset now rather than when
Z0 was set, and one wrong tap shifted every later Z0. It also stored inch values as mm with `$13=1`.

Instead, **SBT: Z0 on stock top** learns: run right after probing the stock with ncSender's Probe
dialog, with the same tool, it takes a Z0 the macros didn't set and that's more than 1 mm above the
spoilboard as the new stock top (a separate "Remember Z0 as stock top" macro was built first, then
folded in at the user's request):

- `#2` = not the stored stock top, not Set Z0's last height, not 0, and more than 1 mm above the
  spoilboard; then `G10 L2 P7 Z[#5343 + [#5223 - #5383 - #5343] * #2]`, and Z0 = spoilboard + thickness
  (unchanged when learned). The usual stops apply; with no thickness stored it still works when there's
  a Z0 to learn from.
- The catch: a Z0 on a vise jaw, fixture or step is learned as a "thickness" too. Help and the README
  list the safe and unsafe uses.
- No spoilboard version: Record and the surfacing note cover that.

## Later: when the plugin is closed (needs ncSender)

Asking while the plugin is closed needs ncSender to tell a plugin's server-side part about offsets:
`pluginContext.getServerState()` adding the active offset and G54–G59.3 values, or an
`onWorkOffsetChange` event (CncController already spots Z offset writes). Then a small background
script (`events: ["background"]`) could ask with `showDialogAsync` on every screen, right when Z0 is
probed. Not planned now; it's a PR for siganberg, so ask the user first.
