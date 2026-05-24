# v43 Single Viewport Grid Fix

This version fixes the stacking by architecture, not by small patches.

DOM:
main.app
  div.bg
  div.ui
    header
    scoreboard
    rounds
  section.dock

CSS:
- .app is a fixed 100svh grid with exactly two rows:
  1. minmax(0, 1fr) = header/scoreboard/rounds
  2. auto = dock
- .dock is NOT fixed.
- .ui is NOT scrollable and NOT allowed to run behind the dock.
- .rounds gets only the remaining available space.
- .bg is the only fixed layer.

Validated:
- one main
- one bg
- one ui
- one dock
- no app-bg remnants
- no fixed dock CSS
