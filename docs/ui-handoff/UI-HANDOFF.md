# Warlord Draft — UI handoff v1

*For the session that builds the client. Companion to `HANDOFF.md` (engine), `battle-design-three-fronts.md` (battle model) and `DECISIONS.md`. Everything here was designed against the engine as it stands in `src/api.ts` at data version 2; where the UI needs something the engine does not yet expose, §9 says so.*

**Goal:** a phone-first client for a three-minute daily. Draft eight units, set them on three fronts, watch a battle resolve one beat at a time, share the result. Desktop is the wide version of the same screens, not a different product.

**The design:** `design/` beside this file — `canvas.json` is the artboard index, one `<name>.dc.html` per screen (the `README.md` here says how to read them). The same screens are live and clickable on the Design canvas at `https://claude.ai/artifact/FYFSv7GGwABWfVfCXHgLPz`. Three rows: desktop run (top), the phone app (middle, the primary reference), superseded direction sketches (bottom, ignore). Artboards marked `is_interactive` are working prototypes — click through them; the `renderVals()` in each is the closest thing to a spec for that screen's state logic and is written to be read.

---

## 1. Decisions already made (do not reopen)

- **Phone-first.** 390×844 is the design target; desktop screens are the same components laid wide.
- **Direction A, "War Room".** Dark warm ground, editorial serif display, monospace numbers. §2 has the tokens.
- **One run is one sitting**, about three minutes, plus a shared daily (same seed, same opponent, one attempt).
- **Draft on phone is one row per screen**, all six stats visible, with a "Board" sheet for the whole-board survey. Desktop shows all eight rows at once.
- **Deploy is tap-a-unit-then-tap-a-front** on phone; desktop adds drag and drop on top of the same click path.
- **Doctrine (plan) is chosen on the Deploy screen**, after the enemy roster is visible, not in the draft.
- **Players see grades, never cost.** `cost` is a balance knob; the UI shows `grade` only. Total cost is not shown.
- **No slot penalties in the UI.** Under `battleModel: "fronts"` a unit is its stats and its front; the row only decides which culture is offered. Show the unit's own class as a deployment hint (§4.3), never a penalty.
- **Battle is stepped**, one beat per tap, narration first, with bars that animate between beats.
- **No emoji anywhere**, including the share card. Icons are inline stroke SVG if ever needed.

## 2. Visual system

Fonts (Google Fonts, one `<link>`): `Instrument Serif` for display, `IBM Plex Sans` 400/500/600 for UI, `IBM Plex Mono` 400/500/600 for every number, label and stat. Nothing else.

| Token | Value | Use |
|---|---|---|
| ground | `#14130F` | page background |
| panel | `#1C1A15` | cards, rails |
| panel-2 | `#211E18` / `#2A2419` | chips; selected state |
| hidden | `#191712` + dashed `#322E27` | the enemy's hidden deployment, trays |
| rule | `#2E2A23` / `#35312A` / `#2A2720` | borders, dividers |
| bone | `#EDE7D8` | primary text |
| dim | `#A39B89` | secondary text (≥ 4.5:1 on ground) |
| faint | `#8A8271`, `#6F6858` | labels, hints (`#6F6858` only at 11px+ on dark panels) |
| accent | `#C4562E` | current step, selected border, wordmarks. Editable via the `accent` tweak. |
| accent-fill | `#A8401F` with `#F5EFE3` text | primary buttons only |
| brass | `#C9A227` | grade S, active traits, "yours" in battle bars, trait-on moments |
| enemy | `#7E93A8` | "his" in battle bars |
| good / bad | `#9DBA72` / `#D9724F` | multipliers above/below 1, damage taken, broken fronts |
| wing / centre | `#8FA9C4` / `#C4BDAC` | class tint: cavalry, skirmish, special vs line, shock, ranged |

Grade chips read by lightness, not hue: **S** brass fill, **A** `#D8CBAE` fill, **B** `#9C9686` fill (all with `#14130F` text); **C** outlined `#5F5949` with `#B8B1A0` text; **D/F** outlined `#413C33` with `#8A8271` text.

