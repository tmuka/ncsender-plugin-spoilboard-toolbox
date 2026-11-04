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

## 2. Ask where a new Z0 is (build now, in the plugin's page)

ncSender gives plugins no "Z0 changed" event, and its server-side plugin context can't read work
offsets (`getServerState` has status, tool and job only; `onBeforeCommand` misses the Probe dialog,
which sends straight to the controller). The plugin's page can: ncSender refreshes the G54–G59 values
in its state after any G10, and the page reads `$#` itself. So for now the question is asked **when
Spoilboard Toolbox is open** (on opening, and when the offset changes while it's open).

- **When:** the machine is connected, homed, Idle, with no job running; the spoilboard height is
  recorded (you use the Z0 macros); a tool length offset is in effect; the macros' offset's Z0 isn't
  the spoilboard, the stock top, or the last Set Z0 height (the same test the macros' "save the old
  Z0" uses); and that Z0 hasn't been answered already.
- **The question** (a banner at the top, like the surfacing note): "G54 Z0 was set outside the Z0
  macros: 18.4 mm above the spoilboard. Where is it?"
  - **Stock top:** stores 18.4 mm as the stock thickness (G21, `G10 L2 P7 Z18.4`, G20 back). Then
    Z0 on stock top gives this Z0 for any tool. Not offered when it's at or below the spoilboard or
    more than the Z travel.
  - **Spoilboard:** stores it as the spoilboard height (`G10 L2 P9 Z…`), "e.g. after surfacing". Says
    how far it is from the recorded one; more than 3 mm asks to be sure.
  - **Neither:** nothing changes; that Z0 isn't asked about again.
- **Ask When Z0 Changes** (a checkbox on the Z0 macros tab, on by default) turns it off.
- The answered Z0 is remembered in the plugin's settings (per offset), so other screens don't ask
  again.

## Later: when the plugin is closed (needs ncSender)

Asking while the plugin is closed needs ncSender to tell a plugin's server-side part about offsets:
`pluginContext.getServerState()` adding the active offset and G54–G59.3 values, or an
`onWorkOffsetChange` event (CncController already spots Z offset writes). Then a small background
script (`events: ["background"]`) could ask with `showDialogAsync` on every screen. A PR for
siganberg, so ask the user first.
