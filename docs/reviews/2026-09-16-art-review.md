# Warlord Draft — Art direction review

*16 September 2026. Reviewer role: art director / technical artist. Rubric: the nine art-bible sections (`.claude/skills/art-bible/SKILL.md`) and the asset-audit checks (`.claude/skills/asset-audit/SKILL.md`), applied to the v2 handoff (`docs/ui-handoff-v2/`), the phone mocks, and the client at commit `b31a9bb` (`apps/web/src`). Line numbers are from that commit.*

**Assumptions.** The v2 handoff is the spec of record; the mocks win where handoff prose and mock disagree only when the mock is the interactive prototype. The live site was not screenshotted; the review reads the code. Contrast figures are WCAG 2.x ratios computed from the token hexes; colour-vision figures are CIE ΔE after a Machado (2009) severity-1.0 protan/deutan simulation, so they estimate, not measure. Tailwind is v4 (`apps/web/package.json`), so `rounded-sm` = 4px, `rounded-md` = 6px, `rounded-lg` = 8px.

---

## Verdict: SERVICEABLE

The chrome is disciplined and the system underneath it is real: one warm-dark neutral ramp, a deep/bright pair per culture, achromatic grades, one accent, three typefaces with clear jobs. Nothing looks broken and nothing looks cheap. But almost all of the "classical antiquity" lives in the copy and the serif. Take the words away and every screen is a dark analytics dashboard: rounded panels, hairlines, mono labels, coloured bars. There is no emblem, no mark, no ornament, no material, no silhouette; the general "card" is a coloured rectangle with text, and a unit token is a letter in a square. The palette also has a real accessibility gap (culture pairs that collapse for red-green colour vision), the type scale drops to 7px mono labels and 2.7:1 text on several screens, and there is no reduced-motion path for a game whose draft is a mandatory 1.5-second slot machine. All fixable within a sprint, and the fixes below are ordered by how much theme they buy per hour.

---

## Top 5 findings

### 1. The theme has no visual carrier beyond type and copy
**Evidence.** `apps/web/src/app/general/page.tsx:83-89` — the face-down general card is a panel with an inset rule and the words "Warlord Draft" in Instrument Serif; the face (`:90-134`) is a deep-fill rectangle with a name, a note, four bars and three chips. `apps/web/src/components/deploy/Token.tsx:12` — a unit on the field is a 40px square with a grade letter; culture appears nowhere on the token (the 5px dot at `:18` is *class* tint, not culture). `apps/web/src/app/page.tsx:68-74` — Today's hero is three dashed boxes containing "?". `apps/web/public/` contains only `data/v2/*.json`: there is not one image, SVG or glyph in the project.
**Why it matters.** Pillar 1 of the art-bible rubric asks for a one-line visual rule that resolves ambiguity. Today the de-facto rule is "dark dashboard, warm neutrals, serif headline", which any fintech app satisfies. The nine cultures — the whole point of the draft — are told apart by hue alone.
**Recommendation.** Adopt one motif and commit to it: **the coin**. Classical antiquity's own portrait medium; cheap to produce consistently (two-tone, profile, no need for a likeness); survives at 40px. Concretely: (a) nine culture emblems as coin reverses (single-colour SVG, bone on deep, ≤ 6 KB each; Rome eagle/wolf, Macedon Vergina sun, Greece owl, Persia winged disc, Carthage Tanit sign, China *taotie*/halberd, India elephant, Steppe stag, Gauls boar); (b) general portraits as coin obverses (256/512px WebP, engraved two-tone, drawn or generated from one style prompt, §8); (c) the general card back becomes the emblem at 96px in `--raised` on `--panel`; (d) the unit token carries a 12px emblem in its corner and the field's faint centre circle (`deploy/[battle]/page.tsx:116`) becomes the ground's emblem. The serif stays the typographic voice; the coin becomes the visual one.