Stats: six per unit, always in this order and with these labels: `MEL RNG ARM MOB DIS SHK`. A value ≥ 75 renders brass; a 0 renders `#4E4A3F`. Labels 8px mono, values 12–14px mono.

Type scale: display 72/44/30/26 (desktop), 33/30/27 (phone); body 13–15; mono labels 9–11 with `letter-spacing: 0.1–0.2em`, uppercase.

Touch targets ≥ 44px. Bottom bars carry 28px of safe-area padding. Never draw a status bar or keyboard. Radii are 2–4px; no gradients except the two reel masks (§5.1).

## 3. Screens and flow

```
Today ─▶ 1 General ─▶ 2 Draft (×8 rows) ─▶ 3 Deploy ─▶ 4 Battle (7 beats) ─▶ Result ─▶ Today
                         └─ Board sheet
```

Progress is a thin segmented bar at the top of every run screen: 4 segments for the run, 8 for the draft rows. Brass = done, accent = current, `#2E2A23` = ahead. The run has no tab bar; Today and Result do (`TODAY · ARMIES · LADDER · RULES`).

### 3.1 Today (`Phone-Home`, `Main`)
The daily muster card: date, seed, ground, rerolls, one primary button "Draft today's army", the line "Four screens, about three minutes." Below: yesterday's result as a one-line headline plus the last five as W/L marks; a "Free run" / "Replay a seed" pair; today's standings. **Needs a resume state** (§9).

### 3.2 General (`Phone-General`, `GeneralPick`)
`startDraft(seed).generalPool` gives three general ids. Each card: culture (mono label), name (serif), note (italic), four stats `CMD TAC LOG CHA`, chips for doctrine (`styleToPlan[style]`), elite slots, and the trait name. Whole card is the button; bottom CTA reads "Take the field with <first name>". Elite slots: `rules.eliteCap.base`, or `withLogistics` when `logistics ≥ logisticsThreshold` (2 → 3 at 80). Say it: "Logistics 90 buys a third elite slot."

### 3.3 Draft (`Phone-Draft`, `Draft`)
State is the engine's `DraftState`; render `rows[i].cards[j]` through `pickCard`, `unpickRow`, `rerollRow`. Each row: slot label (mono, uppercase), culture, reroll button (only while the row is unpicked and `rerollsLeft > 0`), and its cards — four, or three when a culture has fewer eligible units (India has three cavalry; show the empty slot as a dashed box with that sentence).

A card shows, top to bottom: grade chip + name; class badge (tinted per §2) + subtype; the six stats; and a **consequence line** computed from the current picks (§4.1). Picking dims the row's other cards to 0.42 and shows `PICKED` under the slot label; picking again unpicks.

The rail (desktop) or bottom bar (phone) shows: slots filled as eight pips, elite used / cap, rerolls left, and culture tallies with a six-cell meter and a note (§4.2). Doctrine is **not** here: a dashed note says it is chosen at deployment.

Phone: one row per screen; "Board" opens the sheet (`Phone-Board`): eight compact rows, four chips each with grade letter and short name, taken chips lit, current row ruled in accent, tap a row to jump. Bottom of the sheet repeats elite/rerolls and the nearest trait threshold.

### 3.4 Deploy (`Phone-Deploy`, `Deploy`)
Top: his deployment as three dashed boxes of `?` (never revealed here), and a one-line read of his roster: "He brings six that stand and two that ride. Pack the centre and his wings are one unit each." His full roster is in the desktop rail and behind "Roster" on phone. Then the four doctrine pills; picking one updates the effect lines (`rules.fronts.plans[name]`: skirmish, contact, steadiness, centre, wing) and the style-match note (`+8%` when `styleToPlan[general.style] === plan`).

