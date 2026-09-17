"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "TODAY", href: "/" },
  { label: "VERSUS", href: "/versus" },
  { label: "RULES", href: "/rules" },
] as const;

/** The three tab screens' bar (v3 §13.3). `invite` puts the rust dot on VERSUS. */
export function TabBar({ invite }: { invite?: boolean }) {
  const path = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 mt-auto flex shrink-0 border-t border-raised bg-sunk px-2 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,16px))]">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href) || (t.href === "/rules" && path.startsWith("/numbers"));
        return (
          <Link key={t.href} href={t.href} className="relative flex min-h-11 flex-1 flex-col items-center gap-1.5 py-1.5 no-underline" aria-label={t.href === "/versus" && invite ? "Versus, invite waiting" : undefined}>
            <div className="h-0.5 w-6" style={{ background: on ? "var(--rust)" : "transparent" }} />
            <span className="label" style={{ color: on ? "var(--bone)" : "var(--faint)" }}>
              {t.label}
              {t.href === "/versus" && invite && <span aria-hidden="true" className="absolute -mt-0.5 ml-1 inline-block h-[7px] w-[7px] rounded-full bg-rust" />}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
