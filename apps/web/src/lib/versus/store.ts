// Where rooms live: a Supabase table through its REST API when the server has keys, else JSON files under
// apps/web/.rooms/ for local play. Writes are optimistic on `version`; a lost race is retried.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Room } from "./room";

export interface RoomStore {
  get(code: string): Promise<Room | null>;
  insert(room: Room): Promise<void>;
  /** Read, apply, write; retried when another request wrote in between. */
  update(code: string, fn: (room: Room) => Room): Promise<Room>;
}

// ---------- files (local) ----------

function fileStore(dir: string): RoomStore {
  const file = (code: string) => path.join(dir, `${code}.json`);
  return {
    async get(code) {
      try { return JSON.parse(await fs.readFile(file(code), "utf8")) as Room; } catch { return null; }
    },
    async insert(room) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file(room.code), JSON.stringify(room));
    },
    async update(code, fn) {
      const cur = await this.get(code);
      if (!cur) throw new Error("no such room");
      const next = { ...fn(cur), version: cur.version + 1 };
      await fs.writeFile(file(code), JSON.stringify(next));
      return next;
    },
  };
}

// ---------- Supabase (PostgREST) ----------

type Row = { code: string; created_at: string; updated_at: string; expires_at: string; status: string; match_no: number; data_version: number; seed: number | null; ground: string | null; battle_seed: number | null; host: Room["host"]; guest: Room["guest"]; record: Room["record"]; rematch: Room["rematch"]; version: number };

const toRow = (r: Room): Row => ({ code: r.code, created_at: new Date(r.createdAt).toISOString(), updated_at: new Date(r.updatedAt).toISOString(), expires_at: new Date(r.expiresAt).toISOString(), status: r.status, match_no: r.matchNo, data_version: r.dataVersion, seed: r.seed, ground: r.ground, battle_seed: r.battleSeed, host: r.host, guest: r.guest, record: r.record, rematch: r.rematch, version: r.version });
const fromRow = (w: Row): Room => ({ code: w.code, createdAt: Date.parse(w.created_at), updatedAt: Date.parse(w.updated_at), expiresAt: Date.parse(w.expires_at), status: w.status as Room["status"], matchNo: w.match_no, dataVersion: w.data_version, seed: w.seed, ground: w.ground as Room["ground"], battleSeed: w.battle_seed, host: w.host, guest: w.guest, record: w.record, rematch: w.rematch, version: w.version });

function supabaseStore(url: string, key: string): RoomStore {
  const base = `${url.replace(/\/$/, "")}/rest/v1/rooms`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async (code: string): Promise<Room | null> => {
    const res = await fetch(`${base}?code=eq.${encodeURIComponent(code)}&limit=1`, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`rooms read failed: ${res.status}`);
    const rows = (await res.json()) as Row[];
    return rows[0] ? fromRow(rows[0]) : null;
  };
  return {
    get,
    async insert(room) {
      const res = await fetch(base, { method: "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(toRow(room)) });
      if (!res.ok) throw new Error(`rooms insert failed: ${res.status} ${await res.text()}`);
    },
    async update(code, fn) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const cur = await get(code);
        if (!cur) throw new Error("no such room");
        const next = { ...fn(cur), version: cur.version + 1 };
        const res = await fetch(`${base}?code=eq.${encodeURIComponent(code)}&version=eq.${cur.version}`, { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify(toRow(next)) });
        if (!res.ok) throw new Error(`rooms update failed: ${res.status} ${await res.text()}`);
        const rows = (await res.json()) as Row[];
        if (rows.length) return fromRow(rows[0]);
      }
      throw new Error("rooms update lost the race five times");
    },
  };
}

let cached: RoomStore | null = null;
/** The store for this process: Supabase when configured, else files. */
export function roomStore(): RoomStore {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? supabaseStore(url, key) : fileStore(path.join(process.cwd(), ".rooms"));
  return cached;
}
export const serverConfigured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) || process.env.NODE_ENV !== "production";