### 2. Culture colours collapse for red-green colour vision, and "your colour vs his" has no second channel
**Evidence.** `apps/web/src/lib/text.ts:20-30` (the nine brights) and `apps/web/src/app/battle/[battle]/page.tsx:56-58`, which only guards the case where both generals share a culture (`his.bright === mine.bright`), swapping his to `#b3ac9c`. Simulated ΔE between brights: **protan** car/mac 5.4, ind/stp 9.3; **deutan** car/grk 7.5, per/gal 8.6, ind/stp 11.6, car/mac 13.6, and rust `#D9633C` vs Rome `#E4574F` 8.4 (rust is "you are here", Rome is a culture — so a Roman held token and a Roman card edge are the same colour to ~6% of male players). Even with normal vision Persia `#38C7AC` vs China `#52C98A` is ΔE 19.5, two adjacent greens. The deeps are worse (car/mac 3.6, per/gal 3.2, rom/stp 3.8 deutan), which matters because the Rules page grid (`rules/page.tsx:145-156`) and the Between "next general" card use deep fills.
**Recommendation.** Keep the palette (it is coherent and the contrast work is good: every bright ≥ 5.27:1 on ground, bone on every deep ≥ 7.67:1) but stop asking hue to work alone. (a) In Battle, give *his* side a pattern, not just a colour: his bars get a 45° 2px hatch (`repeating-linear-gradient`) or a 1px bone cap on the bar end; keep the `YOU`/`HIM` labels, which already exist. (b) Put the culture emblem (finding 1) wherever a deep or bright fill is the only identifier: general card, token, Rules grid, Board sheet rows. (c) Shift two hues to open the tightest pairs without touching the rest: Persia bright from `#38C7AC` to a colder teal `#2FB5C4` (moves it off China without landing on Greece `#4FC0E6` — Greece then reads sky, Persia sea), and Steppe bright from `#C9C45A` to a paler straw `#D9D07A` (lifts it off India saffron under deutan). Re-run the simulation after; target no pair under ΔE 15 in either simulation. (d) Do not let rust share a screen with Rome as an *accent*: when the general or row culture is `rom`, the held-token edge and the current-step segment should fall back to bone.

### 3. The small type is below the floor the handoff set, and one grey fails contrast wherever it carries text
**Evidence.** Handoff §2.4: "labels 7–8px mono", §2.1: `#6F6858` "for hints, 11px+ only". Code: `components/draft/StatGrid.tsx:9` stat words at 7px, letter-spaced, on every draft card and roster row; `deploy/[battle]/page.tsx:135,180` 7px; `battle/[battle]/page.tsx:112,121,199` 7px; `Token.tsx:15` unit name at 9px in `--center`; `rules/page.tsx:152` `#E6DECB` at 9px with `opacity-75`; `page.tsx:123,127` 8px. `#5C5749` (not a token; 2.66:1 on ground, 2.36:1 on panel) is used as text in `battle/[battle]/page.tsx:136-137` ("BEAT" / "WHAT DECIDED IT"), `:121` ("HOLDING"), `draft/[row]/page.tsx:143` (the disabled reroll label) and `Reel.tsx:14` (grade letters on the strip). `#6F6858` (3.47:1) is used at 8–9px in at least eight places. The morale numbers (`battle/[battle]/page.tsx:87,101`) are 30px Instrument Serif, a proportional face, so `0.93 → 1.02` reflows every beat.
**Why it matters.** IBM Plex Mono at 7px has a ~3.6px x-height; at 390 CSS px on a 3× phone that is 11 device pixels for the six words the whole game asks you to read first. The stat words were the point of v2 ("stats are words, not codes"); they are currently the least legible text on the card.
**Recommendation.** Publish a type scale in `globals.css` and use it instead of 25 inline sizes: `--t-micro: 9px` (mono labels, `letter-spacing 0.12em`, never below), `--t-label: 10px`, `--t-mono: 12px`, `--t-body: 13px`, `--t-body-lg: 15px`, `--t-display-s: 22px`, `--t-display: 27px`, `--t-display-l: 30px`. Rules: `#6F6858` only at ≥ 11px; `#5C5749` never as text (make it `--rule-2` for hairlines); `#9A9384` is the floor for anything under 11px. Stat words go to 9px with `letter-spacing 0.08em`, values stay 14px. Set `font-variant-numeric: tabular-nums` on `.display` and use it for the morale figures, or set them in Plex Mono 26px 500 — the serif does not earn its keep on a number that changes every 1.6 s.

