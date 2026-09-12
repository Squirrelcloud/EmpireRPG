import { cn } from "@/lib/utils";

const tones = {
  control: "bg-control",
  heat: "bg-heat",
  loyalty: "bg-loyalty",
} as const;

export function Meter({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: number;
  tone: keyof typeof tones;
  compact?: boolean;
}) {
  const v = Math.round(Math.max(0, Math.min(100, value)));
  return (
    <div className={cn("min-w-0", compact ? "space-y-1" : "space-y-1.5")}>
      <div className="flex items-baseline justify-between gap-3 text-muted">
        <span className="text-xs font-medium tracking-wide">{label}</span>
        <span className="font-mono text-xs tabular-nums text-fg">{v}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-elevated">
        <div
          className={cn("meter-fill h-full rounded-full", tones[tone])}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
