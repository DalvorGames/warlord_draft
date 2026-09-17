# Warlord Draft — UI handoff v2

*For the session that builds the client. Companion to `HANDOFF.md` (engine), `battle-design-three-fronts.md` (battle model) and `DECISIONS.md`. Designed against the engine in `packages/engine/src` at data version 2 (`battleModel: "fronts"`). Where the UI needs something the engine does not expose yet, §10 says so. This replaces UI handoff v1: the palette, the stat vocabulary, the General reveal, the Deploy screen and the Battle screen all changed.*

**Goal:** a phone-first client for a three-minute daily. Take a general, draft eight units, set them on three fronts, watch the battle resolve one beat at a time, see where you ranked, share it. Desktop is the wide version of the same screens, not a different product, and is not yet redrawn in v2.

**The design:** `design/` beside this file — `canvas.json` is the artboard index, one `<name>.dc.html` per screen (`README.md` says how to read them). The same screens are live and clickable on the Design canvas at `https://claude.ai/artifact/FYFSv7GGwABWfVfCXHgLPz`. Rows on the canvas, top to bottom: **the phone app in palette v2 (the primary reference)**, the palette token sheet, the desktop run (still palette v1), superseded sketches (ignore). Artboards marked `is_interactive` are working prototypes; the `renderVals()` in each is the closest thing to a spec for that screen's state logic and is written to be read.

---

## 1. Decisions already made (do not reopen)

- **Phone-first.** 390×844 is the design target; desktop is the same components laid wide.
- **Palette v2, "colour is the culture".** Neutral warm-dark chrome; every culture owns a deep fill and a bright ink; grades are achromatic; the only warm accent is rust, used for "you are here" and nothing else. §2.
- **Stats are words, not codes.** The UI says FIGHT · SHOOT · ARMOUR · SPEED · STEADY · CHARGE for units and COMMAND · TACTICS · SUPPLY · CHARISMA for generals. The engine keys (`melee ranged armor mobility discipline shock`, `command tactics logistics charisma`) never reach the screen except as small grey aliases on the Numbers page.
- **Every number is explained in place.** A `?` in the header of General and Draft opens the Numbers page; tapping a unit on Deploy shows its numbers and what they mean for a wing or the centre. The Rules page is one tap from Today.
- **The general reveal is automatic.** Three cards turn over one after another; the player never taps to reveal, only to choose.
- **One run is one sitting**, about three minutes, plus a shared daily (same seed, same opponent, one attempt), ranked.
- **Draft on phone is one row per screen**, with the six stats visible, a slot-reel roll, and a "Board" sheet for the whole-board survey.
- **Deploy is a pitch**: three fronts drawn as a field, tokens for units, a bench below, tap-a-token-then-tap-a-front. Desktop adds drag and drop on the same click path.
- **His line is hidden at Deploy.** Nothing about his deployment is drawn there; it is revealed in battle and on Result. Do not draw `?` placeholders for it.
- **Doctrine (plan) is chosen on Deploy**, not in the draft.
- **Players see grades, never cost.** `cost` is a balance knob. Total cost is not shown.
- **No slot penalties.** Under the fronts model a unit is its stats and its front; the row only decides which culture is offered. Show the unit's class as a placement hint (§4.3), never a penalty.
- **Battle is a match report**: one beat at a time, narration first, opposed bars, running morale, with a "Key beats / Every beat" toggle.
- **Result is a rank**: your place among everyone who drafted today, then what everyone else took (only after the battle, never before).
- **No emoji anywhere**, including the share card. Icons are inline stroke SVG if ever needed.

## 2. Visual system (palette v2)

Fonts (Google Fonts, one `<link>`): `Instrument Serif` for display, `IBM Plex Sans` 400/500/600 for UI, `IBM Plex Mono` 400/500/600 for every number, label and stat. Nothing else. The token sheet is `design/V2-Palette.dc.html`.

### 2.1 Chrome

| Token | Value | Use |
|---|---|---|
| ground | `#100F0C` | page background |
| panel | `#1F1C17` | cards, sheets, the inspector |
| sunk | `#16140F` | bottom bars, the field, reel wells |
| raised | `#2C2822` | chips, pills, selected rows, progress "ahead" |
| rule | `#3D3830` | card borders, dividers; `#4A453C` for outlined buttons |
| bone | `#F2ECDD` | primary text; **primary button fill** (with `#100F0C` text) |
| dim | `#B3AC9C` | secondary text |
| faint | `#9A9384` | labels; `#6F6858` for hints, 11px+ only |
| rust | `#D9633C` | the current step, the held token, the reel flash, `0.80 ROUT`. Nothing else. |