### 4. Spec-to-code drift in the small things that make a system feel like one
**Evidence.** (a) `lib/text.ts:6` `ARMOR` — the handoff, the mocks and the Numbers copy say `ARMOUR`; the whole spec is British (`centre`, `colour`) and the code is American (`CENTER` at `deploy/[battle]/page.tsx:17`, `rules/page.tsx:96`, `battle/[battle]/page.tsx:109`). Pick one; the serif-and-Plex voice reads as British. (b) `layout.tsx:30` `themeColor: "#14130f"` is the v1 ground; v2 is `#100F0C`, so the iOS status bar and Android chrome are a different black from the page. (c) Culture colours are not CSS tokens (`text.ts:20-30`); `--bad #D9724F` and `--link #E08A5F` exist in code and mocks but not in handoff §2.1, which says rust is the only warm accent and is used for "nothing else" — there are now three oranges (`#D9633C`, `#D9724F`, `#E08A5F`) within ΔE 10 of each other. (d) Grade C: handoff outline `#4A453C` / text `#B3AC9C`; palette sheet `#6A6456` / `#C4BDAC`; code follows the handoff. Grade F: handoff `#6F6858`, sheet `#9A9384`; code follows the handoff. Resolve the sheet. (e) Radii: handoff "chips 2–3px, cards 6–8"; mock draft card `border-radius: 4px`, mock counts are 3px ×25, 1px ×17, 4px ×14, 2px ×12; code uses `rounded-lg` (8px) on draft cards (`UnitCard.tsx:19`), reel wells and roster rows, `rounded-sm` (4px) on chips, `rounded-[3px]` on buttons, `rounded-[4px]` on the inspector, `rounded-md` (6px) on the field. Five radii on one screen. (f) Narration: handoff §3.5 "serif 19px"; mock Battle uses 13px sans for narration and serif only for the morale figures; code uses 15px serif for hot beats and 13px sans otherwise (`battle/[battle]/page.tsx:166`). (g) Hard-coded fills the spec does not name: `#33261A` selected card (`UnitCard.tsx:21`), `#191712` field, `#4A3228` / `#6B5636` front edges, `#2E2214` / `#2A1C15` / `#6B3E12` / `#6E3620` beat-card tints, `#2A2419` toggle, `#0C0B09` sheet scrim, `#E6DECB` on-deep text — 14 unnamed hexes across the app.
**Recommendation.** One pass: move every hex into `:root` with a name (`--field`, `--selected`, `--hot-you`, `--hot-him`, `--on-deep`, `--rule-2`, and `--c-rom-deep … --c-gal-bright`), then `@theme inline` them so Tailwind classes can use them. Fix the radius scale to three values and name them: `--r-chip: 3px`, `--r-control: 3px`, `--r-card: 6px` (the field and sheets may use 8px/14px). Fix `themeColor`. Choose a spelling.

### 5. No reduced-motion path, on a game whose draft is a mandatory 1.5 s animation
**Evidence.** `grep -r prefers-reduced-motion apps/web/src` returns nothing. `draft/[row]/page.tsx:41-63` schedules the reel on every new row (`520 + i×300` ms) and refuses picks and rerolls while `rolling` (`:96,100`); `general/page.tsx:29-33` auto-flips three 3D cards; `battle/[battle]/page.tsx:51-53` smooth-scrolls on every beat; `globals.css:88-109` defines five keyframes with no media guard.
**Recommendation.** Add to `globals.css`: `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }`. In `draft/[row]/page.tsx` `roll()`, if `matchMedia("(prefers-reduced-motion: reduce)").matches` set every phase to `2` immediately. In `general/page.tsx` flip all three at 0 ms under the same test. Keep the rust flash (it is a state change, not decoration) but shorten it.

---

## 1. Visual pillars — does it read as "classical antiquity warlord"?

