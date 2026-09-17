import Link from "next/link";

/** The tab screens' header (v3 §3 "Headers"): the wordmark alone. */
export function AppHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between px-5 pt-4 pb-1">
      <Link href="/" className="font-mono text-[11px] tracking-[0.2em] text-faint no-underline">
        WARLORD DRAFT · ERA I
      </Link>
    </header>
  );
}
