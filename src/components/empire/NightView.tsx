import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/empire/Meters";
import { playClick } from "@/lib/empire/audio";
import { seed, useEmpire } from "@/lib/empire/store";
import { cn } from "@/lib/utils";
import type { TerritoryId } from "@/lib/empire/types";

export function NightView() {
  const lastNight = useEmpire((s) => s.lastNight);
  const territories = useEmpire((s) => s.territories);
  const finishNight = useEmpire((s) => s.finishNight);

  if (!lastNight) return null;

  const streetId = (lastNight.patrols[0]?.id ??
    (lastNight.neonLeak >= lastNight.docksLeak ? "NeonRow" : "Hall")) as TerritoryId;
  const street = territories[streetId] ?? territories.NeonRow;
  const fallbackArt = seed.territories.find((t) => t.Name === streetId)?.Art ?? "/art/hall.jpg";
  const shaken = lastNight.patrols.length > 0 || Boolean(lastNight.betrayal);
  const flashHeat = Boolean(lastNight.betrayal) || lastNight.patrols.length > 0;
  const title = lastNight.betrayal
    ? `${lastNight.betrayal} has a buyer.`
    : lastNight.dayRolled
      ? `Morning. Take ${lastNight.gained}.`
      : lastNight.patrols.length
        ? `Patrol on ${lastNight.patrols[0].name}.`
        : "The night went quiet.";
  const eyebrow = lastNight.betrayal ? "The door" : lastNight.dayRolled ? "Morning" : "Night";
  const action = lastNight.betrayal
    ? lastNight.betrayal === "Rico"
      ? "Call the corners"
      : "Call the door"
    : lastNight.dayRolled
      ? "Debrief Marcus"
      : "Return to the table";

  return (
    <main
      className={cn(
        "relative flex min-h-dvh flex-col justify-end overflow-hidden",
        shaken && "anim-shake",
      )}
    >
      <ArtImage
        src={street.Art}
        fallback={fallbackArt}
        alt=""
        className="absolute inset-0 size-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/30" />
      <div
        className={cn("pointer-events-none absolute inset-0 z-20 anim-flash", flashHeat ? "bg-heat" : "bg-fg")}
        aria-hidden
      />
      <div className="anim-rise relative z-10 mx-auto w-full max-w-lg space-y-6 px-5 pb-10">
        <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">{eyebrow}</p>
        <h1 className="font-display text-4xl font-medium">{title}</h1>
        <p className="text-sm text-muted">
          {lastNight.bandBefore === lastNight.bandAfter
            ? lastNight.bandAfter
            : `${lastNight.bandBefore} → ${lastNight.bandAfter}`}
          {lastNight.patrols.length
            ? ` · ${lastNight.patrols.map((p) => p.name).join(" · ")}`
            : " · no patrol"}
          .
        </p>
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-surface/90 p-4 shadow-border">
          <Stat label="Ticks" value={lastNight.ticks} />
          <Stat label="Patrols" value={lastNight.patrols.length} />
          <Stat label="Take" value={lastNight.gained} signed />
          <Stat label="Neon" value={-lastNight.neonLeak} signed />
          <Stat label="Docks" value={-lastNight.docksLeak} signed />
          <Stat label="Heat" value={lastNight.cityHeatAfter} />
        </div>
        <Meter label="Neon Row control" value={territories.NeonRow.control} tone="control" />
        <Meter label="Docks control" value={territories.Docks.control} tone="control" />
        <Button
          className="min-h-12 w-full"
          variant={lastNight.betrayal ? "heat" : "primary"}
          onClick={() => {
            playClick();
            finishNight();
          }}
        >
          {action}
        </Button>
      </div>
    </main>
  );
}

function Stat({ label, value, signed: showSign }: { label: string; value: number; signed?: boolean }) {
  const n = Math.round(value);
  const text = showSign && n > 0 ? `+${n}` : String(n);
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-lg tabular-nums">{text}</p>
    </div>
  );
}
