# Warlord Draft — Game Concept

> **Status**: Approved direction (reverse-documented from a live build)
> **Author**: designer, with Claude
> **Last Updated**: 2026-09-16 (revised after the cross-review)
> **Sources**: `docs/classical-world-design-plan.md` (v0.3), `docs/mvp-plan.md`, `docs/app-design.md`, the six system GDDs in this folder, designer interview 2026-09-16
> **Live build**: https://warlord-draft.vercel.app

*Working title: Warlord Draft. Era 1: The Classical World, 400–200 BC.*

---

## Elevator Pitch

**Draft an ancient army. Read the enemy. Watch the war.**

A free, phone-first daily game. Pick a general from history, draft eight units from the cultures of 400–200 BC,
then face three enemy commanders in a row. Before each battle you see his army but not his line, and you place
your own on the left, center and right. Then you watch it play out, beat by beat. Lose once and the campaign
is over. Everyone gets the same board today, so your result is an argument you can have with your friends.

---

## Core Identity

| | |
|---|---|
| **Genre** | Draft-and-simulate strategy; daily roguelite |
| **Platform** | Web, phone-first (one column), desktop supported |
| **Session** | 5–10 minutes for one campaign |
| **Players** | Single-player against AI; asynchronous comparison on a shared daily board. 1v1 is a later phase |
| **Business model** | Free. One extra rewarded reroll per campaign, open to every player on equal terms, daily included. Power is never for sale |
| **Tech** | TypeScript engine (pure, deterministic) in a Next.js app; Supabase planned for verified play and ladders |
| **Tone** | Sober, text-first, historically literate. A war-room ledger, not a cartoon |

---

## Core Fantasy

**You are the general who out-thinks the other general.**

The high point of a run is a deployment read that pays off: you saw six that stand and two that ride, stripped
your center to load the left, and found one cavalry unit opposite. The wing breaks, wheels into his flank, and
the report tells you exactly that. The army you raised and the history on the cards matter, and the battle
report is drama worth sharing, but when those pull in different directions, **decisions and legibility win
over spectacle and collection.**

Supporting fantasies, in order: raising an army with a character (a Roman core with Numidian horse under
Hannibal); watching history play out in a chronicle you can share.

---

## Unique Hook

Nothing else combines **drafting across historical cultures** with a **hidden-information deployment bet** and
a **stat-driven, explainable battle** in a **shared daily** format.

- Total War and tabletop wargames are hands-on tactics: hours, not minutes.
- TABS and UEBS are physics sandboxes: spectacle without decisions.
- Autobattlers and deckbuilders have drafting and synergy but no history and no read on a visible opponent.
- Daily puzzle games have the habit and the comparison but no strategy.

The "and also": it is a daily puzzle **and also** a wargame you can lose by being out-thought.

---

## Player Experience Analysis (MDA)

### Target aesthetics, in priority order

1. **Challenge**: reading the enemy and committing under uncertainty.
2. **Expression**: an army with an identity, chosen from real alternatives.
3. **Narrative**: a battle report that reads like a chronicle.
4. **Fellowship**: the same board for everyone, so results are comparable.
5. **Discovery**: learning what the cultures, matchups and grounds do.

Not targeted: sensation (no spectacle), submission (no idle grind).

### Key dynamics we want to emerge

- Players argue about today's board: which general, which culture to chase, where to load the line.
- Players learn counters from losses ("his elephants ate my cavalry") and draft differently tomorrow.
- A weaker army beats a stronger one through deployment, often enough to be a story.
- Doctrine is chosen per battle for the ground and the foe, not looked up from the general.

### Core mechanics we build

Draft board; culture traits; elite cap; per-battle plan and three-front deployment; hidden enemy deployment;
the contest-and-morale battle resolver; roll-ups; the beat-by-beat report; seeded daily campaigns; run strings.

---

## Player Motivation Profile

**Needs served.** Competence (a read that pays off, a loss you can learn from); autonomy (eight picks and
eight placements that are yours); relatedness (the shared daily).

**Player types.** Primarily achievers and socialisers in the daily-puzzle sense: play once, do well, compare.
Secondarily explorers of the rules. Not built for killers until 1v1 exists.

**Flow.** One decision at a time on a phone: one row per screen in the draft, tap a unit then a front at
deploy, one beat per tap in the battle. Difficulty climbs across the three battles. A run is short enough that
a loss invites another free campaign rather than a walk away.

