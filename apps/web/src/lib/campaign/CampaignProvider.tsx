"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Army, BattleResult, DraftState, Engine, Front, PlanName } from "@warlord/engine";
import { useEngine } from "@/lib/engine/EngineProvider";
import { campaignFromSeed, BATTLES_PER_CAMPAIGN, type CampaignSpec } from "./spec";
import { storage, type BattlePlay, type CampaignSave, type HistoryEntry, type Stage } from "./save";

export interface BattleView {
  index: number;
  spec: CampaignSpec["battles"][number];
  foe: Army;
  foeGeneral: string;
  foeCulture: string;
  play: BattlePlay;
  /** Present once fought. Deterministic from the inputs. */
  result: BattleResult | null;
}

export interface CampaignContextValue {
  engine: Engine | null;
  /** null until localStorage has been read (avoids a hydration mismatch). */
  hydrated: boolean;
  save: CampaignSave | null;
  history: HistoryEntry[];
  /** Your army when the draft is legal, else null. */
  army: Army | null;
  battles: BattleView[];
  /** Battles won so far, battles played, and total losses over battles played. */
  score: { won: number; played: number; lossPct: number; over: boolean; conquered: boolean };
  start(kind: "daily" | "free", seed: number, id: string): void;
  abandon(): void;
  updateDraft(fn: (engine: Engine, d: DraftState) => DraftState): void;
  setRow(row: number): void;
  setStage(stage: Stage): void;
  setBattlePlan(i: number, plan: PlanName): void;
  setBattleDeployment(i: number, deployment: Front[] | null): void;
  giveBattle(i: number): void;
  marchOn(): void;
}

/** Resolve every fought battle of a save from its inputs. */
function resolveAll(engine: Engine, save: CampaignSave, army: Army): (BattleResult | null)[] {
  return save.spec.battles.map((spec, i) => {
    const play = save.battles[i];
    if (!play.fought || !play.plan || !play.deployment) return null;
    const foeArmy = engine.replayDraft(spec.foe).army!;
    const mine: Army = { ...army, plan: play.plan, deployment: play.deployment };
    const foe: Army = { ...foeArmy, deployment: engine.aiDeploy(foeArmy, mine, spec.terrain) };
    return engine.resolve(mine, foe, spec.terrain, spec.battleSeed);
  });
}

const Ctx = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const engine = useEngine();
  const [save, setSaveState] = useState<CampaignSave | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once, after mount
    setSaveState(storage.loadSave());
    setHistory(storage.loadHistory());
    setHydrated(true);
  }, []);

  const setSave = useCallback((next: CampaignSave | null) => {
    setSaveState(next);
    storage.writeSave(next);
  }, []);
  const patch = useCallback(
    (fn: (s: CampaignSave) => CampaignSave) => {
      setSaveState((cur) => {
        if (!cur) return cur;
        const next = fn(cur);
        storage.writeSave(next);
        return next;
      });
    },
    [],
  );

  const army = useMemo(() => {
    if (!engine || !save) return null;
    return engine.validate(save.draft).length === 0 ? engine.toArmy(save.draft) : null;
  }, [engine, save]);

  const battles = useMemo<BattleView[]>(() => {
    if (!engine || !save) return [];
    const results = army ? resolveAll(engine, save, army) : save.spec.battles.map(() => null);
    return save.spec.battles.map((spec, index) => {
      const foeArmy = engine.replayDraft(spec.foe).army!;
      const general = engine.data.generalById.get(foeArmy.generalId)!;
      return { index, spec, foe: foeArmy, foeGeneral: general.name, foeCulture: general.culture, play: save.battles[index], result: results[index] };
    });
  }, [engine, save, army]);

  const score = useMemo(() => {
    const fought = battles.filter((b) => b.result);
    const won = fought.filter((b) => b.result!.winner === "A").length;
    const lossPct = fought.reduce((t, b) => t + b.result!.casualties.A, 0);
    const lost = fought.some((b) => b.result!.winner !== "A");
    return { won, played: fought.length, lossPct, over: lost || won === BATTLES_PER_CAMPAIGN, conquered: won === BATTLES_PER_CAMPAIGN };
  }, [battles]);

  const value: CampaignContextValue = {
    engine,
    hydrated,
    save,
    history,
    army,
    battles,
    score,
    start: (kind, seed, id) => {
      if (!engine) return;
      const spec = campaignFromSeed(engine, seed, id);
      const draft = engine.startDraft(seed);
      const battlesInit: BattlePlay[] = spec.battles.map(() => ({ plan: null, deployment: null, fought: false }));
      setSave({ v: 1, kind, spec, draft, row: 0, battles: battlesInit, battleIndex: 0, stage: "general", startedAt: new Date().toISOString(), finishedAt: null });
    },
    abandon: () => setSave(null),
    updateDraft: (fn) => patch((s) => (engine ? { ...s, draft: fn(engine, s.draft) } : s)),
    setRow: (row) => patch((s) => ({ ...s, row })),
    setStage: (stage) => patch((s) => ({ ...s, stage })),
    setBattlePlan: (i, plan) => patch((s) => ({ ...s, battles: s.battles.map((b, j) => (j === i ? { ...b, plan } : b)) })),
    setBattleDeployment: (i, deployment) => patch((s) => ({ ...s, battles: s.battles.map((b, j) => (j === i ? { ...b, deployment } : b)) })),
    giveBattle: (i) => {
      if (!engine || !save || !army) return;
      const next: CampaignSave = { ...save, stage: "battle", battleIndex: i, battles: save.battles.map((b, j) => (j === i ? { ...b, fought: true } : b)) };
      // Resolve now so the campaign's end is known and recorded once, from inputs only.
      const results = resolveAll(engine, next, army);
      const won = results.filter((r) => r?.winner === "A").length;
      const lost = results.some((r) => r && r.winner !== "A");
      const played = results.filter(Boolean).length;
      if (lost || won === BATTLES_PER_CAMPAIGN) {
        const finishedAt = new Date().toISOString();
        const lossPct = results.reduce((t, r) => t + (r ? r.casualties.A : 0), 0);
        const lastIdx = results.map((r, k) => (r ? k : -1)).filter((k) => k >= 0).pop()!;
        const foeName = engine.data.generalById.get(engine.replayDraft(next.spec.battles[lastIdx].foe).army!.generalId)!.name;
        const entry: HistoryEntry = {
          id: next.spec.id,
          kind: next.kind,
          general: engine.data.generalById.get(army.generalId)!.name,
          won,
          played,
          lossPct,
          headline: lost ? `Fell at battle ${lastIdx + 1} to ${foeName}` : `Conquered, ${(lossPct * 100).toFixed(0)}% lost`,
          finishedAt,
          runs: next.battles.filter((b) => b.fought).map((b) => engine.toRunString({ ...next.draft, plan: b.plan, deployment: b.deployment })),
        };
        setHistory(storage.pushHistory(entry));
        next.finishedAt = finishedAt;
      }
      setSave(next);
    },
    marchOn: () => patch((s) => ({ ...s, stage: "deploy", battleIndex: s.battleIndex + 1 })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCampaign(): CampaignContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCampaign outside CampaignProvider");
  return v;
}
