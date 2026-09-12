import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/empire/Meters";
import { playClick, playLoss, playWin } from "@/lib/empire/audio";
import { crewPower } from "@/lib/empire/sim";
import { seed, useEmpire } from "@/lib/empire/store";

export function DefenseView() {
  const assigned = useEmpire((s) => s.assigned);
  const crews = useEmpire((s) => s.crews);
  const territories = useEmpire((s) => s.territories);
  const pickTactic = useEmpire((s) => s.pickTactic);
  const lastDefense = useEmpire((s) => s.lastDefense);
  const finishResolve = useEmpire((s) => s.finishResolve);
  const phase = useEmpire((s) => s.phase);
  const activeQuest = useEmpire((s) => s.activeQuest);

  const territoryId = activeQuest === "TakeoverDocks" ? "Docks" : "NeonRow";
  const territory = territories[territoryId];
  const fallbackArt = seed.territories.find((t) => t.Name === territoryId)?.Art ?? "/art/neon-row.jpg";
  const bodies = assigned.map((id) => crews[id]).filter(Boolean);
  const preview = crewPower(bodies, seed.simRules, undefined);
  const threat = territory.DefenseDifficulty + territory.heat * 0.35;

  if (phase === "resolve" && lastDefense) {
    return (
      <main className="relative flex min-h-dvh flex-col justify-end">
        <ArtImage
          src={territory.Art}
          fallback={fallbackArt}
          alt=""
          className="absolute inset-0 size-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/30" />
        <div className="relative z-10 mx-auto w-full max-w-lg space-y-6 px-5 pb-10">
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
            <Stat label="Loyalty" value={lastDefense.won ? 3 : -4} signed />
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
            {activeQuest === "TakeoverDocks" ? "Back to the table" : "Debrief Marcus"}
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
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-5 pb-10">
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">{territory.DisplayName}</p>
          <h1 className="mt-2 font-display text-3xl font-medium">Pick the walk</h1>
          <p className="mt-2 text-sm text-muted">
            Crew power {preview.toFixed(0)} against threat {threat.toFixed(0)}. Variance ±
            {seed.simRules.defense.variance}.
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
          {seed.simRules.tactics.map((t) => {
            const bonus = bodies.some((c) => t.bonusIf.includes(c.Name));
            return (
              <Button
                key={t.id}
                variant="secondary"
                className="h-auto min-h-14 flex-col items-start gap-1 py-3 text-left"
                onClick={() => {
                  playClick();
                  pickTactic(t.id);
                  const won = useEmpire.getState().lastDefense?.won ?? false;
                  if (won) playWin();
                  else playLoss();
                }}
              >
                <span>{t.label}</span>
                <span className="text-xs font-normal text-muted">
                  {t.blurb}
                  {bonus ? " Bonus active." : ""}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  const n = Math.round(value);
  const text = signed && n > 0 ? `+${n}` : String(n);
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-lg tabular-nums">{text}</p>
    </div>
  );
}
