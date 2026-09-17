# Warlord Draft — UI handoff v3: brief for the design session

*2026-09-16. This is a brief, not a finished spec. It tells a design session what the game is, what is already
built, what has changed in the gameplay plan, and what each screen must now do. The output we want back is
a new set of phone mockups and an updated UI-HANDOFF, in the same form as v2.*

Read this file first. Everything needed is here or in this folder:

| File | What it is |
|---|---|
| `UI-HANDOFF-V3.md` | This brief |
| `UX-REVIEW.md` | The UX designer's full review of the current build against the gameplay plan: top ten problems, a screen-by-screen brief, the token, comparison, trait and morale proposals, accessibility, a keep list |
| `screens/01…17.jpg` | The current build, captured at phone width on 2026-09-16 from a real run (a loss at battle one) |
| `../ui-handoff-v2/` | The spec and mockups the current UI was built from. The visual system there still stands |

Live build of the current UI: https://warlord-draft.vercel.app

---

## 1. The game in one page

A free, phone-first daily. **Draft an ancient army. Read the enemy. Watch the war.**

1. **Pick a general**, one of three offered, from 81 historical commanders (400–200 BC).
2. **Draft eight units** from an eight-row board, four cards a row. Two rerolls, plus one extra that everyone may take.
3. **Three battles in a row.** Before each you see the enemy's **army but not his line**. You place your eight
   units on the **Left, Center or Right**, choose a plan, and then watch a beat-by-beat report you cannot interrupt.
4. **One loss ends the run.** Everyone gets the same board today, so results are comparable.

**Core fantasy: you are the general who out-thinks the other general.** The high point is a deployment read
that pays off. When choices conflict, **decisions and legibility beat spectacle and collection.**

**The player** is a daily-puzzle player with a history itch: one campaign a day, on a phone, in five to ten
minutes. They have opinions about Hannibal. **They do not read stat tables.** "Too complex" means: it needs a
number the screen does not show, or a rule that cannot be said in one sentence.

**Pillars** (each screen should serve at least one):
1. Every choice is a tradeoff, never a lookup.
2. Deployment is a bet on hidden information.
3. Battles are explainable: you always know why you lost.
4. One board for everyone; any result replays from its inputs.
5. Historical first, and a stat sim: no map, no control once the lines meet.

**Never:** control during battle; grind or unlocks; power for sale.

---

## 2. What stays from v2

The v2 visual system is sound and is **not** being redesigned. Keep:

- **Phone-first**, 390×844 artboards; desktop is the same components laid wide.
- **Palette v2, "colour is the culture".** Warm-dark neutral chrome; each of nine cultures owns a deep fill and
  a bright ink; grades are achromatic; rust means "you are here" and nothing else. Tokens are in
  `../ui-handoff-v2/UI-HANDOFF.md` §2 and `apps/web/src/app/globals.css`.
- **Type:** Instrument Serif for display, IBM Plex Sans for text, IBM Plex Mono for labels and numbers.
- **Stats are words:** FIGHT · SHOOT · ARMOR · SPEED · STEADY · CHARGE for units; COMMAND · TACTICS · SUPPLY ·
  CHARISMA for generals. US spelling (ARMOR, center).
- **No emoji.** Real buttons and links, 44pt minimum. 28pt of bottom safe area.
- **Players see grades, never cost.**
- **His line is hidden at Deploy.**

And keep these things the current build does well (`UX-REVIEW.md` §I has the full list):

