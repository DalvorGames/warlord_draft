// The Versus room: one row on the server, pure transitions (docs/versus-plan.md §4). Every function takes `now`
// in milliseconds and returns a new room; nothing here reads a clock, storage or the network, so it is testable
// end to end with two pretend players.

import { firstLegalCard, type Engine, type Front, type PlanName, type TerrainName } from "@warlord/engine";

export type Seat = "host" | "guest";
export type RoomStatus = "waiting" | "ready" | "drafting" | "deploying" | "battle" | "done" | "closed";
/** idle · general · row-0 … row-7 · drafted · line · locked · watching · done */
export type Step = string;

export interface SeatState {
  name: string;
  token: string;
  ready: boolean;
  step: Step;
  /** When the current timed step began (general, a row, the line). */
  stepStartedAt: number | null;
  lastSeenAt: number;
  /** The seat's draft as a run string; private until both drafts are in. */
  run: string | null;
  plan: PlanName | null;
  line: (Front | null)[] | null;
  locked: boolean;
  /** Steps the server picked for this player: "general", "row-3", "line". */
  auto: string[];
  /** The beat the player is watching, while the report plays. */
  beat: number | null;
  draftedAt: number | null;
}

export interface MatchRecord {
  matchNo: number;
  winner: Seat;
  hostRun: string | null;
  guestRun: string | null;
  ground: TerrainName | null;
  seed: number | null;
  battleSeed: number | null;
  claimed: boolean;
  at: number;
}

export interface Room {
  code: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  status: RoomStatus;
  matchNo: number;
  dataVersion: number;
  seed: number | null;
  ground: TerrainName | null;
  battleSeed: number | null;
  host: SeatState;
  guest: SeatState | null;
  record: { host: number; guest: number; history: MatchRecord[] };
  rematch: { by: Seat; at: number } | null;
  version: number;
}

export const TIMERS = { general: 45_000, row: 40_000, line: 90_000 } as const;
export const AWAY_MS = 20_000;
export const LEAVE_MS = 60_000;
export const WAITING_TTL = 10 * 60_000;
export const ROOM_TTL = 24 * 3_600_000;
export const REROLLS = 2;
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GROUNDS: TerrainName[] = ["plains", "hills", "forest", "river"];

export class RoomError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

export const other = (s: Seat): Seat => (s === "host" ? "guest" : "host");

export function newCode(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return out;
}

const cleanName = (name: string | undefined, fallback: string) => (name ?? "").trim().slice(0, 16) || fallback;

function seat(name: string, token: string, now: number): SeatState {
  return { name, token, ready: false, step: "idle", stepStartedAt: null, lastSeenAt: now, run: null, plan: null, line: null, locked: false, auto: [], beat: null, draftedAt: null };
}

export function createRoom(engine: Engine, code: string, token: string, name: string | undefined, now: number): Room {
  return {
    code, createdAt: now, updatedAt: now, expiresAt: now + WAITING_TTL, status: "waiting", matchNo: 1, dataVersion: engine.dataVersion,
    seed: null, ground: null, battleSeed: null, host: seat(cleanName(name, "Host"), token, now), guest: null,
    record: { host: 0, guest: 0, history: [] }, rematch: null, version: 0,
  };
}

/** Draw a fresh board: seed, ground and battle seed. */
function draw(room: Room, rng: () => number): Room {
  return { ...room, seed: Math.floor(rng() * 2147483647), ground: GROUNDS[Math.floor(rng() * GROUNDS.length)], battleSeed: Math.floor(rng() * 2147483647) };
}

export function joinRoom(room: Room, token: string, name: string | undefined, now: number, rng: () => number = Math.random): Room {
  if (room.status !== "waiting") throw new RoomError("this room is not waiting for a player");
  if (room.guest) throw new RoomError("the room is full");
  return { ...draw(room, rng), status: "ready", guest: seat(cleanName(name, "Guest"), token, now), expiresAt: now + ROOM_TTL, updatedAt: now };
}

/** Which seat a token holds, or null. */
export function seatOf(room: Room, token: string | null | undefined): Seat | null {
  if (!token) return null;
  if (room.host.token === token) return "host";
  if (room.guest?.token === token) return "guest";
  return null;
}

const get = (room: Room, s: Seat): SeatState => {
  const st = s === "host" ? room.host : room.guest;
  if (!st) throw new RoomError("no such seat", 404);
  return st;
};
const put = (room: Room, s: Seat, st: SeatState): Room => (s === "host" ? { ...room, host: st } : { ...room, guest: st });

const replay = (engine: Engine, run: string) => engine.replayDraft(run, { rerolls: REROLLS }).state;

