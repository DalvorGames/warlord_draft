"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createEngine, type Engine, type RawData } from "@warlord/engine";
import { DATA_FILES, DATA_VERSION } from "@/lib/config";

type EngineStatus =
  | { state: "loading"; engine: null; error: null }
  | { state: "ready"; engine: Engine; error: null }
  | { state: "error"; engine: null; error: string };

const EngineContext = createContext<EngineStatus>({ state: "loading", engine: null, error: null });

let cached: Promise<Engine> | null = null;

/** Fetch the four data files once per page load and build the engine. Pure and browser-safe. */
function loadEngine(): Promise<Engine> {
  if (!cached) {
    cached = Promise.all(
      DATA_FILES.map(async (f) => {
        const res = await fetch(`/data/v${DATA_VERSION}/${f}.json`);
        if (!res.ok) throw new Error(`could not load ${f}.json (${res.status})`);
        return [f, await res.json()] as const;
      }),
    ).then((entries) => {
      const raw = Object.fromEntries(entries) as unknown as RawData;
      const engine = createEngine(raw);
      if (engine.dataVersion !== DATA_VERSION) {
        throw new Error(`data says version ${engine.dataVersion}, app expects ${DATA_VERSION}`);
      }
      return engine;
    });
  }
  return cached;
}

export function EngineProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<EngineStatus>({ state: "loading", engine: null, error: null });
  useEffect(() => {
    let alive = true;
    loadEngine().then(
      (engine) => alive && setStatus({ state: "ready", engine, error: null }),
      (err: unknown) => alive && setStatus({ state: "error", engine: null, error: String(err) }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return <EngineContext.Provider value={status}>{children}</EngineContext.Provider>;
}

/** The loaded engine, or null while loading. Throws if loading failed. */
export function useEngine(): Engine | null {
  const s = useContext(EngineContext);
  if (s.state === "error") throw new Error(s.error);
  return s.engine;
}
