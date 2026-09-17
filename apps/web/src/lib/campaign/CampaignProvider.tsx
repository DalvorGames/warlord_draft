"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { flipSides, type ActiveTrait, type Army, type BattleResult, type DraftState, type Engine, type Front, type General, type PlanName } from "@warlord/engine";
import { useEngine } from "@/lib/engine/EngineProvider";
import { campaignFromSeed, BATTLES_PER_CAMPAIGN, type CampaignSpec } from "./spec";
import { storage, type BattlePlay, type CampaignSave, type HistoryEntry, type Stage } from "./save";
import { api, device } from "@/lib/versus/client";
import type { RoomView } from "@/lib/versus/room";

export interface BattleView {
  index: number;
  spec: CampaignSpec["battles"][number];
  /** The foe's army, its line included (chosen player-blind when the campaign was derived; his locked line in a duel). */
  foe: Army;
  foeGeneral: General;
  foeTraits: ActiveTrait[];
  play: BattlePlay;
  /** Present once fought. Deterministic from the inputs. */
  result: BattleResult | null;
}

/** What the run screens need from a live room (docs/versus-plan.md §6.2). */
export interface DuelState {
  view: RoomView;
  /** Server time now, from the last poll plus the local clock. */
  serverNow(): number;
  pick(action: { general: number } | { card: number } | { reroll: true }): Promise<void>;
  line(input: { plan?: PlanName; deployment?: (Front | null)[]; locked?: boolean }): Promise<void>;
  presence(input: { beat?: number; done?: boolean }): Promise<void>;
  claim(): Promise<void>;
  rematch(): Promise<void>;
  leave(): Promise<void>;
  /** The last request's error, if any. */
  error: string | null;
}

export interface CampaignContextValue {
  engine: Engine | null;
  /** null until localStorage has been read (avoids a hydration mismatch). */
  hydrated: boolean;
  /** True when a save from an older version had to be dropped this load. */
  stale: boolean;
  save: CampaignSave | null;
  history: HistoryEntry[];
  /** Your army when the draft is legal, else null. */
  army: Army | null;
  general: General | null;
  /** Every trait your army fields. */
  traits: ActiveTrait[];
  battles: BattleView[];
  /** The draft is frozen once the first battle has been given (or, in a duel, the server owns it). */
  draftFrozen: boolean;
  /** Battles won so far, battles played, and total losses over battles played. */
  score: { won: number; played: number; lossPct: number; over: boolean; conquered: boolean };
  /** Present while this save plays in a 1v1 room. */
  duel: DuelState | null;
  start(kind: "daily" | "free", seed: number, id: string): void;
  /** Begin (or resume) the run for a room that has started drafting. */
  startDuel(view: RoomView, token: string): void;
  abandon(): void;
  updateDraft(fn: (engine: Engine, d: DraftState) => DraftState): void;
  setRow(row: number): void;
  setStage(stage: Stage): void;
  setBattlePlan(i: number, plan: PlanName): void;
  setBattleDeployment(i: number, deployment: (Front | null)[] | null): void;
  /** Mark battle i fought with this plan; resolves it from inputs and ends the campaign if it is over. */
  giveBattle(i: number, plan: PlanName): void;
  marchOn(): void;
}

const DUEL_REROLLS = 2;

/** Resolve every fought battle of a save from its inputs. The foe's line comes from the spec, never from you. */
function resolveAll(engine: Engine, save: CampaignSave, army: Army): (BattleResult | null)[] {
  return save.spec.battles.map((spec, i) => {
    const play = save.battles[i];
    if (!play.fought || !play.plan || !play.deployment || play.deployment.some((f) => f === null) || !spec.foe) return null;
    const foe = engine.replayDraft(spec.foe, save.kind === "duel" ? { rerolls: DUEL_REROLLS } : undefined).army;
    if (!foe) return null;
    const mine: Army = { ...army, plan: play.plan, deployment: play.deployment as Front[] };
    const his: Army = { ...foe, deployment: spec.line };
    // A duel is always resolved host against guest; the guest sees it flipped so A stays "you".
    if (save.kind === "duel" && save.duel?.seat === "guest") return flipSides(engine.resolve(his, mine, spec.terrain, spec.battleSeed));
    return engine.resolve(mine, his, spec.terrain, spec.battleSeed);
  });
}

