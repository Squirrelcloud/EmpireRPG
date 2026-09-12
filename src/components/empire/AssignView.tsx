import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/empire/Meters";
import { playClick } from "@/lib/empire/audio";
import { questById } from "@/lib/empire/sim";
import { seed, useEmpire } from "@/lib/empire/store";
import { cn } from "@/lib/utils";
import type { CrewId } from "@/lib/empire/types";

export function AssignView() {
  const crews = useEmpire((s) => s.crews);
  const assigned = useEmpire((s) => s.assigned);
  const toggleAssign = useEmpire((s) => s.toggleAssign);
  const confirmAssign = useEmpire((s) => s.confirmAssign);
  const activeQuest = useEmpire((s) => s.activeQuest);
  const quest = questById(seed.quests, activeQuest ?? "DefendNeonRow");
  const min = Math.max(1, quest?.RequiredCrewMin ?? 1);
  const deployable = seed.crews.filter((c) => crews[c.Name]?.Deployable);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">Roster</p>
        <h1 className="font-display text-3xl font-medium">{quest?.Title ?? "Assign crew"}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          {quest?.Summary} Marcus stays in the Hall. {min}–{seed.simRules.defense.maxAssigned} on the street.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deployable.map((c) => {
          const live = crews[c.Name];
          const on = assigned.includes(c.Name as CrewId);
          const dead = live?.betrayed;
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
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Selected <span className="font-mono tabular-nums text-fg">{assigned.length}</span> / {seed.simRules.defense.maxAssigned}
        </p>
        <Button className="min-h-12 sm:min-w-48" disabled={assigned.length < min} onClick={confirmAssign}>
          Walk the street
        </Button>
      </div>
    </main>
  );
}