/** Both players ready: the board is dealt to both and the general timers start. */
function beginDraft(engine: Engine, room: Room, now: number): Room {
  const run = engine.toRunString(engine.startDraft(room.seed!, { rerolls: REROLLS }));
  const start = (st: SeatState): SeatState => ({ ...st, step: "general", stepStartedAt: now, run, plan: null, line: null, locked: false, auto: [], beat: null, draftedAt: null });
  return { ...room, status: "drafting", rematch: null, host: start(room.host), guest: start(room.guest!), updatedAt: now };
}

/** Both drafts in: the line timers start together, from the later of the two finishes. */
function beginDeploying(engine: Engine, room: Room): Room {
  const at = Math.max(room.host.draftedAt ?? 0, room.guest!.draftedAt ?? 0);
  const start = (st: SeatState): SeatState => {
    const state = replay(engine, st.run!);
    const general = engine.data.generalById.get(state.generalPool[state.generalIndex!])!;
    return { ...st, step: "line", stepStartedAt: at, plan: engine.defaultPlan(general), line: null, locked: false };
  };
  return { ...room, status: "deploying", host: start(room.host), guest: start(room.guest!), updatedAt: at };
}

function armyOf(engine: Engine, st: SeatState) {
  let state = replay(engine, st.run!);
  state = engine.setPlan(state, st.plan!);
  state = engine.setDeployment(state, st.line as Front[]);
  return { army: engine.toArmy(state), run: engine.toRunString(state) };
}

/** Both lines locked: one deterministic battle, recorded once. Both clients replay it from the two runs. */
function resolveMatch(engine: Engine, room: Room, now: number): Room {
  const h = armyOf(engine, room.host), g = armyOf(engine, room.guest!);
  const r = engine.resolve(h.army, g.army, room.ground!, room.battleSeed!);
  const winner: Seat = r.winner === "A" ? "host" : "guest";
  const watch = (st: SeatState, run: string): SeatState => ({ ...st, run, step: "watching", stepStartedAt: null, beat: 0 });
  const rec: MatchRecord = { matchNo: room.matchNo, winner, hostRun: h.run, guestRun: g.run, ground: room.ground, seed: room.seed, battleSeed: room.battleSeed, claimed: false, at: now };
  return { ...room, status: "battle", host: watch(room.host, h.run), guest: watch(room.guest!, g.run), record: { ...room.record, [winner]: room.record[winner] + 1, history: [...room.record.history, rec] }, updatedAt: now };
}

const rowOf = (step: Step): number | null => (step.startsWith("row-") ? Number(step.slice(4)) : null);
const deadlineOf = (st: SeatState): number | null => {
  if (st.stepStartedAt === null) return null;
  if (st.step === "general") return st.stepStartedAt + TIMERS.general;
  if (rowOf(st.step) !== null) return st.stepStartedAt + TIMERS.row;
  if (st.step === "line") return st.stepStartedAt + TIMERS.line;
  return null;
};
export { deadlineOf };

/** Apply one auto-pick to a seat whose timer has run out; the next step starts at the deadline, not at `now`. */
function autoStep(engine: Engine, st: SeatState, deadline: number): SeatState {
  if (st.step === "general") {
    const state = engine.pickGeneral(replay(engine, st.run!), 0);
    return { ...st, run: engine.toRunString(state), step: "row-0", stepStartedAt: deadline, auto: [...st.auto, "general"] };
  }
  const row = rowOf(st.step);
  if (row !== null) {
    const { state } = firstLegalCard(engine.data, replay(engine, st.run!), row);
    const done = row === 7;
    return { ...st, run: engine.toRunString(state), step: done ? "drafted" : `row-${row + 1}`, stepStartedAt: done ? null : deadline, draftedAt: done ? deadline : null, auto: [...st.auto, `row-${row}`] };
  }
  if (st.step === "line") {
    const state = replay(engine, st.run!);
    const dflt = engine.defaultDeployment(engine.toArmy(engine.setPlan(state, st.plan!)));
    const line = (st.line ?? dflt.map(() => null)).map((f, i) => f ?? dflt[i]);
    return { ...st, line, locked: true, step: "locked", stepStartedAt: null, auto: [...st.auto, "line"] };
  }
  return st;
}

/** Settle everything the clock has decided since the last request. Idempotent. */
export function settle(engine: Engine, room: Room, now: number): Room {
  let r = room;
  if (r.status === "waiting" && now >= r.expiresAt) return { ...r, status: "closed", updatedAt: now };
  if (r.status === "drafting" || r.status === "deploying") {
    for (const s of ["host", "guest"] as Seat[]) {
      let st = get(r, s);
      for (let guard = 0; guard < 12; guard++) {
        const d = deadlineOf(st);
        if (d === null || d > now) break;
        st = autoStep(engine, st, d);
      }
      r = put(r, s, st);
    }
    if (r.status === "drafting" && r.host.step === "drafted" && r.guest!.step === "drafted") {
      r = beginDeploying(engine, r);
      return settle(engine, r, now);
    }
    if (r.status === "deploying" && r.host.locked && r.guest!.locked) r = resolveMatch(engine, r, Math.max(now, r.updatedAt));
  }
  return r;
}

