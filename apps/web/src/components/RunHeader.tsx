"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Run-screen header: back, a mono label, and an optional right action. */
export function RunHeader({ back, label, right }: { back: string; label: string; right?: ReactNode }) {
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between pr-2.5 pl-1.5">
      <Link href={back} aria-label="Back" className="flex h-11 w-11 items-center justify-center text-xl text-dim no-underline">
        ←
      </Link>
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-dim">{label}</span>
      <span className="flex min-w-11 justify-end">{right}</span>
    </header>
  );
}
