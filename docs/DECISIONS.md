# Engine decisions

Where the handoff spec was ambiguous or looked wrong, this is what the engine does and why. Every number
mentioned is a knob in `data/rules.json` (source: `scripts/build_data.mjs`).

1. **Charge steadiness is the side's own wall.** The v0.1 formula added the *enemy* wall's steadiness to
   your charge score, so a steady pike wall boosted the attacker. Each side now scores
   `impact + chargeSteadinessCoef × own wall steadiness`, matching the design plan's "shock vs. discipline
   + armor of the line". `chargeSteadinessSide: "enemy"` restores the old reading for comparison.
2. **China level 2 skirmish weight is 0.40.** The handoff value (0.30) equalled the base weight and did
   nothing.
3. **Rampage damage** = winner's charge phase weight × (elephant share of the loser's charge impact) ×
   `params.damageMult`. The handoff's "elephants deal their charge score to own morale" mixed units.
4. **Flank collapse fires at the flank phase**, not the grind (it doubles flank damage).
5. **Downpour scales skirmish morale damage ×0.3** for both sides. Scaling both scores would leave the
   edge unchanged and do nothing.
6. **Zero-score phases give edge 1** (loser takes the full phase weight × 2). Left as specified; the
   batch off-slot report shows whether wrecked ranged rows make this matter.
7. **Simultaneous rout:** the side with the higher damage/threshold fraction loses.
8. **Cavalry rows have no legal off-class card**, so the fourth card is another on-class unit. Any row
   whose pool runs short fills from the other pool; a culture with fewer eligible units than cards deals
   what exists (Carthage has three cavalry units).
9. **`dataVersion` lives in rules.json** (currently 1) and is checked by `replayDraft`.
10. **Roles are the slot's class.** A skirmish unit in a ranged row plays "skirmish", a ranged unit plays
    "ranged"; flex plays the unit's own class. Shooters, chargers, fighters, cavalry are all selected by
    role. Matchups and terrain use the unit's *natural* subtype and class.
11. **Special units are always half a grind body**, even when placed in a line or shock slot.
12. **Damage uses the winner's phase weight**, so China's raised skirmish weight hurts China's enemies
    (not China).
13. **Pikes ignore shaken per unit**: a shaken Macedon-L2 side applies `shakenMult` to non-pike units'
    charge impact and grind quality, and to the whole flank score.
14. **Elite cap is enforced per pick** on the post-pick state (Persia's live cap included). Un-picking a
    Persian unit can leave the draft over cap; `validateDraft` catches it at lock-in. Replay applies
    picks without per-pick enforcement and validates the final army, so pick order never matters.
15. **Pick order in run strings is per row** (`p=` is one card index per row). Rerolls (`r=`) are ordered
    and replay before picks, which is always legal because rerolls only target unpicked rows.
16. **RNG draw order in a battle:** event roll first, then per phase noise for A then B. Adding events to
    the list never shifts the noise draws.
17. **Batch drafters:** `random` takes uniform legal picks and a random plan (measures units, and proves
    off-class placements lose); `greedy` takes the best on-class card by cost, chases culture thresholds,
    rerolls the two weakest rows and plays the general's matching plan. Balance numbers should be read
    from `greedy`. Both pick the general uniformly from the pool so general stats stay measurable.
18. **Batch unit metric** compares a unit's on-class win rate with same-grade units in the *same slot kind*.
    Comparing against the whole grade was biased: a line or shock unit counted on-class also means its row
    avoided a wrecked off-class pick, a bonus cavalry rows can never earn (they have no off-class cards).
19. **New formula knobs, all defaulting to the spec's behavior**: `chargeWallRoles`, `chargeMinShock`,
    `flankFloor`, `chargeWallMatchup`, `chargeSteadinessCoef`. None of them fixed the class imbalance
    (docs/BALANCE.md), they exist so the next experiments are one JSON edit.
20. **Drafter bots swap out an earlier elite pick** when a row offers only elite cards and the cap is full.

## Three-fronts model (2026-09-16, `rules.battleModel: "fronts"`)

21. **Deployment lives on the Army** (`deployment: Front[]`, one per slot). Missing → `defaultDeployment`:
    line, shock and foot ranged to the center; cavalry, skirmishers and specials dealt to the wings by
    descending wing power. Both bots use it. The run string does not carry deployment yet.
22. **Empty fronts** have no weight in army morale but pay the flat break shock when they give way at
    contact, so an empty wing is never free. Shooters facing an empty front fire at the enemy center.
23. **Roll-ups are one-directional** (only the target takes damage) and face only the frontage that can
    turn to meet them. A free center rolls out onto the enemy wing where its own wing is worst off.
24. **Frontage** caps engaged units at 1.5 × the opposing front; reserves count a quarter. Without it,
    eight in the center out-scored four before the wings could wheel in (all-center won 86%).
25. **Skirmish is per front pair**, so an army with no shooters on a wing takes the full capped hit on that
    wing. First batch says this is too heavy; `fronts.weights.skirmish` is the knob.
26. The v1 resolver and its tests are kept (`resolveBattleV1`; `test/resolve.test.ts` forces the flag).
27. **Bots deploy by the plain default heuristic.** A terrain lean (wing units to the center on hills and
    forest) measured 4 points worse overall and 13 worse in forest, so `deployFor` returns the default
    unless `lean` is passed. The run string carries `dep=` so a shared battle replays with its deployment.
28. **Trait numbers were re-tuned for this model** (see BALANCE.md): charge bonuses now land on three
    contact fights, wing bonuses on one, so Gaul and India came down and Macedon and Greece went up.
29. **Roster-reading deployment** (`deployAgainst`): assume the enemy deploys by the default, simulate
    candidate deployments against it over the bot's own seeds, keep the best. Measured +16 pts over blind
    (docs/BALANCE.md). Meant to become the AI opponent's deployment.
30. **Rampage is a per-battle check in the fronts model** (`fronts.rampageChance` per elephant unit on a
    front that loses contact by more than `shakenEdge`; India L2 halves it). The rampage *event* is v1-only.
31. **Trait entries gained `steadiness` and `rollup` multipliers** so level-2 rules can have measurable
    effects in this model (Greek wall, Macedon hammer-and-anvil).
32. **An empty front that gives way counts as `emptyFrontWeight` of the army fully broken**, so an army
    with no center is nearly dead on contact instead of paying only the flat shock.
33. **Batch bots deploy as readers** (`readerSeeds` 3, vs 6 for the AI opponent in `api.ts`), so costs are
    tuned for how the game is played. `--reader-seeds 0` restores blind deployment.
34. **`loadData` moved to `src/node/`**; the engine proper never imports `node:fs`. Clients call
    `buildData` / `createEngine` with fetched JSON.
35. **Persia's trait has a battle-side half** (steadiness 1.05 / 1.08) so the culture is not invisible in
    play and the trait toggle can measure something.
