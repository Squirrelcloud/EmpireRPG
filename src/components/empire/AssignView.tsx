import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/empire/Meters";
import { playClick } from "@/lib/empire/audio";
import { questById } from "@/lib/empire/sim";
import { forecastWalk, signed, winLabel } from "@/lib/empire/strategy";
import { seed, useEmpire } from "@/lib/empire/store";
import { cn } from "@/lib/utils";
import type { CrewId } from "@/lib/empire/types";

export function AssignView() {
  const crews = useEmpire((s) => s.crews);
  const territories = useEmpire((s) => s.territories);
  const assigned = useEmpire((s) => s.assigned);
  const toggleAssign = useEmpire((s) => s.toggleAssign);
  const confirmAssign = useEmpire((s) => s.confirmAssign);
  const openWar = useEmpire((s) => s.openWar);
  const activeQuest = useEmpire((s) => s.activeQuest);
  const tabled = useEmpire((s) => s.tactic);
  const quest = questById(seed.quests, activeQuest ?? "DefendNeonRow");
  const min = Math.max(1, quest?.RequiredCrewMin ?? 1);
  const deployable = seed.crews.filter((c) => crews[c.Name]?.Deployable);
  const territory = territories[quest?.TerritoryId ?? "NeonRow"];
  const bodies = assigned.map((id) => crews[id]).filter(Boolean);
  const forecasts =
    bodies.length > 0
      ? seed.simRules.tactics.map((tactic) =>
          forecastWalk({ seed, bodies, tactic, territory, quest }),
        )
      : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="space-y-2">
        <p className="anim-rise text-xs font-medium tracking-[0.22em] text-muted uppercase">Roster</p>
        <h1 className="anim-rise anim-d1 font-display text-3xl font-medium">{quest?.Title ?? "Assign crew"}</h1>
        <p className="anim-rise anim-d2 max-w-xl text-sm leading-relaxed text-muted">
          {quest?.Summary} Marcus stays in the Hall. {min}–{seed.simRules.defense.maxAssigned} on the{" "}
          {quest?.TerritoryId === "Docks" ? "river" : "street"}.
        </p>
      </header>
      <ul className="anim-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deployable.map((c) => {
          const live = crews[c.Name];
          const on = assigned.includes(c.Name as CrewId);
          const dead = live?.betrayed;
          const thin = (live?.loyalty ?? c.Loyalty) < seed.simRules.betrayal.loyaltyThreshold + 12;
          return (
            <li key={c.Name}>
              <button
                type="button"
                disabled={dead}
                onClick={() => {
                  playClick();
                  toggleAssign(c.Name as CrewId);
                }}
                className={cn(
                  "flex w-full gap-3 rounded-xl bg-surface p-2 text-left shadow-border transition-shadow duration-150",
                  on && "bg-elevated shadow-border-hover",
                  dead && "opacity-40",
                )}
              >
                <ArtImage
                  src={live?.Portrait ?? c.Portrait}
                  fallback={c.Portrait}
                  alt=""
                  className="size-20 shrink-0 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-white/10"
                />
                <div className="min-w-0 flex-1 space-y-2 py-1 pr-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{c.DisplayName}</span>
                    <span className="text-xs text-muted">{on ? "On the street" : c.Role}</span>
                  </div>
                  <Meter compact label="Loyalty" value={live?.loyalty ?? c.Loyalty} tone="loyalty" />
                  <p className="font-mono text-xs tabular-nums text-subtle">
                    Combat {c.Combat} · Street {c.StreetSense}
                    {thin && !dead ? " · thin" : ""}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {forecasts.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {forecasts.map((f) => (
            <li
              key={f.tactic.id}
              className={cn(
                "rounded-lg bg-surface px-3 py-2 shadow-border",
                tabled === f.tactic.id && "shadow-border-hover",
              )}
            >
              <p className="text-xs text-muted">
                {f.tactic.label}
                {tabled === f.tactic.id ? " · tabled" : ""}
              </p>
              <p className="font-mono text-sm tabular-nums">
                {winLabel(f.win)}
                {f.bonus ? " · bonus" : ""}
              </p>
              <p className="font-mono text-xs tabular-nums text-subtle">
                Ctl {signed(f.evControl)} · Heat {signed(f.evHeat)} · {f.bandNow.id === f.bandAfter.id ? f.bandAfter.id : `${f.bandNow.id} → ${f.bandAfter.id}`}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Selected <span className="font-mono tabular-nums text-fg">{assigned.length}</span> / {seed.simRules.defense.maxAssigned}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="ghost" className="min-h-12" onClick={() => openWar(true)}>
            War room
          </Button>
          <Button className="min-h-12 sm:min-w-48" disabled={assigned.length < min} onClick={confirmAssign}>
            {quest?.TerritoryId === "Docks" ? "Walk the river" : "Walk the street"}
          </Button>
        </div>
      </div>
    </main>
  );
}
