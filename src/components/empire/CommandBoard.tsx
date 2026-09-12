import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/empire/Meters";
import { playClick, playTick } from "@/lib/empire/audio";
import { HALL_MAP_ART } from "@/lib/empire/art";
import { heatBand } from "@/lib/empire/sim";
import { heatNow, loopClosed, seed, useEmpire } from "@/lib/empire/store";
import { cn } from "@/lib/utils";
import type { TerritoryId } from "@/lib/empire/types";

export function CommandBoard() {
  const territories = useEmpire((s) => s.territories);
  const crews = useEmpire((s) => s.crews);
  const selected = useEmpire((s) => s.selectedTerritory);
  const selectTerritory = useEmpire((s) => s.selectTerritory);
  const tickNight = useEmpire((s) => s.tickNight);
  const startDocks = useEmpire((s) => s.startDocks);
  const openKit = useEmpire((s) => s.openKit);
  const openLibrary = useEmpire((s) => s.openLibrary);
  const reset = useEmpire((s) => s.reset);
  const day = useEmpire((s) => s.day);
  const cash = useEmpire((s) => s.cash);
  const log = useEmpire((s) => s.log);
  const v0 = useEmpire((s) => s.v0);
  const mapArt = useEmpire((s) => s.mapArt);
  const done = loopClosed(v0);
  const city = heatNow(territories);
  const band = heatBand(seed.simRules, city);
  const focus = selected ? territories[selected] : territories.NeonRow;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">The Hall</p>
          <h1 className="font-display text-2xl font-medium">Command</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs tabular-nums text-muted">
          <span>Day {day}</span>
          <span>Cash {cash}</span>
          <span>
            Heat {Math.round(city)} · {band.id}
          </span>
        </div>
      </header>

      {done ? (
        <div className="rounded-xl bg-elevated px-4 py-3 text-sm shadow-border">
          Loop closed. Neon Row resolved. Marcus debriefed. Control and loyalty moved.
        </div>
      ) : null}

      <section className="relative hidden overflow-hidden rounded-2xl bg-surface shadow-border md:block">
        <ArtImage
          src={mapArt}
          fallback={HALL_MAP_ART}
          alt="Five districts around the Hall"
          className="h-72 w-full object-cover outline outline-1 -outline-offset-1 outline-white/10 lg:h-80"
        />
        {seed.territories.map((t) => {
          const live = territories[t.Name];
          return (
            <button
              key={t.Name}
              type="button"
              onClick={() => {
                playClick();
                selectTerritory(t.Name as TerritoryId);
              }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-bg/80 px-2 py-1 text-left shadow-border",
                selected === t.Name && "bg-elevated shadow-border-hover",
                !t.V0Active && "opacity-50",
              )}
              style={{ left: `${t.MapX}%`, top: `${t.MapY}%` }}
            >
              <p className="text-xs font-medium text-fg">{t.DisplayName}</p>
              {t.V0Active ? (
                <p className="font-mono text-xs tabular-nums text-muted">
                  {Math.round(live.control)}
                </p>
              ) : null}
            </button>
          );
        })}
      </section>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
        {seed.territories.map((t) => {
          const live = territories[t.Name];
          return (
            <li key={t.Name}>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  selectTerritory(t.Name as TerritoryId);
                }}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between rounded-lg bg-surface px-3 py-2 text-left shadow-border",
                  selected === t.Name && "shadow-border-hover",
                  !t.V0Active && "opacity-50",
                )}
              >
                <span className="text-sm">{t.DisplayName}</span>
                <span className="font-mono text-xs tabular-nums text-muted">
                  {t.V0Active ? `${Math.round(live.control)} / ${Math.round(live.heat)}` : "Locked"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl bg-surface p-4 shadow-border">
          <p className="text-xs text-muted">{focus.DistrictType}</p>
          <h2 className="mt-1 font-display text-xl">{focus.DisplayName}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{focus.Blurb}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Meter label="Control" value={focus.control} tone="control" />
            <Meter label="Heat" value={focus.heat} tone="heat" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            className="min-h-12"
            onClick={() => {
              playTick();
              tickNight();
            }}
          >
            Tick the night
          </Button>
          <Button variant="secondary" className="min-h-12" disabled={!done} onClick={startDocks}>
            Take the Docks
          </Button>
          <Button variant="ghost" className="min-h-12" onClick={() => openLibrary(true)}>
            Library
          </Button>
          <Button variant="ghost" className="min-h-12" onClick={() => openKit(true)}>
            Data kit
          </Button>
          <Button variant="ghost" className="min-h-12" onClick={reset}>
            New night
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium tracking-[0.22em] text-muted uppercase">Crew</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {seed.crews.map((c) => {
            const live = crews[c.Name];
            return (
              <li key={c.Name} className="rounded-xl bg-surface p-2 shadow-border">
                <ArtImage
                  src={live.Portrait}
                  fallback={c.Portrait}
                  alt=""
                  className={cn(
                    "aspect-2/3 w-full rounded-lg object-cover outline outline-1 -outline-offset-1 outline-white/10",
                    live.betrayed && "grayscale",
                  )}
                />
                <p className="mt-2 truncate text-sm font-medium">{c.DisplayName}</p>
                <p className="text-xs text-muted">{live.betrayed ? "Gone" : c.Role}</p>
                <div className="mt-2">
                  <Meter compact label="Loyalty" value={live.loyalty} tone="loyalty" />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-border">
        <h2 className="text-xs font-medium tracking-[0.22em] text-muted uppercase">Log</h2>
        <ul className="mt-3 space-y-1.5">
          {log.length === 0 ? <li className="text-sm text-muted">The table is quiet.</li> : null}
          {log.slice(0, 8).map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "text-sm",
                entry.tone === "good" && "text-control",
                entry.tone === "bad" && "text-heat",
                entry.tone === "neutral" && "text-muted",
              )}
            >
              {entry.text}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