Primary buttons are bone with ink text. There is no coloured button. Disabled CTAs are `raised` with `#9A9384` text and say why ("2 still on the bench").

### 2.2 Cultures — deep fill / bright ink

| Key | Culture | deep | bright |
|---|---|---|---|
| rom | Rome | `#6E1C1C` | `#E4574F` |
| car | Carthage | `#4A2A6B` | `#B58AE0` |
| mac | Macedon | `#1E3A6E` | `#6E9BF0` |
| grk | Greece | `#16465A` | `#4FC0E6` |
| per | Persia | `#124A44` | `#38C7AC` |
| chn | China | `#1E4A32` | `#52C98A` |
| ind | India | `#6B3E12` | `#F2A23C` |
| stp | Steppe | `#4A4A1C` | `#C9C45A` |
| gal | Gauls | `#5C2245` | `#DA7AB0` |

Use: a general card is filled with its culture's deep and bordered with its bright; a draft row's cards carry a 3px left edge in the row culture's bright; a unit token's stat bars are its culture's bright; in battle **your side is your general's culture bright and his side is his** (the prototype is India saffron vs Greece azure). Culture text on dark is always the bright; the deep is never used for text.

### 2.3 Grades — achromatic

**S** `#F2ECDD` fill, `#FFFFFF` edge, ink text · **A** `#BDB5A4` fill, ink text · **B** `#7E786B` fill, ink text · **C** outlined `#4A453C`, `#B3AC9C` text · **D/F** outlined `#3D3830`, `#9A9384`/`#6F6858` text. Grades read by lightness so they never collide with a culture hue (brass was dropped because it read as India).

### 2.4 Stats

Units, always in this order and with these labels: `FIGHT SHOOT ARMOUR SPEED STEADY CHARGE` (engine `melee ranged armor mobility discipline shock`). Generals: `COMMAND TACTICS SUPPLY CHARISMA` (engine `command tactics logistics charisma`; "Supply" is the player-facing name for logistics). Labels 7–8px mono uppercase, values 12–14px mono. A value ≥ 75 renders `#FFFFFF`, 0 renders `#4A453C`, else `#B3AC9C`/`#C4BDAC`.

Stage colours (Numbers page chips, Rules page): SKIRMISH `#4FC0E6`, CLASH `#F2A23C`, PRESS `#DA7AB0`, COHESION `#52C98A`, BREAK/ROUT rust.

Class tint: wing `#8FA9C4`, centre `#C4BDAC` (§4.3).

Type scale (phone): display 30/28/27 serif; body 12–15; mono labels 8–11 with `letter-spacing: 0.1–0.2em`, uppercase. Touch targets ≥ 44px. Bottom bars carry 28px of safe-area padding. Radii 3–8px (cards 6–8, chips 2–3). No gradients except the reel masks.

## 3. Screens and flow

```
Today ─▶ 1 General ─▶ 2 Draft (×8 rows) ─▶ 3 Deploy ─▶ 4 Battle ─▶ 5 Result ─▶ Today
  │                       └─ Board sheet
  └─ RULES tab ─▶ How it works ◀─▶ The numbers  ◀─ the ? in the General and Draft headers
```

Progress is a thin segmented bar at the top of every run screen: 4 segments for the run, 8 for the draft rows. Rust = current, bone = done, `raised` = ahead. The run has no tab bar; Today has one (`TODAY · ARMIES · LADDER · RULES`).

### 3.1 Today (`Phone-Home`) — the puzzle page
Date and seed; the muster line (general count, ground, rerolls); today's shape hint; a single bone button "Draft today's army" with "Four screens, about three minutes." Below: the last five days as W/L cells with the shape you used (`2·4·2`), today's standings top three, and the tab bar. RULES opens `Phone-Rules`. **Needs a resume state** (§10.1).

