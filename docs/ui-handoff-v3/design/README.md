# design/ — the artboards as files

One `<name>.dc.html` per artboard and `canvas.json`, the index (frames on the canvas: x, y, w, h, title). Exported
from the Design canvas at `https://claude.ai/artifact/XwCoVMGv3X69LmqUic67Cs` on 2026-09-17 (canvas version 15).
The canvas is the live copy; these files are the snapshot the handoff describes.

## Reading a .dc.html without the canvas runtime

Every file is one self-contained page: a Google Fonts link and a few base rules in `<helmet>`, then one root `<div>`
of the artboard's exact size with everything inline-styled, then an empty `<script data-dc-script>` block the
canvas needs. The mocks are static: no `{{holes}}`, no state, so a browser renders them as-is if you strip the
`support.js` script tag (`renders/render.py` does exactly that with Playwright).

- Colours, sizes, paddings and radii are literal in the markup; copy them, do not round them.
- Every control is a real `<button>` or `<a>` with an `aria-label` where the text alone would not name it.
- `<a href="Other.dc.html">` is a prototype link between screens (the run's CTAs are wired in order).
- Tokens are inline SVG paths (`GLYPH_PATHS` in the handoff §2); the six class shapes are the only icons.

## The artboards

| File | Screen | Size |
|---|---|---|
| Main | Today | 390×844 |
| Main-Invite | Today with a friend waiting in a room (the Join row, the VERSUS tab dot) | 390×844 |
| General | General pick, Epaminondas taken, one trait note open | 390×844 |
| Draft-Line, Draft-Flex | Draft row 1 (line) and row 5 (flex), a stat note and a count note open | 390×844 |
| Board | Board sheet over the row | 390×844 |
| Deploy-Empty, -Held, -Ready, -Plan, -Sheet | Deploy: empty pitch; unit card open; ready with a cohesion bubble; plan card open; enemy sheet | 390×844, the two expanded states taller |
| Battle-First, -Mid, -Trait, -Reveal | The report at the skirmish, at press 2, at the wheel-in, at the reveal | 390×844 |
| Between | After a win (illustrative) | 390×1180 |
| Result-Loss, Result-Win | Loss (the captured run) and win (illustrative) | 390×1560, 390×1400 |
| Rules, Numbers | The two reference pages | 390×1900, 390×2500 |
| Components, Tokens | The component sheet and the token sheet | 1280 wide |
| Versus-Start (the VERSUS tab), -Room-Waiting, -Room-Ready, -General, -Draft, -Deploy, -Locked, -Battle, -Result | 1v1: play a friend (handoff §13) | 390×844, Result 1500 |
