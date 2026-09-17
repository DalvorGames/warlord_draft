/** Thin segmented progress bar (v2 §3): rust = current, bone = done, raised = ahead. */
export function StepBar({ steps, current, className = "" }: { steps: string[]; current: number; className?: string }) {
  return (
    <div className={`flex gap-1 ${className}`} role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1} aria-label={steps[current]}>
      {steps.map((s, i) => (
        <div key={s} title={s} className="h-[3px] flex-1 rounded-sm" style={{ background: i < current ? "var(--bone)" : i === current ? "var(--rust)" : "var(--raised)" }} />
      ))}
    </div>
  );
}
