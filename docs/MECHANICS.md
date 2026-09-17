# How Warlord Draft actually works

*Written 2026-09-16 from the engine source at data version 2. Every number here is read from
`packages/engine/data/rules.json` or the resolver code, not from older design docs. Where the docs or the
UI disagree with the code, the last section says so.*

This is the plain-language reference for the mechanics. It is meant to be the thing a new teammate reads
first, and the raw material for the per-system design docs. It answers four questions: what does each
general stat do, what does each unit stat do, what does a deployment mean, and how does a battle turn all
of that into a winner.

Player-facing words are used throughout, with the code's stat name in brackets the first time.

---

## 1. The shape of a run

1. **Pick a general.** Three are offered, drawn at random from 81.
2. **Draft eight units** from an eight-row board. Two rerolls.
3. **Three battles in a row.** Before each, you see the enemy roster and the ground, place your eight units
   on the Left, Center or Right, and **choose a plan** (the doctrine): Aggressive, Defensive, Envelopment
   or Skirmish. The plan defaults to your general's doctrine and can change every battle. Each battle is
   on a different ground (plains, hills, forest or river).
4. **Any loss ends the run.** Three wins is a completed campaign. Score is wins, then losses.

The same army fights all three battles. Only the deployment and the plan change between them. There is no attrition:
casualties are reported but nothing carries over.

---

## 2. General stats

A general has four stats, each 0 to 100, plus a **style** (Hammer, Envelopment, Attrition, Skirmish,
Defensive). Across the 81 generals the stats run from about 40 to 100 with a median near 70.

| Word on screen | Stat in code | What it actually does |
|---|---|---|
| **COMMAND** | `command` | Multiplies **every score in every contest** of the battle. The multiplier is `0.85 + 0.30 × command/100`. Command 55 gives ×1.02, command 70 gives ×1.06, command 95 gives ×1.14. So the best commander is about 12% stronger than the worst in every fight, every round. This is the single biggest lever a general has. |
| **TACTICS** | `tactics` | Multiplies the **wing press** only (the cavalry fight on Left and Right in rounds 1 to 4). The multiplier is `0.7 + 0.6 × tactics/100`. Tactics 40 gives ×0.94, tactics 70 gives ×1.12, tactics 100 gives ×1.30. Does nothing in the skirmish, the contact, or the center. Carthage at six units boosts this contribution by a further 20%. |
| **SUPPLY** | `logistics` | Two things, both outside the battle formulas. (a) If supply is **80 or higher** you may draft **3 elite units instead of 2**. (b) In the rare Reinforcements event, the side with higher supply gets ×1.2 on its center press. That event is flagged campaign-only and the web client does not pass the campaign flag, so in the app today supply only matters for the elite cap. |
| **CHARISMA** | `charisma` | Adds to the **cohesion** of every front. A front's cohesion threshold is `0.55 + 0.35 × (average STEADY of its units)/100 + 0.20 × charisma/100`, then times plan and trait multipliers. Charisma 40 adds 0.08, charisma 100 adds 0.20. Cohesion is how much morale damage a front can take before it breaks, so charisma 100 versus 40 is roughly 13% more punishment absorbed on every front. |

**Style** does one thing: if the plan you choose is the one that matches the general's style, every phase
multiplier gets ×1.08. Hammer wants Aggressive, Envelopment wants Envelopment, Attrition and Defensive
both want Defensive, Skirmish wants Skirmish. The match is shown as "brings X doctrine" in the report.
Because the bonus applies everywhere, the matching plan is almost always right. That is the "doctrine is a
lookup" finding from the design and balance reviews.

The general also **counts as one unit of their culture** for trait thresholds, so a Macedonian general is
one step toward the Macedon trait for free.

The general **dies** only if two things are both true: their center broke, and the battle was lost. In a
campaign that is the same as losing, so it has no extra effect today beyond the narration.

---

## 3. Unit stats

Every unit has six stats, 0 to 100, a class, a subtype, a grade (S to F) and a cost (2 to 15). Grade and
cost are the same thing seen two ways: S costs 13 to 15, A 10 to 12, B 7 to 9, C 5 to 6, D 3 to 4, F 2.

