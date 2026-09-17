# Warlord Draft — Design Plan v0.3

*Working title: **Warlord Draft**. Era 1: The Classical World, 400–200 BC.*

*Draft an ancient army. Sim the war. Share the upset.*

---

## 1. Concept

A free, browser-based, no-login draft-and-simulate game in the mold of Era Ball, but for ancient warfare. The player drafts a general and an army from the cultures of 400–200 BC, sets a battle plan, and watches a campaign of simulated battles play out with a narrated recap and a shareable result card.

**Why it's different:** Total War and Strategos are hands-on tactics; TABS/UEBS are physics sandboxes; Hannibal: Rome vs. Carthage is a two-player board game. Nothing combines *drafting across cultures* with a *stat-driven, watchable sim* and a *season structure*.

**Design pillars**
1. Every pick is a tradeoff, never a lookup.
2. Battles are explainable — you always know *why* you lost.
3. Results are shareable from a URL with no backend.
4. Historical first; reputation only to fill an S-tier gap.
5. Stay a stat sim. No map to click on.

---

## 2. Scope: one era, nine cultures

**Era window:** 400–200 BC. Wide enough for Hannibal, Scipio, Pyrrhus, Epaminondas, the Diadochi, Chandragupta, and the Qin unification generals; slow enough (ancient doctrine changes over centuries) to be one era. Every unit and general carries `period: early | mid | late`, ignored in v1 but ready for a future era split.

**Cultures (v1)** — traits detailed in §4

| Culture | Identity | Signature units |
|---|---|---|
| Macedon & Successors | Combined arms | Phalangites, Argyraspides, Hypaspists, Companions, Seleucid cataphracts, Tarantine cavalry, Cretan archers, Galatian mercs, elephants |
| Greek city-states | Cohesion | Hoplites (militia → epilektoi → Sacred Band of Thebes), Thessalians, Cretan archers, Agrianians, peltasts |
| Achaemenid Persia | Mass + logistics | Immortals, Kardakes, scythed chariots, Bactrian/Saka cavalry, Greek mercenary hoplites, Mardian archers |
| Carthage | Mercenary glue | Libyan spearmen, Sacred Band, Numidians, Iberian scutarii, Balearic slingers, Gallic mercs, elephants |
| Rome | Discipline, recovery | Hoplite-era legion (early), hastati/principes/triarii (mid), Punic War veterans (late), Italian allied cavalry |
| Warring States China | Mass ranged, engineering | Crossbowmen, ji halberdiers, chariots, Zhao cavalry, Qin conscripts |
| Steppe (Scythian/Saka/Sarmatian) | Mobility | Horse archers, noble lancers, Massagetae, Dahae |
| India (Nanda/Maurya) | Elephant shock | War elephants, longbowmen, chariots, Kshatriya cavalry |
| Gauls/Celts | Ferocity | Levy warband, Gaesatae, noble cavalry, chariots (early) |

**Roster target: ~15 units per culture, ~140 total, ~40 generals.** The draft shows 4 cards per row filtered by slot class, so each culture needs depth per class, not just a total: line 4–5, cavalry 3–4, ranged/skirmish 3–4, shock 2–3, special 1–2.

