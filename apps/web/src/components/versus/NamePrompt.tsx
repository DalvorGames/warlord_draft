"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";

/** One line, once per device: what the other player calls you. */
export function NamePrompt({ open, initial, onDone, onClose }: { open: boolean; initial: string; onDone: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial);
  return (
    <Sheet open={open} onClose={onClose} title={<span className="label text-dim">YOUR NAME IN THE ROOM</span>}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onDone(name.trim().slice(0, 16)); }}>
        <span className="display text-[26px] leading-tight">What do we call you?</span>
        <span className="text-[13px] text-dim">Shown to the other player and on the record. Sixteen letters at most.</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder="Max" aria-label="Your name" className="box-border w-full rounded-[3px] border border-rule-btn bg-sunk px-3 py-3 text-[17px] text-bone outline-none" />
        <button type="submit" disabled={!name.trim()} className="box-border min-h-12 w-full rounded-[3px] border border-bone bg-bone px-4 py-3 text-[17px] font-semibold text-ink disabled:opacity-50">Use this name</button>
      </form>
    </Sheet>
  );
}
