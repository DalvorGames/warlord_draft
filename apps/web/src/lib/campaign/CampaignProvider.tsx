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

const Ctx = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const engine = useEngine();
  const [save, setSaveState] = useState<CampaignSave | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
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
    return save.spec.battles.map((spec, index) => {
      const foeState = engine.replayDraft(spec.foe);
      const foeArmy = foeState.army!;
      const play = save.battles[index];
      const general = engine.data.generalById.get(foeArmy.generalId)!;
      let result: BattleResult | null = null;
      if (play.fought && army && play.plan && play.deployment) {
        const mine: Army = { ...army, plan: play.plan, deployment: play.deployment };
        const foe: Army = { ...foeArmy, deployment: engine.aiDeploy(foeArmy, mine, spec.terrain) };
        result = engine.resolve(mine, foe, spec.terrain, spec.battleSeed);
      }
      return { index, spec, foe: foeArmy, foeGeneral: general.name, foeCulture: general.culture, play, result };
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
    giveBattle: (i) => patch((s) => ({ ...s, stage: "battle", battleIndex: i, battles: s.battles.map((b, j) => (j === i ? { ...b, fought: true } : b)) })),
    marchOn: () => patch((s) => ({ ...s, stage: "deploy", battleIndex: s.battleIndex + 1 })),
  };

  // When a campaign ends, record it in history once.
  useEffect(() => {
    if (!engine || !save || !army || save.finishedAt || !score.over) return;
    const general = engine.data.generalById.get(army.generalId)!.name;
    const last = battles.filter((b) => b.result).slice(-1)[0];
    const entry: HistoryEntry = {
      id: save.spec.id,
      kind: save.kind,
      general,
      won: score.won,
      played: score.played,
      lossPct: score.lossPct,
      headline: last ? (last.result!.winner === "A" ? `Conquered, ${(score.lossPct * 100).toFixed(0)}% lost` : `Fell at battle ${last.index + 1} to ${last.foeGeneral}`) : "",
      finishedAt: new Date().toISOString(),
      runs: battles.filter((b) => b.result).map((b) => engine.toRunString({ ...save.draft, plan: b.play.plan, deployment: b.play.deployment })),
    };
    setHistory(storage.pushHistory(entry));
    patch((s) => ({ ...s, stage: "result", finishedAt: entry.finishedAt }));
  }, [engine, save, army, battles, score, patch]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCampaign(): CampaignContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCampaign outside CampaignProvider");
  return v;
}