---

## Core Loop

### Moment to moment (30 seconds)
Read four cards, take one. Or: read the enemy roster, place a unit, watch the front's cohesion word change.

### Short term (5–10 minutes): one campaign
Pick a general → draft eight units → for each of three battles: read the foe, choose a plan, place the line,
watch the report → result and a casualty score.

### Session
One daily campaign, then optionally free campaigns from fresh seeds for practice.

### Long term
No power progression. What accumulates is **skill and history**: a record of past campaigns, a streak,
knowledge of the roster, and (Phase B) a place on the daily ladder. The ladder ranks battles won, then the
**general's handicap** (a weaker general ranks higher), then casualties; and every general has its own
ranking, so you can see how you did with your general against everyone else who took him.

### Retention hooks
A new board every day; one attempt at it; a result worth comparing; a recognisable general or culture you
have not tried yet.

---

## Game Pillars

### Pillar 1: Every choice is a tradeoff, never a lookup
Each pick, each plan and each placement must have a live alternative. If one option is right more than about
three times in four, it is a lookup and must be fixed.
*Design test:* can a bot with one simple rule match a thoughtful player? If yes, the decision is fake.
*Known violations today:* the doctrine match (the matching plan is best for 99% of rosters); the draft
(cost-only, culture-chase and elite-first heuristics perform within a point of each other); the general
pick (one tap, the largest swing in a run, and no reason to take a weak general). *Intended fix for the
general pick:* a published handicap, so a weaker general ranks higher on the ladder and the pick is a trade.

### Pillar 2: Deployment is a bet on hidden information
You see his army, not his line. The enemy's shape must be guessable by reasoning and never known. The AI must
not know your line or your plan either.
*Design test:* does a reasoned deployment beat a by-the-book one, and does the AI ever use information the
player could not have?
*Known violations today:* the AI simulates against the player's roster and chosen plan, and beats every
reasoned deployment. *Decided fix:* a player-blind AI that picks among its near-tied best lines using the
campaign seed, so its shape can be reasoned about but not computed.

### Pillar 3: Battles are explainable
After any battle the player can say which front gave way and why, from the report alone. Every rule the
player is told about must actually exist, and every rule that decides battles must be told.
*Design test:* show a loss to someone who did not play it; can they name the cause?
*Scope:* the test must pass for the **primary** player, who does not read the Numbers page. Rules that decide
battles (CHARGE counting double at contact, SPEED gating the wings, reserves, matchups, the ground's two
effects) need a plain-language line where the decision is made, not only a formula on a reference page.
*Known violations today:* beat cards show bars without naming who did the damage; the loser gets less
explanation than the winner; four of five battle events fire without a word in the report; several described
rules are dead code.

### Pillar 4: One board for everyone
The daily is identical for all players and any result can be replayed from its inputs. (Phase A caveat: the
daily is derived from the device's local date, so players in different time zones can briefly see different
boards. Phase B serves the daily and closes the gap.) Saves and shared
results store inputs only, never outcomes. This is what makes results comparable, shareable and verifiable.
*Design test:* can a run string alone reproduce the battle on another device, on the data version it was
played on?

### Pillar 5: Historical first, and a stat sim
Real cultures, units and commanders, with numbers a history reader finds plausible. No map, no unit
movement, no control once the lines meet: the game is the decisions before the battle and the report after.
*Design test:* would this feature need a map or a mid-battle order? Then it is a different game.

### When pillars conflict
Pillar 2 and Pillar 1 outrank the rest: favour decisions and legibility (the core fantasy) over roster breadth,
spectacle or flavour.

### Anti-pillars (what this game is NOT)

- **No control during battle.** Once the lines meet the player only watches. No orders, no real time, no map.
- **No grind or unlocks.** No meta-progression, no unit unlocks, no power carried between runs. Every run
  starts equal; skill is the only progression.
- **Power is never for sale.** Anything that affects the ranked daily is open to every player on equal terms.
  The one extra rewarded reroll is available to everyone, so the game is balanced around it. Nothing a
  player can buy makes an army stronger.

*Deliberately not an anti-pillar:* ahistorical content. "Historical first" is a pillar, not a ban; later eras
or what-if modes remain possible.

---

## Inspiration and References