| Word on screen | Stat in code | Where it counts | How much |
|---|---|---|---|
| **FIGHT** | `melee` | Press rounds, both center and wings | Center: 50% of a unit's press value. Wing: 40%. Not used in the skirmish or the contact at all. |
| **SHOOT** | `ranged` | Skirmish only | The whole basis of the skirmish score. Units with SHOOT 0 contribute nothing to the missile exchange. |
| **ARMOR** | `armor` | Skirmish (defence), contact (steadiness), center press | Halves incoming missiles at full armor: the target front's average ARMOR × 0.5 is the fraction of shots shrugged off. 40% of steadiness at contact. 30% of center press. |
| **SPEED** | `mobility` | Skirmish, wing press, pursuit | Small bonus to shooting (up to +30%). On the wings it is both 40% of the press value **and** a curve: the value is multiplied again by `sqrt(SPEED/100)`, so a SPEED 36 unit fights on a wing at 60% of a SPEED 100 unit before anything else. After the battle the winner's wing SPEED sets pursuit casualties. |
| **STEADY** | `discipline` | Cohesion, contact (steadiness), center press | The biggest share of a front's cohesion threshold. 60% of steadiness at contact. 20% of center press. |
| **CHARGE** | `shock` | Contact, roll-ups, wing press | The whole of impact at contact, and curved: a unit's impact is `CHARGE × (CHARGE/100)`, so CHARGE 80 is 64 and CHARGE 40 is 16. Four times the impact for twice the stat. Also 20% of wing press. |

**Class** (line, shock, cavalry, ranged, skirmish, special) decides only which draft rows offer the unit
and where the default deployment puts it. Once on the field a unit is just its stats and its front.

**Subtype** (pike, hoplite, heavy_cav, elephant, archer, and so on) drives the **matchup table**. Every
contribution a unit makes is multiplied by the average of its matchup values against the enemy units on
that front. Pikes are ×1.3 against horse, heavy cavalry is ×1.4 against archers and ×0.7 against pikes,
elephants are ×1.4 against every cavalry and ×0.7 against javelins. Matchups apply to shooting, impact,
steadiness and press alike, so they are the main way a cheap unit beats an expensive one.

Rough class averages from the roster, to calibrate expectations:

| Class | FIGHT | SHOOT | ARMOR | SPEED | STEADY | CHARGE |
|---|---|---|---|---|---|---|
| line | 64 | 5 | 55 | 42 | 69 | 42 |
| shock | 72 | 2 | 47 | 52 | 61 | 67 |
| cavalry | 58 | 23 | 40 | 82 | 59 | 59 |
| ranged | 29 | 72 | 19 | 59 | 52 | 8 |
| skirmish | 48 | 56 | 25 | 76 | 53 | 28 |
| special | 63 | 8 | 57 | 65 | 39 | 83 |

---

## 4. The draft

**The board** is eight rows, one per slot, in this fixed order: line, line, shock, cavalry, cavalry,
ranged, ranged, flex. Each row is a single culture: 30% of the time the general's home culture, otherwise
one of the other eight at random. Each row shows four cards: three units of the row's class and one
off-class unit from the same culture (a cavalry row has no legal off-class card, so it shows four cavalry).
Cards are drawn by grade rarity: S 5%, A 15%, B 30%, C 30%, D 15%, F 5%.

**Picking.** Take exactly one card per row. Flex accepts anything.

**Rerolls.** Two per run. A reroll redraws one row you have not picked from yet.

**Elite cap.** You may hold at most **2** units of grade A or S. Three if your general's SUPPLY is 80 or
more. Persia's trait adds one more. The UI greys out elite cards once the cap is full.

**Culture traits.** Count units per culture, with the general counting as one of theirs. **4** of a
culture switches on that culture's trait at level I; **6** switches on level II. A trait is a bundle of
multipliers on the army:

| Culture | Trait | Level I (4 units) | Level II (6 units) |
|---|---|---|---|
| Macedon | Combined Arms | wings +25% | wings +35%, roll-ups +30%, pikes ignore shaken |
| Greece | Hoplite Cohesion | Greek units STEADY +15%, cohesion +5% | same, plus steadiness +4% at contact |
| Persia | Weight of Numbers | +1 elite slot, steadiness +5% | +1 elite slot, steadiness +8%, center press +10% |
| Carthage | Mercenary Army | every non-Carthaginian unit all stats +5% | +8%, and TACTICS counts +20% on the wings |
| Rome | Manipular Reserve | cohesion +10% | cohesion +10%, never shaken by a charge |
| China | Crossbow Volleys | skirmish +20% | skirmish +30% (the "skirmish counts for more" line in the UI is not implemented, see section 9) |
| Steppe | Refuse Battle | skirmish +25% | skirmish +25%, half morale damage from a lost center press |
| India | Elephant Line | contact +8% | contact +15%, elephants rampage half as often |
| Gauls | Furor | contact +8% | contact +18%, cohesion −5% |

