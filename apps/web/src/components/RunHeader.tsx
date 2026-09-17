"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Run-screen header (v3): a back arrow, a mono title, and at most one text link on the right. */
export function RunHeader({ back, label, right, close }: { back?: string; label: string; right?: ReactNode; close?: string }) {
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between pr-3 pl-1.5">
      {back ? (
        <Link href={back} aria-label="Back" className="flex h-11 w-11 items-center justify-center text-xl text-dim no-underline">
          ←
        </Link>
      ) : close ? (
        <Link href={close} aria-label="Close" className="flex h-11 w-11 items-center justify-center text-xl text-dim no-underline">
          ×
        </Link>
      ) : (
        <span className="w-11" />
      )}
      <span className="min-w-0 truncate font-mono text-[11px] tracking-[0.14em] uppercase text-dim">{label}</span>
      <span className="flex min-w-11 items-center justify-end">{right}</span>
    </header>
  );
}

export function HeaderLink({ href, children, onClick }: { href?: string; children: ReactNode; onClick?: () => void }) {
  const cls = "flex h-11 min-w-11 items-center justify-center px-1 text-[15px] text-bone no-underline bg-transparent border-0";
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}
