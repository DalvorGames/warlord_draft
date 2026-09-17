import Link from "next/link";

/** Today's header (v3 Main): the wordmark as a mono label and a Rules link. */
export function AppHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between px-5 pt-4 pb-1">
      <Link href="/" className="font-mono text-[11px] tracking-[0.2em] text-faint no-underline">
        WARLORD DRAFT · ERA I
      </Link>
      <Link href="/rules" className="py-2 text-[15px] text-bone no-underline">
        Rules
      </Link>
    </header>
  );
}
