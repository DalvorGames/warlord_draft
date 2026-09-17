# Systems Index: Warlord Draft

> **Status**: Draft
> **Created**: 2026-09-16
> **Last Updated**: 2026-09-16
> **Source Concept**: design/gdd/game-concept.md

---

## Overview

Warlord Draft is a draft-and-simulate daily. Its mechanical scope is small and deep: a data layer (the
roster), four rule systems that turn a drafted army into a decided battle (Draft, Army Preparation,
Deployment, Battle Resolution), and one wrapper that gives runs their stakes (Campaign). Everything is a pure
function of inputs, so that one board is the same for everyone (Pillar 4). The systems that carry the core
fantasy, out-thinking the other general, are Deployment (Pillar 2) and Draft (Pillar 1); Battle Resolution
and the Battle Report carry Pillar 3. All six rule systems exist in code and were reverse-documented on
2026-09-16. Presentation and meta systems exist in the build but have no design docs yet.

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | Units & Generals (roster data) | Core | MVP | In Review | design/gdd/units-and-generals.md | — |
| 2 | Draft | Gameplay | MVP | In Review | design/gdd/draft.md | Units & Generals, Deployment (bots' default line). Input: a seed from Campaign |
| 3 | Army Preparation | Gameplay | MVP | In Review | design/gdd/army-preparation.md | Units & Generals, Draft, Deployment |
| 4 | Deployment | Gameplay | MVP | In Review | design/gdd/deployment.md | Battle Resolution, Army Preparation, Units & Generals |
| 5 | Battle Resolution | Gameplay | MVP | In Review | design/gdd/battle-resolution.md | Army Preparation, Deployment, Units & Generals |
| 6 | Campaign | Progression | MVP | In Review | design/gdd/campaign.md | Draft, Deployment, Battle Resolution, Units & Generals |
| 6a | Traits (shared pool for generals and cultures; replaces culture traits and doctrine) | Gameplay | MVP | In Design | design/gdd/traits.md | Units & Generals, Army Preparation, Battle Resolution, Draft |
| 7 | Battle Report (beats, recap, chronicle) (inferred) | Narrative | MVP | Implemented | — | Battle Resolution |
| 8 | Run Screens & Flow (Today, General, Draft, Deploy, Battle, Between, Result) (inferred) | UI | MVP | Implemented | — (spec: docs/ui-handoff-v2/UI-HANDOFF.md) | Campaign, Draft, Deployment, Battle Report |
| 9 | Rules & Numbers pages (teaching) (inferred) | Meta | MVP | Implemented | — | all rule systems |
| 10 | Save & History (local) | Persistence | MVP | Implemented | covered in design/gdd/campaign.md §3.5 | Campaign |
| 11 | Balance Tooling (batch sim, cost tuning, deployment swap) (inferred) | Meta | MVP | Implemented | — (log: docs/BALANCE.md) | all rule systems |
| 12 | Verified Play & Ladder (server seeds, replay verification, standings with general handicap, per-general rankings) | Persistence | Vertical Slice | Not Started | — (plan: docs/app-design.md) | Campaign, Draft |
| 13 | 1v1 and Lobbies | Gameplay | Full Vision | Not Started | — | Verified Play, Deployment |

Status note: systems 1–6 are implemented in code. Their docs were flagged by the cross-review of 2026-09-16
(`design/gdd/gdd-cross-review-2026-09-16.md`, verdict FAIL). The consistency fixes were applied and the six
open design decisions were taken the same day, so they are now In Review. They become Approved once the
decided changes have been measured together and the cross-review is re-run.

---

## Categories

| Category | Systems here |
|----------|--------------|
| **Core** | Units & Generals |
| **Gameplay** | Draft, Army Preparation, Deployment, Battle Resolution, 1v1 |
| **Progression** | Campaign (run structure only; there is no power progression, by anti-pillar) |
| **Persistence** | Save & History, Verified Play & Ladder |
| **UI** | Run Screens & Flow |
| **Narrative** | Battle Report |
| **Meta** | Rules & Numbers pages, Balance Tooling |

Not applicable: Economy (no currency or loot), Audio (none planned for MVP).

---

## Priority Tiers

| Tier | Meaning here |
|------|--------------|
| **MVP** | The three-battle campaign, daily and free, client-only. Live. |
| **Vertical Slice** | Phase B: accounts, verified daily, ladder, "what everyone else took". |
| **Full Vision** | 1v1, lobbies, further eras. |

---

## Dependency Map

### Foundation Layer (no dependencies)

1. **Units & Generals** — the data every other system reads; versioned for replay.

### Core Layer (depends on foundation)

1. **Draft** — depends on: Units & Generals, Deployment (bots' default line). Takes a seed as input.
2. **Army Preparation** — depends on: Units & Generals, Draft (culture counts), Deployment (default line).
3. **Deployment** — depends on: Units & Generals, Army Preparation (preview), Battle Resolution (AI simulation).
4. **Battle Resolution** — depends on: Army Preparation, Deployment, Units & Generals.

### Feature Layer (depends on core)

1. **Campaign** — depends on: Draft, Deployment, Battle Resolution.
2. **Save & History** — depends on: Campaign.
3. **Balance Tooling** — depends on: all core systems.

### Presentation Layer (depends on features)

1. **Battle Report** — depends on: Battle Resolution.
2. **Run Screens & Flow** — depends on: Campaign, Draft, Deployment, Battle Report.
3. **Rules & Numbers pages** — depends on: all rule systems (must describe only rules that exist).

### Later

1. **Verified Play & Ladder** — depends on: Campaign, Draft (run strings).
2. **1v1 and Lobbies** — depends on: Verified Play, Deployment.

---

## Recommended Design Order

Reverse-documentation is done for the rule systems. What remains, in order:

| Order | System | Priority | Layer | Agent(s) | Est. Effort |
|-------|--------|----------|-------|----------|-------------|
| 1 | Cross-review of systems 1–6 (`/review-all-gdds`) | MVP | — | game-designer, systems-designer | S |
| 2 | Quick specs for the decided fixes (doctrine, COMMAND, ground/STEADY, player-blind AI, foe tiers) | MVP | Core / Feature | systems-designer | M |
| 3 | Draft redesign spec (board shape, mixed-culture rows, graded SUPPLY) | MVP | Core | game-designer, economy-designer | M |
| 4 | Battle Report | MVP | Presentation | game-designer, writer | S |
| 5 | Run Screens & Flow (UX specs from the v2 handoff and the UX review) | MVP | Presentation | ux-designer | M |
| 6 | Rules & Numbers pages | MVP | Presentation | writer, ux-designer | S |
| 7 | Verified Play & Ladder | Vertical Slice | Feature | technical-director, security-engineer | L |

---

## Circular Dependencies

- **Deployment ↔ Battle Resolution.** The AI's deployment is chosen by running the resolver, and the resolver
  falls back to the default deployment. Resolution: the dependency is one-way at the data level (a deployment
  is an input to a battle); the AI's use of the resolver is a consumer relationship. With the decided
  player-blind AI it remains, but simulates against a neutral mirror rather than the player.
- **Army Preparation ↔ Deployment.** Preparation assigns fronts from the deployment (or the default); the
  Deploy preview calls Preparation for cohesion. Resolution: `defaultDeployment` uses base stats only and does
  not call Preparation, so there is no runtime cycle.
- **Draft ↔ Campaign.** Not a cycle. Campaign depends on Draft (draft functions, foe drafts, run strings).
  Draft takes only a **seed** as an input parameter, which Campaign happens to supply; it needs nothing else
  from Campaign. This keeps a Core-layer system from depending on a Feature-layer one.
- **Draft ↔ Army Preparation.** Draft owns culture counting and trait levels; Preparation owns trait effects;
  the elite cap reads trait entries (`eliteSlots`). Resolution: shared helper functions live in Draft;
  Preparation imports them.

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|-----------------|------------|
| Draft (redesign) | Design | New board and mixed-culture rows may not hit the trait-reach targets, and may make "take the best card" dominant | Prototype in the batch tool before touching the client; six measurable targets in draft.md §8 |
| Draft (redesign) | Technical | Breaks every existing run string | Bump `dataVersion`; keep v2 data served |
| Deployment (player-blind AI) | Design | An AI with no read may be too easy, flattening difficulty further | Measure with `deploy_swap.ts`; difficulty comes from Campaign foe tiers |
| Army Preparation (doctrine, COMMAND) | Design | Re-tuning two global multipliers shifts every win rate and every cost-tuned unit | Re-run the cost-tuning loop after the change |
| Campaign (foe tiers) | Design | With COMMAND softened, general tiers may move win rates too little to make a curve; random ground can mask the climb on a given day | Foe army cost bands decided as the second lever; measure ground's effect before tying it to battle index |
| Battle Resolution (CHARGE²) | Design | Impact is squared, so massing high-CHARGE units on one front may be a dominant deployment that no decided change touches | Measure a CHARGE-stacking deployment first; gate the other changes on it |
| Draft (SUPPLY) | Design | Third elite plus better cards is a double dip that could re-create the general lottery | One joint win-rate cap; the ladder handicap prices the rest |
| Battle Report | Design | Pillar 3 is violated today for the loser | Spec the report from the contest data that already exists (`topA`/`topB`, damage) |
| Verified Play | Technical | Cross-device determinism of the engine | Already pure and seeded; add a replay conformance test |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 14 |
| Design docs started | 7 |
| Design docs reviewed | 6 (cross-review 2026-09-16: FAIL; fixes and decisions applied the same day) |
| Design docs approved | 0 |
| MVP systems designed | 6 / 11 (Save & History covered inside Campaign) |
| Vertical Slice systems designed | 0 / 1 |

---

## Next Steps

1. Run `/review-all-gdds`.
2. `/design-review` each of the six docs, or accept the cross-review's verdicts.
3. `/quick-design` per decided fix; measure with `npm run batch -w packages/engine`.
