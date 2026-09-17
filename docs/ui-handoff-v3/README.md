# UI handoff v3 — how to use this folder

This folder holds both directions of the v3 design pass: the **brief** that went to the design session
(`UI-HANDOFF-V3.md`, `UX-REVIEW.md`, `screens/`) and what **came back** (`UI-HANDOFF.md`, `design/`, `renders/`).

Building the client? Start with `UI-HANDOFF.md`. It is the spec, in the v2 form: decisions, the visual system's
additions, every screen, the rules the UI computes, motion, narration templates, engine asks, open items, build
order and the answers to the brief's questions. The artboards it describes are exported in `design/` and rendered
in `renders/`, and live on the Design canvas it links to.

| File | Use |
|---|---|
| `UI-HANDOFF.md` | **The returned spec.** Read first if you are building |
| `design/` | The artboards as files: `canvas.json` plus one `.dc.html` per screen; `design/README.md` says how to read one |
| `renders/` | Every artboard as a 2× PNG, and `render.py` to regenerate them from `design/` |
| `UI-HANDOFF-V3.md` | The brief the session worked from |
| `UX-REVIEW.md` | The UX designer's review behind the brief |
| `screens/` | The build as it was on 2026-09-16, before this pass |

## The screenshots

Captured from the local dev build at a 435pt-wide viewport, 2x. The red "N · Issue" pill at the bottom left is
the Next.js dev overlay, not part of the app; it hides the left edge of the primary button in several shots.

| File | Screen |
|---|---|
| `01-today-resume.jpg` | Today, with a run in progress |
| `02-general-revealing.jpg` | General: two cards turned, the third turning |
| `03-general-picked-cta-below-fold.jpg` | General after a pick, scrolled: the button was off screen |
| `04-draft-row1-line.jpg` | Draft, row 1 (a line row), nothing picked |
| `05-draft-row1-picked.jpg` | Draft, row 1 after a pick, scrolled to the footer |
| `06-draft-row4-cavalry.jpg` | Draft, row 4: four near-identical cavalry cards |
| `07-board-sheet.jpg` | The whole board |
| `08-deploy-empty.jpg` | Deploy, empty pitch |
| `09-deploy-holding-token.jpg` | Deploy, a token held, inspector open |
| `10-enemy-roster.jpg` | The enemy roster page |
| `11-deploy-full-line.jpg` | Deploy, all eight placed, ready |
| `12-battle-first-beat.jpg` | Battle report, first beat |
| `13-battle-mid.jpg` | Battle report, four beats in |
| `14-battle-end-loss.jpg` | Battle report, ended in a loss |
| `15-result-loss.jpg` | Result after a loss at battle one |
| `16-rules-cultures.jpg` | Rules, scrolled to the cultures and traits grid |
| `17-numbers.jpg` | Numbers |

Not captured: Between battles (shown only after a win) and Result after a win. Their code is in
`apps/web/src/app/between/[battle]/page.tsx` and `apps/web/src/app/result/page.tsx`.

## Giving this to a design session again

Attach `UI-HANDOFF.md` (the current spec), `UI-HANDOFF-V3.md` and `UX-REVIEW.md`. If the session can read the
repository, also point it at `../ui-handoff-v2/` for the visual system and at `design/gdd/traits.md` for the trait
pool. The canvas link in `UI-HANDOFF.md` is the live design; `design/` is its snapshot.
