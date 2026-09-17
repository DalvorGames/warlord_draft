# Warlord Draft — UX Review v3

> **Origin:** written on 2026-09-16 by the studio's `ux-designer` agent from 17 screenshots of the running build
> (`screens/`), the play-through notes of the session that captured them, and the design docs in `design/gdd/`.
> **Status against the brief (`UI-HANDOFF-V3.md`):** adopted, with two corrections.
> 1. §D and open question 6 propose a "best at" tag on draft cards. **Overruled:** highlighting and deltas help the
>    player compare, but a badge naming the best card turns the draft into a lookup and breaks pillar 1.
> 2. §A10 and open question 2 read the three "?" boxes on Today as the three foes. They are the three face-down
>    **general** cards; the foes are already listed beneath them. The point stands: label them or remove them.
> Open questions 1, 3 and 5 were decided by the designer the same day (enemy strip plus sheet; morale as strength
> remaining, display only; abstract class shapes).

Current UI (screenshots, today) vs the decided-but-unbuilt gameplay plan (traits, mixed-culture board, player-blind AI, handicap, foe tiers, narrated events, enemy-line reveal).

Reviewer: ux-designer. Purpose: brief for a separate Design session producing new mocks. No visual design decisions here (no hex, no pixel specs beyond touch-target/type-size floors).

---

## A. Top 10 UX problems, ranked by impact on "out-thinking the other general" and on the non-table-reading daily player

**1. The one screen that is the core fantasy hides the one thing the fantasy is about.**
Deploy (08, 09, 11) is where the player places a bet against a hidden line, but the enemy roster — the only legal information the bet is based on — is not on the screen. It sits behind a "Roster" link (10), a full navigation away from the placement decision. A player has to hold eight units' worth of comparison, plus "he brings six that stand, two that ride," in their head across a page transition. This is the single biggest gap between the built UI and Pillar 2 ("deployment is a bet on hidden information... reading the roster and reasoning"). The designer's own agreed direction — "show the enemy's line beside yours AFTER the battle" — implies the enemy's *roster* (not line) belongs beside yours *before* the battle. Today it's absent at the moment it matters and only a sentence at the moment it doesn't (Roster page has no view of your own line for comparison, and Deploy has no view of his roster at all).

**2. A unit is a grade letter.** Every token on the bench and pitch (08, 09, 11) reads C, C, C, C, C, C, D. A Persian S-grade cataphract and an Indian S-grade elephant are visually identical at 40–56pt. The player's whole in-battle mental model ("my cavalry is on the right, are his elephants opposite?") cannot be built from the token layer at all — it requires opening the inspector on every token, one at a time. This directly taxes the "does not read stat tables" player hardest, at the exact moment (placing eight units under a countdown of taps) when recognition speed matters most.

**3. Four six-stat cards, no comparison aid.** Draft row 4 (06) is the textbook failure case: four cavalry cards differing by 5–10 points across six numbers, dumped side by side with nothing highlighted. The row hint ("read SPEED first, then FIGHT") is a good partial fix but only tells the player where to look, not what the four cards actually say relative to each other. A player has to do 24 silent comparisons per row, 8 rows a run — this is exactly the "needs a number the screen does not show" failure mode the game-concept doc defines as "too complex" for its own target player.

**4. The losing player — the more common and more instructive outcome — gets the thinnest explanation in the app.** Result on a loss (15) is one templated sentence ("Neither line broke. Yours had less left in it."), four tiles, and the enemy's shape buried as 10px text ("you 2 | 4 | 2 · him 2 | 3 | 3"). Half the screen is empty. This is the screen a daily-puzzle player returns to and learns from tomorrow; today it teaches almost nothing. It directly fails Pillar 3's own test ("show a loss to someone who did not play it; can they name the cause?") and contradicts the target player profile, which is built entirely around losses that explain themselves.

**5. Morale reads backwards for a first-time player.** The battle header (12, 13, 14) shows two decimals climbing toward "ROUT AT 0.80" — higher is worse, but nothing about "0.38" reads as "worse" to a player seeing it for the first time; a bigger number conventionally means more, and more usually means winning. Layered onto a daily-puzzle audience that explicitly does not read stat tables, this is a legibility bug with no visual affordance to compensate (no bar direction, no color-coded "health remaining" framing).

**6. Culture colors collide in the one place a collision is costly.** Battle (12, 13) puts Greece (cyan-ish blue) against Macedon (blue), and the opposed contest bars for L/C/R fronts render in near-identical hues for "you" vs "him." The earlier art review measured this precisely (Persia/China ΔE 19.5 normal vision, worse under color-vision deficiency) and flagged it as unresolved outside the one same-culture-swap guard. The player cannot tell which bar is theirs without reading the tiny name labels above — in a screen whose entire job is fast, legible cause-and-effect.