### 3.2 General (`Phone-General`) — three cards turn over
`startDraft(seed).generalPool` gives three ids. Cards are face down (panel, thin inner rule, "THE FIRST / SECOND / THIRD") and flip automatically at 450ms, 1100ms, 1750ms (`rotateY` 560ms, `cubic-bezier(0.2,0.7,0.2,1)`). The face is the culture's deep fill, bright border and culture label; serif name; italic note; four stats as `COMMAND TACTICS SUPPLY CHARISMA` with bars; chips for doctrine (`styleToPlan[style]`), elite slots (lit bone when 3) and the trait name. Tap to choose (bone border, glow, check dot); the footer shows a one-line read of the chosen general ("Supply 90 buys a third elite slot") and the CTA "Take the field with <first name>". Elite slots: `rules.eliteCap.base`, or `withLogistics` when `logistics ≥ 80`. Header `?` → Numbers page.

### 3.3 Draft (`Phone-Draft`, `Phone-Board`) — one row, four reels
Header: back, `ROW n OF 8`, `?`, `Board`. Row header: slot label in rust, culture name in the culture's bright, and a **one-line reading hint for the row's class** ("A ranged row: read SHOOT first, then SPEED if it goes on a wing"), plus the reroll button. Then four cards, each: grade chip + name + check dot; class badge (tinted) + subtype; the six stats; the **consequence line** (§4.1). Cards carry a 3px left edge in the culture's bright. A row rolls as a slot machine (§5.1). Footer: elite used/cap, rerolls, nearest trait threshold as three chips, and the CTA "Next row" / "Set the line" (to Deploy).

`Phone-Board` is the whole board as a sheet: eight compact rows, four chips each, taken chips lit, current row ruled in rust, tap a row to jump.

### 3.4 Deploy (`Phone-Deploy`) — the pitch and the inspector
Title "Set the line", a hint line, and `YOUR SHAPE` as `L · C · R` counts. The field is a sunk panel with a faint centre circle and a small mono line at the top: `PLAINS · WINGS ×1.10` on the left, `HIS LINE IS HIDDEN UNTIL BATTLE` on the right. Three fronts LEFT · CENTRE · RIGHT (centre 1.5× wider), each showing its cohesion word and number (§4.4) and its tokens. A token is a 40px rounded square with the grade letter (grade fill), the short name under it and a class-tint dot. Tap a token to hold it (rust border); every other front then shows a dashed "Place on the left" overlay button; the bench grows "Bench it". Empty fronts turn `#4A3228` with the cost in rust.

**The inspector** sits between the field and the bench, fixed 142px, and is the reason the player can make an informed choice. Empty state: "Tap a token to see its numbers and where it fits" plus the rule of thumb ("Wings press with Speed and Fight. The centre holds with Fight, Armour and Steady"). Held state: name, class badge, culture (in its bright); the six stats with bars in the culture bright, with the keys that count for the unit's natural front lit bone and the rest faint; then a computed sentence (§4.6) and the cohesion word each front would read if the unit stood there.

Below: `THE BENCH · NOT YET ON THE FIELD` with the unplaced tokens; then the four doctrine pills (`Aggressive Defensive Envelopment Skirmish`, selected = raised fill + rust edge) and the CTA "Give battle" (bone) once all eight are placed, else "N still on the bench" (disabled). Deployment goes to `setDeployment(state, Front[])` in slot order and rides in the run string as `dep=`.

### 3.5 Battle (`Phone-Battle`) — the match report
Header: `YOU vs HIM` in the two culture brights, ground, a `Key beats / Every beat` toggle. Pinned: both armies' morale as running columns against the `0.80 ROUT` line, and the three front pairings as opposed bars (your L vs his R, centres, your R vs his L), each side's damage against its threshold, in the two culture brights; a broken front turns rust and reads `HIS FRONT BROKE`. Each beat: stage label, **the narration line** (serif 19px, §6), then one card per contest: pair, edge tag (`YOURS BY 31%` / `HIS BY 28%` / `HELD`), opposed score bars with `topA`/`topB` names, damage taken, and the morale delta. Break and rout events are rust callouts. Controls: Back, Play (auto ~1.6s), Next. Build the beats from `rounds[]` (§8).