/** The save a room view implies: the draft from the server's run, the stage from the step, his army once revealed. */
function duelSave(engine: Engine, view: RoomView, token: string, prev: CampaignSave | null): CampaignSave {
  const me = view.me, him = view.him;
  const draft = me.run ? engine.replayDraft(me.run, { rerolls: DUEL_REROLLS }).state : engine.startDraft(view.seed!, { rerolls: DUEL_REROLLS });
  const step = me.step;
  const stage: Stage = step === "general" ? "general" : step.startsWith("row-") ? "draft" : step === "watching" ? "battle" : step === "done" ? "result" : "deploy";
  const row = step.startsWith("row-") ? Number(step.slice(4)) : Math.max(0, draft.rows.findIndex((r) => r.pick === null));
  const fought = view.status === "battle" || view.status === "done";
  const foeRun = him?.run ?? "";
  const foeLine = him?.line ?? [];
  const keep = prev && prev.kind === "duel" && prev.duel?.code === view.code && prev.duel.matchNo === view.matchNo ? prev : null;
  const play: BattlePlay = { plan: me.plan ?? keep?.battles[0]?.plan ?? null, deployment: me.line ?? keep?.battles[0]?.deployment ?? null, fought };
  return {
    v: 2, dataVersion: engine.dataVersion, kind: "duel",
    duel: { code: view.code, seat: me.seat, token, matchNo: view.matchNo },
    spec: { id: `duel-${view.code}-${view.matchNo}`, seed: view.seed!, dataVersion: view.dataVersion, battles: [{ foe: foeRun, terrain: view.ground!, battleSeed: view.battleSeed!, line: foeLine, tier: 0 }] },
    draft: { ...draft, plan: null, deployment: null },
    row: row < 0 ? 7 : row,
    battles: [play],
    battleIndex: 0,
    stage,
    startedAt: keep?.startedAt ?? new Date().toISOString(),
    finishedAt: fought && keep?.finishedAt ? keep.finishedAt : fought ? new Date().toISOString() : null,
  };
}

const Ctx = createContext<CampaignContextValue | null>(null);

const RUN_ROUTES = ["/general", "/draft", "/deploy", "/battle", "/between", "/result"];

