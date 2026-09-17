"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Run-screen header: back, a mono label, and optional right actions (a `?` to the Numbers page, Board, Roster). */
export function RunHeader({ back, label, right, help }: { back: string; label: string; right?: ReactNode; help?: boolean }) {
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between pr-2.5 pl-1.5">
      <Link href={back} aria-label="Back" className="flex h-11 w-11 items-center justify-center text-xl text-dim no-underline">
        ←
      </Link>
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-dim">{label}</span>
      <span className="flex min-w-11 items-center justify-end">
        {help && (
          <Link href="/numbers" aria-label="What do the numbers mean?" className="flex h-11 w-10 items-center justify-center no-underline">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-rule-btn font-mono text-xs text-dim">?</span>
          </Link>
        )}
        {right}
      </span>
    </header>
  );
}
