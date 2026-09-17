import { AppHeader } from "@/components/AppHeader";
import { Screen } from "@/components/Screen";
import { TabBar } from "@/components/TabBar";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "The campaign",
    body: "Pick a general, draft eight units once, then face three enemy generals in a row on three different grounds. Before each battle you see his roster, choose a doctrine, and set your line. Lose once and the campaign is over. Win three and the province is yours.",
  },
  {
    title: "The draft",
    body: "Eight rows: two line, one shock, two cavalry, two ranged, one flex. A row decides which culture is offered, not what the unit becomes. Where it fights is your call, later. You may reroll two rows. Grades run S to F; S and A units are elite, and your general's logistics decides whether you may take two or three.",
  },
  {
    title: "Cultures and traits",
    body: "Your general counts as one unit of his culture. Four units of one culture turn its trait on; six make it level two. The trait is the reason to lean into a culture instead of taking the best card every time.",
  },
  {
    title: "Three fronts",
    body: "Left, center, right. Your left faces his right, your right faces his left, and the centers meet. Any unit can stand anywhere: cavalry, skirmishers and specials tend to win wings, while line, shock and ranged tend to hold a center. Only about one and a half units per enemy unit can fight on a front; the rest stand in reserve.",
  },
  {
    title: "Cohesion",
    body: "Each front has a cohesion threshold from its average discipline, your general's charisma, and your doctrine. Damage builds against it. Past the threshold the front breaks. A broken wing frees the enemy wing opposite it to wheel into your center.",
  },
  {
    title: "The seven beats",
    body: "Skirmish: everything with a bow shoots the front opposite it. Contact: all three pairs clash; lose badly and that front is shaken. Then up to four rounds of the press, where free wings roll up exposed centers. An army routs when its morale crosses the line, or when every front has broken. If nobody routs, the army with more left in it wins the reckoning.",
  },
  {
    title: "Doctrine",
    body: "Aggressive, defensive, envelopment or skirmish, chosen at deployment once you have seen his roster. Each scales the fights differently. Matching your general's own style gives a little more everywhere.",
  },
  {
    title: "Fair play",
    body: "Every battle is deterministic: the same seed, armies and deployments always give the same result. A run string carries everything, so a shared link replays the exact battle on any device.",
  },
];

export default function RulesPage() {
  return (
    <Screen>
      <AppHeader />
      <main className="flex grow flex-col gap-5 px-[18px] pt-1 pb-6">
        <h1 className="display m-0 text-[30px]">How it works</h1>
        {SECTIONS.map((s) => (
          <section key={s.title} className="flex flex-col gap-1.5 border-t border-rule-3 pt-3">
            <h2 className="display m-0 text-[22px]">{s.title}</h2>
            <p className="m-0 text-[14px] leading-relaxed text-dim">{s.body}</p>
          </section>
        ))}
      </main>
      <TabBar />
    </Screen>
  );
}