export function CampaignProvider({ children }: { children: ReactNode }) {
  const engine = useEngine();
  const router = useRouter();
  const pathname = usePathname();
  const [save, setSaveState] = useState<CampaignSave | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [stale, setStale] = useState(false);
  const [duelView, setDuelView] = useState<RoomView | null>(null);
  const [duelError, setDuelError] = useState<string | null>(null);
  const offset = useRef(0);

  useEffect(() => {
    if (!engine) return;
    const loaded = storage.loadSave(engine.dataVersion);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once the engine is ready
    setSaveState(loaded.save);
    setStale(loaded.stale);
    setHistory(storage.loadHistory());
    setHydrated(true);
  }, [engine]);

  const setSave = useCallback((next: CampaignSave | null) => {
    setSaveState(next);
    storage.writeSave(next);
  }, []);
  const patch = useCallback((fn: (s: CampaignSave) => CampaignSave) => {
    setSaveState((cur) => {
      if (!cur) return cur;
      const next = fn(cur);
      storage.writeSave(next);
      return next;
    });
  }, []);

  // ----- the room, while this save is a duel: poll, and mirror the server's truth into the save -----
  const duelCode = save?.kind === "duel" ? save.duel?.code ?? null : null;
  const duelToken = save?.kind === "duel" ? save.duel?.token ?? null : null;
  const applyView = useCallback((v: RoomView) => {
    offset.current = v.now - Date.now();
    setDuelView(v);
    setDuelError(null);
    if (!engine) return;
    setSaveState((cur) => {
      if (!cur || cur.kind !== "duel" || cur.duel?.code !== v.code) return cur;
      const next = duelSave(engine, v, cur.duel.token, cur);
      const same = JSON.stringify(next.draft) === JSON.stringify(cur.draft) && next.stage === cur.stage && next.row === cur.row && JSON.stringify(next.battles) === JSON.stringify(cur.battles) && JSON.stringify(next.spec) === JSON.stringify(cur.spec) && next.duel?.matchNo === cur.duel?.matchNo;
      if (same) return cur;
      storage.writeSave(next);
      return next;
    });
  }, [engine]);
  useEffect(() => {
    if (!duelCode || !duelToken) return;
    let alive = true;
    const tick = async () => {
      try { const r = await api.get(duelCode, duelToken); if (alive) applyView(r.view); }
      catch (e) { if (alive) setDuelError(e instanceof Error ? e.message : String(e)); }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [duelCode, duelToken, applyView]);
  const act = useCallback(async (fn: (code: string, token: string) => Promise<{ view: RoomView }>) => {
    if (!duelCode || !duelToken) return;
    try { const r = await fn(duelCode, duelToken); applyView(r.view); }
    catch (e) { setDuelError(e instanceof Error ? e.message : String(e)); throw e; }
  }, [duelCode, duelToken, applyView]);
  // A duel's run screens belong to a match. While the room is back at the ready-up (a rematch), waiting or
  // closed, the run screens hand off to the room page instead of chasing an empty save around.
  useEffect(() => {
    if (!duelView || !duelCode || duelView.code !== duelCode) return;
    const inMatch = duelView.status === "drafting" || duelView.status === "deploying" || duelView.status === "battle" || duelView.status === "done";
    if (!inMatch && RUN_ROUTES.some((r) => pathname.startsWith(r))) router.replace(`/v/${duelCode}`);
  }, [duelView, duelCode, pathname, router]);

  const duel = useMemo<DuelState | null>(() => {
    if (!duelView || !duelCode || duelView.code !== duelCode) return null;
    return {
      view: duelView,
      serverNow: () => Date.now() + offset.current,
      pick: (a) => act((c, t) => api.pick(c, t, a)),
      line: (input) => act((c, t) => api.line(c, t, input)),
      presence: (input) => act((c, t) => api.presence(c, t, input)),
      claim: () => act((c, t) => api.claim(c, t)),
      rematch: () => act((c, t) => api.rematch(c, t)),
      leave: () => act((c, t) => api.leave(c, t)),
      error: duelError,
    };
  }, [duelView, duelCode, act, duelError]);

  const general = useMemo(() => (engine && save && save.draft.generalIndex !== null ? engine.data.generalById.get(save.draft.generalPool[save.draft.generalIndex])! : null), [engine, save]);
  const army = useMemo(() => {
    if (!engine || !save || !general) return null;
    // The plan is chosen per battle at deploy; validate the draft with the general's suggested plan as a stand-in.
    const draft: DraftState = { ...save.draft, plan: save.draft.plan ?? engine.defaultPlan(general) };
    return engine.validate(draft).length === 0 ? engine.toArmy(draft) : null;
  }, [engine, save, general]);
  const traits = useMemo(() => (engine && army && general ? engine.traits(general, army.slots.map((s) => engine.data.unitById.get(s.unitId)!)) : []), [engine, army, general]);

  const battles = useMemo<BattleView[]>(() => {
    if (!engine || !save) return [];
    const results = army ? resolveAll(engine, save, army) : save.spec.battles.map(() => null);
    return save.spec.battles.map((spec, index) => {
      const play = save.battles[index];
      if (!spec.foe) {
        // A duel before his roster is revealed: no foe yet. The Deploy screen waits on him.
        return null;
      }
      // In a duel his run has no plan until he locks, so build his army with a stand-in plan, as for your own.
      const foeState = engine.replayDraft(spec.foe, save.kind === "duel" ? { rerolls: DUEL_REROLLS } : undefined).state;
      const foeGeneral = foeState.generalIndex === null ? null : engine.data.generalById.get(foeState.generalPool[foeState.generalIndex])!;
      if (!foeGeneral || foeState.rows.some((r) => r.pick === null)) return null;
      const foeArmy = engine.toArmy({ ...foeState, plan: foeState.plan ?? engine.defaultPlan(foeGeneral) });
      const foe: Army = { ...foeArmy, deployment: spec.line.length ? spec.line : foeArmy.deployment };
      const g = engine.data.generalById.get(foe.generalId)!;
      return { index, spec, foe, foeGeneral: g, foeTraits: engine.traits(g, foe.slots.map((s) => engine.data.unitById.get(s.unitId)!)), play, result: results[index] } as BattleView;
    }).filter((b): b is BattleView => b !== null);
  }, [engine, save, army]);

  const score = useMemo(() => {
    const fought = battles.filter((b) => b.result);
    const won = fought.filter((b) => b.result!.winner === "A").length;
    const lossPct = fought.reduce((t, b) => t + b.result!.casualties.A, 0);
    const lost = fought.some((b) => b.result!.winner !== "A");
    const total = save?.kind === "duel" ? 1 : BATTLES_PER_CAMPAIGN;
    return { won, played: fought.length, lossPct, over: lost || won === total, conquered: won === total };
  }, [battles, save?.kind]);
  const draftFrozen = !!save && (save.kind === "duel" || save.battles.some((b) => b.fought));

  const value: CampaignContextValue = {
    engine, hydrated, stale, save, history, army, general, traits, battles, draftFrozen, score, duel,
    start: (kind, seed, id) => {
      if (!engine) return;
      const spec = campaignFromSeed(engine, seed, id);
      const draft = engine.startDraft(seed);
      const battlesInit: BattlePlay[] = spec.battles.map(() => ({ plan: null, deployment: null, fought: false }));
      setStale(false);
      setSave({ v: 2, dataVersion: engine.dataVersion, kind, spec, draft, row: 0, battles: battlesInit, battleIndex: 0, stage: "general", startedAt: new Date().toISOString(), finishedAt: null });
    },
    startDuel: (view, token) => {
      if (!engine) return;
      setStale(false);
      setSave(duelSave(engine, view, token, save));
      applyView(view);
    },
    abandon: () => setSave(null),
    updateDraft: (fn) => patch((s) => (engine && s.kind !== "duel" && !s.battles.some((b) => b.fought) ? { ...s, draft: fn(engine, s.draft) } : s)),
    setRow: (row) => patch((s) => ({ ...s, row })),
    setStage: (stage) => patch((s) => ({ ...s, stage })),
    setBattlePlan: (i, plan) => patch((s) => ({ ...s, battles: s.battles.map((b, j) => (j === i ? { ...b, plan } : b)) })),
    setBattleDeployment: (i, deployment) => patch((s) => ({ ...s, battles: s.battles.map((b, j) => (j === i ? { ...b, deployment } : b)) })),
    giveBattle: (i, plan) => {
      if (!engine || !save || !army || !general || save.kind === "duel") return;
      const next: CampaignSave = { ...save, stage: "battle", battleIndex: i, battles: save.battles.map((b, j) => (j === i ? { ...b, plan, fought: true } : b)) };
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
        const dep = next.battles[lastIdx].deployment as Front[];
        const entry: HistoryEntry = {
          id: next.spec.id, kind: next.kind, general: general.name, won, played, lossPct,
          headline: lost ? `Fell at battle ${lastIdx + 1} to ${foeName}` : `Conquered, ${(lossPct * 100).toFixed(0)}% lost`,
          finishedAt,
          shape: (["L", "C", "R"] as Front[]).map((f) => dep.filter((x) => x === f).length).join("·"),
          runs: next.battles.filter((b) => b.fought).map((b) => engine.toRunString({ ...next.draft, plan: b.plan, deployment: b.deployment as Front[] })),
        };
        setHistory(storage.pushHistory(entry));
        next.finishedAt = finishedAt;
      }
      setSave(next);
    },
    marchOn: () => patch((s) => ({ ...s, stage: "deploy", battleIndex: s.battleIndex + 1 })),
  };
  void device;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCampaign(): CampaignContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCampaign outside CampaignProvider");
  return v;
}
