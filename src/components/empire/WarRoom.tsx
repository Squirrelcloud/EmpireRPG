import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playClick } from "@/lib/empire/audio";
import { cityHeat, questById } from "@/lib/empire/sim";
import {
  bandShift,
  bestLineups,
  debriefAdvice,
  debriefTable,
  nightForks,
  nightOutlook,
  playForecast,
  playsFor,
  recommendPlay,
  signed,
  walkTarget,
  winLabel,
} from "@/lib/empire/strategy";
import { docksUnlocked, riverClosed, seed, useEmpire } from "@/lib/empire/store";
import { useOverlayPresence } from "@/lib/empire/motion";
import { cn } from "@/lib/utils";
import type { CrewId, TerritoryId } from "@/lib/empire/types";

type Tab = "plays" | "walk" | "night";

export function WarRoom() {
  const open = useEmpire((s) => s.warOpen);
  const openWar = useEmpire((s) => s.openWar);
  const applyPlan = useEmpire((s) => s.applyPlan);
  const startWalk = useEmpire((s) => s.startWalk);
  const startDocks = useEmpire((s) => s.startDocks);
  const startDoor = useEmpire((s) => s.startDoor);
  const tickNight = useEmpire((s) => s.tickNight);
  const crews = useEmpire((s) => s.crews);
  const territories = useEmpire((s) => s.territories);
  const assigned = useEmpire((s) => s.assigned);
  const activeQuest = useEmpire((s) => s.activeQuest);
  const nightTick = useEmpire((s) => s.nightTick);
  const flags = useEmpire((s) => s.flags);
  const v0 = useEmpire((s) => s.v0);
  const lastDefense = useEmpire((s) => s.lastDefense);
  const phase = useEmpire((s) => s.phase);
  const [tab, setTab] = useState<Tab>("plays");
  const [streetPick, setStreetPick] = useState<TerritoryId | null>(null);
  const { present, leaving } = useOverlayPresence(open);

  const city = cityHeat(territories, seed.simRules.v0Scope);
  const docksOpen = docksUnlocked(v0, territories);
  const river = riverClosed(v0);
  const defaultStreet: TerritoryId =
    activeQuest === "TakeoverDocks" || (docksOpen && !river) ? "Docks" : "NeonRow";
  const street: TerritoryId = streetPick ?? defaultStreet;
  const streetQuestId = street === "Docks" ? "TakeoverDocks" : "DefendNeonRow";
  const live = walkTarget(seed, streetQuestId, territories);
  const liveQuest = live.quest ?? questById(seed.quests, streetQuestId);
  const named = playsFor(streetQuestId);

  const rec = useMemo(
    () =>
      recommendPlay({
        seed,
        crews,
        territory: live.territory,
        quest: liveQuest,
        cityHeat: city,
        plays: named,
      }),
    [crews, live.territory, liveQuest, city, named],
  );

  const plays = useMemo(() => {
    const rows = named.map((play) => ({
      play,
      forecast: playForecast(play, { seed, crews, territory: live.territory, quest: liveQuest }),
    }));
    rows.sort((a, b) => Number(rec?.play.id === b.play.id) - Number(rec?.play.id === a.play.id));
    return rows;
  }, [crews, live.territory, liveQuest, rec, named]);

  const lineups = useMemo(
    () =>
      bestLineups({
        seed,
        crews,
        territory: live.territory,
        quest: liveQuest,
        cityHeat: city,
        limit: 4,
      }),
    [crews, live.territory, liveQuest, city],
  );

  const night = useMemo(
    () => nightOutlook({ seed, crews, territories, cityHeat: city, nightTick }),
    [crews, territories, city, nightTick],
  );

  const forks = useMemo(
    () =>
      nightForks({
        seed,
        crews,
        territories,
        cityHeat: city,
        debriefed: v0.debriefed,
        nightTick,
        egoRico: Boolean(flags.creditSelf && !flags.ricoNamed),
      }),
    [crews, territories, city, v0.debriefed, nightTick, flags.creditSelf, flags.ricoNamed],
  );

  const advice = useMemo(
    () =>
      debriefAdvice({
        crews,
        cityHeat: city,
        heatThreshold: seed.simRules.betrayal.heatThreshold,
        street,
      }),
    [crews, city, street],
  );

  const table = useMemo(
    () => debriefTable({ crews, assigned, won: lastDefense?.won ?? true, street }),
    [crews, assigned, lastDefense, street],
  );

  const docksRec = useMemo(
    () =>
      recommendPlay({
        seed,
        crews,
        territory: territories.Docks,
        quest: questById(seed.quests, "TakeoverDocks"),
        cityHeat: city,
      }),
    [crews, territories.Docks, city],
  );

  if (!present) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className={cn("absolute inset-0 bg-bg/60", leaving ? "anim-veil-out" : "anim-veil")}
        aria-hidden
      />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-lg flex-col bg-surface shadow-border",
          leaving ? "anim-sheet-out" : "anim-sheet",
        )}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-xs tracking-[0.22em] text-muted uppercase">Table</p>
            <h2 className="font-display text-xl">War room</h2>
          </div>
          <Button variant="ghost" className="size-11 p-0" onClick={() => openWar(false)} aria-label="Close war room">
            <X className="size-5" />
          </Button>
        </header>
        <p className="px-5 text-sm leading-relaxed text-muted">
          {live.territory.DisplayName} is {heatBandLabel(live.territory.heat)}. Threat{" "}
          {live.territory.DefenseDifficulty.toFixed(0)} plus heat. Variance ±{seed.simRules.defense.variance}.{" "}
          {rec
            ? `Tonight: ${rec.play.name} · ${winLabel(rec.forecast.win)} · ${bandShift(rec.forecast.bandNow, rec.forecast.bandAfter)}.`
            : "No bodies left to table."}
        </p>
        <div className="mt-4 flex gap-1 px-5">
          <StreetBtn
            label="Neon Row"
            on={street === "NeonRow"}
            onClick={() => setStreetPick("NeonRow")}
          />
          <StreetBtn
            label="The Docks"
            on={street === "Docks"}
            disabled={!v0.debriefed}
            onClick={() => setStreetPick("Docks")}
          />
        </div>
        {street === "Docks" && !docksOpen ? (
          <p className="px-5 pt-3 text-sm text-heat">Neon is too hot to leave the Row.</p>
        ) : null}
        <div className="mt-3 flex gap-1 px-5">
          <TabBtn label="Plays" on={tab === "plays"} onClick={() => setTab("plays")} />
          <TabBtn label="Walk" on={tab === "walk"} onClick={() => setTab("walk")} />
          <TabBtn label="Night" on={tab === "night"} onClick={() => setTab("night")} />
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {tab === "plays"
            ? plays.map(({ play, forecast }) => {
                const tonight = rec?.play.id === play.id;
                return (
                  <article key={play.id} className="rounded-xl bg-elevated p-4 shadow-border">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-lg">{play.name}</h3>
                      {forecast ? (
                        <span className="font-mono text-xs tabular-nums text-muted">
                          {winLabel(forecast.win)} · {bandShift(forecast.bandNow, forecast.bandAfter)}
                        </span>
                      ) : (
                        <span className="text-xs text-heat">Bodies gone</span>
                      )}
                    </div>
                    {tonight ? <p className="mt-1 text-xs tracking-[0.18em] text-control uppercase">Tonight</p> : null}
                    <p className="mt-2 text-sm leading-relaxed text-muted">{play.blurb}</p>
                    <p className="mt-2 text-xs text-subtle">{play.when}</p>
                    <p className="mt-1 text-xs text-subtle">Debrief: {play.debrief}</p>
                    {forecast ? (
                      <p className="mt-2 font-mono text-xs tabular-nums text-subtle">
                        Ctl {signed(forecast.evControl)} · Heat {signed(forecast.evHeat)} · after{" "}
                        {Math.round(forecast.heatAfter)}
                      </p>
                    ) : null}
                    <Button
                      className="mt-4 min-h-11 w-full"
                      disabled={!forecast || (street === "Docks" && !docksOpen)}
                      onClick={() => {
                        playClick();
                        applyPlan(
                          play.crew.filter((id) => crews[id] && !crews[id].betrayed),
                          play.tacticId,
                          streetQuestId,
                        );
                      }}
                    >
                      Run this walk
                    </Button>
                  </article>
                );
              })
            : null}

          {tab === "walk" ? (
            <>
              <p className="text-sm text-muted">
                Best lineups for {live.territory.DisplayName} tonight. Secondary bodies count at 42%. A dropped heat
                band scores harder than a louder claim.
              </p>
              {lineups.map((plan) => (
                <button
                  key={`${plan.crew.join("-")}-${plan.forecast.tactic.id}`}
                  type="button"
                  disabled={street === "Docks" && !docksOpen}
                  onClick={() => {
                    playClick();
                    applyPlan(plan.crew, plan.forecast.tactic.id, streetQuestId);
                  }}
                  className={cn(
                    "block w-full rounded-xl bg-elevated p-4 text-left shadow-border disabled:opacity-40",
                    sameCrew(assigned, plan.crew) && "shadow-border-hover",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{plan.forecast.tactic.label}</span>
                    <span className="font-mono text-xs tabular-nums text-fg">{winLabel(plan.forecast.win)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{plan.names.join(" · ")}</p>
                  <p className="mt-2 font-mono text-xs tabular-nums text-subtle">
                    Power {plan.forecast.power.toFixed(0)} vs {plan.forecast.threat.toFixed(0)}
                    {plan.forecast.bonus ? " · bonus" : ""} · {bandShift(plan.forecast.bandNow, plan.forecast.bandAfter)}{" "}
                    · Ctl {signed(plan.forecast.evControl)} · Heat {signed(plan.forecast.evHeat)}
                  </p>
                </button>
              ))}
            </>
          ) : null}

          {tab === "night" ? (
            <>
              <div className="rounded-xl bg-elevated p-4 shadow-border">
                <p className="text-xs tracking-[0.22em] text-muted uppercase">Heat band</p>
                <h3 className="mt-1 font-display text-xl">{night.band.id}</h3>
                <p className="mt-2 text-sm text-muted">
                  Patrol {Math.round(night.band.patrolChance * 100)}%. Income ×{night.band.incomeMult}. Leak{" "}
                  {night.band.controlLeak} plus hold decay {seed.simRules.control.holdDecayPerTick}.
                </p>
                <p className="mt-2 font-mono text-xs tabular-nums text-subtle">
                  Day take {night.income} in {night.ticksToPay} tick{night.ticksToPay === 1 ? "" : "s"}.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs tracking-[0.22em] text-muted uppercase">Forks</p>
                {forks.map((fork) => {
                  const canRun =
                    fork.ready &&
                    (fork.id === "walk" || phase === "command" || v0.debriefed);
                  return (
                    <button
                      key={fork.id}
                      type="button"
                      disabled={!canRun}
                      onClick={() => {
                        playClick();
                        if (fork.door === "Vex" || fork.door === "Rico") {
                          startDoor(fork.door);
                        } else if (fork.id === "walk") {
                          openWar(false);
                          const neonRec = recommendPlay({
                            seed,
                            crews,
                            territory: territories.NeonRow,
                            quest: questById(seed.quests, "DefendNeonRow"),
                            cityHeat: city,
                          });
                          if (neonRec) applyPlan(neonRec.play.crew, neonRec.play.tacticId, "DefendNeonRow");
                          else if (v0.debriefed) startWalk();
                        } else if (fork.id === "tick") {
                          openWar(false);
                          tickNight();
                        } else if (fork.id === "docks" && docksRec) {
                          applyPlan(docksRec.play.crew, docksRec.play.tacticId, "TakeoverDocks");
                        } else if (fork.id === "docks") {
                          openWar(false);
                          startDocks();
                        }
                      }}
                      className="block w-full rounded-xl bg-elevated p-4 text-left shadow-border disabled:opacity-40"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{fork.name}</span>
                        <span className="font-mono text-xs tabular-nums text-muted">
                          {fork.blocked
                            ? "Blocked"
                            : fork.win != null
                              ? `${winLabel(fork.win)}${fork.bandShift ? ` · ${fork.bandShift}` : ""}`
                              : fork.bandShift}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{fork.blocked ?? fork.blurb}</p>
                      {fork.evControl != null ? (
                        <p className="mt-2 font-mono text-xs tabular-nums text-subtle">
                          Ctl {signed(fork.evControl)} · Heat {signed(fork.evHeat ?? 0)}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <ul className="space-y-2">
                {night.leak.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3 rounded-lg bg-elevated px-3 py-2 text-sm shadow-border">
                    <span>{row.name}</span>
                    <span className="font-mono text-xs tabular-nums text-muted">
                      Ctl {Math.round(row.control)} · leak {row.leak.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <p className="text-xs tracking-[0.22em] text-muted uppercase">Betrayal</p>
                {night.betrayal.map((b) => (
                  <div key={b.id} className="rounded-lg bg-elevated px-3 py-3 shadow-border">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{b.name}</span>
                      <span className={cn("font-mono text-xs tabular-nums", b.armed ? "text-heat" : "text-muted")}>
                        {b.armed ? `${Math.round(b.chance * 100)}% / tick` : "Held"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-subtle">
                      Loyalty {Math.round(b.loyalty)}. Flips under {seed.simRules.betrayal.loyaltyThreshold}
                      {city > seed.simRules.betrayal.heatThreshold ? ", and city heat is past the line." : "."}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs tracking-[0.22em] text-muted uppercase">Debrief</p>
                <p className="text-sm text-muted">
                  {advice.why} Table {advice.credit}, then {advice.cameras.toLowerCase()}.
                </p>
                <p className="text-xs tracking-[0.18em] text-subtle uppercase">Credit</p>
                {table.credit.map((row) => (
                  <DebriefLine key={row.id} row={row} />
                ))}
                <p className="pt-2 text-xs tracking-[0.16em] text-subtle uppercase">
                  {street === "Docks" ? "River cameras" : "Cameras"}
                </p>
                {table.cameras.map((row) => (
                  <DebriefLine key={row.id} row={row} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function heatBandLabel(heat: number) {
  return seed.simRules.heatBands.find((b) => heat >= b.min && heat <= b.max)?.id ?? "Burning";
}

function DebriefLine({
  row,
}: {
  row: { label: string; blurb: string; heat: number; control: number; loyalty: { name: string; delta: number }[] };
}) {
  return (
    <div className="rounded-lg bg-elevated px-3 py-3 shadow-border">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{row.label}</span>
        <span className="font-mono text-xs tabular-nums text-muted">
          Heat {signed(row.heat)}
          {row.control ? ` · Ctl ${signed(row.control)}` : ""}
        </span>
      </div>
      <p className="mt-1 text-xs text-subtle">{row.blurb}</p>
      <p className="mt-1 font-mono text-xs tabular-nums text-subtle">
        {row.loyalty.map((hit) => `${hit.name} ${signed(hit.delta)}`).join(" · ")}
      </p>
    </div>
  );
}

function TabBtn({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 flex-1 rounded-md px-3 text-sm font-medium",
        on ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}

function StreetBtn({
  label,
  on,
  disabled,
  onClick,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 flex-1 rounded-md px-3 text-sm font-medium",
        on ? "bg-elevated text-fg shadow-border" : "text-muted hover:text-fg",
        disabled && "opacity-40",
      )}
    >
      {label}
    </button>
  );
}

function sameCrew(a: CrewId[], b: CrewId[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, i) => id === right[i]);
}
