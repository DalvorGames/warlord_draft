# Warlord Draft — UI handoff v3

*Returned from the design session of 2026-09-16 against the brief in `UI-HANDOFF-V3.md`. Companion to
`../ui-handoff-v2/UI-HANDOFF.md`, whose visual system (§2) still stands and is not repeated here except where v3
changes it. Designed against the gameplay plan in `design/gdd/traits.md`, `campaign.md`, `draft.md` and
`deployment.md`, none of which is built yet: the mocks show the game as it will be.*

**The design:** `design/` beside this file — `canvas.json` is the artboard index, one `<name>.dc.html` per screen
(`design/README.md` says how to read one); `renders/` has every artboard as a 2× PNG.
The same screens are live on the Design canvas at `https://claude.ai/artifact/XwCoVMGv3X69LmqUic67Cs`. Rows,
top to bottom: **1 Today to the draft · 2 Deploy in four states · 3 Battle to Result · 4 Rules and Numbers ·
5 Components · 6 Tokens.** Every phone artboard is 390×844 unless it scrolls (Between 1180, Result 1320–1460,
Rules 1900, Numbers 2500); the pinned footer is drawn at the foot of each. CTAs link screen to screen in Play.
Real data throughout is the captured run (Epaminondas of Greece against Alexander III of Macedon on hills, lost at
battle one). Between and Result · win are illustrative: they show the same run as if battle one had been won.

---

## 1. Decisions taken in this pass (do not reopen)

The v2 decisions (§1 there) stand, minus doctrine. Added:

