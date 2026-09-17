import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createEngine, flipSides, narrateBeats, type Front, type RawData } from "@warlord/engine";
import { TIMERS, LEAVE_MS, WAITING_TTL, applyPick, claim, createRoom, joinRoom, leave, presence, rematch, setLine, setReady, settle, viewFor, type Room } from "./room";

const dataDir = path.resolve(__dirname, "../../../../../packages/engine/data");
const raw = Object.fromEntries(["units", "generals", "cultures", "rules"].map((f) => [f, JSON.parse(readFileSync(path.join(dataDir, `${f}.json`), "utf8"))])) as unknown as RawData;
const engine = createEngine(raw);
const rng = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

const T0 = 1_000_000;
function readyRoom(): Room {
  let r = createRoom(engine, "KJ4M7Q", "host-token", "Max", T0);
  r = joinRoom(r, "guest-token", "Sam", T0 + 1000, rng);
  r = setReady(engine, r, "host", true, T0 + 2000);
  r = setReady(engine, r, "guest", true, T0 + 3000);
  return r;
}
/** Draft a seat by hand: general 0, then the first legal card of each row. */
function draftAll(r: Room, seat: "host" | "guest", at: number): Room {
  r = applyPick(engine, r, seat, { general: 0 }, at);
  for (let row = 0; row < 8; row++) {
    const state = engine.replayDraft(r[seat]!.run!, { rerolls: 2 }).state;
    let picked = false;
    for (let c = 0; c < 4 && !picked; c++) { try { r = applyPick(engine, r, seat, { card: c }, at + 100 * (row + 1)); picked = true; } catch { /* next */ } }
    expect(picked, `row ${row} of ${state.rows.length}`).toBe(true);
  }
  return r;
}
const line = (dep: string): Front[] => dep.split("") as Front[];