**What carries the theme today.**
- Instrument Serif at 26–30px for headlines and names (`Three names. Take one.`, `Set the line`, the narration on Result). It is the one element that says "inscription" rather than "dashboard", and it is used well: only for the moment that matters on each screen.
- The copy voice (second person, past tense, "the field is yours", "give battle", "the bench", "his line is hidden"). This is doing most of the work.
- The warm-dark neutral ramp (`#100F0C → #F2ECDD`) reads as parchment-on-basalt rather than slate-on-black. Bone as the button fill is a good, unusual choice.
- Colour as culture. Once you have played twice, Persia is teal and India is saffron; that is a real, ownable convention.
- The pitch on Deploy (three fronts, a faint centre circle) is the only diagram in the game and the only place the *world* is drawn.

**What undermines it.**
- Everything else is dashboard grammar: rounded panels with 1px hairlines, four-up KPI tiles (`between/[battle]/page.tsx:58-72`, `result/page.tsx:88-102`), horizontal progress bars, a segmented control (`battle/[battle]/page.tsx:128-134`), a tab bar. None of it is wrong, but none of it is *of the period*.
- The general is the most important choice in the game and his card has no face, no emblem, no material. The card back reads "Warlord Draft" — the product's name on the back of a card is a placeholder.
- The unit is a grade letter. A Persian S-grade heavy cavalry and an Indian S-grade elephant are the same token.
- Today's hero is three dashed `?` boxes (`page.tsx:68-74`). It is the first thing a new player sees, and it says "loading".
- Small-caps mono labels everywhere (`THE BENCH · NOT YET ON THE FIELD`, `WHAT GETS SHARED`) are terminal, not lapidary. Letter-spaced Plex Mono is the voice of a dev tool. The serif has small-caps-like all-caps potential (`TODAY’S MUSTER` at `page.tsx:66` already tries it) that could take over the *section-title* role and leave mono for numbers and stat words only.

**Proposed one-line visual rule** (offered as the standard the rest of this review measures against): *"An inscription and a coin: everything is either carved type on dark stone or a struck two-tone emblem — never a photo, never a gradient, never a dashboard tile."* Supporting principles: (1) if a colour is the only difference, add a mark; (2) numbers are set, words are cut — mono for what is counted, serif for what is said; (3) the enemy is a pattern, not a colour.

## 2. Colour system

**Coherence.** Good. Nine neutrals in one warm hue family; the deeps are all near-equal in lightness (L* ≈ 20–30) so a wall of general cards looks like one set; the brights are all L* ≈ 65–80 so they all clear the ground. The palette sheet's claim "bone on deep ≥ 7:1, bright on ground ≥ 5:1" holds: bone/deep 7.67 (India) to 10.07 (Gauls); bright/ground 5.27 (Rome) to 10.52 (Steppe). Bright on *deep* (used for culture names on general cards, `general/page.tsx:96`) is 3.13:1 for Rome — below AA for 9px text; the others are 4.0–5.0. Use bone for the culture name on the Rome card, or lift Rome bright to `#EA6A62`.

**Distinguishability.** See finding 2. Normal vision: eight of nine are well separated; Persia/China is the weak pair. Under simulation the palette drops to roughly six distinguishable hues (protan) or five (deutan). The grades being achromatic is exactly right and should not change.

**Semantics.** The spec allows one accent. The code has: rust `#D9633C` (current step, held token, selected card edge, BRITTLE, rout), `--bad #D9724F` (empty front, "THE FIELD IS HIS", broken bars, morale at rout), `--link #E08A5F`. A player cannot tell rust-as-"here" from rust-as-"danger", and on the Battle screen "his" side, broken fronts, and rout all become the same orange while "your" side stays your culture — so a Roman player watches an all-orange screen. Recommend: rust = *you are here / you hold this* only (StepBar, held token, selected card, current row on the Board sheet). Danger/loss = **bone on a dark red-brown**, i.e. `--loss-bg #3A1A14` with bone text and a `#8C2F22` hairline, no orange text. Win = bone, always (`THE FIELD IS YOURS` in your culture bright is fine as a second voice). Warning (BRITTLE, elite cap full) = `--warn #E0B25A`? No — that collides with India and Steppe; use bone text on `--raised` with a rust *left edge* instead of rust text, so the accent rule holds. Links: drop `--link`; there are no inline links in the run.

