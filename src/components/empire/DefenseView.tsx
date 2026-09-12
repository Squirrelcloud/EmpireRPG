import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/empire/Meters";
import { playClick, playLoss, playWin } from "@/lib/empire/audio";
import { questById } from "@/lib/empire/sim";
import { forecastWalk, signed, winLabel } from "@/lib/empire/strategy";
import { seed, useEmpire } from "@/lib/empire/store";
import { cn } from "@/lib/utils";
import type { TerritoryId } from "@/lib/empire/types";

export function DefenseView() {
  const assigned = useEmpire((s) => s.assigned);
  const crews = useEmpire((s) => s.crews);
  const territories = useEmpire((s) => s.territories);
  const pickTactic = useEmpire((s) => s.pickTactic);
  const lastDefense = useEmpire((s) => s.lastDefense);
  const finishResolve = useEmpire((s) => s.finishResolve);
  const phase = useEmpire((s) => s.phase);
  const activeQuest = useEmpire((s) => s.activeQuest);
  const tabled = useEmpire((s) => s.tactic);

  const quest = questById(seed.quests, activeQuest ?? "DefendNeonRow");
  const territoryId = (quest?.TerritoryId ?? "NeonRow") as TerritoryId;
  const territory = territories[territoryId];
  const fallbackArt = seed.territories.find((t) => t.Name === territoryId)?.Art ?? "/art/neon-row.jpg";
  const bodies = assigned.map((id) => crews[id]).filter(Boolean);
  const forecasts = seed.simRules.tactics.map((tactic) =>
    forecastWalk({ seed, bodies, tactic, territory, quest }),
  );
  const ranked = [...forecasts].sort((a, b) => {
    if (tabled === a.tactic.id) return -1;
    if (tabled === b.tactic.id) return 1;
    return b.win - a.win;
  });
  const best = forecasts.reduce((a, b) => (a.win >= b.win ? a : b));

  if (phase === "resolve" && lastDefense) {
    return (
      <main
        className={cn(
          "relative flex min-h-dvh flex-col justify-end overflow-hidden",
          !lastDefense.won && "anim-shake",
        )}
      >
        <ArtImage
          src={territory.Art}
          fallback={fallbackArt}
          alt=""
          className="absolute inset-0 size-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/30" />
        <div
          className={cn("pointer-events-none absolute inset-0 z-20 anim-flash", lastDefense.won ? "bg-fg" : "bg-heat")}
          aria-hidden
        />
        <div className="anim-rise relative z-10 mx-auto w-full max-w-lg space-y-6 px-5 pb-10">
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
            {lastDefense.won ? "Held" : "Slipped"}
          </p>
          <h1 className="font-display text-4xl font-medium">
            {lastDefense.won
              ? `${territory.DisplayName} is yours until morning.`
              : `${territory.DisplayName} got away.`}
          </h1>
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-surface/90 p-4 shadow-border">
            <Stat label="Power" value={lastDefense.power} />
            <Stat label="Threat" value={lastDefense.threat} />
            <Stat label="Margin" value={lastDefense.margin} signed />
            <Stat label="Control" value={lastDefense.controlDelta} signed />
            <Stat label="Heat" value={lastDefense.heatDelta} signed />
            <Stat
              label="Loyalty"
              value={lastDefense.won ? (quest?.LoyaltyDeltaOnWin ?? 3) : (quest?.LoyaltyDeltaOnLoss ?? -4)}
              signed
            />
          </div>
          <Meter label={`${territory.DisplayName} control`} value={territory.control} tone="control" />
          <Meter label="Heat" value={territory.heat} tone="heat" />
          <Button
            className="min-h-12 w-full"
            onClick={() => {
              playClick();
              finishResolve();
            }}
          >
            Debrief Marcus
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col justify-end">
      <ArtImage
        src={territory.Art}
        fallback={fallbackArt}
        alt=""
        className="absolute inset-0 size-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-bg/25" />
      <div className="anim-rise relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-5 pb-10">
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">{territory.DisplayName}</p>
          <h1 className="mt-2 font-display text-3xl font-medium">Pick the walk</h1>
          <p className="mt-2 text-sm text-muted">
            Threat {best.threat.toFixed(0)}. Variance ±{seed.simRules.defense.variance}. Best table: {best.tactic.label}{" "}
            at {winLabel(best.win)}
            {tabled ? ` · war room tabled ${seed.simRules.tactics.find((t) => t.id === tabled)?.label}.` : "."}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {bodies.map((c) => (
            <ArtImage
              key={c.Name}
              src={c.Portrait}
              fallback={seed.crews.find((row) => row.Name === c.Name)?.Portrait ?? c.Portrait}
              alt={c.DisplayName}
              className="size-14 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-white/10"
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {ranked.map((f) => (
            <Button
              key={f.tactic.id}
              variant={tabled === f.tactic.id ? "primary" : "secondary"}
              className="h-auto min-h-14 flex-col items-start gap-1 py-3 text-left"
              onClick={() => {
                playClick();
                pickTactic(f.tactic.id);
                const won = useEmpire.getState().lastDefense?.won ?? false;
                if (won) playWin();
                else playLoss();
              }}
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span>
                  {f.tactic.label}
                  {tabled === f.tactic.id ? " · tabled" : ""}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted">{winLabel(f.win)}</span>
              </span>
              <span className="text-xs font-normal text-muted">
                {f.tactic.blurb}
                {f.bonus ? " Bonus active." : ""} Power {f.power.toFixed(0)} · Ctl {signed(f.evControl)} · Heat{" "}
                {signed(f.evHeat)} · {f.bandNow.id === f.bandAfter.id ? f.bandAfter.id : `${f.bandNow.id} → ${f.bandAfter.id}`}.
              </span>
            </Button>
          ))}
        </div>
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
