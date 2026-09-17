import Link from "next/link";

/** Today's header: the wordmark as a mono label and the account dot (v2 Phone-Home). */
export function AppHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between px-[18px] pt-3.5 pb-1.5">
      <Link href="/" className="font-mono text-[10px] tracking-[0.2em] text-faint no-underline">
        WARLORD DRAFT · ERA I
      </Link>
      <button type="button" aria-label="Your account" className="h-11 w-11 rounded-full border border-rule bg-transparent font-mono text-xs text-dim">
        MP
      </button>
    </header>
  );
}