export function setReady(engine: Engine, room: Room, s: Seat, ready: boolean, now: number): Room {
  if (room.status !== "ready") throw new RoomError("the room is not at the ready-up");
  let r = put(room, s, { ...get(room, s), ready, lastSeenAt: now });
  if (r.host.ready && r.guest?.ready) r = beginDraft(engine, r, now);
  return { ...r, updatedAt: now };
}

export type PickAction = { general: number } | { card: number } | { reroll: true };

export function applyPick(engine: Engine, room: Room, s: Seat, action: PickAction, now: number): Room {
  if (room.status !== "drafting") throw new RoomError("the room is not drafting");
  const st = get(room, s);
  let state = replay(engine, st.run!);
  let next: SeatState;
  if ("general" in action) {
    if (st.step !== "general") throw new RoomError("the general is already picked");
    state = engine.pickGeneral(state, action.general);
    next = { ...st, run: engine.toRunString(state), step: "row-0", stepStartedAt: now };
  } else {
    const row = rowOf(st.step);
    if (row === null) throw new RoomError("not on a draft row");
    if ("reroll" in action) {
      state = engine.rerollRow(state, row);
      next = { ...st, run: engine.toRunString(state) };
    } else {
      state = engine.pickCard(state, row, action.card);
      const done = row === 7;
      next = { ...st, run: engine.toRunString(state), step: done ? "drafted" : `row-${row + 1}`, stepStartedAt: done ? null : now, draftedAt: done ? now : null };
    }
  }
  let r = put(room, s, { ...next, lastSeenAt: now });
  if (r.host.step === "drafted" && r.guest!.step === "drafted") r = beginDeploying(engine, r);
  return { ...r, updatedAt: now };
}

export function setLine(engine: Engine, room: Room, s: Seat, input: { plan?: PlanName; deployment?: (Front | null)[]; locked?: boolean }, now: number): Room {
  if (room.status !== "deploying") throw new RoomError("the room is not at the line");
  const st = get(room, s);
  const him = get(room, other(s));
  if (input.deployment && input.deployment.length !== 8) throw new RoomError("a line has eight places", 400);
  const line = input.deployment ?? st.line;
  const plan = input.plan ?? st.plan;
  const locked = input.locked ?? st.locked;
  if (locked && (!line || line.some((f) => f === null))) throw new RoomError("place all eight before locking", 400);
  if (!locked && st.locked && him.locked) throw new RoomError("he has locked; the battle is starting");
  let r = put(room, s, { ...st, plan, line, locked, step: locked ? "locked" : "line", lastSeenAt: now });
  if (r.host.locked && r.guest!.locked) r = resolveMatch(engine, r, now);
  return { ...r, updatedAt: now };
}

export function presence(room: Room, s: Seat, input: { beat?: number; done?: boolean }, now: number): Room {
  const st = get(room, s);
  const next: SeatState = { ...st, lastSeenAt: now, beat: input.beat ?? st.beat, step: input.done && st.step === "watching" ? "done" : st.step };
  let r = put(room, s, next);
  if (r.status === "battle" && r.host.step === "done" && r.guest?.step === "done") r = { ...r, status: "done" };
  return { ...r, updatedAt: now };
}

/** The other player has been silent for a minute during a match: this seat takes the field. */
export function claim(room: Room, s: Seat, now: number): Room {
  if (room.status !== "drafting" && room.status !== "deploying") throw new RoomError("nothing to claim");
  const him = get(room, other(s));
  if (now - him.lastSeenAt < LEAVE_MS) throw new RoomError("he is still here");
  const rec: MatchRecord = { matchNo: room.matchNo, winner: s, hostRun: room.host.run, guestRun: room.guest?.run ?? null, ground: room.ground, seed: room.seed, battleSeed: room.battleSeed, claimed: true, at: now };
  const done = (st: SeatState): SeatState => ({ ...st, step: "done", stepStartedAt: null });
  return { ...room, status: "done", host: done(room.host), guest: done(room.guest!), record: { ...room.record, [s]: room.record[s] + 1, history: [...room.record.history, rec] }, updatedAt: now };
}