| Reference | What we take | What we leave |
|---|---|---|
| Era Ball and draft-and-sim sports games | Draft, simulate, share the upset | The sports frame |
| Wordle and daily puzzles | One shared board a day, one attempt, a comparable result | The purely solitary puzzle |
| Autobattlers and deckbuilders | Synergy thresholds, elite caps, reading a draft | Meta-progression, randomised combat you cannot read |
| Tabletop ancients wargames (DBA, Strategos, Commands & Colors) | Three-sector battle lines, matchups, morale and rout | The table, the turns, the hours |
| Total War | The roster and the romance of the period | Real-time control |

---

## Target Player Profile

**Primary: the daily-puzzle player with a history itch.** Plays once a day on a phone, in the time it takes to
drink a coffee. Has opinions about Hannibal. Does not read stat tables, so the game must teach itself through
words (FIGHT, STEADY, CHARGE), one-line consequences, and losses that explain themselves. Shares results.

**Secondary: the strategy enthusiast.** Reads the Numbers page, plays several free campaigns, wants to find the
edges. Served by depth that is available but never required.

**Not the target (for now):** roguelite players who expect unlocks and long builds; competitive PvP players.

**What "too complex" means for this audience:** anything that needs a number the screen does not show, or a
rule the Rules page cannot state in one sentence.

---

## Technical Considerations

- The engine is a **pure function of inputs**: `resolve(armyA, armyB, ground, seed)`. Any client or server
  computes the same battle. The database stores inputs, never outcomes.
- **Data is versioned.** A change that alters outcomes bumps `dataVersion`; old versions stay served so old
  run strings replay.
- **Phase A** (live): client-only, `localStorage` saves, the daily derived from the local date.
- **Phase B** (planned): Supabase, anonymous sign-in, server-issued seeds, server replay for verification,
  ladders and "what everyone else took".
- Balance is measured, not guessed: a batch simulator and a cost-tuning loop ship with the engine.

---

## Risks and Open Questions

### Design risks
- **Fake decisions.** Pillar 1 is currently violated in the plan and partly in the draft. Fixes are decided;
  they must be measured.
- **The general lottery.** The general pick explains most of the win-rate spread. COMMAND is to soften.
- **Difficulty.** Flat today; completion 7–25%. Foes are to be tiered by general and by army cost; target
  about 80 / 65 / 55–60% per battle, about 30% completion.
- **Unmeasured interactions.** The decided changes were each reasoned about alone. They are to be measured
  together in one batch run before any ships (cross-review 2026-09-16). CHARGE counting double at contact is
  the largest unexamined risk.
- **Explaining a stat sim on a phone** to a player who does not read tables.

### Technical risks
- A board redesign breaks every existing run string; versioned data must be served indefinitely.
- Determinism across devices and engine builds is a hard requirement of Pillar 4.

### Market risks
- A niche theme. The daily format and shareable results are the reach strategy.

### Scope risks
- The roster (135 units, 81 generals) is content-heavy and uneven across cultures.
- Art is currently typography and colour only; there is no illustrated identity yet.

### Open questions
- Does the player see all three foes before drafting, or one at a time?
- How do flex rows draw on the new board?
- Is there an era 2, and does `period` become a filter?

---

## MVP Definition

**In:** one mode, the three-battle campaign, daily and free; general pick, eight-unit draft, per-battle plan
and deployment, stepped battle report, result and local history; Rules and Numbers pages. Live today.

**Decided next (design, not yet built):** plan as a real decision; COMMAND softened, provisionally halfway;
ground affects combat stats only; the 2 line / 1 cavalry / 1 ranged / 4 flex board with mixed-culture rows;
graded SUPPLY under a joint cap; one extra rewarded reroll for everyone; foes tiered by general and army
cost; a player-blind AI with a seeded choice among its best lines; every battle event narrated; a handicap
shown on general and result cards.

**Out of the MVP:** 1v1, lobbies, ladders and standings including the handicap and per-general rankings (need Phase B), attrition between battles, seasons,
ads, illustrated art, a per-grade draft budget.

### Scope tiers if time shrinks
1. Fix the two integrity defects (AI reads the plan; draft editable after a battle) and the loser's report.
2. Doctrine and COMMAND tuning, foe tiers.
3. The board redesign.
4. Phase B.

---

## Next Steps

1. `design/gdd/systems-index.md`, then `/review-all-gdds` across the six system docs.
2. `/quick-design` for each decided fix; measure with the batch tool before shipping.
3. An art bible once the concept is stable (`/art-bible`), starting from `docs/reviews/2026-09-16-art-review.md`.