### 3.6 Result (`Phone-Result`) — the rank
`THE FIELD IS YOURS` in your culture bright (or `THE FIELD IS HIS` in his), the serif headline from the decisive beat, then the **rank card**: `#412 of 3,180 who drafted`, "Ranked by how you won, then by losses. Ends in 5h 12m", and a "Challenge a friend" button. Four stat tiles (ended at, his morale, you lost, he lost — yours in your bright, his in his). `WHAT EVERYONE ELSE TOOK`: grade, unit, pick-% bar (yours in your bright), and a one-line observation. The share card (§7), "Share today's result" (bone), `RUN` (copies `toRunString`), "Back to today". Deployments are revealed here as `2 | 4 | 2` against `1 | 6 | 1`.

### 3.7 How it works (`Phone-Rules`) — scrolls, drawn at 390×1640
Title "One army a day. About three minutes." Four numbered cards, each with a small diagram made of real components, one sentence of body and two rust-dot tips: **1 Take a general** (three mini culture cards), **2 Draft eight rows** (the eight-row board with the picks lit and the class labels tinted), **3 Place them on three fronts** (three dashed fronts with tokens and "wants speed / wants steady"), **4 Watch it play out** (the four stages in their colours and a morale bar with the rout line). Then `CULTURES & TRAITS` as a 3×3 grid of culture-filled cells with `cultures[key].trait` and a one-line gist, headed "4 units wakes it · 6 doubles it". Footer: "What each number means" (outlined) and "Play today's board" (bone).

### 3.8 The numbers (`Phone-Glossary`) — scrolls, drawn at 390×1280
Title "What each number means" with the four stage chips and one sentence defining them. `YOUR GENERAL`: four cards (Command, Tactics, Supply, Charisma), each with the engine alias in grey, a plain sentence, a mono "how it is counted" line, and stage chips on the right. `YOUR UNITS`: six cards the same way (Shoot, Charge, Steady, Armour, Fight, Speed, in the order the battle uses them). `GRADES`: the six chips and the elite rule. The copy is in the artboard and should ship as written; it is derived from `resolveFronts.ts` and `prepare.ts` and must be kept in step with them.

## 4. Rules the UI computes itself

### 4.1 The consequence line on every draft card
For card `j` in row `i`, with `counts` = culture counts from current picks **plus 1 for the general's culture**, and `eliteUsed` = picks with grade S or A:

```
base      = counts[row.culture] − (row picked ? 1 : 0)
baseElite = eliteUsed − (row picked with an S/A ? 1 : 0)
after     = base + 1
if S/A and baseElite ≥ eliteCap and not already this row's pick:
    "ELITE CAP FULL — DROP ONE TO TAKE THIS"   rust, card disabled at 0.6 opacity
else if after === 4:   "INDIA 4 → ELEPHANT LINE ON"        culture bright
else if after === 6:   "INDIA 6 → ELEPHANT LINE II"        culture bright
else if S/A:           "ELITE 2 OF 3 · INDIA 3"            bone
else:                  "INDIA 3 OF 4"                      faint
```
Thresholds from `rules.traitThresholds` (4, 6). Trait names from `cultures[key].trait`.

### 4.2 Culture tally notes
`n ≥ 6`: "<Trait> II is on." · `n ≥ 4`: "<Trait> is on. <6−n> more upgrades it." · else "<4−n> more for <Trait>." The general's culture counts as one unit.

### 4.3 Class tint and natural front
`cavalry`, `skirmish`, `special`, `ranged` → wing tint, "wants speed". `line`, `shock` → centre tint, "wants steady". It is a hint; any unit can stand anywhere. (Ranged is tinted wing because its press numbers are weak everywhere and the inspector says so.)

### 4.4 Cohesion
Per front, live: `(0.55 + avgDis/100 × 0.35 + charisma/100 × 0.20) × plans[plan].moraleThreshold`, where `avgDis` is **effective** discipline (plains: cavalry and chariots ×1.05). Matches `resolveFronts.ts → threshold()`. Word: ≥ 1.00 `FIRM` (bone), ≥ 0.92 `STEADY` (dim), else `BRITTLE` (rust). Empty: `NOBODY` in rust. Show word then number (`FIRM 1.02`).

### 4.5 Edge tags and damage
Tag = `round(edge × 100)%` with the winner; `edge === 0` reads `HELD`. Damage: `YOU TAKE +0.28` (rust) / `HE TAKES +0.19` / `NOTHING LOST`. Morale delta beside the columns on whichever side took more.

