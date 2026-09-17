# General Traits — Draft Assignment

> **Status**: Draft for the designer to edit. Nothing here is shipped.
> **Date**: 2026-09-16
> **Parent**: `design/gdd/traits.md`
> **Data**: `packages/engine/src/cli/lab/general_traits.ts` (edit this, then re-run the simulation to regenerate the numbers)
> **Simulation**: `npx tsx src/cli/lab/general_traits_sim.ts 40000 --md` — 40,000 battles, bot-drafted armies, default lines, new culture traits at 4 and 6 units, same trait stacking to III, doctrine removed

## Read this first: traits on top of today's stats make the lottery worse

| Setup | General win rates | Spread (SD) | 0 traits | 1 trait | 2 traits | 3 traits |
|---|---|---|---|---|---|---|
| Today: current stats, doctrine, old culture traits | 21%–80% | 12.7 | 38.0% | 48.1% | 58.5% | 73.6% |
| Traits added, stats unchanged | 22%–84% | **15.3** | 33.1% | 47.1% | 63.7% | 77.4% |
| Traits added, stats compressed halfway to 70 | 28%–78% | 11.4 | 37.3% | 47.7% | 60.5% | 70.7% |
| Traits added, stats compressed three-quarters to 70 | 33%–72% | 9.2 | 40.0% | 48.0% | 58.6% | 66.0% |

(The trait-count columns are the average win rate of the generals in that group.)

The famous generals already have the best stats. Giving them the most traits as well counts their greatness
twice, and the spread widens from 12.7 to 15.3. "Greater generals have more traits" only works if the stats
stop saying the same thing. Three ways to get there:

1. **Compress the stats hard** (three-quarters of the way to 70, so roughly 59–78 instead of 40–100). Traits
   then carry most of the difference and the spread falls to 33%–72%. Simple, and the four stats stay on the card.
2. **Let stats and traits trade off.** A three-trait general gets ordinary stats; a traitless general can have
   one standout stat. Historically odd for Hannibal, but it makes every general good at something.
3. **Accept the spread and price it.** Keep the stats, and let the ladder handicap (measured win rate) make a
   weak general the brave pick. This needs the handicap visible on the card from day one.

These combine. My suggestion is 1 plus 3: compress hard, and show the handicap.

## The assignment at a glance

- **3 traits (5 generals):** Alexander, Hannibal, Scipio Africanus, Bai Qi, Han Xin.
- **2 traits (22):** the other famous names, e.g. Philip II, Pyrrhus, Epaminondas, Fabius, Marcellus, Hamilcar,
  Wu Qi, Sun Bin, Chandragupta, Xiang Yu.
- **1 trait (34):** solid commanders with one thing they were known for.
- **No traits (20):** the unlucky, the obscure and the beaten: Flaminius, Regulus, Darius's satraps, Pang Juan.
  With a handicap these are the prestige picks.
- **Rule traits** (Delayer, Rally, Master of ground, Scouts) go to 18 generals, never more than one each,
  except Hannibal, who has two.

| Strongest under the proposal | | Weakest under the proposal | |
|---|---|---|---|
| Alexander III (Oblique order, Hammer and anvil, Rally) | 78% | Hasdrubal Gisco (no traits) | 28% |
| Hannibal Barca (Envelopment, Scouts, Master of ground) | 74% | Artaxerxes II (Numbers) | 32% |
| Pyrrhus of Epirus (Terror, Rally) | 72% | Bessus (no traits) | 32% |
| Scipio Africanus (Envelopment, Scouts, Deep ranks) | 70% | Darius III (Numbers) | 33% |
| Marcus Claudius Marcellus (Rally, Furor) | 69% | Bindusara (no traits) | 33% |
| Philopoemen (Envelopment, Master of ground) | 68% | Concolitanus (no traits) | 33% |
| Marcus Furius Camillus (Deep ranks, Rally) | 67% | Himilco (no traits) | 34% |
| Xiang Yu (Furor, Rally) | 67% | Hasdrubal the Fair (no traits) | 35% |

