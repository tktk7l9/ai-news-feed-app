import { importanceLabel, importanceStars } from "@/lib/display";

// Shape (★/☆) carries the value, colour only reinforces it; the number is read aloud (SHIG 96, 94, 70).
export function ImportanceStars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`tabular-nums tracking-tight ${className}`} title={importanceLabel(value)}>
      <span aria-hidden="true">{importanceStars(value)}</span>
      <span className="sr-only">{importanceLabel(value)}</span>
    </span>
  );
}