Three fronts, LEFT · CENTRE · RIGHT, the centre 1.25–1.5× wider, each labelled with what it faces (`FACES HIS RIGHT` etc.). A unit chip is a `<button>`: tap lifts it (accent border), every *other* front grows a `Place on the left` button, the tray grows `Take off the line`. Desktop chips are also `draggable`; fronts take `onDragOver`/`onDrop`. Empty fronts turn `#4A3228` with the cost in red: wing "0.25 of the army on the spot, and his right rolls into your centre"; centre "the general standing alone: 0.40 on the spot".

Each front's footer shows unit count, average discipline, and **cohesion as a word then a number** (§4.4). CTA is "Give battle" only when all eight are placed; otherwise "N still unplaced". Deployment goes to `setDeployment(state, Front[])` in slot order and is carried in the run string as `dep=`.

### 3.5 Battle (`Phone-Battle`, `Battle`)
Seven beats from `resolve(...)`: skirmish, contact, press 1–4, result. Build the list from `rounds[]`: the two `round: 0` records are skirmish and contact; each later record is a press round (its `rollup` contests come first). Controls: Back, Play (auto-advance ~1.6s), Next; desktop also has clickable stage chips.

Pinned at the top: army morale for both sides against the rout line at 0.80 (`rounds[i].moraleA/B`), and three front cards (your L vs his R, the centres, your R vs his L) with damage-vs-threshold bars for both sides, from `fronts[side][f].threshold` and the cumulative `damageA/damageB` of that front's contests so far. A broken front turns red and its label reads `HIS FRONT BROKE`.

Each beat shows, in this order: stage label (mono, accent), **the narration line** (serif, 19px phone / 25px desktop, §6), the mechanic note (small, grey, desktop only), then one card per contest: pair label, tag (`YOURS BY 31%` / `HIS BY 28%` / `HELD` when `edge === 0`), two score bars with `topA`/`topB` names beside them, damage taken. Break and rout events are rust callouts under the contests. All bars `transition: width 700ms ease`; the beat block fades in over 240ms.

The result beat: `THE FIELD IS YOURS` / `THE FIELD IS HIS`, a serif headline, four stats (ended at, his morale, your losses, his losses), then "See the recap".

### 3.6 Result (`Phone-Result`)
Headline, general/doctrine/ground line, four stat tiles, "How it went" (one line per beat), the **share card** (§7), buttons "Share today's result" and a `RUN` button that copies `toRunString(state)`. Deployments are revealed here as `2 | 4 | 2` against `1 | 6 | 1`.

## 4. Rules the UI computes itself

### 4.1 The consequence line on every draft card
For card `j` in row `i`, with `counts` = culture counts from current picks **plus 1 for the general's culture**, and `eliteUsed` = picks with grade S or A:

```
base      = counts[row.culture] − (row picked ? 1 : 0)
baseElite = eliteUsed − (row picked with an S/A ? 1 : 0)
after     = base + 1
if S/A and baseElite ≥ eliteCap and not already this row's pick:
    "ELITE CAP FULL — DROP ONE TO TAKE THIS"   red, card disabled at 0.6 opacity
else if after === 4:   "INDIA 4 → ELEPHANT LINE ON"        brass
else if after === 6:   "INDIA 6 → ELEPHANT LINE II"        brass
else if S/A:           "ELITE 2 OF 3 · INDIA 3"            bone
else:                  "INDIA 3 OF 4"                      faint
```
Thresholds from `rules.traitThresholds` (4, 6). Trait names from `cultures[key].trait`.

### 4.2 Culture tally notes
`n ≥ 6`: "<Trait> II is on: <level2 summary>." · `n ≥ 4`: "<Trait> is on: <level1 summary>. <6−n> more upgrades it." · else "<4−n> more for <Trait>." The general's culture shows "(with <name>)" after its count. Show the top three cultures by count.

### 4.3 Class tint
`cavalry`, `skirmish`, `special` → wing tint, legend "WINS A WING". `line`, `shock`, `ranged` → centre tint, "HOLDS A CENTRE". It is a hint, not a rule; any unit can stand anywhere.