export function rematch(room: Room, s: Seat, now: number, rng: () => number = Math.random): Room {
  if (room.status !== "battle" && room.status !== "done") throw new RoomError("no match to replay");
  const reset = (st: SeatState): SeatState => ({ ...seat(st.name, st.token, now), lastSeenAt: st.lastSeenAt });
  const r = draw(room, rng);
  return { ...r, status: "ready", matchNo: room.matchNo + 1, host: { ...reset(room.host), ready: s === "host", lastSeenAt: s === "host" ? now : room.host.lastSeenAt }, guest: { ...reset(room.guest!), ready: s === "guest", lastSeenAt: s === "guest" ? now : room.guest!.lastSeenAt }, rematch: { by: s, at: now }, expiresAt: now + ROOM_TTL, updatedAt: now };
}

export function leave(room: Room, s: Seat, now: number): Room {
  if (room.status === "waiting") return { ...room, status: "closed", updatedAt: now };
  if (room.status === "ready") {
    if (s === "guest") return { ...room, status: "waiting", guest: null, host: { ...room.host, ready: false }, expiresAt: now + WAITING_TTL, rematch: null, updatedAt: now };
    return { ...room, status: "closed", updatedAt: now };
  }
  if (room.status === "drafting" || room.status === "deploying") {
    // Leaving mid-match is a forfeit.
    const w = other(s);
    const rec: MatchRecord = { matchNo: room.matchNo, winner: w, hostRun: room.host.run, guestRun: room.guest?.run ?? null, ground: room.ground, seed: room.seed, battleSeed: room.battleSeed, claimed: true, at: now };
    const done = (st: SeatState): SeatState => ({ ...st, step: "done", stepStartedAt: null });
    return { ...room, status: "done", host: done(room.host), guest: done(room.guest!), record: { ...room.record, [w]: room.record[w] + 1, history: [...room.record.history, rec] }, updatedAt: now };
  }
  return { ...room, status: "closed", updatedAt: now };
}

// ---------- what a seat is allowed to see ----------

export type Dot = "here" | "away" | "left" | "done";
export interface HisView { name: string; ready: boolean; step: Step; deadline: number | null; dot: Dot; where: string; locked: boolean; run: string | null; line: Front[] | null; auto: string[]; beat: number | null; general: string | null }
export interface MeView { seat: Seat; name: string; ready: boolean; step: Step; deadline: number | null; run: string | null; plan: PlanName | null; line: (Front | null)[] | null; locked: boolean; auto: string[]; beat: number | null }
export interface RoomView {
  code: string; status: RoomStatus; matchNo: number; dataVersion: number; seed: number | null; ground: TerrainName | null; battleSeed: number | null;
  now: number; expiresAt: number; timers: typeof TIMERS; me: MeView; him: HisView | null; record: Room["record"]; rematch: Room["rematch"];
}

function where(st: SeatState, dot: Dot, status: RoomStatus): string {
  if (dot === "left") return "LEFT";
  const row = rowOf(st.step);
  if (st.step === "general") return "CHOOSING";
  if (row !== null) return `ROW ${row + 1} OF 8`;
  if (st.step === "drafted") return "DRAFTED";
  if (st.step === "line") return "PLACING";
  if (st.step === "locked") return "LOCKED";
  if (st.step === "watching") return "WATCHING";
  if (st.step === "done") return "DONE";
  return status === "ready" ? (st.ready ? "READY" : "GETTING READY") : "HERE";
}

export function viewFor(engine: Engine, room: Room, s: Seat, now: number): RoomView {
  const me = get(room, s);
  const himSt = s === "host" ? room.guest : room.host;
  const revealed = room.status === "deploying" || room.status === "battle" || room.status === "done";
  const fought = room.status === "battle" || room.status === "done";
  let him: HisView | null = null;
  if (himSt) {
    const silent = now - himSt.lastSeenAt;
    const dot: Dot = himSt.step === "done" ? "done" : silent >= LEAVE_MS ? "left" : silent >= AWAY_MS ? "away" : "here";
    let general: string | null = null;
    if (revealed && himSt.run) { const st = replay(engine, himSt.run); general = st.generalIndex === null ? null : st.generalPool[st.generalIndex]; }
    him = { name: himSt.name, ready: himSt.ready, step: himSt.step, deadline: deadlineOf(himSt), dot, where: where(himSt, dot, room.status), locked: himSt.locked, run: revealed ? himSt.run : null, line: fought ? (himSt.line as Front[]) : null, auto: revealed ? himSt.auto : [], beat: himSt.beat, general };
  }
  return {
    code: room.code, status: room.status, matchNo: room.matchNo, dataVersion: room.dataVersion, seed: room.seed, ground: room.ground, battleSeed: room.battleSeed,
    now, expiresAt: room.expiresAt, timers: TIMERS,
    me: { seat: s, name: me.name, ready: me.ready, step: me.step, deadline: deadlineOf(me), run: me.run, plan: me.plan, line: me.line, locked: me.locked, auto: me.auto, beat: me.beat },
    him, record: room.record, rematch: room.rematch,
  };
}