### 4.6 The inspector sentence (Deploy)
From the unit's stats, using the engine's press weights:
```
wingScore   = round(mobility×0.4 + melee×0.4 + shock×0.2)
centreScore = round(melee×0.5 + armor×0.3 + discipline×0.2)
ranged:  "Shoots {ranged} in the skirmish, then presses at only {wingScore} on a wing, {centreScore} in the centre. Keep it where the fight is short."
wing:    "On a wing it presses at {wingScore} and charges {shock}. In the centre it would grind at {centreScore} and lose its Speed."
centre:  "In the centre it grinds at {centreScore} and holds with Steady {discipline}. On a wing it would press at only {wingScore}."
+ " If placed: Left {word} · Centre {word} · Right {word}."   ← cohesion (§4.4) recomputed with the unit on each front
```
Lit keys: wing → SPEED FIGHT CHARGE SHOOT; centre → FIGHT ARMOUR STEADY CHARGE.

## 5. Motion

### 5.1 The reel — a real slot machine
Everything finishes in 1.5s. On a roll every card in the row becomes a reel: a sunk well with a **payline** band across the middle (34px, `rgba(255,255,255,0.04)` with 1px top/bottom rules in the culture bright), and a strip of `grade · name` rows (30px each, drawn from the row's culture and two others) looping upward at 260–350ms per loop, each reel a little slower than the one above it, under top/bottom fade masks. Reels **stop one at a time, top to bottom**: reel *i* settles at `520 + i×300` ms (+80ms hold on the last one). 480ms before settling it switches to a **brake strip** ending in the real card: `@keyframes wdstop { 0% translateY(0); 78% translateY(-190px); 100% translateY(-180px) }` with `cubic-bezier(0.1,0.8,0.2,1)` — it overshoots one row past the payline and eases back into position. The settled card then mounts with `wdland` (drop 10px, 55% overshoot) and a short rust flash. Rerolls are refused while any reel is spinning. State per reel: `0 looping · 1 braking · 2 settled`.

### 5.2 General reveal
Face-down cards flip at 450/1100/1750ms; the footer copy changes from "Turning them over…" to "Tap a card to take him" when all three are up.

### 5.3 Battle
Bars `transition: width 700ms ease, background 400ms ease`; beat content 240ms fade-and-rise; Play advances every 1.6s and stops at the result.

### 5.4 Everything else
No hover-only affordances. Selection changes are instant. No page transitions beyond a plain push.

## 6. Narration — templates the engine must produce

The prototype's lines are hand-written for one battle (seed 1147, Ashoka vs Chabrias, plains, battle seed 11). Ship them as templates in `recap.ts`. Every `ContestRecord` carries `topA`/`topB`, `edge`, `winner`, and each round carries `events[]`. Voice: second person to the player ("your longbows"), his side by name, past tense, one or two sentences, no numbers except cohesion fractions.

| Beat | Template |
|---|---|
| Skirmish | "Your **{topA on your best wing}** open on {his wings with no shooters ? 'both his wings and find nothing shooting back' : 'his left'}. In the centre {his skirmish > yours ? 'it runs the other way: his **{topB centre}** pour it into a line you brought no bows to' : 'your **{topA centre}** answer'}." |
| Clash | "The lines meet. **{topA L}** {win/lose} the left, **{topA R}** {win/lose} the right, and the centres {edge < 0.1 ? 'come out almost even' : '{winner} by {a lot / a little}'}. {any shaken ? '**{front}** is shaken.' : 'Nobody is shaken.'}" |
| Press n | Lead with the biggest edge of the round; close with the front nearest its threshold: "His left is close to done." |
| Break | "{Both/His left/His right} {go/goes} in the same round. **{units}** leave the field, and your {wing(s)} {is/are} free. Your centre is at {fraction, in fifths} of its cohesion, and holding." |
| Roll-up | "Your left wheels in. … Carrying {broken wings} and {n} flank marks, his centre folds and the army routs." |
| Result | Headline from the decisive beat. Losing versions must exist for every template. |

Keep the short chronicle (one clause per beat) for Result.

## 7. The share card

Monospace, five lines, no unit names, copied as text:
```
Warlord Draft · 16 Sep · #412
me   2 | 4 | 2   Ashoka
him  1 | 6 | 1   Chabrias
both his wings gone by press 3
routed press 4 · 11% lost
```
Rank replaces the seed on line one once the daily is ranked. Whether to render a coloured image beside the text is open (§10.5).

## 8. Engine binding (`packages/engine/src/api.ts`)

```
const engine = createEngine({ units, generals, cultures, rules });   // apps/web/public/data/v2/*.json
let s = engine.startDraft(seed);            s.generalPool → 3 ids
s = engine.pickGeneral(s, i);               s.rows[8] → { slot, culture, cards[{unitId,onClass}], pick }
s = engine.pickCard(s, row, card) | engine.unpickRow(s, row) | engine.rerollRow(s, row)
engine.summarize(s) → { cultureCounts, traitLevels, eliteUsed, eliteCap, totalCost, picksMade }
engine.validate(s)  → string[]  (show these; never block silently)
s = engine.setPlan(s, plan); s = engine.setDeployment(s, ['C','C','C','L','R','L','R','C'])
const army = engine.toArmy(s); const run = engine.toRunString(s);   // v=2&d=…&g=…&p=…&r=…&plan=…&dep=…
const foe = engine.aiDraft(foeSeed, 'greedy');
const result = engine.resolve(army, foe, terrain, battleSeed);     // rounds[], fronts{A,B}, casualties, recap[]
engine.replayDraft(run) → { state, army }
```
Beats from `rounds[]`: the two `round: 0` records are skirmish and clash; each later record is a press round (its `rollup` contests first). Ignore `Card.penalty` / `Card.wrecked` and `phaseLog` (v1). The daily = one fixed `(seed, foeSeed, terrain, battleSeed)` per date, served to everyone; the ladder ranks by outcome then losses.

## 9. Mobbin references that shaped v2
Keep these in mind when extending the design: how-to-play as numbered cards with small diagrams (Singapore Airlines "How it works", Life Reset, Babbel's pixel "How to play"); stat definitions as one-sentence rows with a "how is it calculated" line (FotMob Stats Definitions, Oura Resilience); a rank card at the top of a result (daily-puzzle apps); slot reels with a payline and a decelerating stop (casual game reels).

## 10. Open items — decide before or during the build

1. **Resume state.** A run interrupted at row 5 must come back to row 5. Today's button should read "Resume — row 5 of 8". Undrawn.
2. **The first beat is too heavy** (`DECISIONS.md` §25 agrees). Either the engine lowers `fronts.weights.skirmish`, or the UI plays the skirmish as narration over the morale columns and holds the contest cards until the clash.
3. **Frontage and reserves are invisible.** Six in a centre fight as six against four only up to `frontage` (1.5×). Proposed: a `2 IN RESERVE` tag on a front that out-numbers the likely opposite front.
4. **His shape before Deploy.** Currently hidden by decision. If the daily ever reveals his *shape* (`1 · 6 · 1`, no names) before deploy, bring it back as one mono line on the field, not as boxes.
5. **Share card image** alongside the text.
6. **Desktop** is still palette v1 and still has the old stat codes and the enemy `?` boxes on Deploy. Recolour with the mapping in `README.md` and carry over §3.4's inspector before shipping desktop.
7. **First-run onboarding.** Whether a brand-new player sees the Rules page before their first board (Babbel-style) or only via the tab.
8. **"Supply" as the player-facing name for logistics** — confirm before it appears in copy elsewhere.

## 11. Build order

1. Shell + tokens (§2) + progress bar + tab bar. Fonts loaded once.
2. General (auto-reveal) → Draft → Board sheet against a real `DraftState`, with §4.1–4.3 and the reel (§5.1). Acceptance: the consequence line is correct for every card on seed 1147 after any sequence of picks; elite-capped cards are disabled; reels settle top to bottom within 1.5s.
3. Deploy with the inspector (§3.4, §4.6) and live cohesion (§4.4); acceptance: the three thresholds for `CCCLRLRC` on plains, defensive, match `resolve(...).fronts.A` to two decimals (0.95 / 1.02 / 0.94), and the inspector sentence for Persian Heavy Cavalry reads "presses at 71 and charges 75".
4. Battle stepper from `rounds[]`; acceptance: front bars end where `fronts[].damage / threshold` says, morale ends at `moraleFraction`.
5. Narration templates (§6) in `recap.ts`, then Result with the rank card and the share card.
6. Rules and Numbers pages from the artboard copy, linked from Today, General and Draft.
7. Today, daily seed service, ladder, resume state (§10.1).