**Combined arms** is a free bonus on top of traits: if the army has at least one line, one cavalry and one
ranged or skirmish unit, wings get +10% and center press +5%.

**Slot penalties** still exist in the engine's card data from the old v1 model, but neither the web UI nor
the three-fronts resolver uses them. Only the AI drafter still does. See section 9.

---

## 5. Plan and ground

**The plan** is a row of multipliers chosen per battle on the Deploy screen, defaulting to the general's
doctrine:

| Plan | Skirmish | Contact | Steadiness | Center press | Wing press | Cohesion |
|---|---|---|---|---|---|---|
| Aggressive | ×0.90 | ×1.15 | ×0.90 | ×1.00 | ×1.00 | ×0.95 |
| Defensive | ×1.00 | ×0.90 | ×1.10 | ×1.05 | ×0.90 | ×1.05 |
| Envelopment | ×1.00 | ×1.05 | ×0.95 | ×0.90 | ×1.25 | ×1.00 |
| Skirmish | ×1.30 | ×0.95 | ×1.00 | ×0.95 | ×1.10 | ×1.00 |

Then the doctrine match adds ×1.08 to the first, second, fourth and fifth columns if the plan fits the
general's style.

**The ground** does two separate things.

*It scales unit stats by type* before the battle: on plains cavalry and chariots are ×1.05; on hills
cavalry ×0.8, chariots ×0.7, elephants ×0.85, ranged and skirmishers ×1.1; in forest cavalry ×0.7,
chariots ×0.6, pikes ×0.75, elephants ×0.8, skirmishers ×1.15, warbands ×1.1; at a river pikes ×0.85.

*It scales the stakes of each kind of fight*, meaning how much morale damage a win there inflicts: plains
wing fights ×1.1; hills wing ×0.5 and skirmish ×1.1; forest wing ×0.5, skirmish ×1.2, contact ×0.8; river
contact ×0.7. On hills or in forest the wings barely matter and the center decides the battle.

---

## 6. Deployment

Before each battle you see the enemy's eight units and general, and the ground. You do not see where they
will put their units. You place each of your eight on **Left**, **Center** or **Right**. Any split is legal.

**Who fights whom.** Your Left faces their Right. Your Center faces their Center. Your Right faces their
Left. Three separate fights run in parallel.

**Cohesion.** Each front gets its own cohesion threshold from its own units' STEADY plus the general's
charisma (section 2). The Deploy screen shows this as FIRM (1.0 or more), STEADY (0.92 to 1.0), or BRITTLE
(below 0.92). Typical values are 0.87 to 0.98. A front breaks when its accumulated morale damage reaches
its threshold.

**Frontage.** A front can only bring `1.5 × (enemy units opposite)` of its units into a contest, rounded
up. The rest are reserves and count at 25%. Eight units against three fight as five at full strength plus
three at a quarter. Packing the center does not scale.

**Empty fronts.** A front with no units facing an enemy front with units breaks at contact without a
fight. That costs the army a flat 0.15 morale plus the break shock (see section 7), so an empty wing is
0.25 morale on the spot and an empty center is 0.40. Two empty fronts opposite each other do nothing.

**The default deployment** is what the engine suggests and what the AI assumes you will do: line, shock
and foot-ranged units in the center, cavalry, skirmishers and specials dealt alternately to the wings by
wing power (SPEED 40% + FIGHT 40% + CHARGE 20%).