### 4.4 Cohesion
Per front, live: `(0.55 + avgDis/100 × 0.35 + charisma/100 × 0.20) × plans[plan].moraleThreshold`, where `avgDis` is **effective** discipline — on plains cavalry and chariots are ×1.05 (`rules.terrain.plains`), and other grounds scale other classes. Matches `resolveFronts.ts → threshold()` exactly. Word: ≥ 1.00 `FIRM` (brass), ≥ 0.92 `STEADY` (bone), else `BRITTLE` (rust). Empty: `NOTHING HERE` in rust.

### 4.5 Edge tags and damage
Tag = `round(edge × 100)%` with the winner's name; `edge === 0` reads `HELD`. Damage line: `YOU TAKE +0.28` (rust) or `HE TAKES +0.19` (green) or `NOTHING LOST`. Morale delta beside the bar on desktop: `+0.28` on whichever side took more this beat.

## 5. Motion

### 5.1 The reel (draft roll and reroll)
On the board's first render every row rolls; a reroll rolls one row. A rolling card slot shows a strip of eight `grade · name` lines (drawn from that row's culture and two others), duplicated, scrolling upward with `@keyframes wdreel { to { transform: translateY(-50%) } }` at 340–520ms per loop (each card slightly different, negative `animation-delay` so they are out of phase), under a top/bottom fade mask in the panel colour. Cards settle **left to right** (top to bottom on phone): first at +520ms, then every +170ms (+210ms phone); rows start 90ms apart on desktop. A settled card mounts with `wdland` (drop in from −9px over 260ms) and a 700ms brass `box-shadow` flash. Rerolls are refused while the row is still spinning.

### 5.2 Battle
Bars: `transition: width 700ms ease, background 400ms ease`. Beat content: 240–260ms fade-and-rise. Play mode advances every 1.6–1.7s and stops at the result.

### 5.3 Everything else
No hover-only affordances. Selection changes are instant. No page transitions beyond a plain push.

## 6. Narration — the templates the engine must produce

The prototype's lines are hand-written for one battle (seed 1147, Ashoka vs Chabrias, plains, battle seed 11). Ship them as templates in `recap.ts` so every battle reads like this. Every `ContestRecord` already carries `topA`/`topB`, `edge`, `winner`, and the round carries `events[]`. Voice: second person to the player ("your longbows"), his side by name, past tense, one or two sentences, no numbers except cohesion fractions. Never "A wins the left front by 0.18".

| Beat | Template (fill from the records) |
|---|---|
| Skirmish | "Your **{topA on your best wing}** open on {his wing(s) with no shooters ? 'both his wings and find nothing shooting back' : 'his left'}. In the centre {his skirmish > yours ? 'it runs the other way: his **{topB centre}** pour it into a line you brought no bows to' : 'your **{topA centre}** answer'}." |
| Contact | "The lines meet. **{topA L}** {win/lose} the left, **{topA R}** {win/lose} the right, and the centres {edge < 0.1 ? 'come out almost even' : '{winner} by {a lot / a little}'}. {any shaken ? '**{front}** is shaken.' : 'Nobody is shaken.'}" |
| Press n | Lead with the biggest edge of the round: "{N} against {M} in the centre starts to tell, and your **{topA C}** give ground." / "Out on the wings your horse is winning, slowly." Close with the front nearest its threshold: "His left is close to done." |
| Break | "{Both/His left/His right} {go/goes} in the same round. **{units}** leave the field, and your {wing(s)} {is/are} free. Your centre is at {fraction, in fifths} of its cohesion, and holding." |
| Roll-up | "{Two free wings wheel inward / Your left wheels in}. Your right is held but marks his centre flanked; your left lands. Carrying {broken wings} and {n} flank marks, {his} centre folds and the army routs." |
| Result | Headline from the decisive beat: "Both wings came back in, and his centre had nothing left to turn to." Losing versions must exist for every template. |

