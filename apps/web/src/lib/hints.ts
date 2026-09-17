"use client";
// First-time hints (v3 §2): one line per rule, shown once per device.
import { useEffect, useState } from "react";

const KEY = "wd.hints.v1";
function read(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
export function useHint(id: string): [boolean, () => void] {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount; storage is client-only
    setShow(!read()[id]);
  }, [id]);
  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(KEY, JSON.stringify({ ...read(), [id]: true })); } catch { /* private mode */ }
  };
  return [show, dismiss];
}
