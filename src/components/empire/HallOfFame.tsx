import { X } from "lucide-react";
import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/empire/Meters";
import { playClick } from "@/lib/empire/audio";
import { CREW_SEATS, FAME_PLAQUE_ART, HALL_FAME_ART, crewSeatStatus, districtPlate } from "@/lib/empire/fame";
import { heatBand } from "@/lib/empire/sim";
import { useOverlayPresence } from "@/lib/empire/motion";
import { loopClosed, riverClosed, seed, useEmpire } from "@/lib/empire/store";
import { cn } from "@/lib/utils";
import type { CrewId } from "@/lib/empire/types";

export function HallOfFame() {
  const open = useEmpire((s) => s.fameOpen);
  const openFame = useEmpire((s) => s.openFame);
  const crews = useEmpire((s) => s.crews);
  const territories = useEmpire((s) => s.territories);
  const fameNights = useEmpire((s) => s.fameNights);
  const v0 = useEmpire((s) => s.v0);
  const day = useEmpire((s) => s.day);
  const { present, leaving } = useOverlayPresence(open);

  if (!present) return null;

  const neon = loopClosed(v0);
  const river = riverClosed(v0);
  const engravings = [
    { label: "Neon Row", value: v0.defended ? "Held" : "Empty" },
    { label: "Marcus", value: v0.debriefed ? "Debriefed" : "Waiting" },
    { label: "The Docks", value: v0.docksTaken ? "Taken" : "Empty" },
    { label: "The river", value: river ? "Closed" : neon ? "Ajar" : "Later" },
    { label: "The river door", value: v0.vexGone ? "Empty" : crewSeatStatus(crews.Vex) === "armed" ? "Armed" : crewSeatStatus(crews.Vex) === "thin" ? "Thin" : "Seated" },
    { label: "The corners", value: v0.ricoGone ? "Empty" : crewSeatStatus(crews.Rico) === "armed" ? "Armed" : crewSeatStatus(crews.Rico) === "thin" ? "Thin" : "Seated" },
  ];

  return (
    <div className={cn("fixed inset-0 z-40 overflow-y-auto bg-bg", leaving ? "anim-veil-out" : "anim-veil")}>
      <ArtImage
        src={HALL_FAME_ART}
        fallback="/art/hall.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/45" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-4 py-5 pb-12">
        <header className="anim-rise flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">The Hall</p>
            <h1 className="font-display text-3xl font-medium sm:text-4xl">Hall of Fame</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Steel plates. Museum light. The Hall keeps who walked and who did not. No gold.
            </p>
          </div>
          <Button variant="ghost" className="size-11 shrink-0 p-0" onClick={() => openFame(false)} aria-label="Close hall of fame">
            <X className="size-5" />
          </Button>
        </header>

        <section className="space-y-3">
          <h2 className="text-xs font-medium tracking-[0.22em] text-muted uppercase">The wall</h2>
          <ul className="anim-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {seed.crews.map((c) => {
              const live = crews[c.Name];
              const status = crewSeatStatus(live);
              return (
                <li key={c.Name}>
                  <article className="rounded-xl bg-surface/90 p-1.5 shadow-border">
                    <ArtImage
                      src={live.Portrait}
                      fallback={c.Portrait}
                      alt=""
                      className={cn(
                        "aspect-2/3 w-full rounded-md object-cover outline outline-1 -outline-offset-1 outline-white/10",
                        status === "gone" && "grayscale",
                      )}
                    />
                    <div className="space-y-1 px-1 py-3 text-center">
                      <p className="text-xs tracking-[0.16em] text-subtle uppercase">{CREW_SEATS[c.Name as CrewId]}</p>
                      <h3 className="font-display text-lg leading-tight">{c.DisplayName}</h3>
                      <p className="font-mono text-xs tabular-nums text-muted">
                        {status === "gone"
                          ? "Gone"
                          : status === "armed"
                            ? `Armed · ${Math.round(live.loyalty)}`
                            : status === "thin"
                              ? `Thin · ${Math.round(live.loyalty)}`
                              : `Seated · ${Math.round(live.loyalty)}`}
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-medium tracking-[0.22em] text-muted uppercase">District plates</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {seed.territories.map((t) => {
              const live = territories[t.Name];
              const plate = districtPlate(live, v0);
              const band = heatBand(seed.simRules, live.heat);
              return (
                <li key={t.Name}>
                  <article
                    className={cn(
                      "relative overflow-hidden rounded-xl bg-surface/90 shadow-border",
                      !plate.seated && t.Name !== "Hall" && "opacity-70",
                    )}
                  >
                    {!plate.seated && t.Name !== "Hall" ? (
                      <ArtImage
                        src={FAME_PLAQUE_ART}
                        fallback={FAME_PLAQUE_ART}
                        alt=""
                        className="absolute inset-0 size-full object-cover opacity-30"
                      />
                    ) : null}
                    <div className="relative space-y-2 px-4 py-4">
                      <p className="text-xs tracking-[0.18em] text-subtle uppercase">{t.DistrictType}</p>
                      <h3 className="font-display text-xl">{t.DisplayName}</h3>
                      <p className="text-sm text-muted">{plate.seat}</p>
                      {t.V0Active ? (
                        <div className="pt-1">
                          <Meter compact label={band.id} value={live.control} tone="control" />
                        </div>
                      ) : (
                        <p className="font-mono text-xs tabular-nums text-subtle">Locked</p>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl bg-surface/90 p-4 shadow-border">
            <h2 className="text-xs font-medium tracking-[0.22em] text-muted uppercase">Engraved</h2>
            <p className="mt-2 text-sm text-muted">Day {day}. The plates only move when the street does.</p>
            <ul className="mt-4 space-y-2">
              {engravings.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                  <span className="text-sm">{row.label}</span>
                  <span className="font-mono text-xs tabular-nums text-muted">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-surface/90 p-4 shadow-border">
            <h2 className="text-xs font-medium tracking-[0.22em] text-muted uppercase">The record</h2>
            {fameNights.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-muted">The wall is waiting. Walk Neon. Names go up after the street.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {fameNights.map((night) => (
                  <li key={night.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-lg">{night.title}</span>
                      <span className="font-mono text-xs tabular-nums text-muted">Day {night.day}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {night.tactic}. {night.names.join(" · ") || "No names."}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