Things the numbers flag for a second look:
- **Rally dominates the top of the table.** All five Rally holders are in the top eight: Alexander 78%,
  Pyrrhus 72%, Marcellus 69%, Camillus 67%, Xiang Yu 67%. Marcellus and Xiang Yu have ordinary stats and get
  there on Rally alone. It was already the strongest trait (+12) and the one that cannot be dialled down.
  This is the clearest case for weakening it: wings only, or the rallied front fights shaken.
- **A rule trait lifts a weak general a long way.** Ariobarzanes (Master of ground, for the Persian Gates) is
  historically perfect, and it moves him from 31% to 44%: from the bottom of the roster to just below the middle.
- **Every Gaul has Furor or nothing**, and the Gallic culture trait is also Furor, so Gallic generals are all
  depth and no breadth. That suits them, but it makes the seven feel alike. One could take Terror (Brennus at
  the Allia already does) or Harass.
- **Steppe generals are all Harass** for the same reason. With three generals that is probably fine.
- **Delayer appears four times** (Fabius, Memnon, Lian Po, Wang Jian). All four earned it; it is also the
  trait that most changes how a battle plays.

## The full table

Win rates are simulated, per general, over about 1,000 battles each. "Today" is the live game. The last
column is this assignment with stats compressed halfway to 70, which is roughly as unequal as today.

### Macedon & Successors

| General | Traits | Why | Win rate today | With traits and halved stats |
|---|---|---|---|---|
| Philip II | Hammer and anvil, Oblique order | Built the phalanx-and-Companions army; Chaeronea's refused flank | 67% | 61% |
| Alexander III | Oblique order, Hammer and anvil, Rally | Led the decisive wedge himself at Issus and Gaugamela; his presence turned wavering lines | 76% | 78% |
| Parmenion | Steady | Held the left at Gaugamela while Alexander won the battle | 58% | 54% |
| Antigonus Monophthalmus | Hammer and anvil | Paraetacene and Gabiene: Macedonian combined arms at full scale | 63% | 55% |
| Eumenes of Cardia | Mercenary captain, Scouts | A Greek secretary commanding Macedonians; out-manoeuvred Antigonus by deception | 58% | 57% |
| Seleucus I Nicator | Terror | Four hundred elephants decided Ipsus | 63% | 54% |
| Ptolemy I Soter | Steady | Gaza 312: a prepared line that stopped Demetrius's elephants | 59% | 54% |
| Demetrius Poliorcetes | Furor | Brilliant and erratic; his cavalry won its wing at Ipsus and rode off the field | 55% | 54% |
| Lysimachus | — | — | 41% | 40% |
| Craterus | Steady | Alexander's infantry commander, beloved of the phalanx | 55% | 51% |
| Pyrrhus of Epirus | Terror, Rally | Elephants the Romans had never seen; fought in the front rank at Heraclea and Asculum | 66% | 72% |
| Antigonus III Doson | — | — | 50% | 44% |
| Philip V | — | — | 48% | 45% |
| Antiochus III the Great | Numbers | Raphia and the anabasis: the great eastern levy | 56% | 55% |

### Greek city-states

| General | Traits | Why | Win rate today | With traits and halved stats |
|---|---|---|---|---|
| Xenophon | Mercenary captain, Master of ground | Brought ten thousand mercenaries home across the Armenian mountains | 56% | 63% |
| Agesilaus II | Steady | Spartan discipline at Coronea | 49% | 44% |
| Iphicrates | Harass, Mercenary captain | His mercenary peltasts destroyed a Spartan regiment at Lechaeum | 53% | 54% |
| Chabrias | Steady | Ordered his hoplites to kneel and hold; Agesilaus declined to attack | 44% | 42% |
| Epaminondas | Oblique order, Deep ranks | Leuctra: the left wing fifty shields deep, the right refused | 70% | 64% |
| Pelopidas | Furor | The Sacred Band as a shock force; Tegyra | 54% | 50% |
| Dionysius I of Syracuse | Mercenary captain | A tyrant's army of hired Greeks, Iberians and Campanians | 46% | 46% |
| Timoleon | Master of ground | Crimissus: struck the Carthaginians as they crossed a river in a storm | 53% | 54% |
| Agathocles | — | — | 47% | 42% |
| Agis III | — | — | 36% | 37% |
| Cleomenes III | — | — | 47% | 42% |
| Philopoemen | Envelopment, Master of ground | Plutarch: he studied ground obsessively; his cavalry decided Sellasia | 64% | 68% |