**What the AI does.** The AI drafts with a greedy heuristic (on-class, highest cost, chases culture
thresholds, rerolls its two weakest rows, plan = its general's style). At deployment it assumes you use
the default, then simulates about twenty variants of its own default against that assumption over six
seeds, and keeps the variant that wins most. It is reading your roster and optimising against the shape
the Rules page teaches you. That is why the reviews found that deploying "by the book" loses.

---

## 7. The battle

A battle is a sequence of **contests**. Every contest compares two scores and converts the gap into
morale damage:

```
edge   = |scoreA − scoreB| / max(scoreA, scoreB), capped at 0.6
damage = weight × groundStakes × edge × 2      to the losing front
         a quarter of that                     to the winning front
```

Every score is multiplied by the side's COMMAND factor and by a random factor drawn from a normal
distribution with mean 1 and standard deviation 0.15. So a 15% swing either way is one standard
deviation of luck, per contest.

After every stage, any front whose damage has reached its cohesion threshold **breaks** and its units
leave the field. Then **army morale** is recomputed:

```
army morale = Σ over fronts of (units on front / 8) × min(1, damage / threshold)
            + 0.10 per broken wing
            + 0.25 for a broken center
```

An army **routs** when its morale reaches **0.8** or when every front it deployed is broken. The battle
ends at once.

### Stage 1: Skirmish (weight 0.4)

Each front shoots the front opposite. A front facing an empty front shoots the enemy center instead.
Center units shoot at half strength because they are in formation.

```
per unit: SHOOT × (0.7 + 0.3 × SPEED/100) × matchup × (center ? 0.5 : 1)
front:    Σ units × (1 − avgArmorOpposite/100 × 0.5) × plan.skirmish × command × luck
```

Maximum damage to a losing front: 0.48 before ground stakes. A front with no shooters simply scores zero
and takes the full edge.

### Stage 2: Contact (weight 0.5)

All three pairs clash at once. Each side's score is impact plus steadiness.

```
impact     = Σ CHARGE × (CHARGE/100) × matchup
steadiness = Σ (STEADY × 0.6 + ARMOR × 0.4) × matchup
score      = (impact + 0.6 × steadiness × plan.steadiness) × frontage × plan.contact × command × luck
```

Losing contact by an edge above 0.25 makes that front **shaken**: all its units are ×0.9 for the rest of
the battle. Rome II is immune; Macedon II pikes are immune. Elephants on a front that loses contact badly
each have a 30% chance to rampage and add damage to their own front.

### Stage 3: The press (weight 0.25 per round, up to 4 rounds)

Fronts still standing fight round after round. The center grinds, the wings fight the cavalry fight.

```
center, per unit: (FIGHT × 0.5 + ARMOR × 0.3 + STEADY × 0.2) × matchup × shaken
center score:     Σ × N^0.3 × plan.center × 0.85^flanked × command × luck

wing, per unit:   (SPEED × 0.4 + FIGHT × 0.4 + CHARGE × 0.2) × sqrt(SPEED/100) × matchup × shaken
wing score:       Σ × N^0.3 × (0.7 + 0.6 × TACTICS/100) × plan.wing × command × luck
```

`N^0.3` is a small numbers bonus: four units score about 1.5× what one unit would per head. Frontage
still applies. On hills and forest the wing stakes are halved, so wing wins there hurt half as much.

### Stage 4: Roll-ups (weight 0.4, no damage to the charger)

At the start of each press round, any front whose opponent has broken is **free**. A free wing wheels
into the side of the enemy center. A free center turns onto whichever enemy wing is still fighting where
its own wing is worst off. The charge is one-directional: the charger's impact ×1.5 is set against the
steadiness of only the target units that can face it. Only the target takes damage. The target is marked
**flanked**, which costs it ×0.85 on every later center press, stacking. The charging units then join the
fight on that front. Two free wings on the same side is Cannae.

### Ending

Rout, all fronts broken, or the fourth round done. If both stand at the end, the side with higher army
morale damage loses. If both rout in the same stage, the one with more damage loses.

**Casualties** are for the report only. The loser takes 12% plus 35% of the morale gap plus 15% of the
winner's average wing SPEED, capped at 80%. The winner takes 4% plus up to 12% for a close fight.

**Events.** Once per battle there is an 8% chance an event fires: Downpour (skirmish damage ×0.3), The
general falls (loser of the center contact gets its center cohesion cut), Cavalry pursues off-field (a
free wing leaves instead of rolling up), Flank collapses (loser of a wing contact takes ×2), and
Reinforcements (campaign only, not active in the app). Elephant rampages are separate and rolled per
elephant unit, not from this list.

---

## 8. A worked battle

Seed 7 on plains, both sides drafted by the greedy bot. Hasdrubal Gisco (Carthage, COMMAND 60, CHARISMA
50, Defensive) against Lysimachus (Macedon, COMMAND 70, CHARISMA 55, Attrition style, Defensive plan).
Both match their doctrine, so both get the ×1.08. Both have combined arms. Lysimachus's command factor is
×1.06 against Hasdrubal's ×1.03: a 3% edge in every contest before anything else.

Hasdrubal deploys 3 / 3 / 2: horse archers, heavy cavalry and javelins on the Left; three infantry in the
Center; velites and war elephants on the Right. Lysimachus deploys 2 / 4 / 2 with a four-unit center
including the Theban Sacred Band and Qi Technicians.

Cohesion: Hasdrubal's center 0.94, Lysimachus's 0.98. The Macedonian center has higher STEADY on average.

**Skirmish.** Hasdrubal's Left (horse archers plus javelins, lots of SHOOT) fires into Lysimachus's Right
and wins 111 to 50. Edge 0.55, nearly the cap. Lysimachus's Right takes 0.44 damage in one volley, half
its cohesion, before anyone has touched. Army morale after skirmish: Hasdrubal 0.09, Lysimachus 0.36.

**Contact.** The wings are close. The center is not: 324 to 217, edge 0.33. Four units against three,
higher CHARGE, higher STEADY. Hasdrubal's center takes 0.33 and is shaken. Morale 0.29 to 0.42.

**Press 1 to 3.** Hasdrubal's Left keeps winning its wing fight (234 to 180, then 275 to 179, then 340 to
162) and grinds Lysimachus's Right toward breaking. But the shaken Carthaginian center loses every round
by widening margins (edge 0.25, 0.36, 0.42) while the Right loses narrowly too. In round 3 both happen at
once: Lysimachus's Right breaks, and Hasdrubal's Center breaks.