**7. The plan picker shows engine internals instead of a decision.** Deploy's plan panel (11) reads "Clash ×1.05, Steadiness ×0.95, Center ×0.90, Wings ×1.25. Matches Epaminondas: +8% everywhere" — six raw multipliers and a doctrine-match bonus that the traits redesign explicitly deletes (traits.md §3.4: "the general's style label and the doctrine bonus go away"). This is also flagged by Battle Resolution's own acceptance criteria as a near-total lookup today (98.8% of the time the matching plan is best). The screen currently asks the target player to do arithmetic across six numbers to make a decision the design has already decided should be made in one sentence of consequence, not a multiplier table.

**8. The primary action can be below the fold.** General pick (03) puts "Take the field with X" under a third card whose bottom third is dead space, off-screen at common phone heights; the earlier code-based UX review independently measured the same failure on Draft and Deploy. This is a blocking usability defect on the *first* real decision in the game — a bad first impression compounds every session-start friction after it.

**9. The enemy roster is 48 numbers with no framing to the player's own line.** Roster (10) is eight cards × six stats with a good one-line prose summary at the top, but nothing on the page tells the player what to do with the 48 numbers — no comparison against the player's own drafted units, no highlighting of what the matchup table (per Battle Resolution §4, subtype counters) actually rewards. The single sentence at the top is good; the 48 numbers below it are a wall the target player will not read (confirmed by the concept doc's own definition of "too complex").

**10. Today's hero decoration promises information it doesn't have and never resolves.** The three dashed "?" boxes above the muster date (01) look like a locked reveal (foe cards, maybe), but nothing on the page or in the flow ever fills them in — they are pure ornament that reads as "something is broken" on a first view, and the bottom half of the screen is empty. It's a small thing, but it's the very first pixel a new player sees, and it currently says "loading" forever.

---

## B. Screen-by-screen brief

Each screen below assumes the target board shape (2 line / 1 cavalry / 1 ranged / 4 flex, mixed-culture cards), traits replacing doctrine, one extra rewarded reroll, foe tiers, player-blind AI, narrated trait/events, and a shown handicap, per the gameplay-plan docs.

### Today
**Player's question:** "Is there a game waiting for me, and what is today's shape?"
**Hierarchy.** Primary: the date, the CTA (start/resume), and — new — a one-line *board* read (not per-foe cards) since the target board removes per-row culture, so a "shape hint" (game-concept open question, resolved toward: show all three foes before drafting, so the draft can be a plan) belongs here as prose, not as dashed placeholders. Secondary: last-five history, streak. On-demand: rules link, numbers link.
**Changes from the plan:** the three "?" boxes should either become the three foes' names/cultures (if the "see all three before drafting" open question resolves yes — recommended, since it turns the draft into a plan, matching Pillar 1's "trade, not lookup" spirit) or be removed entirely (if it resolves no). Either way, never show an unresolved placeholder as the first thing a new player sees.
**States:** first-time (no history), mid-run (resume, with stage named in plain words: "row 5 of 8" / "battle 2, placing your line" — this already exists and is good, keep it), daily-done (headline), daily-blocked-by-yesterday (needs an explicit message per the earlier review's finding — today it silently blocks with no explanation), loading (must show words, not a blank rectangle), error/corrupt-save (must not crash the whole app).
**Remove:** the two permanently-dead affordances ("Replay a seed," the account "MP" button) until they do something — a disabled control with no reason shown reads as broken, not as "coming soon."

### General pick
**Player's question:** "Which general's traits and stats fit the board I'm about to see, and how much of a handicap am I choosing?"
**Hierarchy.** Primary: the general's name, culture, and — new — his trait words (replacing the doctrine/style chip entirely; traits.md §3.3 is explicit that style goes away). Secondary: the four stats as bars (kept), and the new handicap number (campaign.md §3.4: "shown on the general card at pick time"). On-demand: what each trait means (inline, not a navigation — see §E).
**Changes from the plan:** the doctrine chip disappears; the trait chips take its place and must show level as a numeral where relevant ("Steady II"), never a percentage (traits.md §3.3.7). The handicap needs a home on this card — recommend it sit beside the elite-slot chip, phrased as a tradeoff, not a penalty ("Handicap +3 — outranks Hannibal picks on the ladder"), so a traitless general reads as a legitimate, even prestigious, choice per the design's own framing.
**Required states:** revealing (auto-flip, kept — it's good, see §I), picked (footer consequence line), first-time (a one-line "what handicap means" the first time it's shown — see §E's first-time-hint pattern), resumed (already-picked general shown without re-flipping).
**Remove:** nothing structural; fix the below-fold CTA (finding A8) by shrinking the dead space at the bottom of each card, not by cutting content.

### Draft row
**Player's question:** "Which of these four cards is actually better for the army I'm building, and what does it cost me elsewhere?"
**Hierarchy.** Primary: the two or three stats that decide *this slot* (see §D), highlighted, not all six read flat. Secondary: the other stats, present but visually quieter; the per-card culture (now on the card, not the row — see below); the consequence line. On-demand: full six-stat comparison, class/subtype detail.
**Changes from the plan (this is the single biggest structural change to this screen):**
- The row no longer has one culture. "LINE · Steppe" as a row header (04) is gone; the row is typed only by slot ("LINE," "CAVALRY," "RANGED," "FLEX") and each of the four cards carries its *own* culture tag and its own culture-tally consequence line. This is a full rework of the card's top-left corner and the row header, not a copy change.
- Board shape changes to 2 line / 1 cavalry / 1 ranged / 4 flex. The flex rows are where identity is built — they deserve the row's reading hint to say so explicitly ("Flex: any class, any culture — this is where your army's shape is decided"), since four of eight rows will otherwise look undifferentiated.
- Reroll footer must show three total (two base + one rewarded, open to everyone including the daily) and should say so plainly the first time it's seen ("2 rerolls, plus 1 free for everyone today") so it doesn't read as a monetization hook.
- SUPPLY's grade-rarity nudge is invisible by design (it shifts draw odds, not a displayed number) — nothing to show here, but the Numbers page must document it (§ Numbers below).
**Required states:** rolling (reel, no input — kept), row with a short pool (existing "fields only 3 ranged units" note — keep), elite-cap-full (existing disabled-card pattern — keep, but see §G for the accessible-name gap), all rows complete.
**Remove:** slot-penalty and "wrecked" language if any survived into copy (engine-only, already correctly hidden from the UI per MECHANICS.md §9 — just don't reintroduce it when reworking the card).

### Board sheet
**Player's question:** "What have I got so far, and where's the gap in my army?"
**Hierarchy.** Primary: the eight rows' taken/untaken state and each pick's name+grade (kept). Secondary: culture tally per pick (now per-card, not per-row, so the sheet's grouping by "row culture" — Steppe/Rome/Gauls headers in 07 — must become grouping by slot type only, with each card's own culture shown inline).
**Changes from the plan:** row culture headers go away (see Draft row above); this is the same underlying data change reflected in the summary view.
**Required states:** partial draft (current picks lit, rest dashed — kept), complete draft.
**Remove:** nothing; this screen is otherwise sound. Recommend it become a true bottom sheet (the earlier review notes it's a full route today, so swipe-to-close does nothing) — a UI-programmer concern, but worth flagging since it affects the "close" affordance's legibility.

### Deploy — the core screen, with the enemy integrated
**Player's question:** "Given what I know about his roster, where do I put mine?"
**Hierarchy — this is the screen that most needs re-hierarchizing, not just re-skinning:**
- **Primary:** the pitch (your fronts, your tokens, live cohesion) *and* a compact enemy-roster summary, on the same screen, simultaneously visible or one tap away without leaving Deploy (e.g., a collapsible panel, not a separate route). The prose read ("he brings six that stand, two that ride...") is already good — promote it from the Roster sub-page to Deploy itself. The constraint stands: never show *where* his units will be, only *what* he has. A roster chip-strip (grade + class glyph per enemy unit, no positions) satisfies "guessable, not known" while finally giving the player something to react to without a page transition.
- **Secondary:** the inspector (kept, it's the best-written text in the app), the plan picker (reworked to consequences, see A7/§F), the bench.
- **On-demand:** full enemy stat cards (today's Roster page), reachable from Deploy without losing placement state.
**Changes from the plan:**
- Plan picker: replace the multiplier list with the trait-and-consequence sentence the designer already agreed to ("no multipliers on the plan picker — consequences instead"). The doctrine-match line ("Matches Epaminondas: +8% everywhere") is deleted outright per traits.md §3.4.
- Scouts trait: the one exception to "enemy line is always hidden" — when the general carries Scouts, Deploy must say which enemy front is heaviest, prominently, since it's the one piece of "shape" information the game ever grants. This needs a distinct visual treatment from the roster summary (it's a rarer, higher-value fact) — recommend it sit directly above or inside the field's header line, not buried in the inspector.
- Ground: currently a mono line inside the field header ("HILLS · WINGS ×0.5 · SKIRMISH ×1.1") — keep the plain-words direction already agreed ("ground in plain words, both effects") but the two effects (stat scaling *and* stakes scaling) are currently conflated into one multiplier string; split into two short clauses ("Cavalry fights worse here. A won wing matters less here.").
- Foe tiers: the player should be able to tell "this is the hard battle" without doing arithmetic. A one-line cue tied to the foe's general/army-cost band (campaign.md §3.6.14: "show each foe's general stats... already shown on Deploy") should read as prose, not just numbers ("His army is the largest you'll face" for battle 3).
**Required states:** empty pitch (kept, good), placing (live cohesion — kept), token held (kept, with the enemy panel still visible/reachable), all-placed/ready, first-time (a one-time hint the first time cohesion changes color, per the agreed "one first-time hint when a rule first matters"), resumed (partial placement restored — kept).
**Remove:** the separate "Roster" full-page navigation as the *only* way to see the enemy — fold its content into Deploy; keep a detail view for the curious secondary player, but the primary player must never have to leave Deploy to read the thing the decision depends on.

### Battle report
**Player's question:** "What just happened, and whose fault was it?"
**Hierarchy.** Primary: the narration line (already good — names units, reads as chronicle). Secondary: which front, what changed, whether a trait or event decided it. On-demand: raw contest-bar percentages for the secondary/strategy player.
**Changes from the plan:**
- Every trait that acts, and every battle event, must get a named sentence at the beat it acted (battle-resolution.md §3.8 requirement, traits.md §3.3.8: "a trait that cannot produce such a sentence is too abstract to keep"). Today's beats (12, 13) narrate culture and unit names but nothing about *why* a stat differential existed — no "Fresh ranks step up on the left" style trait attribution. This is a content requirement on the beat generator, but the UI must reserve a visual slot for it (a distinct treatment from ordinary contest narration — recommend the same rust key-beat treatment already used for breaks/roll-ups, since a trait deciding a beat is exactly as important as a break).
- Morale: see §F for the recommended reframe.
- Enemy-line reveal: currently absent during the battle and reduced to two tiny shape-strings on Result. The agreed direction — show the enemy's line beside yours after the battle as the main teaching tool — belongs at the *end* of the report (the "END" card, 14) or immediately on Result, not squeezed into 10px text. See §F.
**Required states:** playing (auto/step — kept), key/every toggle (kept, but confirm default per the earlier review's flag that "every" is default while the spec intends "key" as the three-minute framing), ended (win/loss — the END card's "RECKONING" label is currently truncated at typical widths, confirm at build).
**Remove:** the raw `+31%` / `−58%` sign-only tags as the *only* cue — pair them with plain words ("yours, clearly" / "his, narrowly" / "even") so the target player isn't decoding a sign convention mid-story.

### Between battles
**Player's question:** "How did that go, and what am I walking into next?"
**Hierarchy.** Primary: the chronicle (already built here and good — "HOW IT WENT" per-beat list). Secondary: the four result tiles, the next foe's culture/ground/general. On-demand: nothing new needed.
**Changes from the plan:** the next-foe teaser should reflect tiering — if this is the harder battle, say so in the same prose register as the rest of the app, not just via stat numbers the player must interpret alone. Trait words for the next foe's general belong here too, since the player is about to draft nothing new but should recalibrate for a different opponent.
**Required states:** this screen exists only after a win (by design) — this asymmetry is exactly why the loss path needs its own chronicle on Result (see below and A4).
**Remove:** nothing.

### Result — win and loss
**Player's question (loss):** "What decided this, and what would I try differently?" **(win):** "How well did I do, and what's worth sharing?"
**Hierarchy — currently identical treatment for both outcomes; they should diverge:**
- **Loss, primary:** a named turning point (the agreed direction: "name the turning point on a loss" — e.g., "Your left broke at press 3 when his Thracian Peltasts overran your Saka archers"), then the same beat-by-beat chronicle Between already builds for wins, then the enemy-line-beside-yours reveal (currently a barely-legible "you 2 | 4 | 2 · him 2 | 3 | 3" — this pairing is the single best teaching moment in the whole app and it's rendered smaller than the footer).
- **Loss, secondary:** the four tiles (kept), the handicap earned/at-risk framing if applicable.
- **Win, primary:** the campaign's outcome, the handicap-adjusted framing ("Conquered with Flaminius, handicap +3" per campaign.md §3.4.8), the share card.
- **On-demand:** full per-battle breakdown, the run string.
**Changes from the plan:** the handicap belongs on this card now (campaign.md decision), and the per-general and global-ranking framing — even without Phase B's backend — should be previewed in words ("Ranked by wins, then by general handicap, then by losses" as static copy, priming the ladder concept before it exists).
**Required states:** loss at battle 1/2/3 (each needs its own chronicle, not just battle-of-loss), full conquest, first-time (explain the share card's "no spoilers" framing once).
**Remove:** the "you 2|4|2" microtext treatment — promote it to a real comparison, not a caption.

### Rules
**Player's question:** "What are the words this game keeps using, in one sentence each?"
**Hierarchy.** Primary: the four-stage diagram (kept, it's good — real components, not stock icons). Secondary: the cultures-and-traits grid. On-demand: nothing (Numbers is the on-demand tier).
**Changes from the plan:** the 3×3 culture grid (16) currently mixes trait *names* with raw percentages ("Wings press +25%," "Charge +8%"). Traits.md §3.3.7 is explicit that percentages belong on the Numbers page, not on cards — and while Rules isn't literally a "card," it's the first-read reference, not the deep reference; recommend the grid show only the trait word and a one-clause plain-English effect ("Wings hit harder"), with the number demoted to Numbers. Each of the nine cells should show the *current* one culture-trait-per-culture model directly (this grid is close to right structurally already — it's the content, not the layout, that needs the number stripped out).
**Required states:** engine not yet loaded (currently shows raw culture keys like "rom" instead of names — should show nothing or a loading word instead of leaking an internal id).
**Remove:** the percentage figures from the grid cells (move to Numbers).

### Numbers
**Player's question:** "I want the real formula — show me."
**Hierarchy.** Primary: the plain-sentence definition per stat (kept, well-written: "Multiplies everything your army does, on every front, at every stage"). Secondary: the mono "how it's counted" formula line. On-demand: nothing further — this *is* the on-demand tier for the whole app.
**Changes from the plan:** every trait needs an entry here with its numeric size (traits.md §8: "the Rules page states each trait in one sentence, and no trait is described that the engine lacks" — Numbers is where the sizes live per §3.3.7). SUPPLY's entry needs its new second lever documented (the rarity nudge, alongside the existing elite-slot rule). The handicap concept could get one entry here too, since it's a new number the strategy-enthusiast player will want defined.
**Required states:** none new; already renders without the engine loaded, which is correct and should be preserved.
**Remove:** nothing.

---

## C. The token problem

A unit must be told apart from seven others at 48–56pt using something better than a grade letter, without an illustrator. Recommend a **three-layer glyph system**, each layer legible at a different distance:

1. **At-a-glance (must read in under a second, at 48–56pt):** a **class silhouette**, not the grade letter, as the token's dominant mark — a small set of geometric shapes (a bar for line infantry, a wedge for shock, a horse-head-ish triangle-on-legs for cavalry, a chevron/arrow for ranged, a dot cluster for skirmish, a diamond for special). Six shapes total, reusable everywhere a class already appears in text (draft cards, the roster). This answers the question the player asks first during battle-watching: "is that my cavalry?"
2. **At-a-glance, secondary:** a **culture edge or corner mark** (the culture's assigned color, already established system-wide) so "is that unit Roman or Numidian" is answerable without a tap — this is cheap because the culture-color system already exists; it is simply not currently applied to the token itself (the art review independently flagged this exact gap: "culture appears nowhere on the token").
3. **On tap only:** grade (S–F), subtype, and full stats — via the existing inspector, which is already well-written and should not be duplicated on the token face.

Do not put the unit's name or a monogram on the token face at this size — a 9px name under a 40px square is already flagged as under the legibility floor by the art review, and initials collide across a 135-unit roster in ways a shape system does not. Grade should move *off* the token's dominant real estate (it currently occupies the entire glyph) and become a secondary cue — a border weight or corner tick, since grade matters far less during battle-watching than "which unit is this and what does it do."

**Legible at a glance vs. on tap, summarized:**
- Glance (pitch, bench, battle beats): class shape + culture color + front position.
- Tap (inspector, draft card, roster): name, subtype, grade, all six stats, the plain-English fit sentence.

This requires no illustrator: six flat geometric marks and the culture-color system that already exists are both buildable by a UI programmer from a spec, not commissioned art.

---

## D. The comparison problem in the draft

Recommend: **highlight the row's decisive stats, and show deltas against the row's best, not raw numbers alone.**

Concretely, for each row (per its slot type — line/cavalry/ranged/flex):
- **Determine the 2 stats that matter most for that slot** (already implicit in the existing row hint copy — "a cavalry row: read SPEED first, then FIGHT" — but today that hint is prose only; make it structural). Render those 2 stats visually louder (larger value, brighter/bolder) on every card in the row; the other 4 stay present but visually quieter — this is progressive disclosure, not data removal, so the secondary/strategy player loses nothing.
- **Show each card's value on the decisive stats as a delta against the row's best**, not just the raw number — e.g., the highest-SPEED card in the row reads plainly as the number; the other three read as "−12," "−20," "−31" relative to it, or an equivalent lightweight marker (a short bar, a "best here" tag on the winner). This turns "read four numbers and subtract in your head" into "read one number and one relative position," which is the actual comparison task a phone player can do in a glance.
- **A "best at" tag** on whichever single card in the row wins the most stats overall, phrased as consequence, not just data — "the steadiest pick," "the fastest pick" — so a player who wants a fast decision has one, while a player who wants to override it (because they're chasing a culture, or filling a gap) still sees the full row.
- For **flex rows specifically** (new in the target board, 4 of 8 rows), where class *and* culture both vary within a row, the same mechanism applies but the "decisive stat" pair should be inferred from what the army currently lacks (e.g., if the army has no ranged units yet, a flex row's ranged card gets its SHOOT stat foregrounded) rather than a fixed per-slot pair — this is the row that most needs comparison help, since it has the least built-in structure.

This is the single highest-leverage fix for Pillar 1 ("every choice is a tradeoff, never a lookup") on the daily-puzzle player: today the tradeoff exists in the numbers but is invisible without arithmetic; this makes the tradeoff visible without pre-deciding it for the player.

---

## E. The trait system in the UI

Traits replace doctrine entirely and appear in six places; the requirement from traits.md §3.3.9 — "the player only ever needs two in mind: their own (chosen) and the foe's (printed on his card)" — should guide how loudly each placement treats the concept:

1. **General card (pick screen):** up to three trait words with their one-line text, in place of the current single doctrine chip. This is the first time the player meets any traits, so give each trait chip enough room for its sentence to be visible without a tap on this first encounter — not truncated into a chip label only.
2. **Culture tally (draft):** trait word + count toward it (today's consequence-line pattern, e.g. "STEPPE 1 OF 4," already has the right shape — swap in the trait word: "3 more for Refuse Battle").
3. **Enemy card at deploy:** his trait words, printed plainly — this is the second (and last) trait the player needs to hold in mind per §3.3.9, so it deserves the same visual weight as the enemy roster summary recommended in the Deploy brief (§B), not a smaller aside.
4. **Deploy, Scouts exception:** as noted in §B, Scouts is the one trait that changes what information Deploy shows at all (which enemy front is heaviest) — this needs its own visual slot, separate from "his trait words are printed," since it's actionable information, not flavor.
5. **Battle report:** every trait that acts gets a named sentence at its beat (§B, Battle report). This is the highest-value placement for teaching what a trait *does*, since it's shown in the moment it mattered, which is more durable learning than a card definition read once at pick time.
6. **Result:** if a trait decided the turning point (§B, Result), name it in the turning-point sentence, not just in the beat list — this closes the loop from "I picked this general for his trait" to "the trait is why I won/lost."
7. **Rules page:** the culture grid, trait word + one plain clause, no percentage (§B, Rules).
8. **Numbers page:** every trait's numeric size, the only place percentages belong (§B, Numbers).

**Levels and stacking:** show as a roman numeral suffix directly on the trait word wherever it's displayed with a level ("Steady II"), never as a separate badge or a percentage — this matches the decided copy convention (traits.md §3.3.6) and keeps the vocabulary consistent across all eight placements above.

**Learning a trait's meaning without leaving the screen:** every placement above should carry the trait's one-line plain-English text inline (already the pattern for the general card's chips-with-sentence framing) rather than requiring a tap-through to Rules or Numbers. The **first time** a specific trait is shown to a player in a run (first general card, first enemy card, first time it fires in a battle), it should get the fuller sentence; subsequent appearances of the same trait that run can shorten to word + level, trusting the player already met it once — this follows the agreed "one first-time hint when a rule first matters" principle and avoids the current app's pattern of either always showing everything or requiring a separate Numbers-page trip.

---

## F. Morale and battle legibility

**Morale framing.** Recommend flipping the displayed frame from "damage accumulated toward a rout threshold" (higher = worse, decimals climbing toward 0.80) to **"how much the line has left"** (higher = better, a value counting down from a full state toward zero, or a fraction of cohesion remaining). This is a pure display transform — the underlying math is unchanged — but it aligns the number with the universal convention (bigger number = better off) the target player already brings from every other game and app they use. Pair the number with a short plain-word state (already partially present as cohesion words FIRM/STEADY/BRITTLE at Deploy — extend the same three-word vocabulary into Battle's morale header rather than inventing a second numeric system) so the number is never the only signal, which also serves the "functional without reliance on color alone" accessibility requirement.

**Beat ordering.** Recommend beats append newest at the **top**, under a pinned header (the health/morale figures, the front-pair summary), not at the bottom requiring a scroll-to-follow. This matches the "live feed" convention the designer's earlier revision (v2.1, referenced in the code review) already moved toward and avoids the below-the-fold control problem the current build has on shorter phones (finding A8's sibling issue on Battle).

**Persistent mini-field.** Recommend yes, a persistent three-front summary (not a full pitch redraw, just L/C/R state — which front is winning, which broke) stays visible above the beat feed throughout the report, always. The current build already has this (the three front-pair bars under the morale header, 12/13) — keep it, but make "your" vs "his" distinguishable by more than hue (see §G) and consider letting it double as the spatial anchor for trait/event narration ("your left" should be locatable at a glance against this strip, not just named in prose).

**Post-battle enemy-line reveal.** This is the agreed main teaching tool and it is currently the weakest-rendered content in the app (15's "you 2 | 4 | 2 · him 2 | 3 | 3" at caption size). Recommend a genuine **side-by-side comparison** — your three fronts' composition against his three fronts' composition, front-for-front, at the point of contact — placed at the end of the battle report (the "END" beat, 14) and/or promoted to Result's primary content on both win and loss. This is where the deployment-bet fantasy pays off or teaches its lesson, and it should look like the single most important piece of information on the screen it appears on, not a footnote.

**Tension point, flagged:** hiding the enemy's line before battle (Deployment §3.2.6, correctly preserved) and revealing it prominently after battle are not in conflict — the "no shape hint before" constraint is about the *bet*, not about withholding the *lesson*. Recommend the design lean hard into the contrast: Deploy shows roster-only, ever; the post-battle reveal should feel like the curtain finally pulling back, which argues for making it visually bigger and more central than it is today, not smaller.

---

## G. Accessibility and ergonomics must-haves

These are largely already identified by the two earlier code-based reviews (`docs/reviews/2026-09-16-ux-review.md`, `-art-review.md`); restating the ones a Design session must carry forward, plus what the gameplay-plan changes add:

- **Sticky primary action.** The bottom bar (and Battle's control row) must not scroll with content — pin it, let only the middle region scroll. This is blocking on General, Draft, and Deploy at common phone heights (finding A8) and must be preserved as a hard constraint in any redesign, not re-broken by new content (e.g., an enemy-roster panel added to Deploy per §B must not push the CTA further down — it should collapse/summarize by default).
- **Touch targets ≥44px.** Several existing controls fall short (doctrine/plan pills at 36px, secondary Result buttons, bare-text "Close"/"Abandon" links) — carry the 44px floor into every new control this redesign adds (the enemy-roster toggle on Deploy, any trait-info affordance, the token's tap target given its visual size shrinks to make room for the class glyph in §C).
- **Accessible names on every interactive element.** The four draft card buttons currently have no accessible name (a screen-reader or switch-control user cannot tell them apart) — this must be fixed as part of any card rework, not carried forward as a known gap. Disabled elite-capped cards should be reachable and announce why (`aria-disabled`, not `disabled`), a fix already identified and not yet built.
- **Reduced motion.** No `prefers-reduced-motion` path exists anywhere today — the mandatory 1.5s draft reel (run once per row, up to 8 times a game plus every reroll) and the general-card flip are the two most disruptive for a motion-sensitive player and must degrade to an instant or near-instant state change under the media query. Any new animated affordance this redesign adds (a token's "lift" on hold, a morale-reframe transition per §F) needs the same guard from day one.
- **Contrast.** Several existing text tokens fail WCAG AA at their current sizes (measured precisely in the art review) — a redesign must not reintroduce sub-4.5:1 text at small sizes, especially for anything carrying game-state information (stat values, cohesion words, trait levels) rather than pure decoration.
- **No flashing content without warning.** Not currently a problem (no strobing effects exist), but flag it for the trait/event "beat" treatment in §B/§E — if a decisive-beat callout gets a stronger visual pulse to draw attention, keep it under the flash-safety threshold and respect reduced-motion.
- **Culture-color collisions, functional impact.** Greece/Macedon and other close pairs (§A6) are not just an aesthetic issue — in Battle, "whose bar is whose" is core gameplay information, so this fails "functional without reliance on color alone" as a hard accessibility requirement, not an advisory one. Any redesign of the battle report must add a second channel (position is already doing some of this work via the fixed you-left/him-right layout; a pattern, shape, or label-first convention should not depend on hue alone).
- **Text scaling.** Existing 7–9px labels are below any reasonable floor on a 390px phone and do not respond to platform text-scaling settings. Recommend the redesign commit to a floor and hold it: no informational text below roughly 11–12px, with mono/label text expressed in relative units so browser/OS zoom and Dynamic Type actually work. The stat words (FIGHT/SHOOT/etc.) are the game's core vocabulary for its non-table-reading audience and are currently its least legible text — this is a functional bug for the target player, not a nicety.
- **Subtitles / non-text dialogue:** not applicable — the game has no voiced dialogue; the equivalent obligation here is that narration text must never be the *only* carrier of a decisive outcome that's also conveyed by color/motion (e.g., a front breaking should be nameable from the text alone, which the current narration mostly already achieves — preserve this in the redesign).
- **UI scaling across supported resolutions.** Desktop is currently an unstyled-wide phone column (both earlier reviews flag this); not blocking for this review's phone-first scope, but any redesign work should avoid decisions that make a later desktop pass harder (e.g., don't hardcode phone-only layout assumptions into the enemy-roster panel recommended in §B — it should have a natural wide-screen expansion, per the art review's desktop proposal).

---

## H. Open questions for the designer

1. **Does the enemy-roster panel live inline on Deploy, or as a same-screen expandable sheet?** My recommendation: inline summary strip (grade+class glyphs) always visible, full stat cards one tap away without navigation — this satisfies "the enemy belongs on the core decision screen" without turning Deploy into two screens' worth of content at once.
2. **Do the three "?" boxes on Today become the three foes' names (resolving the open "see all three before drafting" question toward yes), or should they be removed?** My recommendation: show them — it turns the draft into a plan, which is what the designer's own framing of the fantasy wants, and it removes the current dead-promise ornament (A10).
3. **Should the morale reframe (§F, higher = better) be a full semantic flip, or just a presentation layer over the existing damage-toward-threshold value?** My recommendation: presentation layer only (compute `1 − morale/routLevel` for display), since the underlying engine value and its 0.8 rout threshold are load-bearing elsewhere (Numbers page, batch tooling) and shouldn't need to change to fix how it's framed for players.
4. **Is the post-battle enemy-line reveal a fixed final beat in the report, or does it live primarily on Result (and Between, for wins)?** My recommendation: both — a compact version closes the report itself (so the "curtain pulls back" moment lands right after the last beat, not after another navigation), and a fuller version anchors Result, since Result is what gets shared and revisited.
5. **For the token glyph system (§C): should class shapes be literal (horse silhouette for cavalry) or abstract (geometric, unit-agnostic)?** My recommendation: abstract geometric — six shapes read faster at 48–56pt than a recognizable horse/elephant/archer silhouette would at that size, and abstract shapes don't imply a fidelity of illustration the project isn't budgeting for (per the art review's no-illustrator constraint).
6. **Does the draft's "best at" tag (§D) ever get shown for a card the culture-chasing or elite-chasing player would *not* want, i.e., can it actively mislead a player pursuing a different strategy?** Needs a decision on whether the tag is purely stat-based (risk: nudges everyone toward the same "best" pick, undermining Pillar 1) or contextual to the player's current army (risk: more complex to compute and explain). My recommendation: contextual — "fills your ranged gap" beats "highest SHOOT" for keeping the tradeoff real.
7. **Should Scouts' heaviest-front reveal (§B, §E) persist visibly through the whole Deploy session, or appear once as a one-time notice?** My recommendation: persistent — it's load-bearing information for the whole placement decision, not a one-time toast, and traits.md treats it as a standing fact about "the seeded AI line," not an event.
8. **How much of the Rules page's culture grid should change once traits replace the old culture-trait model — is a full grid redesign in scope for this same Design pass, or a follow-up?** My recommendation: same pass — the grid's underlying data model (culture → single trait) is already close to the target (traits.md §3.2.2), so the redesign cost is mostly stripping percentages and adding level language, cheap to bundle now rather than re-touching the page twice.

---

## I. Keep list — what the current UI does well

- **The general auto-flip reveal** (02) — automatic, timed, no tap-to-reveal friction; matches the "the general reveal is automatic" decision and reads as ceremony rather than a UI chore.
- **The draft row's reel + consequence line** (04, 05) — the slot-machine cadence and the plain-English "STEPPE 1 OF 4" / "ELITE CAP FULL — DROP ONE TO TAKE THIS" pattern is exactly the "explanations where the decision is made, in words" principle already working. Carry the *pattern* forward into the mixed-culture rework, even though the row-culture header itself must change.
- **The Deploy inspector's prose fit-sentence** ("On a wing it presses at 60 and charges 30. In the center it would grind at 36 and lose its Speed," 09) — this is the best-written text in the app: plain, specific, and computed from real engine weights rather than hand-authored flavor. This is the template for how trait sentences (§E) and the enemy-roster summary (§B) should read.
- **Live cohesion words at Deploy** (FIRM/STEADY/BRITTLE, updating per placement, 08/09/11) — a three-word vocabulary the player learns once and reuses; keep this pattern rather than introducing a second one for morale (§F recommends reusing it, not replacing it).
- **The battle report's narration-first structure** (12, 13) — narration precedes the numeric bars, names specific units, and already varies its phrasing for losing fronts. The scaffolding is right; it needs the trait/event content layered in (§B), not restructured.
- **Resume-from-anywhere with plain-language stage naming** ("Resume — battle 1, the battle," 01) — this is a genuinely good piece of orientation UX and should be extended, not replaced, as new stages (an enemy panel, trait displays) are added.
- **The Numbers page's plain-sentence-then-formula pattern** (17) — "Multiplies everything your army does, on every front, at every stage" followed by the mono formula is the correct progressive-disclosure shape for a page whose whole job is serving the secondary/strategy player without scaring off anyone else who stumbles onto it. Extend this same two-tier pattern to trait entries (§E) rather than inventing a new format.
- **The consequence-line mechanism itself** (draft cards' bottom line, Deploy's empty-front cost line, "3 more for Refuse Battle") — a single, consistent place on every card/panel where "what does this cost or unlock" is stated in one line. This is the connective tissue that should carry the trait system, the handicap, and the mixed-culture consequence lines — it's already the app's strongest reusable idiom and the redesign should lean on it rather than inventing parallel mechanisms.
