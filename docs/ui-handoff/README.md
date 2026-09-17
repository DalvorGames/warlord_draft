# ui-handoff

Everything the client build needs, in one folder. Start with `UI-HANDOFF.md`.

```
ui-handoff/
  README.md            this file
  UI-HANDOFF.md        the spec: decisions, tokens, every screen, the rules the UI computes,
                       motion, narration templates, engine binding, open items, build order
  design/
    canvas.json        artboard index: sizes, positions, titles, which ones are interactive
    *.dc.html          one file per screen (see below)
```

## The design files

`design/` is a snapshot of the Design canvas at
https://claude.ai/artifact/FYFSv7GGwABWfVfCXHgLPz — the canvas is the live, clickable version;
these files are the same content, checked in so the build does not depend on a link.

Each `.dc.html` is a self-contained screen: the markup is the layout (all styles inline, so
every colour, size and spacing is readable in place), and the `<script data-dc-script>` block at
the bottom is the screen's state logic — `renderVals()` returns exactly what the template
binds, so it doubles as the behaviour spec. The `{{holes}}`, `<sc-for>`, `<sc-if>` and
`onClick="{{handler}}"` are the canvas's own template syntax; treat them as "bind this value",
"repeat", "branch", "handler". `./support.js` is the canvas runtime and is not included, so
these files do not open standalone in a browser — read them, or open the canvas to click them.

| File | Screen | Interactive |
|---|---|---|
| `Phone-Home.dc.html` | Today: the daily muster, yesterday, standings, tab bar | |
| `Phone-General.dc.html` | 1 · pick a general (three real candidates from seed 1147) | yes |
| `Phone-Draft.dc.html` | 2 · one draft row per screen, reels, consequence line | yes |
| `Phone-Board.dc.html` | 2b · the whole board as a sheet | |
| `Phone-Deploy.dc.html` | 3 · tap a unit, tap a front; doctrine; live cohesion | yes |
| `Phone-Battle.dc.html` | 4 · seven beats, narration first, bars that move | yes |
| `Phone-Result.dc.html` | Result, chronicle, share card | |
| `Main.dc.html` | Desktop home | |
| `GeneralPick.dc.html` | Desktop 1 · general | |
| `Draft.dc.html` | Desktop 2 · all eight rows at once, reels, consequence line | yes |
| `Deploy.dc.html` | Desktop 3 · drag or click, doctrine, live cohesion | yes |
| `Battle.dc.html` | Desktop 4 · seven beats with the chronicle rail | yes |

Phone screens are 390×844; desktop 1280–1480 wide. The phone row is the primary reference —
desktop is the same components laid wide.

All unit names, stats, generals, the dealt board (draft seed 1147) and the battle
(Ashoka vs Chabrias, plains, battle seed 11) come from the engine in this repo, not from
invention. The two superseded direction sketches on the canvas are deliberately not here.