**Deep/bright use vs spec.** Consistent where it exists: deep for fills (general card, roster header, Between next-card, Rules grid), bright for text and edges (row title, card left edge, stat bars in the inspector, battle sides). Two gaps: the Token has no culture at all, and the Result page uses `var(--dim)` for "HE LOST" (`result/page.tsx:92`) while Between uses his bright — pick his bright, the spec says "his in his".

## 3. Typography

**Roles.** Clear and correctly applied: Instrument Serif = the sentence that matters (one per screen) and names; Plex Sans = body and buttons; Plex Mono = every number, label and stat. The serif is loaded in italic too (`layout.tsx:9`) but italics appear only in the general's note (`general/page.tsx:105`) — good restraint; consider using italic serif for the narration's quoted unit names instead of bold sans, which does not exist in the mocks either.

**Hierarchy on 390px.** Display sizes match the spec (30/28/27 → `rules:51`, `general:55`, `deploy:104`). Body 12–15 matches. The trouble is below 10px (finding 3). Count of distinct inline sizes in `apps/web/src`: 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 22, 24, 26, 27, 28, 30 — seventeen, plus Tailwind `text-xs/sm/base/xl`. The mocks use 8px thirty times and 7px only four; the code has moved *down*.

**All-caps stat words.** `FIGHT SHOOT ARMOUR SPEED STEADY CHARGE` at 7px mono with `0.06em` tracking, six across in a 342px card = ~50px per column, of which the word takes ~28px. There is room for 9px. At 9px/0.08em `ARMOUR` is ~40px; still fits. Do not go past 10px or the six columns wrap on 360px phones. The general's `COMMAND TACTICS SUPPLY CHARISMA` at 7px with `opacity-70` (`general/page.tsx:113`) on a deep fill is the least legible text in the game; 9px, no opacity.

**Battle report line lengths.** The beat card text column is 390 − 36 (gutters) − 54 (beat rail) − 11 − 10 (padding) − 68 (morale figures) − 8 ≈ 200px. At 13px Plex Sans that is ~34 characters per line; a two-sentence beat wraps to 5–6 lines beside two numbers that take one. At 15px serif (hot beats) it is ~30 characters. Both are under the 45-character comfortable minimum. Recommend: move the two morale figures *below* the narration as a single mono line (`0.97 · 0.88`), which gives the text 268px ≈ 46 characters, and drop the beat rail's fixed 54px to 40px (`SKIRM`, `CLASH`, `P3` all fit in 40).

**Tabular figures.** Plex Mono is monospaced so mono numbers are fine; the serif morale figures are not (finding 3).

## 4. Shape language and components

**What exists.** StepBar (3px segments), RunHeader (52px, back glyph, mono label, `?` ring), PrimaryButton/OutlineButton (44px, 3px radius), GradeChip, StatGrid, UnitCard, Reel, Token, TabBar, BottomBar, and page-local chips (draft footer, general card chips, stage tags, plan pills, KPI tiles).

