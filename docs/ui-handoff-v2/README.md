# UI handoff v2 — how to use this folder

Start with `UI-HANDOFF.md`. It is the design intent: decisions, tokens, every screen, the rules the UI computes itself, motion, narration templates, engine binding, open items and a build order.

`design/` holds the visual mockups, exported from the Design canvas (`https://claude.ai/artifact/FYFSv7GGwABWfVfCXHgLPz`, where the same screens are live and clickable).

## Reading the mockups

- `canvas.json` — the artboard index: each file's size, position and title, plus `is_interactive` on the working prototypes. Rows: phone app in palette v2 (y = 0, the primary reference), the palette token sheet (y = 2000), desktop in palette v1 (y = 3160, not yet redrawn), superseded sketches (y = 4800, ignore).
- `<name>.dc.html` — one artboard each. The markup is plain HTML with inline styles, so the layout, spacing, type and colours read directly; you can open one in a browser and it renders except for the `{{…}}` holes and the `<sc-for>` / `<sc-if>` loops, which the canvas runtime fills. Treat every `{{x}}` as a bound value and every `<sc-for list="{{rows}}" as="r">` as a `rows.map(r => …)`.
- The `<script data-dc-script>` at the bottom of each file is the state logic: `renderVals()` returns every value the markup binds, `componentDidMount()` starts timers (reveal, reels), and handlers passed as `onClick="{{x}}"` are plain closures over `setState`. This is the closest thing to a spec for that screen's behaviour and was written to be read. The reel timings, the cohesion formula, the consequence line and the inspector sentence are all in there.
- Data in the files is real: draft seed 1147 (Ashoka; Triarii, Wei Wuzu, Kshatriya Swordsmen ×2, Persian Heavy Cavalry, Kshatriya Noble Cavalry, Indian Longbowmen ×2; deployment `CCCLRLRC`; defensive) against `aiDraft(707,'greedy')` (Chabrias) on plains with battle seed 11. Numbers on the Battle and Result boards come from `resolve(...)` on that pairing, except the rank and pick-% figures, which are illustrative.

## Phone screens (palette v2, 390×844 unless noted)

| File | Screen |
|---|---|
| `Phone-Home.dc.html` | Today — the daily puzzle page, W/L history, tab bar |
| `Phone-General.dc.html` | 1 · General — three cards turn over by themselves; tap to choose (interactive) |
| `Phone-Draft.dc.html` | 2 · Draft — one row, four slot reels, consequence lines (interactive: Reroll) |
| `Phone-Board.dc.html` | 2b · The whole board as a sheet |
| `Phone-Deploy.dc.html` | 3 · Deploy — the pitch, the unit inspector, the bench, doctrine (interactive) |
| `Phone-Battle.dc.html` | 4 · Battle — the match report, one beat at a time (interactive) |
| `Phone-Result.dc.html` | 5 · Result — rank, what others took, share card |
| `Phone-Rules.dc.html` | How it works — four numbered steps, cultures & traits (390×1640, scrolls) |
| `Phone-Glossary.dc.html` | The numbers — every stat explained, with the stage it counts in (390×1280, scrolls) |
| `V2-Palette.dc.html` | The palette v2 token sheet (980×844) |

Desktop (`Main`, `GeneralPick`, `Draft`, `Deploy`, `Battle`) is still palette v1 with the old stat codes; `UI-HANDOFF.md` §10.6 has the recolour mapping:

```
#14130F→#100F0C  #1C1A15→#1F1C17  #1A1813→#16140F  #211E18/#26221A/#2E2A23/#262218→#2C2822
#35312A→#3D3830  #3D382F/#454036/#4A4538→#4A453C  #EDE7D8→#F2ECDD  #A39B89→#B3AC9C  #8A8271→#9A9384
#C4562E→#D9633C  buttons #A8401F→#F2ECDD with #100F0C text  brass #C9A227→#F2ECDD (S grade) or the culture bright
MEL RNG ARM MOB DIS SHK → FIGHT SHOOT ARMOUR SPEED STEADY CHARGE   CMD TAC LOG CHA → COMMAND TACTICS SUPPLY CHARISMA
```

## Conventions carried into the build

No emoji. Real `<button>` and `<a>` for anything tappable, 44px minimum. Fonts: Instrument Serif, IBM Plex Sans, IBM Plex Mono, loaded once. Bottom bars keep 28px of safe area. Colour is the culture: neutrals for chrome, a deep/bright pair per culture, achromatic grades, rust only for "you are here".
