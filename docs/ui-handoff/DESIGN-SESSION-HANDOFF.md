# Warlord Draft — handoff for the next design session

*Read this first if your job is to take the current UI design and a new game design document and make the design better. `UI-HANDOFF.md` beside this file is the builder's spec for what exists today; this file is about how to change it.*

## 1. What you are inheriting

**The game.** A phone-first daily: take a general (three turn over, pick one), draft eight units one row at a time (four cards per row, two rerolls, elite cap, culture traits at 4 and 6), place them on three fronts (left, centre, right) with a doctrine, then watch a deterministic battle resolve as a live feed and see where you ranked among everyone who drafted the same board. Engine: `packages/engine/src` (`api.ts` is the public surface, `resolveFronts.ts` is the battle, `prepare.ts` builds the army). Data: `apps/web/public/data/v2/` (`units.json`, `generals.json`, `cultures.json`, `rules.json`). Design records: `docs/DECISIONS.md`, `docs/battle-design-three-fronts.md`, `docs/HANDOFF.md` (engine).

**The design.** Live and clickable on the Design canvas: `https://claude.ai/artifact/FYFSv7GGwABWfVfCXHgLPz` (canvas id `75bce6ba-4974-45e2-bbee-d4ae64e49479`). Exported copies are in `design/` here (`canvas.json` + one `.dc.html` per artboard). Ten phone screens in palette v2 are the primary design; five desktop screens are still palette v1 and lag behind; two sketches are superseded. `README.md` explains how to read a `.dc.html` without the canvas runtime.

**The spec.** `UI-HANDOFF.md`: decisions already made (§1), tokens (§2), every screen (§3), the rules the UI computes itself with exact formulas (§4), motion (§5), narration templates (§6), share card (§7), engine binding (§8), Mobbin references (§9), open items (§10), build order (§11). Treat §1 as decided unless the new game design doc contradicts it; then change the decision and record why in `DECISIONS.md`.

## 2. How to work on the canvas

The canvas is a Design-type Artifact. Its own instructions are the `SKILL.md` inside the artifact (read it with the Artifact tool: `action: "read"`, `path: "SKILL.md"`); the short version:

- Every artboard is `project/<Name>.dc.html`: an `<x-dc>` root with a `<helmet>` (one Google Fonts link, `<style>` for keyframes), a fixed-size root `<div>` equal to the board's `w × h` in `canvas.json`, inline styles only, `{{dotted.holes}}` for bound values, `<sc-for list="{{x}}" as="i" hint-placeholder-count="n">` for lists, `<sc-if value="{{flag}}" hint-placeholder-val="{{true}}">` for conditionals (booleans only), `onClick="{{handler}}"` on real `<button>`s, and a `<script data-dc-script data-props='…'>` with `class Component extends DCLogic { renderVals() {…} }` plus optional `componentDidMount` / `componentWillUnmount` / `setState`. No emoji. Real `<a href="Other.dc.html">` links between boards.
- `project/canvas.json` is the index: `boards` (x, y, w, h, title, `is_interactive`), `order`, `notes` (row titles, `kind: "title1"`).
- Publishing: keep local copies under a scratch folder, then call the Artifact tool with `url` = the canvas URL, `root` = the folder that contains `project/`, `file_path` = `project/canvas.json`, and a `files` map of `"project/X.dc.html": "project/X.dc.html"` for every board you changed (`null` removes one). The service refuses to overwrite a file it has not shown you this session: run `Artifact list` with `scope: "files"` on the canvas URL first (or `read` the file), then publish.
- Rows on the canvas today: phone app (y = 0, x = 470·i), palette sheet (y = 2000), desktop (y = 3160), sketches (y = 4800). Add new explorations as a new row below rather than overwriting the phone row until a direction is chosen.
- To smoke-test a board's logic without the runtime: extract the `<script data-dc-script>` body, stub `class DCLogic { setState(f){…} }`, `eval` it and call `renderVals()` with different `state`. Every interactive board in `design/` was checked this way.

## 3. Real data the boards use

Draft seed 1147; general pool Viridomarus (gal), Ashoka (ind, chosen), Hasdrubal Barca (car); picks `[2,3,2,1,0,3,3,0]` → Triarii, Wei Wuzu (S), Kshatriya Swordsmen ×2, Persian Heavy Cavalry, Kshatriya Noble Cavalry, Indian Longbowmen ×2; deployment `CCCLRLRC`; doctrine Defensive. Opponent `aiDraft(707, 'greedy')` → Chabrias (grk). Plains, battle seed 11: you win, rout at press 4, losses 11% vs 35%; thresholds L 0.95 / C 1.02 / R 0.94. Rank `#412 of 3,180` and the pick-% figures on Result are illustrative. Keep using this seed so screens stay comparable; regenerate with a `.mjs` that imports `dist/api.js` when the engine changes.

## 4. Where the design is weak today (start here)

These came out of playing the prototype with the owner. They are the reason the next pass exists.

