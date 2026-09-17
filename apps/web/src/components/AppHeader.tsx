import Link from "next/link";

/** Wordmark header shown on Today and Result. */
export function AppHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between px-[18px] pt-3.5 pb-3">
      <Link href="/" className="flex items-baseline gap-2.5 text-bone no-underline">
        <span className="display text-[23px]">Warlord Draft</span>
        <span className="label text-[9px] tracking-[0.18em] text-faint-2">Era I</span>
      </Link>
      <button
        type="button"
        aria-label="Your account"
        className="h-11 w-11 rounded-full border border-rule-2 bg-transparent font-mono text-xs text-dim"
      >
        MP
      </button>
    </header>
  );
}