1. **The enemy lives on Deploy** as an always-visible row (his general's name and his eight tokens) and a sheet
   over Deploy for his trait words, his read and his full cards. The Roster page is gone. His shape is never
   drawn; Scouts is the only exception and gets its own slot (§3.5).
2. **Tokens are class shapes with a culture foot.** Six geometric marks: bar (line), wedge (shock), chevron
   (cavalry), arrow (ranged), three dots (skirmish), diamond (special). Culture bright on the 3px foot edge. Grade
   is a lightness tick top-left, plus the letter top-right from 48px. **Yours are filled, his are outlined**, on
   every surface.
3. **Strength, not morale.** Both armies show a bar that drains from full, worded FIRM · STEADY · BRITTLE ·
   ROUTED. Display only (§4.5). Yours is solid and on the left; his is hatched and on the right.
4. **No "best pick" tag.** The draft helps the player compare (loud stats, a bar on a shared scale, the delta to
   the row's best) and never names the answer.
5. **The handicap is a small signed number** (`HANDICAP +3`) on the general card and in the result headline,
   glossed once the first time. A traitless card carries "No traits" and one sentence that makes it the bold pick.
6. **Rule traits look different from scaling traits**, subtly: a small diamond before the word and a dotted edge.
   Levels are a numeral after the word (`Steady II`). No percentages anywhere but Numbers.
7. **The draft delta is a short bar on a shared 0–100 scale** under each loud stat, with a bone tick at the row's
   best and `−12` / `best here` beneath. Typed rows have fixed loud pairs; **flex rows take theirs from what the army
   lacks**, stated in the row hint.
8. **The line reveal shows tokens, front for front, as three bands.** Your left against his right, center against
   center, your right against his left, each band your tokens on the left, `VS`, his on the right, with the
   state word (BROKE) beside the front it belongs to. Used as the last beat (30px tokens), on Between and Result
   (36–40px).
9. **The plan picker is one row** (`PLAN · Envelopment ›`) that expands a card underneath: what a plan is in one
   line, then four options with one consequence sentence each and who each suits. No multipliers. It can be
   removed by deleting one row.
10. **The rewarded reroll has no moment of its own.** The reroll control reads `Reroll · 2` over `+1 FREE FOR ALL`;
    Today says "2 rerolls, plus 1 free for everyone".
11. **The three face-down cards on Today stay**, as a small labelled tease: "Three generals are waiting. They turn
    over when you start."
12. **Type floor: no informational text under 11px.** Mono labels are 11px with 0.14em tracking (v2 had 7–9px).
    `#6F6858` is no longer used for anything that carries game state.
13. **Hue never carries a fact alone.** Yours/his is also position (left/right), fill (solid/hatched, filled/outlined)
    and a word. Grades are achromatic. Cohesion, strength and edge are words first.
14. **Explanations live behind a tap, and never cover what is being decided.** Every trait chip, stat label,
    cohesion word, culture count and the handicap mark opens one sentence with a link to Rules. Inside a fixed
    board (the pitch) it is an **info bubble**; anywhere content can grow (cards, rows, sheets) it is an **inline
    note** that opens under the tapped thing and pushes the rest down. The long-form chip (word + sentence)
    appears only on Rules. Cards carry words, not paragraphs.
15. **Air is a rule.** 20px gutters, 12px between sections, 14–16px card padding, 12–14px between cards. A draft
    card shows its two loud stats large and the other four as one quiet line. A general card is name, chips, four
    thin bars, one bottom row. Three general cards and three draft cards fit above the pinned footer; the rest
    scrolls under it.

## 2. Visual system: what v3 adds to palette v2

Tokens, fonts, culture colours and grades are exactly v2 §2. Additions:

| Thing | Spec |
|---|---|
| Label | IBM Plex Mono 11px, 0.14em, uppercase. `#9A9384` on ground (≈6:1); `#B3AC9C` when it carries state |
| Body | Plex Sans 12–13px on cards, 14–15 for names; serif 26–30 for screen titles, 18 for a beat, 21–28 for a general |
| Token 52 | bench. 8px radius, `#1F1C17` fill, 1px `#4A453C` border (2px bone for S/A, 2px rust when held), 3px foot in the culture bright, glyph 22px bone, tick 6×6 top-left in the grade fill, letter 11px mono top-right |
| Token 44 | pitch and the enemy sheet. Same, no name under it |
| Token 34 | enemy strip. Outlined glyph, tick, no letter |
| Token 24 | battle front strip. Shaken = dashed border and dim glyph; broken = rust glyph, a rust strike, 55% opacity |
| Trait chip | Plex Sans 12px 500, 3px radius, 3×8 padding. On: `#2C2822` fill, `#4A453C` edge, bone text. One away: no fill, dim text. Off: `#3D3830` edge, faint text. Rule traits: dotted edge and an 8px diamond before the word |
| Strength bar | the scoreboard: 14px, track ground, fill in the army's culture bright; his hatched with a 135° stripe every 7px and filling from the right so it drains toward the outside. The word sits **inside the fill** at its outer end (bone on a `rgba(16,15,12,0.72)` pill) when the fill is 45% or more, else just outside it in the track (bone / dim / rust by word) |
| Contest row | one 8px bar: your share solid from the left, his hatched to the right, a 2px ground tick at 50%; then the word and the signed percent |
| Key beat | a callout inside the beat card: `#2C2822` fill, 2px left edge — bone for a trait, rust for a break or the end — a diamond (trait) or dot (event) before the label |
| Sheet | `#1F1C17`, 14px top radius, 1px `#4A453C` top rule, grab handle, `0 -12px 40px rgba(0,0,0,0.55)`; the screen behind stays at 30% |
| First-time hint | one line, `#2C2822` fill, 2px rust left edge, an × to dismiss. Shown once per rule per device |
| Handicap mark | mono 11px `HANDICAP` + 13px 600 number, 1px `rgba(242,236,221,0.35)` edge, on the culture fill; a button that opens its bubble |
| Expanding card | a card that opens under the thing tapped (unit card under the bench, plan card under the plan row): `#1F1C17` fill, 1px `#4A453C` edge, 8px radius, 14px padding, rises 240ms, an × top-right. The page grows and scrolls under the pinned button; one open at a time. For anything longer than a bubble's sentence |
| Inline note | opens inside a card under the tapped chip, label or line: `#16140F` fill (`rgba(16,15,12,0.35)` on a culture fill), 2px `#4A453C` left rule, 3px radius, 8×10 padding, title 12px 600, sentence 12px dim, `More in Rules ›`. Rises 200ms. The tapped chip gets a 1px bone ring, a tapped stat label a dotted underline |
| Matchup ring | on Deploy while a unit is held: his tokens the unit is favoured against get a 2px bone ring, those that beat it a 2px rust ring, from `rules.matchups` (both directions, ≥ 1.1 or ≤ 0.9); a legend under the tokens counts them |
| Ghost slot | an empty front shows one dashed 48px slot with a dash in it, and NOBODY in `#9A9384` until the first unit is placed anywhere; after that an empty front turns to the rust NOBODY |
| Info bubble | `#2C2822` fill, 1px `#4A453C` edge, 8px radius, 10×12 padding, `0 10px 30px rgba(0,0,0,0.5)`; a 10px caret under the tapped element; title 13px 600 bone, one sentence 12px dim, `More in Rules ›` 11px link. 240–260px wide. One open at a time; a tap elsewhere closes it |
| Stat label (draft) | mono 11px bone with a 12px ⓘ ring; the pair is a 44px button. Value 20px mono 600 white, delta beside it, 6px bar under |
| Text on a culture deep fill | **bone**, never the bright: measured, the bright on its own deep is 3.1:1 for Rome and 4.0–4.3 for Macedon, Carthage, Gauls and India. The bright stays on the border and as text on chrome (4.7–10:1) |
| Grade chip (draft card, sheets) | S and A filled with ink text as v2; **B, C and D outlined** with `#C4BDAC` / `#B3AC9C` / `#9A9384` text, because ink on the B fill measures 4.3:1. The token tick keeps the v2 fills, it carries no text |

## 3. Screens

```
Today ─▶ 1 General ─▶ 2 Draft (×8 rows) ─▶ 3 Deploy ─▶ 4 Battle ─▶ Between (win) ─▶ 3 Deploy …
  │                      └─ Board sheet        └─ Enemy sheet        └─ Result (loss / win) ─▶ Today
  └─ RULES ◀─▶ NUMBERS ◀─ the ? on General and Deploy
```

### 3.1 Today (`Main`)
Date as the title. One card: the three face-down cards with "Three generals are waiting"; the three foes as rows
(name, culture in its bright, trait chips, ground, a three-step tier bar and a word: "a light army", "a full
army", "at full strength, the hard one"); the muster line; the bone button. Below: THE LAST FIVE as five cells
(W/L over the shape), STREAK, and THE LADDER in words before it exists. Tab bar TODAY · RULES.
States (copy only, one artboard): first visit as drawn; run in progress → the button reads "Resume — battle 1,
setting the line"; daily done → the headline replaces the button and the share card sits under it; loading →
"Turning over today's board…" in the card, never a blank; corrupt save → "Yesterday's run could not be read. Start
today's." Remove the dead "Free run" / "Replay a seed" until they work.

### 3.2 General
Three cards, auto-flip kept. Each: culture label, serif name, italic note; up to three **short trait chips**
(a tap opens the bubble with the sentence: drawn open on Epaminondas' Oblique order); four thin stat bars; a bottom
row with the elite count and the handicap mark (a tap opens its gloss). The Take control is the check circle. The
picked card gets a bone edge and a filled check. Footer: the CTA alone, pinned. Resumed: cards already up, no
flip. A general with no traits: the chip reads "No traits" beside "The bold pick."; the bubble says why.

### 3.3 Draft row (`Draft-Line`, `Draft-Flex`)
Header `ROW n OF 8 · LINE`, progress, `Board`. Row header: a serif question ("Who holds the center?"), one line
naming the loud stats, and the reroll control (`Reroll` over `3 LEFT · 1 FREE`; at zero it disables and says "No
rerolls left"). **No row culture.** Four cards, each: 44px token, name, grade chip,
`CLASS · subtype`, its own culture in its bright; **the two loud stats side by side** (label with ⓘ, 20px value,
delta, a bar on the row's shared scale with a tick at the row's best); **the other four as one quiet mono line**;
the consequence line. Tapping a stat label or the consequence line opens a bubble (drawn open on both draft
artboards). Elite-capped cards stay focusable at 60% and say why. Footer: one line `ELITE 0 / 2 · TAKEN 1 / 8 ·
GREECE 1 OF 4`, then the CTA. Three cards fit above the footer; the fourth scrolls under it.

### 3.4 Board sheet
A true sheet over the row. Eight rows grouped by slot (LINE, LINE, CAVALRY, RANGED, FLEX ×4), each pick as token,
name, class and its own culture, grade; the current row ruled in rust; empty rows dashed. Below, the **trait
tally**: every trait in play as a chip (on / one away / off) with its source ("Epaminondas · Rome 1 of 4",
"Greece 3 of 4 · one more unit").

### 3.5 Deploy (`Deploy-Empty`, `-Held`, `-Ready`, `-Sheet`) — the board is the screen
Modelled on lineup and chess boards (Duolingo Chess, theScore and FotMob lineups): the pitch is the hero, the
opponent is a row of pieces above it, your pieces sit below it, and words wait behind a tap. Top to bottom, 14px
gaps, nothing scrolls:
1. Header `BATTLE 1 OF 3`, back, `?`.
2. **Enemy row** (one link, ~90px): his name in serif with "of Macedon", a chevron, and his eight 36px outlined
   tokens. **Nothing else** — until a unit is held: then his tokens ring bone (the held unit is favoured against
   them) or rust (they beat it) and a one-line legend counts them. Reading the roster becomes a glance. His traits with their sentences, his one-line read and the matchup line all live in
   the enemy sheet (a change against decision 1 of the brief, taken with the designer on 2026-09-17: the row shows
   pieces, the sheet shows words).
3. **The pitch** (250px): a `HILLS ⓘ` chip (its bubble carries the two ground clauses) and `YOUR SHAPE 2 · 4 · 2`;
   three fronts with only their name, the cohesion **word** (its bubble carries the number and what fixes it;
   drawn open on Ready, placed below the tokens) and 48px tokens. **Before anything is placed** each front shows a
   ghost slot and a quiet NOBODY, and one line sits under the fronts: "Tap a unit below, then tap a front. Wings
   want speed; the center wants steady." Once the line is partly built an empty front turns rust. Holding a
   token, the other fronts show the dashed "Place on the left" button.
4. **Your general's row**, directly under the pitch, mirroring the enemy row above it: "Epaminondas of Greece"
   and his traits as chips. **A line-dependent trait's chip reads its state from the line**: Oblique order is
   `off` while no single front is heaviest (drawn on Empty, with its bubble open: "not on yet") and `on` once one
   is; Volley would count the shooters in the center the same way. Deep ranks is always on. This replaces the
   trait note that used to sit inside the pitch.
5. **The bench**: eight 52px tokens in two rows of four, **no names** (the token carries class, culture and grade;
   the unit card has the name).
6. **The unit card** (`Deploy-Held`): tapping a token opens a card **under the bench** and the page grows; the
   button stays pinned and the middle scrolls. Token, name, grade, class and culture, an ×; the six stats in a
   3×2 grid with the keys that count for the unit's natural front lit; the fit sentence (v2 §4.6, unchanged); "If
   placed: Left Brittle · Center Steady · Right Brittle"; the matchup sentence ("Favoured against his Libyan
   Veterans, Immortals. Beaten by his Massagetae Cataphracts."); "Bench it" when the unit is already placed.
   Tapping the token again, the ×, or a front closes it. One card at a time.
7. **The plan** (`Deploy-Plan`): one row, `PLAN · Envelopment` with **its fit line** under the name ("Wants heavy
   wings; your center is heaviest."), computed from the line (§4.12). Tapping it expands **the plan card
   underneath**: one line on what a plan is, then the four options, each with its consequence sentence, who it
   suits, and its fit line for this line in bone; the chosen one ruled in rust with CHOSEN. The chevron turns
   down while it is open.
8. **The pinned CTA**: "8 still on the bench" (disabled, says why) → "Give battle".
The rule: **fit on one screen when nothing is open; expand down when something is.** Deploy · empty carries about
70 visible words. The two expanded artboards are drawn taller than a phone to show what scrolls.
**Scouts slot:** when your general has Scouts, a dotted bone row sits between the enemy row and the pitch:
`SCOUTS · His right is heaviest: three units.` Persistent (component sheet).
**Enemy sheet:** opens over Deploy from 60px down; the general in his culture fill with short trait chips (a tap
opens the bubble, drawn open on Hammer and anvil) and four stats; THE READ (his one-line read, then the matchup line: "He has two heavy horse. Your spears, the Camp Guard and
the Roman Hoplites, are favoured against them wherever they meet."); HIS EIGHT as rows of token, name, class,
culture, grade and six stats. Close returns to the line as it was.

### 3.6 Battle (`Battle-First`, `-Mid`, `-Trait`, `-Reveal`)
Pinned header: the two **strength bars** with names and words and the **front strip** (three cells: your 24px
tokens over his, a state word: HOLDING · SHAKEN · BROKE · FLANKED · HE BROKE). Then the feed, newest beat at the
top. **One feed, no Key / Every toggle** (decided with the designer on 2026-09-17: a battle has six to eight beats,
too few to split). A beat: stage label in the gutter, serif narration, an optional **key callout** (a trait or
event, or a break), then one contest row per front with the word and the percent. Pinned controls: Play / Pause and
Next beat. The **last beat is the reveal**: `THE FIELD IS HIS`, "The
curtain comes back. This is the line he set.", the line reveal at 30px tokens, one sentence on what it teaches, and
the CTA becomes "See the result".

### 3.7 Between (after a win)
Headline from the decisive beat, three tiles, the chronicle (one clause per beat, key beats in bone, traits named
in brackets), the line reveal, then the **next foe** as a card in his culture fill: `BATTLE 2 OF 3 · HARDER: A FULL
ARMY`, name, note, long-form traits, ground in words. CTA "Set the line for battle 2".

### 3.8 Result — loss and win differ
**Loss** leads with `THE TURNING POINT` and the sentence, then the trait that decided it as a chip in the subline,
the chronicle, **the line reveal at 40px** with one sentence on *why* ("A wing that shoots and cannot hold is a
wing he can carry.") and never what to do instead: the game explains, it does not solve; the four tiles, the
ladder in words, the share card. **Win** leads with "Conquered with Epaminondas, handicap +1." and the handicap sentence, four tiles
(HANDICAP is one), the three battles as rows, the last battle's line reveal (tap a battle for its own), the ladder,
the share card. Both: pinned "Share the result" + RUN, then "Back to today" and "New free run".

### Headers, everywhere
One style: a back arrow on the left that always returns to the previous step (Deploy → the last draft row; the
report has none), a mono title, and at most one text link on the right (`Numbers`, `Board`, `Skip`, `Rules`,
`Replay`). No icon buttons, no circled `?`.

### 3.9 Rules (390×1900)
Four numbered cards with diagrams made of real components (mini general cards with trait chips and handicaps; the
2-1-1-4 board; three fronts with class glyphs; the stage chips and two strength bars). Then CULTURES & TRAITS as the
3×3 grid: culture, trait word, one clause, no numbers. Then GENERALS' OWN TRAITS: six long-form chips. Then the
ladder sentence. Footer: "What each number means" · "Play today's board".

### 3.10 Numbers (390×2500)
Sentence-then-formula cards for the four general stats (Supply now documents both jobs) and six unit stats (copy
carried from v2, derived from `resolveFronts.ts`); grades; the **trait table** with the hook and the I / II / III sizes
from `traits.md` §4.1; the four rule traits; STRENGTH AS SHOWN with its formula; THE HANDICAP. Two placeholders are
marked `[SIZE OPEN]` and `[FORMULA OPEN]`: the Supply rarity nudge and the handicap curve are not yet decided.

## 4. Rules the UI computes itself

### 4.1 The consequence line, v3
Per card, with `counts` = culture counts from current picks plus one for the general's culture, `c` = the card's
own culture, `after = counts[c] + 1` (or `counts[c]` if this row's pick is already this card):
```
elite and baseElite ≥ cap:   "ELITE CAP FULL — DROP ONE TO TAKE THIS"        rust, card at 0.6, aria-disabled
after == 4:                  "ROME 4 → DEEP RANKS"                            culture bright
after == 6:                  "ROME 6 → DEEP RANKS II"                         culture bright
after == 3:                  "ROME 3 OF 4 · ONE MORE FOR DEEP RANKS"          culture bright
elite:                       "ELITE 1 OF 2 · PERSIA 1 OF 4"                   bone
else:                        "ROME 1 OF 4 · 3 MORE FOR DEEP RANKS"            dim
```
Trait names from the culture's trait id. The general's own traits are counted into the level shown
(`→ STEADY II` when Fabius leads three Greeks and takes a fourth).

### 4.2 Loud stats and the delta
Typed rows: LINE → FIGHT, STEADY · CAVALRY → SPEED, FIGHT · RANGED → SHOOT, SPEED. Flex rows: from what the army
lacks, in this order — no ranged unit yet → SHOOT, SPEED; fewer than two wing units → SPEED, FIGHT; fewer than
three center units → FIGHT, STEADY; else CHARGE, FIGHT. The row hint states the reason. For each loud stat,
`best = max over the four cards`; the bar is `value%` of a 0–100 track, the tick at `best%`, the caption
`best here` or `−(best − value)`. The best card's bar is its culture bright; the others' are `#9A9384`.

### 4.3 Trait tally (Board sheet)
For every trait with a source in this army: level = general's copies + (culture ≥ 4) + (culture ≥ 6), capped at III.
State on if level ≥ 1; one away if some culture count is 3 or 5; else off. Caption: sources joined with `·`.

### 4.4 Cohesion
Unchanged from v2 §4.4. Show the **word only**; the number appears on tap for one beat, as `BRITTLE 0.90`.
Ground multipliers apply to effective discipline as the engine does. Line-dependent trait chips in your general's
row: Oblique order `on` when exactly one front holds the most units, else `off` (bubble: "needs one front heavier
than the other two"); Volley `on` when at least one shooter stands in the center, else `off` (bubble: "wants
shooters in the center: n there now").

### 4.5 Strength, as shown
`strength = 1 − morale / routLevel` (the resolver's `R.routLevel`, 0.80 today), clamped 0–1. Word: ≥ 0.67 FIRM · ≥ 0.34 STEADY · > 0
BRITTLE · 0 ROUTED. The engine value is untouched and still shown on Numbers.

### 4.6 Edge words
`edge` from the contest: 0 → "even"; |edge| < 0.12 → "yours, narrowly" / "his, narrowly"; ≥ 0.30 → "yours,
clearly" / "his, clearly"; else "yours" / "his". Always followed by the signed percent in faint mono.

### 4.7 Front strip states
Per front pair, in priority: BROKE (yours) · HE BROKE · FLANKED (a broken neighbour has wheeled in) · SHAKEN ·
HE'S SHAKEN · HOLDING. Token states follow: shaken = dashed, broken = struck.

### 4.8 The foe tier
From the foe army-cost band in `campaign.md`: battle 1 "a light army", 2 "a full army", 3 "at full strength, the
hard one". On Deploy: `THE LIGHTEST OF THE THREE` · `THE MIDDLE ONE` · `THE HARD ONE`. On Between: `HARDER: A FULL ARMY`.

### 4.9 The handicap
A published integer per general per data version, from measured win rate (Campaign §3.4; curve open). Shown as
`+n`; `+0` is shown, never hidden. The gloss, once: "A weaker general is a handicap you choose: among equal
results, the run with the bigger handicap ranks higher."

### 4.10 Matchups: rings on Deploy, the line in the unit card and the sheet
For the held unit `a` and each of his units `b`: `edge = matchups[a.sub][b.sub or b.class] / matchups[b.sub][a.sub or a.class]`
(missing entries are 1). `edge ≥ 1.1` → bone ring, "favoured"; `edge ≤ 0.9` → rust ring, "beaten"; else no ring.
The unit card lists both sets by name.

### 4.12 The plan fit line
One sentence per plan, from the current line; "Set your line to see the fit." while nothing is placed.
```
Aggressive:   center ≥ 4                       → "Your clash is strong: a loaded center."
              else                             → "Your clash is ordinary; breaking sooner costs you more than it gives."
Defensive:    any front BRITTLE                → "Your {front} is brittle; standing longer helps it least."
              else                             → "Your fronts are steady; standing longer suits them."
Envelopment:  max(left, right) ≥ center        → "Your wings are heavy: this is their plan."
              else                             → "Wants heavy wings; your {heaviest} is heaviest."
Skirmish:     shooters ≥ 3                     → "You have {n} shooters, {m} on the wings."
              else                             → "Few shooters: the softer clash costs more than it gives."
```
Shooters = ranged units and horse archers. This is the evidence for whether the plan picker survives: if the fit
line is always "this is their plan" for the same choice, the plan is a lookup and can go.

### 4.11 The roster-level matchup line (enemy sheet, under the read)
From `rules.matchups` and his roster: pick the largest class group in his army that one of your subtypes counters;
"He has two heavy horse. Your spears, the Camp Guard and the Roman Hoplites, are favoured against them wherever
they meet." If nothing counters anything: "Nothing in your army is favoured against his. Win it on the line."

## 5. Motion
The reel (v2 §5.1) and the flip (§5.2) are unchanged. New: beat cards rise 240ms; strength and contest bars
`transition: width 700ms`; a sheet slides up 260ms from 60px down and the screen behind dims to 30%; a held
token lifts (rust edge, `#2C2822` fill) instantly. **`prefers-reduced-motion`**: the reel and the flip become
instant, bars snap, sheets appear. No pulse on key beats; the callout is static.

## 6. Narration — templates the engine must produce

Voice as v2 §6. Every trait that alters a contest gets a sentence at that beat, rendered as a key callout with the
trait as its label (`HAMMER AND ANVIL · HIS`):

| Trait | When | Sentence |
|---|---|---|
| Deep ranks | after each press round it acts | "Fresh ranks step up in the {front}: {side} line recovers a little." |
| Steady | first time a front survives damage it would have broken under | "{front} takes it and stands. Steady." |
| Hammer and anvil | at the wheel-in | "{wing} wheels in. Hammer and anvil: {units} turn into the center, and {units} take them on the flank." |
| Numbers | first press round it decides | "Weight of numbers tells in the {front}: {n} against {m}." |
| Mercenary captain | at the clash | "{foreign units} fight the harder for their pay." |
| Volley | at the skirmish | "{center shooters} pour it into the line: Volley." |
| Harass | at the skirmish | "On the wings {units} shoot and shoot again: Harass." |
| Terror | when a front is shaken by it | "{front} is shaken sooner than it should be. Terror." |
| Furor | at the clash; then when the decay first costs a round | "{units} hit like a wave: Furor." / "The fury is spent; {units} press weaker." |
| Envelopment | first press round a wing wins by it | "{wing} presses harder. Envelopment." |
| Oblique order | at the clash | "The loaded {front} hits harder at the clash. Oblique order." |
| Delayer | when a front would have broken in round 1 | "{front} should have gone. Delayer: nothing breaks before the second round." |
| Rally | when the first break is held | "{front} breaks — and holds. Rally: one more stage." |
| Master of ground | at the first ground penalty | "{ground} costs {units} half what it should. Master of ground." |
| Scouts | none in the report; it acted on Deploy | — |

Events, as key callouts with a dot: downpour "A downpour: the arrows fall short."; flank collapse "{front} gives
way; {units} spill into the {neighbour}."; pursuit "{units} ride down the broken and leave the field. {wing} is
free but empty."

**The turning point (loss).** The last beat with a break or a wheel-in on the player's side, in one or two
sentences, past tense, the unit named, the trait named if one acted: "Your left broke in round three. His
Massagetae Cataphracts wheeled into your center, and the line had nothing left." If nothing broke: "Neither line
broke. Yours had less left in it: {front} took the most and never recovered."

## 7. The share card
Unchanged in shape. Line two now carries the general and his handicap: `me   2 | 4 | 2   Epaminondas +1`.

## 8. What the UI needs from the engine
- Trait activations in `rounds[].events[]` with `{trait, side, front, units[]}` so beats can name them.
- Scouts: the seeded AI line's heaviest front (or the tie) before deploy.
- The foe's tier band per battle; the handicap per general in `generals.json`.
- The AI line, for the reveal, only after `resolve()`.
- `rules.matchups` exposed to the client for §4.10.

## 9. Mobbin references that shaped v3
Density and explanation on tap: a ⓘ beside a label and a speech bubble with a caret for the rule it explains
(Garmin Connect); a popover under the tapped control with a title and one sentence (Tabby); a tapped word defined
in a bubble at the foot of the screen (How We Feel); traits as plain pills with the description kept apart
(Family); compact rows that carry one name and two figures each (Formula 1 fantasy).
Newest-first match feeds under a pinned scoreboard with a Key / All toggle (Apple Sports play-by-play, FotMob
commentary, DAZN live updates); the key event as a filled callout inside the feed (Premier League goal card, MLS);
two lineups side by side on small pitches as the post-match teaching view (FotMob "Share lineup"); head-to-head
stats as bars on one shared scale with the delta beside them (Box Box Club, Hevy); a daily with the date, a one-line
read and the last days as a row of cells (The New Yorker "Today's Crossword").

## 10. Open items

From the design review of 2026-09-17, not yet taken (the rest of that review is in the artboards):
- **Foe tiers are a whisper.** Three-pixel bars and "a light army" will not register. If foes climbing is real, the
  third foe wants a heavier card on Today and `THE HARD ONE` in rust on Deploy. Waits on the campaign GDD.
- **Three reveals on a conquest.** Result · win shows only battle 3's line; a tab or three compact reveals.
- **Palette, at build:** lift Rome's bright and the B-grade fill one step (measured 3.1:1 and 4.3:1).
- **One source for trait copy:** Rules cells and the Numbers table must come from the same strings.

1. The Supply rarity nudge size and the handicap curve (marked on Numbers).
2. Whether the plan picker survives; it is one row to delete.
3. Between and Result · win are drawn from an illustrative win; retake them from a real conquest once foes climb.
4. The captured run has Alexander at battle one; under foe tiers he belongs at three. The Today mock words the
   climb by army band, not by fame.
5. Desktop: the enemy strip becomes a right column beside the pitch; the sheet becomes that column expanded.
6. A share image beside the text.
7. Two v2 palette pairs measured under 4.5:1 and worked around here rather than changed: the culture bright on its
   own deep (Rome 3.1:1) and ink on the B grade fill (4.3:1). If the palette is ever reopened, lift Rome's bright
   and the B fill a step.

## 11. Build order
1. Tokens (§2), chips, the type floor and the label token. Fonts loaded once.
2. General with traits and the handicap; Draft with per-card culture, loud stats and the delta (§4.1–4.2); Board
   sheet with the tally. Acceptance: consequence lines and deltas correct for every card after any sequence of
   picks on the captured seed.
3. Deploy re-ordered (§3.5): enemy row and sheet, the ground chip, word-only cohesion, the inspector as a bubble,
   the two-row bench, the plan row, pinned CTA. Acceptance: nothing pushes the CTA off an 844pt screen; the pitch
   never shrinks below 300pt with eight on the bench.
4. Battle: strength display (§4.5), front strip, newest-first feed, key callouts, the reveal beat.
5. Narration templates for traits and events (§6), the turning point, Result loss and win, Between.
6. Rules and Numbers from the artboard copy.
7. Today: foe rows with tiers and traits, the tease, last five, streak, ladder words.

## 12. Answers to the brief's §9
1. **Handicap:** a small signed number with a one-line gloss the first time. A traitless card says "No traits" and why
   that is brave. (Recommendation taken.)
2. **Rule traits:** yes, subtly: diamond mark and dotted edge; same chip otherwise. (Taken.)
3. **Draft delta:** a short bar on a shared scale with the tick at the row's best and a `−n` caption. (Taken.)
4. **Flex loud stats:** from what the army lacks, stated in the row hint and once in a first-time hint. (Taken.)
5. **Line reveal:** unit tokens, front for front, your left over his right. (Taken.)
6. **Plan picker:** collapsed to one line by default; expanded, four sentences. Removable. (Taken.)
7. **Rewarded reroll:** no moment; one line in the control and one on Today. (Taken.)
8. **Face-down cards on Today:** kept as a labelled tease. (Taken.)