**Radii.** Five values in play (2/3/4/6/8 plus 14 on the sheet). The mocks are 3px-dominant with 1px on bars. The spec says chips 2–3, cards 6–8. Set three: `--r-chip 2px` (grade chip, class badge, stage tag, bars), `--r-control 3px` (buttons, pills, tiles, tokens' outer button), `--r-card 6px` (cards, panels, the field, the inspector). Tokens at 8px (`Token.tsx:12`) match the mock and can stay as the one deliberate exception — a token is an object, not a panel.

**Borders.** Consistent 1px `--rule` on cards and `--rule-btn` on controls, 3px culture left-edge on cards and the inspector, 2px on tokens and general cards. Good. The Board sheet uses `--raised` as a border (`board/page.tsx:60`), which is a fill token; use `--rule`.

**Spacing.** 18px gutters everywhere (correct, matches mocks). Internal gaps are ad hoc: 5, 7, 9, 10, 14, 15px paddings appear as `[…]` literals. Adopt a 4px scale with two odd exceptions the mocks need (18 gutter, 14 bottom): 4/8/12/16/18/24.

**Do they follow one system?** Mostly one *style* (flat, hairline, dark) but not one *system*: the general card, the Between next-card and the Rules culture cell are three hand-built versions of "deep fill + bright edge + bright mono label + serif name". Extract `CultureCard` (fill, edge, label, title, children) and `Chip` (tone: bone | culture | stage | faint). The KPI tile is built three times (`battle:191-205`, `between:58-72`, `result:88-102`); extract `StatTile`.

**Grade badges.** Correct to spec and the lightness ramp is readable: S bone, A `#BDB5A4`, B `#7E786B` (ink on B is 4.37:1 — fine for 12px bold), C/D/F outlined. The Token collapses B–F to `--raised` fill with bone text, so B looks like a C on the field while it is distinct on the card; give B its `#7E786B` fill on the token too.

## 5. Iconography

**What exists.** Text glyphs only: `←` (`RunHeader.tsx:11`), `×` (`result/page.tsx:69`), `✓` U+2713 (`UnitCard.tsx:32`, `general/page.tsx:102`), `?` in a ring, `·` separators, a 5px class dot, a 5px rust tip dot. No SVG anywhere. The arrows and check render in the system font, so they change weight and baseline per platform (the `←` is a different glyph on iOS and Android).

**What is missing.** Unit class (6: line, shock, cavalry, ranged, skirmish, special), front (L/C/R), terrain (4: plains, hills, river, forest — `rules.json.terrain`), doctrine (4), culture (9), and the control set (back, close, check, help, reroll, play, pause, skip, share, copy, board, roster).

**Recommendation for a no-artist budget.** Do *not* draw stat icons; the words are the design and six more glyphs would compete with them. Do build two small SVG sets, both drawn by hand or by prompt in the same rule set so they cannot drift:
- **Controls (12):** 20px grid, 1.5px stroke, round caps, `currentColor`, no fills. Inline `<svg>` via one `Icon` component with a `name` prop; total ≤ 8 KB.
- **Marks (6 class + 4 terrain + 3 front = 13):** 16px grid, *filled silhouettes* (not strokes — silhouettes read at 12px, strokes do not), `currentColor`. Class: a shield (line), a wedge (shock), a horse head (cavalry), an arrow (ranged), a javelin (skirmish), an elephant (special). Terrain: a flat line, two peaks, a wave, a tree. These replace the class dot on the Token, the class badge word on cards can keep the word plus the mark, and the terrain word on Today/Deploy gets its mark.
- **Culture emblems (9):** the coin reverses from finding 1, 24px grid, single fill, designed to sit inside a circle. These are the only "art" in this set and the only ones worth commissioning; everything else is a morning with a vector tool.
Rule: an icon is never the only carrier of meaning; the word stays beside it at ≥ 9px.

## 6. Motion

**What exists.** The reel (`Reel.tsx`, `draft/[row]/page.tsx:41-63`) is a faithful build of §5.1: loop, brake with overshoot, land, rust flash, top-to-bottom settle in 1.5s. The general flip (`general/page.tsx:81`) is 560ms with the spec's easing; note the flip cadence is `450 + i×650` (450/1100/1750) — matches. Battle bars transition 700/400ms (`battle:116,119`), beats rise 240ms (`:152`), Play advances at 1.6s. That is everything; there is no motion on Deploy (holding a token is a border change), none on Today, none on Result.

**Reduced motion.** None (finding 5).

**What small motion would add the most**, in order:
1. **Held token lift** (Deploy): `transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,.5)` 120ms, and the placed token lands with the existing `wdland`. Right now the most tactile act in the game has no physicality.
2. **Front break** (Battle): when `f.him.broken` flips, flash the bar bone for one frame then to `--loss` over 400ms, and shake the front tile 2px ×2. This is the game's biggest beat and currently a colour transition.
3. **Morale tick** (Battle): tabular figures with a 200ms colour pulse (bone → culture bright) on change; drop the smooth `scrollIntoView` in favour of an instant scroll so the number is where the eye already is.
4. **Cohesion word change** (Deploy): `FIRM → STEADY → BRITTLE` cross-fade 160ms so the player notices the consequence of a placement.
5. **Today's hero**: nothing animated, but replace the `?` boxes with the three foe emblems dimmed (or three coin backs); a static composition beats a loading affordance.
Keep §5.4: no hover-only affordances, no page transitions.

## 7. Spec vs implementation drift (register)

| Item | Handoff / mock | Code | Where |
|---|---|---|---|
| Stat word | `ARMOUR` | `ARMOR` | `lib/text.ts:6`, `numbers/page.tsx:18` |
| Spelling | centre / colour | CENTER / Center | `deploy:17`, `rules:96`, `battle:109`, `deployText` |
| Theme colour | `#100F0C` | `#14130f` (v1) | `layout.tsx:30` |
| Culture colours as tokens | palette sheet | JS object only | `lib/text.ts:20-30` |
| Accent count | rust only | rust + `--bad` + `--link` | `globals.css:16-17,28` |
| Grade C/F colours | sheet ≠ handoff | follows handoff | `lib/text.ts:45-47` |
| Chip radius | 2–3px | 4px (`rounded-sm`, Tailwind v4) | `GradeChip.tsx:7`, `UnitCard.tsx:36` |
| Draft card radius | 4px (mock) | 8px | `UnitCard.tsx:19`, `Reel.tsx:23` |
| Narration size | 19px serif (handoff) / 13px sans (mock) | 15px serif hot, 13px sans | `battle:166` |
| Stat label size | 7–8px | 7px | `StatGrid.tsx:9` |
| `#6F6858` floor | 11px+ | 8–9px | `page.tsx:123`, `rules:152`, `deploy:135` |
| Token B fill | `#7E786B` | `--raised` | `Token.tsx:7` |
| Result | rank card, pick-% | campaign summary (no ladder yet) | `result/page.tsx` — expected, backend absent |
| Today | 1 general, "ABOUT 3 MIN" | 3 generals, "ABOUT 6 MIN" | `page.tsx:91` — the campaign supersedes the handoff; update §3.1 |
| Progress bar | 4 run segments | 6 (`steps.ts`) | fine; document it |
| Unnamed hexes | 0 | 14 | see finding 4(g) |

Nothing here is a wrong *decision*; it is the tail of a redesign landing in one commit. A tokens-only PR closes the table.

## 8. Asset standards (proposal for the first illustrated assets)

**Folder layout** (under `apps/web/public/art/`, served statically; SVG marks may instead live in `apps/web/src/components/icons/` as components):
```
public/art/
  emblems/    emblem_<culture>.svg              (9)   single fill, currentColor, 24-grid, ≤ 6 KB
  portraits/  portrait_<generalId>_256.webp     (81)  256×256, ≤ 28 KB
              portrait_<generalId>_512.webp     (81)  512×512, ≤ 80 KB   (Result and desktop only)
              portrait_placeholder_256.webp     (1)   the blank coin
  terrain/    terrain_<terrain>_780x300.webp    (4)   ≤ 90 KB; the Deploy field ground
  marks/      mark_class_<class>.svg            (6)   16-grid silhouettes
              mark_terrain_<terrain>.svg        (4)
              mark_front_<l|c|r>.svg            (3)
  icons/      icon_<name>.svg                   (12)  20-grid, 1.5 stroke
  brand/      icon.svg, apple-touch-icon.png (180), og_1200x630.png
```
Naming follows the audit skill's `[category]_[name]_[variant]_[size].[ext]`, lowercase, underscores, `<culture>` = the engine key (`rom car mac grk per chn ind stp gal`), `<generalId>` = `generals.json.id` (`alexander`, `philip2`) so the audit can cross-check every general has a portrait and flag orphans.

**Formats.** SVG for anything single-colour (emblems, marks, icons): `viewBox` set, no `width/height`, no embedded styles, `fill="currentColor"`, run through SVGO. WebP for raster at quality 80; PNG only for `apple-touch-icon`. No JPEG (halos on two-tone art). No gradients in any asset (matches §2.4 "no gradients except the reel masks").

**Style brief for portraits and emblems** (so they can be commissioned or generated consistently): *"Struck coin, profile bust, two tones only: bone `#F2ECDD` relief on the culture's deep, no mid-tones, no outlines, engraved hatching for shadow, circular field with a 6% bevel ring, no text, no background."* Any generator or artist can hit that; likeness does not matter because coins never had it. Portraits are 1:1 and must read at 40px (the token) — test every portrait at 40px before accepting it.

**Budgets.** Per screen ≤ 250 KB of art on first paint (General = 3 portraits at 256 + 3 emblems ≈ 100 KB); whole art folder ≤ 4 MB at 81 portraits × 2 sizes; lazy-load 512s. Deliver portraits in batches by culture so the game can ship with 3 cultures illustrated and a placeholder coin for the rest — the placeholder *is* on-theme, which is the point of the coin.

**Existing assets.** `apps/web/src/app/favicon.ico` (25.9 KB, 16 and 32px, 32-bit) is the only asset; there is no `icon.svg`, no `apple-touch-icon`, no OG image, so the share link (§7) currently unfurls with no image. Add the three `brand/` files first; they cost an hour and touch every share.

## 9. Desktop

`Screen.tsx:5` caps the column at 480px on phones and 560px from `md`. On a 1440px display that is a phone in the middle of 880px of `#100F0C`. The handoff says desktop is "the same components laid wide", not a wider phone. Proposal, at one breakpoint (`lg`, 1024px):
- **Column** stays 560px for General, Draft, Between, Result — these are reading screens and the serif's measure is right at 560.
- **Draft** lays the four cards as a 2×2 grid inside 720px so all six stats are visible without scrolling; the Board becomes a persistent 280px right rail instead of a sheet.
- **Deploy** goes to 900px: the field 560 wide (fronts get real width for eight tokens), the inspector fixed on the right at 300px, the bench under the field. Drag and drop on the same tap path.
- **Battle** goes to 900px: the scoreboard (morale, three fronts) becomes a 320px left rail that stays pinned; beats scroll on the right at a 46–60-character measure.
- **Ground.** Empty ground on a wide screen is where the flatness shows. Add a single faint radial vignette on `body` (`radial-gradient(ellipse at 50% 0%, #17140F 0%, #100F0C 60%)`) — the one permitted gradient — and, once emblems exist, the player's culture emblem at 480px, 4% opacity, centred behind the column. That is the whole desktop art budget.
- Never widen a text block past 640px; never scale type up for desktop beyond the display sizes already used.

---

## First art sprint (ordered)

1. **Tokens PR**: every hex into `:root` with a name (culture pairs included), three radii, a type scale with a 9px floor, `#5C5749` demoted to a hairline, `themeColor #100F0C`, `ARMOUR`, one spelling. Zero visual risk, closes §7.
2. **Reduced motion**: the media block in `globals.css` and the two `matchMedia` early-outs (reel, flip).
3. **Nine culture emblems** as SVG coin reverses, on the general card back, the token corner, the Rules grid, the Board sheet rows, and Today's hero in place of the `?` boxes.
4. **Colour-vision pass**: hatch for *his* bars, Persia → `#2FB5C4`, Steppe → `#D9D07A`, bone fallback for rust when the culture is Rome; re-run the ΔE check.
5. **Brand files**: `icon.svg`, `apple-touch-icon.png`, `og_1200x630.png` (the coin on ground with the wordmark), so shares unfurl.
6. **Control and mark SVG sets** (12 + 13) through one `Icon` component; replace `←`, `×`, `✓`, the class dot.
7. **Battle layout**: morale figures under the narration, 40px beat rail, tabular figures, break flash.
8. **General portraits, first three cultures** (India, Greece, Rome — the prototype's pairing plus the most-drafted) at 256px from the coin brief; placeholder coin for the other six.