### Achaemenid Persia

| General | Traits | Why | Win rate today | With traits and halved stats |
|---|---|---|---|---|
| Artaxerxes II | Numbers | Cunaxa: the royal levy | 23% | 32% |
| Pharnabazus | Harass | His cavalry harried Agesilaus across Phrygia | 38% | 44% |
| Memnon of Rhodes | Delayer, Mercenary captain | Urged scorched earth against Alexander; commanded the Greek mercenaries | 45% | 57% |
| Darius III | Numbers | Issus and Gaugamela | 21% | 33% |
| Mazaeus | Envelopment | His cavalry nearly broke Parmenion's wing at Gaugamela | 40% | 42% |
| Bessus | — | — | 26% | 32% |
| Ariobarzanes | Master of ground | Held the Persian Gates for a month | 31% | 44% |

### Carthage

| General | Traits | Why | Win rate today | With traits and halved stats |
|---|---|---|---|---|
| Himilco | — | — | 34% | 34% |
| Hamilcar Barca | Mercenary captain, Harass | Years of raiding from Mount Eryx; then put down his own mercenaries | 67% | 63% |
| Xanthippus | Terror, Envelopment | Bagradas: elephants through the center, cavalry around both flanks | 53% | 54% |
| Hasdrubal the Fair | — | — | 36% | 35% |
| Hannibal Barca | Envelopment, Scouts, Master of ground | Cannae, Trasimene, the Alps | 80% | 74% |
| Hasdrubal Barca | — | — | 43% | 37% |
| Mago Barca | Envelopment | Sprang the ambush at the Trebia | 47% | 46% |
| Hasdrubal Gisco | — | — | 28% | 28% |
| Maharbal | Harass | Commander of the Numidian horse | 44% | 45% |

### Rome

| General | Traits | Why | Win rate today | With traits and halved stats |
|---|---|---|---|---|
| Marcus Furius Camillus | Deep ranks, Rally | Credited with the manipular reforms; second founder of Rome after the Allia | 63% | 67% |
| Papirius Cursor | Steady | Cursor, the disciplinarian of the Samnite wars | 56% | 54% |
| Fabius Maximus Rullianus | Deep ranks | Sentinum: held his reserves until the Samnites tired | 57% | 54% |
| Manius Curius Dentatus | Steady | Stood against Pyrrhus's elephants at Beneventum | 56% | 53% |
| Marcus Atilius Regulus | — | — | 36% | 39% |
| Gaius Flaminius | — | — | 34% | 38% |
| Fabius Maximus Cunctator | Delayer, Steady | The Delayer | 57% | 63% |
| Lucius Aemilius Paullus | — | — | 41% | 38% |
| Marcus Claudius Marcellus | Rally, Furor | The Sword of Rome: beaten by Hannibal one day, back in the field the next; killed a Gallic king in single combat | 66% | 69% |
| Gaius Claudius Nero | Envelopment | Metaurus: marched his wing behind the army to fall on the Carthaginian flank | 67% | 61% |
| Publius Cornelius Scipio | — | — | 35% | 36% |
| Scipio Africanus | Envelopment, Scouts, Deep ranks | Ilipa's reversed line and double envelopment; the lanes and reserves at Zama | 74% | 70% |

### Warring States China