**How thin cultures reach 15**, in priority order:
1. **Quality tiers** — militia hoplites → epilektoi → Sacred Band; Kardakes → Immortals; levy warband → Gaesatae → noble retinue.
2. **Period variants** only where doctrine actually changed (Rome's hoplite → manipular shift; not "slightly better hoplite").
3. **Subject and allied peoples** — historically honest, since ancient armies were coalitions.

**Authoring method:** ~20 archetype templates (pike, hoplite, legion, heavy cavalry, horse archer, elephant…) with baseline stats; each culture's unit is a template plus 2–3 adjustments. Keeps balance sane and authoring fast.

---

## 3. Data model

All stats 1–100. Data in JSON; the sim is a pure function of the data.

**Unit**
- `class`: line · shock · cavalry · ranged · skirmish · special
- `subtype`: pike, hoplite, spear, legion, heavy_cav, light_cav, horse_archer, archer, slinger, javelin, crossbow, elephant, chariot, warband
- `stats`: melee, ranged, armor, mobility, discipline, shock
- `cost` 1–15 internally, **displayed as a grade: S (13–15), A (10–12), B (7–9), C (5–6), D (3–4), F (1–2).** Grade doubles as draft rarity (S 5%, A 15%, B 30%, C 30%, D 15%, F 5%).
- `period`, `tags`

**General**
- `stats`: command (army-wide multiplier), tactics (flank + matchup edges), logistics (elite slots + campaign attrition), charisma (morale pool)
- `style`: hammer · envelopment · attrition · skirmish · defensive — bonus when the battle plan matches
- **Counts as one unit of their culture toward culture bonuses.**

**Elephants** are `special`, flex-slot only. Historically their own arm, never cavalry: an anti-cavalry screen (×1.4), an inconsistent line-breaker, and a liability when panicked. In the sim: full weight in the charge phase, half a body in the grind, nothing in the flank; vulnerable to javelins/slingers (×0.7); discipline ~40 so morale damage bites; elevated rampage-event chance after losing the charge.

**Battle plan** — aggressive · defensive · envelopment · skirmish.

**Terrain** — plains · hills · river · forest, applied *asymmetrically by unit class* (hills hurt cavalry, river hurts whoever charges), never as a flat phase multiplier.

---

## 4. Culture bonuses

**Thresholds: 4 and 6 units of one culture, the general counting as one.** With 8 unit slots + general, an army can hold at most two level-1 bonuses (4 + 4), and a level-2 bonus (6) locks out any second bonus. That's the core strategic choice: one big identity or two small ones.

**Design rule:** level 1 is a number; level 2 is a bigger number *plus a rule*. All values are placeholders for the batch sim.

| Culture | Trait | Level 1 (4) | Level 2 (6) |
|---|---|---|---|
| Macedon & Successors | Combined Arms | flank ×1.15 | flank ×1.25; pikes ignore *shaken* |
| Greeks | Hoplite Cohesion | discipline ×1.10 | discipline ×1.15; morale threshold ×1.10 |
| Persia | Weight of Numbers | +1 elite slot | +1 elite slot; grind ×1.10 |
| Carthage | Mercenary Army | non-Carthaginian units +5% all stats | +8%; general's tactics ×1.2 in flank |
| Rome | Manipular Reserve | morale threshold ×1.10 | + losing the charge never makes you *shaken* |
| Warring States | Crossbow Volleys | skirmish ×1.20 | skirmish ×1.30; skirmish phase weight raised (can break an army early) |
| Steppe | Refuse Battle | skirmish ×1.25 | + morale damage from a lost grind halved |
| India | Elephant Line | charge ×1.15 | charge ×1.25; rampage chance halved |
| Gauls | Furor | charge ×1.20 | charge ×1.35 **but** morale threshold ×0.90 |

**Balancing traits:** raw multipliers are not comparable (charge ×1.20 on cheap warbands ≠ charge ×1.15 on 90-shock elephants). Balance by *measured win-rate lift*: batch-sim each culture with the trait toggled on vs. off, same armies and seeds, and tune every trait to roughly the same lift (target +4 to +6 points at level 1).

---

## 5. Draft

**Order**
1. **General first** — pool of 3, pick one. This sets the elite cap (logistics) and the home culture.
2. **The board** — 8 rows revealed together (animated row by row for suspense), each row a culture with **4 cards**, weighted by grade rarity. Rows are slot-typed: 2 line · 1 shock · 2 cavalry · 2 ranged/skirmish · 1 flex. Each row shows ~3 on-class units + 1 off-class unit from the same culture.
3. **Home-culture tilt** — each row has ~30% chance of rolling the general's culture (~2.4 expected home rows), so a general's bonus is *likely but not automatic*.
4. **Pick in any order.** Counters pinned at top: elite slots used, units per culture toward 4 and 6.
5. **Rerolls** — 2 per draft, target a whole row (culture and cards re-roll), only on rows not yet picked from.
6. **Lock in**, then choose a battle plan.

**Constraints — just two**
- **Elite cap:** 2 units of grade A/S by default; 3 if the general's logistics ≥ 80; +1 from Persia's trait.
- **Slot eligibility with penalties** (below).

No culture cap. No unit-type limit. Duplicates of the same unit are allowed and stay RNG — three Phalangites is a build you got lucky into and committed to, not one the draft hands you.

**Out-of-slot placement.** The slot decides the unit's role in the sim; its natural class decides the penalty. On-class costs nothing.

| Unit class → placed in | Line | Shock | Cavalry | Ranged/Skirmish |
|---|---|---|---|---|
| Line infantry | — | −10% | ✕ | −45% (wrecked) |
| Shock infantry | −10% | — | ✕ | −40% |
| Cavalry | −30% (dismounted) | −25% | — | −20% heavy / −5% light |
| Ranged/skirmish | −40% (wrecked) | −40% | ✕ | — |
| Special | −25% | −15% | ✕ | ✕ |

*Wrecked* placements also start the battle **shaken**. The card's grade visibly drops (A → C) when dragged into a bad row. Penalties must be steep enough that on-class stays the default — the batch sim checks whether any off-class placement is ever optimal.

**Why this draft shape:** full-information board + breakpoints + elite cap makes the draft a puzzle rather than a gamble; 4 cards per row fits a phone; off-slot placement changes the reroll economy (save rerolls for chasing breakpoints, not dead rows) and solves the thin-roster problem from the other side.

**Later mode:** budget draft (point cap instead of elite cap).

---

## 6. Battle simulation

**Structure:** four scored phases, then a break check. Each phase contests specific stats; the loser takes morale damage proportional to the edge. A side routs when accumulated morale damage exceeds its threshold (discipline + charisma + plan).

| Phase | Contest | Who matters |
|---|---|---|
| Skirmish | ranged + mobility vs. target armor | archers, slingers, horse archers, javelins |
| Charge | shock (with matchup) vs. discipline + armor of the line | cavalry, elephants, chariots, warbands, shock infantry |
| Grind | (melee, armor, discipline) × N^1.5 (Lanchester) — elephants count as ½ body | line and shock infantry |
| Flank | cavalry mobility + general's tactics + plan | cavalry, general |
| Break | morale damage vs. threshold | discipline, charisma, plan |

**Matchup table** — soft counters, 20–40% edges, never auto-wins. Pikes ×1.3 vs cavalry frontally, ×0.75 vs horse archers; elephants ×1.4 vs cavalry, ×0.7 vs javelins; heavy cavalry ×1.4 vs archers, ×0.7 vs pikes; legions ×1.15 vs warbands.

**Carryover** — losing the charge decisively makes you *shaken* (−10%) for the grind.

**Variance — two layers**
- *Continuous:* ~15% gaussian noise per phase. Tuning targets: clearly better army wins ~75–80%, even matchup ~50%, badly outmatched army still steals ~10–15%.
- *Discrete events:* **5–10% chance per battle** of one narratable swing, rolled on the seed. Initial list: general falls in the charge · elephants panic and trample their own line · downpour kills the missile phase · cavalry pursues off the field and misses the flank · a flank collapses early (Cannae) · reinforcements arrive (campaign only). Events carry the drama; noise stays modest.

**Outcome** — winner, phase the loser broke in, casualties (scaled by margin and winner's cavalry for pursuit), and a 6–8 line narrated recap naming the units that decided each phase.

---

## 7. Campaign ("season")

- **12 battles** vs. AI-drafted armies across a terrain mix, then a **4-round conquest bracket**.
- **Attrition** between battles scaled by casualties and reduced by the general's logistics. **Fatigue** for back-to-back battles.
- Battle plan can change per battle so the coaching layer stays live.
- Track W–L, casualties, run score. Leaderboards by culture and general later.

---

## 8. Sharing and persistence

- **Seeded RNG.** Fight draws a fresh random seed; the player sees full variance. The seed just names that roll so it can be replayed — same inputs + same seed = identical battle.
- **Run string in the URL:** general, unit IDs and slots, plan, terrain, seed, data version. Anyone opening it re-runs the sim client-side. Draft is seeded too: a whole run is `draftSeed + pick indices + rerolls`.
- **Data versioning** (`v=3`) so rebalances don't silently rewrite old links.
- **No database for v1.** Backend only for leaderboards/lifetime stats, storing inputs (run strings), never outputs.
- **Daily challenge** = today's date as the draft seed.

---

## 9. Balancing process

- **Batch sim:** 10k random drafts, play them, flag any unit outside 45–55% win rate per cost point, any trait/plan that dominates, any grade underperforming its rarity, any off-slot placement that's ever optimal.
- **Cost is the lever.** Stats come from history and feel; cost/grade is tuned until win-rate-per-point is flat.
- **Trait toggle** for measuring trait lift (§4).
- **Elo per unit/general** derived from the batch, published alongside the hand-authored grade.
- **Publish ratings openly.** Debate is engagement.

**Known issues in resolver v0.1** (from the first batch run):
1. Sample Hannibal army wins 66% — 5 grind bodies vs. 4 and N^1.5 over-rewards it. Fix: elephants at ½ body, warbands not full line bodies, or soften to N^1.2.
2. Terrain has zero effect — symmetric multipliers cancel. Fix: apply by unit class, asymmetrically.
3. No early routs in 6,000 battles — phase weights too gentle. Fix: raise weights, add a collapse check after the charge.

---

## 10. Tech

- Single-page app, TypeScript, JSON data, sim runs client-side. Static hosting, zero backend for v1.
- `resolveBattle(armyA, armyB, terrain, seed)` as a pure function, testable before any UI.
- Mobile-first: collapsible rows (culture name + 4 grade badges, tap to expand), counters pinned at top, live grade-drop on off-slot placement.

---

## 11. Roadmap

**Phase 0 — Engine (1–2 weekends).** Fix the three v0.1 issues. Add discrete events, asymmetric terrain, slot penalties, trait breakpoints, trait toggle. Author ~20 archetypes, ~40 units and ~12 generals across 4 cultures. Batch-test to targets. *Deliverable: a resolver you trust.*

**Phase 1 — MVP (2–3 weeks).** General pick, the 8-row board, rerolls, elite cap, off-slot drag with grade drop, single-battle sim, recap, run-string sharing. Ship on a domain; post to r/ancientwarfare, r/history, wargaming Discords. *Deliverable: people sharing upsets.*

**Phase 2 — v1 (3–4 weeks).** Campaign + bracket, attrition/fatigue, all 9 cultures at ~15 units, terrain mix, rebalance from feedback, daily challenge. *Deliverable: a reason to come back tomorrow.*

**Phase 3 — Growth.** Leaderboards (first backend), budget draft, historical-matchup mode (Gaugamela, Cannae, Ipsus with real rosters), lifetime stats, mini-games. Then a second era.

---

## 12. Open questions

1. ~~Rome's roster~~ — settled: any Roman general who commanded in the field before 200 BC is eligible.
2. **Off-slot penalty magnitudes.** The table is a first guess; the batch sim will say whether −25% for cavalry-as-shock is enough to keep shock slots for shock units.
3. **Home-culture tilt.** 30% is the starting number; move to 35% if bonuses fire too rarely.
4. **Elite cap feel.** 2 / 3 / +1. Batch will check power; what feel do you want?
5. ~~General pool~~ — settled: pure random.
6. ~~Naming~~ — settled on **Warlord Draft** (checked: no existing game; "Eras of War" is a 24M-play Roblox title, "Hegemon" collides with the Hegemony series). Verify warlorddraft.com / .gg and handles.
