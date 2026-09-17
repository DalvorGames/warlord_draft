# Battle design v3 — Three Fronts

*Status: agreed 2026-09-16, replaces HANDOFF §4–5's slot-decides-role model and the "Line and Wing" draft.
Implemented as `rules.battleModel: "fronts"`; the v1 resolver stays reachable as `"v1"` for comparison.*

## Deployment: the general's decision

An army is a general and eight units. Before each battle the general sees the **enemy roster** (not their
deployment) and places every unit on the **Left**, in the **Center**, or on the **Right**. Any split is legal.
Eight in the center leaves both wings empty, so the enemy wings win unopposed and roll into the line from
both sides. An empty center is the general standing alone. Neither is forbidden; both are obviously bad, and
everything in between is the game.

Left faces the enemy's right, center faces center, right faces the enemy's left. Because the enemy's
deployment is hidden, loading a wing is a bet. The AI deploys by a heuristic that reads the player's roster
the same way, so its deployment is guessable, not known.

The draft board's row types only shape what is offered. Once drafted, a unit is its stats and its position.
No slot penalties, no roles by class, no half-bodies for specials: an elephant in the center is a low-
discipline, javelin-vulnerable body; on a wing it is a charge monster that fights cavalry at ×1.4.

## Fronts and morale

Each front tracks its own morale damage against its own **cohesion threshold**, from that front's average
discipline plus the general's charisma, times plan and trait multipliers. When a front's damage passes its
threshold the front **breaks**: its units leave the field.

**Army morale** is the unit-weighted average of the three fronts' damage fractions (a broken front counts
as 1) plus a flat shock per broken front: `wingBreakShock` 0.1, `centerBreakShock` 0.25. An empty front that
gives way counts as `emptyFrontWeight` (0.15) of the army fully broken plus its shock, so an empty wing
costs 0.25 on the spot and an empty center 0.40: the general standing alone is nearly fatal. The army
**routs** when army morale passes `routLevel` (0.8), or when every front is broken.

A broken center is heavy, not fatal: a four-unit center that breaks puts the army at 0.75 on its own, so
any further damage routs it. Intact wings that have already won their fronts can still save it by breaking
the enemy center first.

## The battle

Every unit fights in every stage it is present for. No class gates. Curves, `(stat/100)^k`, make a specialist
worth several generalists in its own stage without excluding anyone.

**Frontage.** A front can bring at most `frontage` (1.5) × the opposing front's units into a contest; the
rest are reserves and count at `reserveMult` (0.25). Eight in the center against four fight as six plus two
in reserve. A wing wheeling into a center's flank is resisted only by the units that can face it, so a
packed center is not a safe center.

**1. Skirmish.** Per front pair. Every unit with a ranged stat shoots the front opposite it; a front facing
an empty front shoots the enemy center instead. Center units shoot at half strength (`lineSkirmishMult`)
because they are in formation and are the target. Heavy armor on the receiving front shrugs missiles off.

```
shot(u)  = ranged × (0.7 + 0.3 × mobility/100) × matchup(u vs opposing front) × (center ? 0.5 : 1)
score_f  = Σ shot × (1 − avgArmor(opposing front)/100 × 0.5) × plan.skirmish × cmd × noise
damage   = weights.skirmish × min(edgeCap, edge) × 2 to the losing front, 25% of that to the winner
```

**2. Contact.** All three front pairs clash at once. Each side's score is its impact (shock, curved) plus its
steadiness (discipline and armor). Steadiness is scaled by each unit's *own* matchup row against the enemy
units on that front, which is how pikes and elephants resist horse. Losing contact by more than
`shakenEdge` makes that front shaken for the rest of the battle (Rome L2 immune, Macedon L2 pikes immune).

```
impact     = Σ shock × (shock/100)^chargeCurve × matchup(u vs enemy front)
steadiness = Σ (discipline × 0.6 + armor × 0.4) × matchup(u vs enemy front)
score_f    = (impact + steadinessCoef × steadiness) × terrain.chargeAttacker × plan.charge × cmd × noise
damage     = weights.contact × min(edgeCap, edge) × 2
```

An empty front facing a non-empty one breaks at contact without a fight. Two empty fronts do nothing.

**3. The press.** `rounds` rounds, all fronts fighting at once. The center pair grinds; the wing pairs fight
the cavalry fight, where mobility matters and the general's tactics multiply.

```
center:  q(u)  = (melee × 0.5 + armor × 0.3 + discipline × 0.2) × matchup × shaken
         score = Σ q × N^0.3 × plan.grind × cmd × noise
wing:    p(u)  = (mobility × 0.4 + melee × 0.4 + shock × 0.2) × (mobility/100)^wingCurve × matchup × shaken
         score = Σ p × N^0.3 × (0.7 + tactics/100 × 0.6) × plan.flank × cmd × noise
damage   = weights.press × min(edgeCap, edge) × 2 per round
```

After every round, fronts whose damage passed their threshold break, army morale is recomputed, and a side
past `routLevel` routs.

**4. Rolling up.** A front whose opponent broke is *free*. Next round a free wing charges the enemy
center's side; a free center turns onto whichever enemy wing is still fighting where its own wing is worst
off. The charge is one-directional: the charger's impact (× `rollupMult`) is set against the steadiness of
only the units that can face it, and only the target takes damage. If the target's steadiness absorbs the
charge outright the edge is zero and nothing is lost, but the target is still marked flanked (`flankedMult`
per flank on its press score, stacking). The charging units then join the fight on that front. Two free
wings on the same side is Cannae.

**5. Ending.** Rout, all fronts broken, or the round limit, where the higher army-morale damage loses.
Casualties scale with the morale gap and the winner's wing mobility (pursuit).

**The general** stands in the center and dies only when both are true: the center broke *and* the battle
was lost. Center broken, battle won: the horse came back in time. Battle lost, center held: the general
retreats with the line. In a campaign, general death ends the run.

## Events

Rolled once per battle from the seed. Downpour scales skirmish damage; the general falls when the center
loses contact (threshold cut); elephants rampage on a front that fields them and loses contact; a winning
wing may pursue off the field instead of rolling up; a wing that loses contact may collapse outright
(damage ×2, "Cannae"). Reinforcements are campaign-only.

## What the batch must check

- Deployment is a decision: the default heuristic should not win > 60% against alternatives on the same
  roster. Measured with the deployment swap tool.
- Early breaks (a front broken at contact) 10–25%; routs before the round limit not above ~70%.
- Class value in the same slot within 5 points after cost tuning, measured with paired swaps.
- Zero-shooter armies lose most of the time but not all.
- Cavalry-heavy armies ≥ 5 points better on plains than hills.