**Reckoning.** Hasdrubal's morale: Center 3/8 × 1 = 0.375, plus 0.25 center shock, plus Left 3/8 × 0.4,
plus Right 2/8 × 0.5. Total 0.91, over the 0.8 rout line. Lysimachus is at 0.73 and still standing.
Hasdrubal routs at press 3, and because his center broke and he lost, he falls.

What decided it: Hasdrubal won the missile exchange and the Left decisively, but a three-unit shaken
center against a four-unit steadier one lost every press, and a broken center is worth 0.625 morale by
itself. Had the Right held one more round, his free Left would have rolled into the Macedonian center's
flank in round 4.

---

## 9. Where the docs, the UI and the code disagree

These are the gaps a newcomer will trip over. All were confirmed in the code during this write-up.

- **Slot penalties are computed but not applied.** Engine cards still carry a penalty and a WRECKED flag
  from the old v1 model. The web UI hides them and the fronts resolver ignores them, which is consistent.
  But the greedy AI still discounts penalised cards, so the AI sometimes skips the best card in a row for
  a reason that no longer exists.
- **The river's "charge attacker ×0.7" is dead.** The prepare step reads it into a field the fronts
  resolver never uses. The river's real effect is contact stakes ×0.7 and pikes ×0.85.
- **China II "skirmish counts for more" does nothing.** The trait sets a v1 phase weight. The fronts
  resolver reads its skirmish weight from the fronts rules and ignores it.
- **Reinforcements never fires in the app.** The client calls resolve without the campaign flag.
- **The Rules page teaches the default deployment**, which is exactly the shape the AI optimises against.
- **Generals "die" with no consequence** beyond narration, since any loss already ends the run.
- **Spelling.** The handoff says ARMOUR and centre. The code and the site say ARMOR and center.

---

## 10. Cheat sheet

**If you want to win the skirmish:** SHOOT, then SPEED. China or Steppe at 4. Skirmish plan. Avoid armored
targets. Hills and forest raise the stakes.

**If you want to win contact:** CHARGE above all, since it is squared. STEADY and ARMOR to hold. India or
Gauls at 4. Aggressive plan. Rivers and forest lower the stakes.

**If you want to win the center:** FIGHT, then ARMOR, then STEADY. Numbers help a little. Persia at 6.
Defensive plan. Keep it from being flanked.

**If you want to win the wings:** SPEED, then FIGHT. A high-TACTICS general. Macedon at 4 or 6.
Envelopment plan. Plains only: on hills and forest the wings are worth half.

**If you want fronts that do not break:** STEADY on the units, CHARISMA on the general, Rome or Greece at 4.
Defensive plan.

**The general stat that matters most:** COMMAND, because it multiplies everything. Then CHARISMA for
cohesion, then TACTICS only if you plan to fight on the wings. SUPPLY only matters at 80 or above.