- The **general reveal**: three cards turn over by themselves.
- The **reel** on each draft row, and the **consequence line** under every card ("STEPPE 1 OF 4", "ELITE CAP
  FULL — DROP ONE TO TAKE THIS"). That one-line "what this costs or unlocks" idiom is the app's best reusable
  pattern. Carry traits, the handicap and the new culture counts on it.
- The **Deploy inspector's prose**: "On a wing it presses at 60 and charges 30. In the center it would grind at
  36 and lose its Speed." This is the register for all new copy.
- The **cohesion words** FIRM · STEADY · BRITTLE.
- **Narration-first battle beats** that name units.
- **Resume in plain words**: "Resume — battle 1, the battle".
- The Numbers page's **sentence, then formula** pattern.

---

## 3. What is wrong with the current UI

Ranked by damage to the core fantasy and to the target player. Screenshots in `screens/`.

| # | Problem | See |
|---|---|---|
| 1 | **The enemy is not on the Deploy screen.** The one input the bet depends on is a page away, as 48 numbers, with no view of your own line | 08, 10, 11 |
| 2 | **A unit is a grade letter.** The bench reads "C C C C C C D". You cannot build "my cavalry is on the right" from the tokens | 08, 11 |
| 3 | **Four six-stat cards with nothing to help compare them.** Twenty-four silent comparisons a row | 06 |
| 4 | **The loser gets the thinnest screen in the app**, and the enemy's line is revealed only as caption text: "you 2 \| 4 \| 2 · him 2 \| 3 \| 3" | 15 |
| 5 | **Morale reads backwards.** 0.38 against 0.31, "rout at 0.80": bigger means losing | 12–14 |
| 6 | **Culture colours collide in battle.** Greece cyan against Macedon blue; you cannot tell whose bar is whose | 12, 13 |
| 7 | **The plan picker shows engine internals**: six multipliers and a doctrine bonus that is being deleted | 11 |
| 8 | **Primary buttons fall below the fold** on General, Draft and Deploy | 03, 05 |
| 9 | **The battle has no field.** The line you built vanishes; new beats land below the fold; "RECKONING" is truncated | 12–14 |
| 10 | **Three unexplained "?" boxes** open the Today screen, and its lower half is empty | 01 |

---

## 4. What has changed in the gameplay plan

These are decided by the designer and **not yet built**. The mocks should show the game as it will be.

### 4.1 Traits replace doctrine and the old culture bonuses

One shared pool of **fifteen traits**. A trait is **a word and a sentence**. Players learn them once and meet
them everywhere.

- A **general** carries 0 to 3 traits. Greater generals have more. He keeps his four stats as well.
- A **culture** grants its trait when you field **four** of its units, and a second level at **six**. The
  general counts as one unit of his culture.
- The **same trait stacks**, up to level **III**. Shown as a numeral: *Steady II*.
- The general's **style label and the doctrine bonus are gone.** Delete "ENVELOPMENT" style chips and
  "Matches Epaminondas: +8% everywhere".
- **No percentages on cards.** Sizes live on the Numbers page only.
- **Every trait that acts in a battle is named in the report** at the beat where it acted.
- The player only needs two in mind at a time: their own, and the foe's, printed on his card.

| Trait | What the player is told | Granted by culture |
|---|---|---|
| Deep ranks | Fresh ranks step up: your fronts recover a little each round | Rome |
| Steady | Your fronts take more punishment before they break | Greece |
| Hammer and anvil | A wing of yours that breaks its opponent wheels into his center harder | Macedon |
| Numbers | Weight of numbers counts for more in the press | Persia |
| Mercenary captain | Units from outside your general's culture fight better | Carthage |
| Volley | Your center shoots harder | China |
| Harass | Your wings win the missile exchange more heavily | Steppe |
| Terror | Fronts that lose the clash to you shake sooner and fight worse for it | India |
| Furor | You hit harder at the clash, and a little weaker every round after | Gauls |
| Envelopment | Your wings press harder | generals only |
| Oblique order | Your most heavily loaded front hits harder at the clash | generals only |
| Delayer *(rule)* | None of your fronts can break before the second round | generals only |
| Rally *(rule)* | The first of your fronts to break holds for one more stage | generals only |
| Master of ground *(rule)* | Ground penalties on your units are halved | generals only |
| Scouts *(rule)* | Before you deploy, you are told which of his fronts is heaviest | generals only |

The first eleven have levels I–III. The four rule traits are on or off. Full design: `design/gdd/traits.md`.
Which general has which: `design/content/general-traits-draft.md`.

### 4.2 The handicap

Generals now belong on the leaderboard. **A weaker general is a handicap you choose**: among equal results,
the run with the weaker general ranks higher, and every general has its own ranking. The ladder needs a
backend and is out of scope, but **the handicap is shown now** on the general card at pick time and on the
result card ("Conquered with Flaminius, handicap +3"). A general with no traits must read as a brave pick,
not a bad one. How to word and show the handicap is an open design question (§9).

### 4.3 The draft board

- Board shape becomes **2 line, 1 cavalry, 1 ranged, 4 flex**. The flex rows are where an army's identity is decided.
- **Rows no longer have a culture.** Each of the four cards in a row comes from any culture. The row header
  "LINE · Steppe" goes away; **each card carries its own culture** and its own count toward that culture's trait.
- **Rerolls:** two, plus **one extra rewarded reroll open to every player**, daily included. It must read as
  part of the game, not as a monetisation hook.
- Today the player sees all three foes and grounds before drafting. Keep that: it makes the draft a plan.

### 4.4 Deployment and the AI

- The player gets the **enemy's roster and a one-sentence prose read. No hint of his shape.** Any pre-battle
  matchup help must work from his roster, never from where his units stand. ("He has three cavalry units; your
  spears are favoured against them wherever they meet.")
- **Scouts is the one exception**: it tells the player which enemy front is heaviest.
- The **pitch starts empty and every unit is placed by hand.** No auto-deploy button.
- The **plan** is still chosen here, per battle, from four options, with **consequences in words, not
  multipliers**. It may be cut later; design it so it can be removed without leaving a hole.
- **Ground in plain words, both effects.** It changes how some units fight ("In forest, horse fights at 70%") and how
  much a won fight is worth ("On hills, a won wing counts for half").
- **Foes climb.** Battle one is a weaker general with a cheaper army; battle three is a great general at full
  strength. The player should feel the climb without doing arithmetic.

### 4.5 The battle report and what follows it

- **Every battle event is narrated** (downpour, a flank collapsing, cavalry pursuing off the field). Today four of five are silent.
- **His line is revealed after the battle, large**, beside yours. This is the game's main teaching tool.
- **A loss names its turning point**: "Your left broke in round three. His cataphracts wheeled into your center."
- A front breaking early, at the clash, is intended drama and should be called out loudly.

---

## 5. Decisions already taken for this pass

Taken with the designer on 2026-09-16. Do not reopen.

1. **The enemy on Deploy is an always-visible strip plus a sheet.** A compact row of his eight unit tokens, his
   general with trait words, and his one-line read sit above the pitch at all times. Tapping opens his full
   cards as a sheet **over Deploy**, so placement is never lost. The separate roster page goes away.
2. **Tokens are abstract class shapes with a culture edge.** Six simple geometric marks, one per class (line,
   shock, cavalry, ranged, skirmish, special), as the dominant mark. Culture colour on the edge or corner.
   Grade demoted to a corner tick or border weight. Name and stats on tap only. No illustrator needed.
3. **Morale is shown as strength remaining, with words.** Each army has a bar that drains, labelled FIRM,
   STEADY, BRITTLE, then ROUTED. Bigger is better. Display only: the engine value is unchanged and still
   appears on the Numbers page.
4. **No "best pick" tag on draft cards.** Help the player compare; never tell them the answer. A badge that
   names the best card turns the draft into a lookup and breaks pillar 1.

---

## 6. Screen-by-screen brief

For each: the player's question, the hierarchy, what changes, what to remove. `UX-REVIEW.md` §B has more
detail and the required states for every screen.

### 6.1 Today
**"Is there a game waiting, and what is today's shape?"**
- Primary: the date, the three foes with their grounds, one button. Show that the foes **climb** (battle three
  should look like the hard one).
- Each foe shows his culture and his **trait words**.
- The three "?" boxes are the three face-down generals. Either say so ("Three generals are waiting") or
  remove them. Never open on an unexplained placeholder.
- Use the empty lower half: last five results, a streak, and once it exists the ladder.
- States: first visit, run in progress (resume in plain words, keep), daily done, loading with words.

### 6.2 General
**"Which of these three fits today's board, and how brave do I want to be?"**
- Primary: name, culture, **up to three trait words each with its sentence**. This is where traits are first
  met, so give the sentence room.
- Secondary: the four stat bars (keep), the elite count, the **handicap**.
- A general with no traits still needs a card that feels like a choice, not a gap.
- Remove: the style chip. Fix the dead band at the foot of each card so the button is on screen.
- States: revealing (keep the auto-flip), picked, resumed without re-flipping, first-time hint for the handicap.

### 6.3 Draft row
**"Which of these four is better for the army I am building?"**
- The row is typed only by slot: LINE, CAVALRY, RANGED or FLEX. **No row culture.**
- Each card: class shape (same mark as its token), name, **its own culture**, grade, six stats, consequence line.
- **The comparison fix:** the two stats that matter for this row are loud; the other four are quiet but
  present. Show each card's value on those two stats **against the row's best** (a delta, a short bar, a
  position), so the player reads one number and a position rather than four numbers.
- **Flex rows** vary in class and culture within a row, and there are four of them. They need the most help.
  Consider foregrounding what the army still lacks ("you have no shooters yet").
- The consequence line now carries the card's own culture count: "ROME 3 OF 4 → DEEP RANKS".
- Rerolls read as "2, plus 1 free for everyone".
- Pin the step header and the primary button. Give the four card buttons accessible names.

### 6.4 Board sheet
**"What have I got, and where is the gap?"**
- Group by slot, not by culture. Each pick shows its class shape and culture.
- Add the running **trait tally**: which traits are on, at what level, and what is one unit away.
- Make it a true sheet over the row, not a separate page.

### 6.5 Deploy — the core screen
**"Given what I know about his army, where do I put mine?"**

This screen needs re-ordering, not re-skinning. From top to bottom:
1. **Header:** battle n of 3, the foe's general, that this is the easy, middle or hard battle.
2. **The enemy strip:** his general with **trait words**, his eight unit tokens (class shape, culture edge,
   grade tick), and the one-line read. Always visible. Tap for the sheet of full cards.
3. **Scouts slot:** if the player's general has Scouts, the heaviest enemy front is stated here, persistently,
   in its own treatment. It is the only shape information the game ever gives.
4. **The ground**, in two short plain clauses.
5. **The pitch:** three fronts, the player's tokens, a cohesion word per front. Drop the raw decimals
   ("BRITTLE 0.90") to the word alone, with the number on tap.
6. **The inspector** (keep the prose). When nothing is held, use the space for roster-level matchup help:
   "He has two cataphract units. Your spears are favoured against them wherever they meet."
7. **The bench.**
8. **The plan**, as four options, each with one sentence of consequence. No multipliers. Removable.
9. **The pinned primary button.**

- Own trait effects that depend on the line should be visible while placing. *Oblique order* rewards an uneven
  line, so show which front is currently heaviest. *Volley* wants shooters in the center.
- Empty-front warnings in words: "Nobody here. This front gives way the moment it is touched."
- States: empty pitch, placing, token held, ready, resumed with a partial line, first-time hint when a
  cohesion word first changes.

### 6.6 Battle report
**"What just happened, and why?"**
- **Pinned header:** both armies' strength bars with their word, and a **persistent three-front strip** showing
  both lines. The line the player built should visibly carry over from Deploy.
- **Newest beat at the top**, under the header. Narration first (keep).
- **A second channel beyond hue** for "yours" and "his": position, pattern, label. Greece against Macedon must be readable.
- **Trait and event beats** get the key-beat treatment a break gets today: "Fresh ranks step up on the left:
  Rome's line recovers." "A downpour: the arrows fall short."
- Pair the percentages with words: "yours, clearly", "his, narrowly", "even".
- **The final beat is the reveal**: his line beside yours, front for front, large.
- Controls pinned: Play, Next beat, Skip. Key beats and Every beat toggle (keep).

### 6.7 Between battles (after a win)
**"How did that go, and what am I walking into?"**
- The chronicle (keep), the line reveal, then the next foe: his general, his trait words, his ground, and that
  he is harder.

### 6.8 Result — win and loss should differ
- **Loss.** Lead with the **named turning point**. Then the chronicle, the same one a win gets. Then the
  **line reveal at full size**. Then the share card. A loss is the most common ending and the one people learn from.
- **Win.** Lead with the campaign and the **handicap**: "Conquered with Flaminius, handicap +3". Then casualties,
  then the share card.
- Both: name any trait that decided the turning point. Preview the ladder in words ("Ranked by battles won, then
  by general, then by losses") even before it exists.
- The text share card exists today; keep it, no spoilers, no emoji.

### 6.9 Rules
- The 3×3 culture grid is already the right shape. Each cell becomes **the trait word and one plain clause**,
  no percentage. Add the six general-only traits beneath it.
- Replace the doctrine step with traits. State the reroll rule. State the handicap in one sentence.

### 6.10 Numbers
- The on-demand tier. Add an entry per trait with its size at levels I, II and III. Document SUPPLY's second
  job (slightly better cards) and the handicap.

---

## 7. New components to design

1. **Unit token**, at about 48–56pt, in three contexts: bench, pitch, enemy strip. Six class shapes, culture
   edge, grade tick, held and placed states, a broken or shaken state for the battle strip.
2. **Trait chip**: word plus level numeral; a long form with its sentence and a short form without. States: on,
   one unit away, off. Rule traits may want a distinct treatment from scaling traits.
3. **Enemy strip and enemy sheet** for Deploy.
4. **Strength bar** with its four words, for the battle header and the front strip.
5. **Line reveal**: your three fronts against his three, front for front. Used in the last beat, on Between and on Result.
6. **Draft card v3**: class shape, per-card culture, loud and quiet stats, delta against the row's best,
   consequence line.
7. **Handicap mark** for the general card and result card.
8. **First-time hint**: one line, shown once, when a rule first matters.
9. **Plan option** with a consequence sentence.

---

## 8. Must-haves

- **The primary action is pinned.** Only the middle of the screen scrolls. New content on Deploy must not push
  the button down; the enemy strip stays compact and the sheet does the rest.
- **Touch targets 44pt or more**, including tokens once the glyph shrinks them.
- **Every control has an accessible name.** Disabled cards stay focusable and say why.
- **Reduced motion:** the reel and the card flip become instant.
- **No informational text under about 11–12pt.** The stat words are the game's vocabulary and are currently
  its least legible text.
- **Contrast of 4.5 to 1** for anything carrying game state. `../reviews/2026-09-16-art-review.md` has the
  measured failures.
- **Never rely on hue alone.** Several culture pairs collapse for colour-blind players, and Greece against
  Macedon collapses for everyone.
- Do nothing that makes a later desktop layout harder.

---

## 9. Open questions for the design session

Each has a recommendation. Decide, and say so in the returned handoff.

1. **How is the handicap worded and shown?** A number, a word ("a bold pick"), or stars? It must make a
   traitless general feel brave. Recommendation: a small signed number with a one-line gloss the first time.
2. **Do rule traits look different from scaling traits?** Recommendation: yes, subtly, since they are rarer and
   change how a battle plays rather than how hard something hits.
3. **How does the draft delta look?** A signed number, a short bar, or a position marker on a shared scale.
   Recommendation: a short bar on a shared scale; it reads faster than signed numbers.
4. **Where does a flex row get its two loud stats?** Fixed, or from what the army lacks. Recommendation: from
   what the army lacks, stated in the row hint.
5. **Does the line reveal show units or only counts?** Recommendation: unit tokens, front for front. Counts
   alone are what we have today and they teach little.
6. **Is the plan picker worth its space on Deploy?** It may be cut. Recommendation: design it collapsed by
   default, showing the current plan in one line.
7. **Does the rewarded reroll need its own moment?** Recommendation: no; one line in the reroll control.
8. **What do the three face-down general cards on Today become?** Recommendation: keep them as a small, labelled
   tease of the pick to come, or remove them.

---

## 10. Real data to use in the mocks

From the captured run, so the mocks tell a true story.

**The pick:** Spitamenes (Steppe; *Harass, Envelopment*), **Epaminondas** (Greece; *Oblique order, Deep ranks*;
COMMAND 85, TACTICS 100, SUPPLY 65, CHARISMA 85), Fabius Maximus Cunctator (Rome; *Delayer, Steady*; SUPPLY 85
so three elites). Illustrative handicaps: Epaminondas +1, Fabius +2, Spitamenes +4.

**The player's army:** Camp Guard (Dismounted) — C, line, Steppe · Roman Hoplites (Servian) — C, line, Rome ·
Warband — C, shock, Gauls · Saka Horse Archers (Allied) — C, cavalry, Persia · Athenian Hippeis — C, cavalry,
Greece · Cretan Archers — C, ranged, Greece · Persian Archers — D, ranged, Persia · Zhao Cavalry — B, cavalry, China.

**Battle one, on hills, against Alexander III** (Macedon; *Oblique order, Hammer and anvil, Rally*; COMMAND 90,
TACTICS 90, SUPPLY 75, CHARISMA 100): Gaesatae — B, shock · Libyan Veterans (Roman Kit) — A, line · Melophoroi
(Apple-Bearers) — B, shock · Kshatriya Noble Cavalry — B, cavalry · Massagetae Cataphracts — B, cavalry ·
Thracian Peltasts — B, skirmish · Iberian Caetrati — B, skirmish · Immortals — A, line.
His read: "He brings four that stand, two that ride and two that skirmish. Half his army rides. Expect
strong wings and a thin center."

**The lines:** the player 2 · 4 · 2 (Left: Saka Horse Archers, Persian Archers. Center: Camp Guard, Roman
Hoplites, Warband, Cretan Archers. Right: Athenian Hippeis, Zhao Cavalry). Alexander 2 · 3 · 3.

**The story:** the player wins the missile exchange on the left and center. At the clash his cataphracts carry
the player's left, which is shaken. The left is ground down over three rounds and **breaks in round three**.
In round four the cataphracts **wheel into the player's center**. Neither army routs; the player's has less
left. Lost at battle one, 35% casualties against 11%.
Turning point, as the loss screen should say it: *"Your left broke in round three. His Massagetae Cataphracts
wheeled into your center, and the line had nothing left."*
(Under the new rules Alexander's *Hammer and anvil* would be named in that wheel-in beat.)

---

## 11. What we want back

1. Phone artboards at 390×844 for: Today, General, Draft row (a typed row and a flex row), Board sheet,
   Deploy (empty, token held, ready, and with the enemy sheet open), Battle (first beat, mid, a trait beat, the
   reveal), Between, Result (loss and win), Rules, Numbers.
2. A component sheet for §7, with states.
3. A token sheet: the six class shapes at real size on all nine culture colours, including the worst colour pairs.
4. An updated UI-HANDOFF in the v2 form: decisions, screens, the rules the UI computes (new consequence lines,
   the draft delta, trait tally), motion, narration templates for trait and event beats, open items, build order.
5. Answers to §9.

**Out of scope:** the ladder and standings, accounts, desktop layouts, illustration, sound, 1v1.

**Sources in the repo, if the session has it:** `design/gdd/game-concept.md`, `design/gdd/traits.md`,
`design/gdd/deployment.md`, `design/gdd/draft.md`, `design/gdd/campaign.md`, `docs/MECHANICS.md`,
`docs/reviews/2026-09-16-ux-review.md`, `docs/reviews/2026-09-16-art-review.md`.