Keep the short chronicle too (one clause per beat) — it feeds the Result screen and the desktop rail.

## 7. The share card

Monospace, five lines, no unit names (the board is the daily's spoiler), copied as text:

```
Warlord Draft · 16 Sep · 1147
me   2 | 4 | 2   Ashoka
him  1 | 6 | 1   Chabrias
both his wings gone by press 3
routed press 4 · 11% lost
```
Line four is the decisive beat's short clause; line five is `{outcome} {beat} · {losses}%`.

## 8. Engine binding (from `src/api.ts`)

```
const engine = createEngine({ units, generals, cultures, rules });   // fetched from data/*.json
let s = engine.startDraft(seed);            s.generalPool → 3 ids
s = engine.pickGeneral(s, i);               s.rows[8] → { slot, culture, cards[{unitId,onClass}], pick }
s = engine.pickCard(s, row, card) | engine.unpickRow(s, row) | engine.rerollRow(s, row)
engine.summarize(s) → { cultureCounts, traitLevels, eliteUsed, eliteCap, totalCost, picksMade }
engine.validate(s)  → string[] (empty when the army is legal — show these, never block silently)
s = engine.setPlan(s, plan); s = engine.setDeployment(s, ['C','C','C','L','R','L','R','C'])
const army = engine.toArmy(s); const run = engine.toRunString(s);   // v=2&d=…&g=…&p=…&r=…&plan=…&dep=…
const foe = engine.aiDraft(foeSeed, 'greedy');                      // foe.deployment is set by the bot
const result = engine.resolve(army, foe, terrain, battleSeed);     // rounds[], fronts{A,B}, casualties, recap[]
engine.replayDraft(run) → { state, army }                           // for "Replay a seed" and shared links
```
Ignore `Card.penalty` / `Card.wrecked` and `BattleResult.phaseLog` — they are v1. The daily = one fixed `(seed, foeSeed, terrain, battleSeed)` per date, served to everyone.

## 9. Open items — decide before or during the build

1. **Resume state.** A run interrupted at row 5 must come back to row 5. Today's card should read "Resume — row 5 of 8"; every screen is a resume point. Undrawn.
2. **The first beat is too heavy** (`DECISIONS.md` §25 agrees). Both of his wings take the capped 0.48 before anyone moves. Either the engine lowers `fronts.weights.skirmish`, or the UI plays the skirmish as narration over the morale bars and holds the contest cards until contact.
3. **Frontage and reserves are invisible.** Six in a centre fight as six against four only up to `frontage` (1.5×); the rest stand at `reserveMult`. Nothing on Deploy says so. Proposed: a `2 IN RESERVE` tag on a front that out-numbers the likely opposite front.
4. **A ghosted guess at his deployment** on the Deploy screen (`aiDeploy`-style, marked as a guess) would turn deployment into a bluff instead of arithmetic. Not drawn; needs a design decision on whether the daily should help that much.
5. **Share card colour.** No emoji is the decision; whether to render coloured blocks (image share) alongside the text is open.
6. **Desktop draft board** keeps all eight rows visible; the phone does not. Accept the divergence, or make desktop a wide one-row-at-a-time. Current canvas assumes the former.

## 10. Build order

1. Shell + tokens + progress bar + tab bar. Fonts loaded once.
2. General → Draft → Board sheet against a real `DraftState`, with §4.1–4.3 and the reel (§5.1). Acceptance: the consequence line is correct for every card on seed 1147 after any sequence of picks, and elite-capped cards are disabled.
3. Deploy with live cohesion (§4.4) and doctrine; acceptance: the three thresholds for `CCCLRLRC` on plains, defensive, match `resolve(...).fronts.A` to two decimals (0.95 / 1.02 / 0.94).
4. Battle stepper from `rounds[]`; acceptance: front bars end where `fronts[].damage / threshold` says, morale ends at `moraleFraction`.
5. Narration templates (§6) in `recap.ts`, then Result and the share card.
6. Today, daily seed service, resume state (§9.1).