| General | Traits | Why | Win rate today | With traits and halved stats |
|---|---|---|---|---|
| Wu Qi | Steady, Volley | The Wei Wuzu: picked, drilled heavy infantry; never beaten, by tradition | 58% | 57% |
| Sun Bin | Scouts, Volley | Maling: ten thousand crossbows waiting in the dusk | 48% | 50% |
| Pang Juan | — | — | 36% | 36% |
| King Wuling of Zhao | Harass | Put Zhao in nomad dress and on horseback with bows | 50% | 48% |
| Yue Yi | Mercenary captain | Led a five-state coalition army into Qi | 49% | 45% |
| Tian Dan | Terror | The fire-oxen of Jimo | 47% | 48% |
| Bai Qi | Envelopment, Terror, Numbers | Changping: an army encircled and destroyed; a name that emptied cities | 69% | 66% |
| Lian Po | Delayer, Steady | Held Changping by refusing battle, until he was replaced | 52% | 59% |
| Li Mu | Volley, Envelopment | Feigned weakness for years, then enveloped the Xiongnu with massed archers and chariots | 62% | 59% |
| Wang Jian | Numbers, Delayer | Demanded six hundred thousand men for Chu, then waited a year for Chu to tire | 62% | 65% |
| Meng Tian | Volley | Crossbows against the Xiongnu in the Ordos | 46% | 45% |
| Xiang Yu | Furor, Rally | Broke the cauldrons and sank the boats at Julu | 62% | 67% |
| Han Xin | Numbers, Envelopment, Scouts | 'The more the better'; repaired the plank roads in the open and marched by Chencang | 70% | 67% |

### Steppe

| General | Traits | Why | Win rate today | With traits and halved stats |
|---|---|---|---|---|
| Ateas | Harass | Scythian horse archers | 47% | 47% |
| Spitamenes | Harass, Envelopment | Polytimetus: feigned flight, then a ring of horse archers around a Macedonian column | 51% | 53% |
| Arsaces I | Harass | The Parni on horseback | 50% | 50% |

### India

| General | Traits | Why | Win rate today | With traits and halved stats |
|---|---|---|---|---|
| Porus | Terror | The elephant line at the Hydaspes | 48% | 43% |
| Chandragupta Maurya | Numbers, Terror | Six hundred thousand foot and nine thousand elephants, by Greek report | 62% | 57% |
| Bindusara | — | — | 35% | 33% |
| Ashoka | Numbers | Kalinga | 43% | 41% |

### Gauls & Celts

| General | Traits | Why | Win rate today | With traits and halved stats |
|---|---|---|---|---|
| Brennus (Senones) | Furor, Terror | The Allia: the Roman line broke at the first rush | 43% | 51% |
| Britomaris | — | — | 35% | 37% |
| Brennus (Galatian) | Furor | The great raid on Greece | 43% | 44% |
| Bolgios | — | — | 38% | 39% |
| Aneroëstes | Furor | Led the Gaesatae at Telamon | 38% | 42% |
| Concolitanus | — | — | 32% | 33% |
| Viridomarus | Furor | Rode out to single combat at Clastidium | 40% | 43% |

## How to edit this

1. Change `GENERAL_TRAITS` in `packages/engine/src/cli/lab/general_traits.ts`. Trait ids are in `trait_pool.ts`.
2. Run `npx tsx src/cli/lab/general_traits_sim.ts 40000 --md` from `packages/engine`.
3. The first four lines show what the change did to the spread; the table below them is this document's table.

## Open questions

1. Which of the three approaches to the double count (above)?
2. Should a general's own culture trait appear among his traits? In this draft 24 generals carry their own
   culture's trait: every Gaul and Steppe general who has a trait at all, four Chinese (Volley), three Romans
   (Deep ranks), three Macedonians (Hammer and anvil), and a few others. It gives them a head start on depth:
   four home units and they are at level II. Natural for Gauls and Steppe; elsewhere it is a choice to make
   on purpose, since it nudges those generals toward mono-culture armies.
3. Flaws for the famous (*Rash* for Flaminius and Demetrius, *Far from home* for Hannibal and Pyrrhus) are not
   drafted here.
4. Stat compression changes who reaches SUPPLY 80 for the third elite. With stats compressed halfway only
   Wang Jian, Meng Tian, Hannibal, Chandragupta and Ashoka (SUPPLY 90 today) still reach it.
