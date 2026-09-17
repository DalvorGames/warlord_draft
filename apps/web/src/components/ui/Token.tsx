import type { Grade, Unit, UnitClass } from "@warlord/engine";
import { cultureColor, gradeTick } from "@/lib/text";

/** The six class shapes (v3 §1.2): bar, wedge, chevron, arrow, three dots, diamond. From the Tokens artboard. */
const GLYPH: Record<UnitClass, string> = {
  line: "M3 9 h18 a1 1 0 0 1 1 1 v4 a1 1 0 0 1 -1 1 h-18 a1 1 0 0 1 -1 -1 v-4 a1 1 0 0 1 1 -1 z",
  shock: "M12 3 L21.5 20 H2.5 Z",
  cavalry: "M5 3 L14.5 12 L5 21 H10 L19.5 12 L10 3 Z",
  ranged: "M12 2 L19.5 10.5 H14.5 V22 H9.5 V10.5 H4.5 Z",
  skirmish: "M12 3.5 a3.4 3.4 0 1 0 0.01 0 Z M5.5 14.5 a3.4 3.4 0 1 0 0.01 0 Z M18.5 14.5 a3.4 3.4 0 1 0 0.01 0 Z",
  special: "M12 2 L22 12 L12 22 L2 12 Z",
};

export function Glyph({ cls, size, outlined, color = "#F2ECDD" }: { cls: UnitClass; size: number; outlined?: boolean; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={GLYPH[cls]} fill={outlined ? "none" : color} stroke={outlined ? color : "none"} strokeWidth={outlined ? 2 : 0} strokeLinejoin="round" />
    </svg>
  );
}

export type TokenState = "normal" | "shaken" | "broken";

/**
 * A unit token (v3 §2): class glyph, culture on the 3px foot, a grade tick top-left and the letter top-right from
 * 48px. Yours are filled, his are outlined, on every surface.
 */
export function Token({ unit, size = 52, his, held, ring, state = "normal", ghost, onClick, label, pressed }: {
  unit: Unit;
  size?: number;
  his?: boolean;
  held?: boolean;
  /** Matchup ring while a unit is held: "bone" favored, "rust" beaten. */
  ring?: "bone" | "rust" | null;
  state?: TokenState;
  ghost?: boolean;
  onClick?: () => void;
  label?: string;
  pressed?: boolean;
}) {
  const cc = cultureColor(unit.culture);
  const g = unit.grade as Grade;
  const glyph = Math.round(size * 0.42);
  const broken = state === "broken";
  const edge = held ? "var(--rust)" : ring === "bone" ? "var(--bone)" : ring === "rust" ? "var(--rust)" : g === "S" || g === "A" ? "var(--bone)" : "var(--rule-btn)";
  const width = held || ring || g === "S" || g === "A" ? 2 : 1;
  const body = (
    <div
      className="relative box-border flex items-center justify-center overflow-hidden"
      style={{
        width: size, height: size, borderRadius: size >= 44 ? 8 : 6, background: held ? "#2c2822" : "var(--panel)",
        border: `${width}px ${state === "shaken" ? "dashed" : "solid"} ${broken ? "#6e3620" : edge}`,
        boxShadow: `inset 0 -3px 0 ${cc.bright}`, opacity: ghost ? 0.5 : broken ? 0.55 : 1,
      }}
    >
      <Glyph cls={unit.class} size={glyph} outlined={his} color={broken ? "var(--rust)" : state === "shaken" ? "var(--dim)" : "#F2ECDD"} />
      {broken && <div className="absolute" style={{ width: size * 1.1, height: 2, background: "var(--rust)", transform: "rotate(-40deg)" }} />}
      <span className="absolute" style={{ top: size >= 44 ? 5 : 3, left: size >= 44 ? 5 : 3, width: size >= 44 ? 6 : 5, height: size >= 44 ? 6 : 5, background: gradeTick(g), borderRadius: 1 }} />
      {size >= 48 && (
        <span className="absolute font-mono font-semibold" style={{ top: 4, right: 6, fontSize: 11, color: g === "S" || g === "A" ? "var(--bone)" : "var(--dim)" }}>
          {g}
        </span>
      )}
    </div>
  );
  if (!onClick) return body;
  return (
    <button type="button" onClick={onClick} aria-label={label ?? unit.name} aria-pressed={pressed} className="flex items-center justify-center border-0 bg-transparent p-0" style={{ minWidth: Math.max(size, 44), minHeight: Math.max(size, 44) }}>
      {body}
    </button>
  );
}