1. **Deploy shows how much a front can take but not how hard it hits.** The cohesion word and number (`FIRM 1.02`) is an *average* of Steady plus Charisma, so adding units never raises it and adding a low-Steady unit lowers it, which reads as "placing troops does nothing". The other property, contest strength (sum of contributions, frontage-capped at 1.5× the enemy count), is never shown. Proposed: show both per front, a strength figure in the stage that front cares about (centre press weight; wing press weight) beside the cohesion word, and let the inspector sentence say "adds +140 to the centre's press and keeps it FIRM". This is the single most confusing thing in the current design.
2. **Doctrines are explained but not felt.** The doctrine card now shows the six multipliers and a sentence, and the Rules page repeats the sentences. Still missing: the doctrine's effect on *this* army's numbers (see 1), and any guidance earlier than Deploy. The player should be able to choose a plan by row 3 of the draft and draft toward it; nothing in the draft says which plan the general and the cultures on offer favour.
3. **Army crafting has no guidance.** The draft has a consequence line per card (culture tallies, elite cap, trait thresholds) but no notion of "what am I building". Candidates: a shape/plan intent chosen after the general ("I'm going Envelopment"), with the draft row hint and the consequence line tuned to it; or a passive "your army so far" read on the Board sheet (steady centre? real wings? any shooting?).
4. **The general's numbers are shown but not connected to decisions.** Command, Tactics, Supply, Charisma are defined on the Numbers page and summarised in one line on Deploy. Tactics (wings only) and Charisma (every front's cohesion) should influence the doctrine recommendation and the deploy hints.
5. **The first battle beat is too heavy** (`DECISIONS.md` §25): both of his wings can take the capped 0.48 before anyone moves. Engine or presentation fix, undecided.
6. **Frontage and reserves are invisible.** Seven in a centre against four fight as six; nothing on Deploy says so.
7. **Resume state on Today is undrawn.** Every screen must be a resume point.
8. **Desktop is a full generation behind** the phone design (palette v1, old stat codes, `?` enemy boxes on Deploy, no inspector). Do not spend time on it until the phone flow settles.

## 5. Working with a new game design document

When the owner gives you a new or revised design doc:

1. Diff it against `UI-HANDOFF.md` §1 (decisions) and §4 (computed rules) first. List every rule the UI currently computes that the doc changes: cohesion formula, elite cap, trait thresholds, doctrine multipliers, stage order, rout level, frontage. Each one has a screen that renders it; §3 says which.
2. Diff it against the engine before designing to it. If the doc describes a mechanic `resolveFronts.ts` does not implement, say so and design for what the doc says, marked as "pending engine".
3. Keep the vocabulary. Units are FIGHT SHOOT ARMOUR SPEED STEADY CHARGE; generals are COMMAND TACTICS SUPPLY CHARISMA; stages are Skirmish, Clash, Press, Break/Rout; fronts are Left, Centre, Right; cohesion words are FIRM, STEADY, BRITTLE. If the doc renames something, change the words everywhere in one pass and update §2.4 and the Numbers page.
4. Keep the palette rules. Colour is the culture; chrome is neutral; grades are achromatic; rust is only for "you are here". New elements get a culture colour or a neutral, never a new hue.
5. Work in the order the player meets things: Today → General → Draft → Deploy → Battle → Result → Rules/Numbers. A change to how armies are built ripples forward; a change to how battles are shown ripples back into what Deploy must explain.
6. For every new or changed screen, write the `renderVals()` so it computes from the real data (§3), not from typed-in numbers, so the board is a check on the rule as well as a picture of it.
7. When a decision in §1 is overturned, add a line to `docs/DECISIONS.md` with the reason and the doc that caused it, and update `UI-HANDOFF.md` in the same pass. Then republish the canvas and re-export `design/`.

## 6. Reference material already gathered

Mobbin (paid, connected via the Mobbin MCP; keep `task_intent` = "Find UI references to refine a phone-first daily draft-and-battle strategy game"): how-to-play pages (Singapore Airlines, Life Reset, Babbel), stat glossaries (FotMob Stats Definitions, Oura), live match feeds newest-first under a pinned score (FotMob, Premier League, DAZN, MLS, F1), finished play-by-play logs chronological (NBA, theScore), rank cards on daily-puzzle results, slot reels with a payline and decelerating stop. Links are in the session that produced them and in `UI-HANDOFF.md` §9; search again rather than reuse expired image URLs.

A draft playtest skill (`game-designer-playtest`) exists as a proposal: run the engine on real seeds, hunt dominant strategies and dead choices, then review the flow screen by screen. Use it, or the same three-pass shape, before redesigning anything the numbers could settle.

## 7. Suggested first hour

Read `UI-HANDOFF.md` §1, §3.4, §4.4, §4.6, §4.7. Open the canvas and click through the phone row with seed 1147 in mind. Read the new design doc and produce the diff from §5.1. Then fix weakness 1 on Deploy first, because every other confusion the owner reported traces back to it.