describe("room life", () => {
  it("creates, joins, readies and deals the same board to both", () => {
    const r = readyRoom();
    expect(r.status).toBe("drafting");
    expect(r.host.run).toBe(r.guest!.run);
    expect(r.host.step).toBe("general");
    expect(r.ground).toBeTruthy();
    const v = viewFor(engine, r, "host", T0 + 3000);
    expect(v.me.deadline).toBe(T0 + 3000 + TIMERS.general);
    expect(v.him!.where).toBe("CHOOSING");
    expect(v.him!.run).toBeNull();
  });
  it("a waiting room closes after ten minutes", () => {
    const r = createRoom(engine, "AAAAAA", "t", "Max", T0);
    expect(settle(engine, r, T0 + WAITING_TTL - 1).status).toBe("waiting");
    expect(settle(engine, r, T0 + WAITING_TTL).status).toBe("closed");
  });
  it("hides picks until both drafts are in, then reveals rosters but not lines", () => {
    let r = readyRoom();
    r = draftAll(r, "host", T0 + 5000);
    expect(r.host.step).toBe("drafted");
    expect(viewFor(engine, r, "guest", T0 + 6000).him!.run).toBeNull();
    r = draftAll(r, "guest", T0 + 7000);
    expect(r.status).toBe("deploying");
    const v = viewFor(engine, r, "guest", T0 + 8000);
    expect(v.him!.run).toBe(r.host.run);
    expect(v.him!.line).toBeNull();
    expect(v.me.plan).toBeTruthy();
  });
  it("refuses a pick out of turn or off the board", () => {
    const r = readyRoom();
    expect(() => applyPick(engine, r, "host", { card: 0 }, T0 + 4000)).toThrow();
    expect(() => applyPick(engine, r, "host", { general: 9 }, T0 + 4000)).toThrow();
    const r2 = applyPick(engine, r, "host", { general: 1 }, T0 + 4000);
    expect(r2.host.step).toBe("row-0");
    expect(() => applyPick(engine, r2, "host", { general: 0 }, T0 + 4100)).toThrow();
  });
  it("auto-picks at every deadline, cascading from the deadline rather than from now", () => {
    let r = readyRoom();
    r = applyPick(engine, r, "host", { general: 2 }, T0 + 4000);
    // The guest never touches the room again: general at +45s, eight rows at +40s each.
    const late = T0 + 3000 + TIMERS.general + 8 * TIMERS.row + 5;
    const mid = settle(engine, r, T0 + 3000 + TIMERS.general + 2 * TIMERS.row + 5);
    expect(mid.guest!.step).toBe("row-2");
    expect(mid.guest!.auto).toEqual(["general", "row-0", "row-1"]);
    expect(mid.guest!.stepStartedAt).toBe(T0 + 3000 + TIMERS.general + 2 * TIMERS.row);
    r = settle(engine, r, late);
    // By now both drafts have been settled in full, so the room has moved to the line and its timer started at the later finish.
    expect(r.status).toBe("deploying");
    expect(r.guest!.auto).toEqual(["general", "row-0", "row-1", "row-2", "row-3", "row-4", "row-5", "row-6", "row-7"]);
    expect(r.guest!.draftedAt).toBe(T0 + 3000 + TIMERS.general + 8 * TIMERS.row);
    expect(r.host.auto).toEqual(["row-0", "row-1", "row-2", "row-3", "row-4", "row-5", "row-6", "row-7"]);
    expect(r.host.stepStartedAt).toBe(r.guest!.draftedAt);
    expect(engine.replayDraft(r.guest!.run!, { rerolls: 2 }).state.rows.every((row) => row.pick !== null)).toBe(true);
  });
  it("locks both lines and resolves one battle both seats can replay from their side", () => {
    let r = readyRoom();
    r = draftAll(r, "host", T0 + 5000);
    r = draftAll(r, "guest", T0 + 7000);
    const t = r.host.stepStartedAt! + 10_000;
    r = setLine(engine, r, "host", { deployment: line("LCCRCLRC"), locked: true }, t);
    expect(r.status).toBe("deploying");
    expect(viewFor(engine, r, "guest", t).him!.where).toBe("LOCKED");
    // Unlocking is allowed while the other has not locked.
    r = setLine(engine, r, "host", { locked: false }, t + 1000);
    expect(r.host.locked).toBe(false);
    r = setLine(engine, r, "host", { deployment: line("LCCRCLRC"), locked: true }, t + 2000);
    r = setLine(engine, r, "guest", { deployment: line("CCCCLLRR"), plan: "defensive", locked: true }, t + 3000);
    expect(r.status).toBe("battle");
    expect(r.record.history.length).toBe(1);
    expect(r.record.host + r.record.guest).toBe(1);
    const hv = viewFor(engine, r, "host", t + 4000), gv = viewFor(engine, r, "guest", t + 4000);
    expect(gv.him!.line).toEqual(line("LCCRCLRC"));
    const H = engine.replayDraft(hv.me.run!, { rerolls: 2 }).army!, G = engine.replayDraft(gv.me.run!, { rerolls: 2 }).army!;
    const res = engine.resolve(H, G, r.ground!, r.battleSeed!);
    expect(res.winner === "A" ? "host" : "guest").toBe(r.record.history[0].winner);
    const guestSide = flipSides(res);
    expect(narrateBeats(guestSide)[0].narration).toBe(narrateBeats(res, "B")[0].narration);
    // Unlocking after both locked is refused.
    expect(() => setLine(engine, r, "host", { locked: false }, t + 5000)).toThrow();
  });
  it("sets the line for a player whose timer ran out, keeping what he had placed", () => {
    let r = readyRoom();
    r = draftAll(r, "host", T0 + 5000);
    r = draftAll(r, "guest", T0 + 7000);
    const start = r.host.stepStartedAt!;
    r = setLine(engine, r, "guest", { deployment: ["L", null, null, null, null, null, null, "R"] }, start + 1000);
    r = setLine(engine, r, "host", { deployment: line("LCCRCLRC"), locked: true }, start + 2000);
    r = settle(engine, r, start + TIMERS.line);
    expect(r.status).toBe("battle");
    expect(r.guest!.auto).toEqual(["line"]);
    expect(r.guest!.line![0]).toBe("L");
    expect(r.guest!.line![7]).toBe("R");
    expect(r.guest!.line!.every(Boolean)).toBe(true);
  });
  it("lets the other player claim the field after a minute of silence, and forfeits a leaver", () => {
    let r = readyRoom();
    expect(() => claim(r, "host", T0 + 3000 + LEAVE_MS - 1)).toThrow();
    const c = claim(r, "host", T0 + 3000 + LEAVE_MS);
    expect(c.status).toBe("done");
    expect(c.record.host).toBe(1);
    expect(c.record.history[0].claimed).toBe(true);
    r = leave(readyRoom(), "guest", T0 + 4000);
    expect(r.status).toBe("done");
    expect(r.record.host).toBe(1);
  });
  it("presence words follow the step and the silence", () => {
    let r = readyRoom();
    r = applyPick(engine, r, "guest", { general: 0 }, T0 + 4000);
    r = applyPick(engine, r, "guest", { card: 0 }, T0 + 4500);
    r = applyPick(engine, r, "guest", { card: 0 }, T0 + 5000);
    expect(viewFor(engine, r, "host", T0 + 5001).him!.where).toBe("ROW 3 OF 8");
    expect(viewFor(engine, r, "host", T0 + 5001).him!.dot).toBe("here");
    expect(viewFor(engine, r, "host", T0 + 5000 + 25_000).him!.dot).toBe("away");
    expect(viewFor(engine, r, "host", T0 + 5000 + 61_000).him!.where).toBe("LEFT");
  });
  it("a rematch keeps the room and the record and deals a new board", () => {
    let r = readyRoom();
    r = draftAll(r, "host", T0 + 5000);
    r = draftAll(r, "guest", T0 + 7000);
    const t = r.host.stepStartedAt! + 1000;
    r = setLine(engine, r, "host", { deployment: line("LCCRCLRC"), locked: true }, t);
    r = setLine(engine, r, "guest", { deployment: line("LCCRCLRC"), locked: true }, t + 1);
    const seed1 = r.seed;
    r = presence(r, "host", { beat: 3 }, t + 2);
    expect(viewFor(engine, r, "guest", t + 3).him!.beat).toBe(3);
    r = rematch(r, "guest", t + 10, rng);
    expect(r.status).toBe("ready");
    expect(r.matchNo).toBe(2);
    expect(r.seed).not.toBe(seed1);
    expect(r.guest!.ready).toBe(true);
    expect(r.record.host + r.record.guest).toBe(1);
    r = setReady(engine, r, "host", true, t + 20);
    expect(r.status).toBe("drafting");
    expect(r.rematch).toBeNull();
  });
});
