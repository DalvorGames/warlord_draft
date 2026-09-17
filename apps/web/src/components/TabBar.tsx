"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "TODAY", href: "/" },
  { label: "RULES", href: "/rules" },
] as const;

/** Bottom tab bar for Today and Result. Run screens have none (handoff §3). */
export function TabBar() {
  const path = usePathname();
  return (
    <nav className="flex shrink-0 border-t border-rule bg-[#1a1813] px-2 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,16px))]">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="flex min-h-11 flex-1 flex-col items-center gap-1.5 py-1.5 no-underline">
            <div className="h-0.5 w-[18px]" style={{ background: on ? "var(--accent)" : "transparent" }} />
            <span className="label text-[10px] tracking-[0.1em]" style={{ color: on ? "var(--bone)" : "var(--faint-2)" }}>
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
