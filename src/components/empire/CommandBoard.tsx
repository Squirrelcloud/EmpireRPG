import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/empire/Meters";
import { playClick, playTick } from "@/lib/empire/audio";
import { HALL_MAP_ART } from "@/lib/empire/art";
import { heatBand, questById } from "@/lib/empire/sim";
import { bandShift, debriefAdvice, nightOutlook, recommendPlay, winLabel } from "@/lib/empire/strategy";
import { heatNow, loopClosed, riverClosed, docksUnlocked, seed, useEmpire } from "@/lib/empire/store";
import { cn } from "@/lib/utils";
import type { TerritoryId } from "@/lib/empire/types";

export function CommandBoard() {
  const territories = useEmpire((s) => s.territories);
  const crews = useEmpire((s) => s.crews);
  const selected = useEmpire((s) => s.selectedTerritory);
  const selectTerritory = useEmpire((s) => s.selectTerritory);
  const tickNight = useEmpire((s) => s.tickNight);
  const startDocks = useEmpire((s) => s.startDocks);
  const startDoor = useEmpire((s) => s.startDoor);
  const openKit = useEmpire((s) => s.openKit);
  const openLibrary = useEmpire((s) => s.openLibrary);
  const openWar = useEmpire((s) => s.openWar);
  const openFame = useEmpire((s) => s.openFame);
  const startWalk = useEmpire((s) => s.startWalk);
  const reset = useEmpire((s) => s.reset);
  const day = useEmpire((s) => s.day);
  const nightTick = useEmpire((s) => s.nightTick);
  const cash = useEmpire((s) => s.cash);
  const log = useEmpire((s) => s.log);
  const v0 = useEmpire((s) => s.v0);
  const flags = useEmpire((s) => s.flags);
  const mapArt = useEmpire((s) => s.mapArt);
  const done = loopClosed(v0);
  const river = riverClosed(v0);
  const docksOpen = docksUnlocked(v0, territories);
  const city = heatNow(territories);
  const band = heatBand(seed.simRules, city);
  const focus = selected ? territories[selected] : territories.NeonRow;
  const street = docksOpen && !river ? "Docks" : "NeonRow";
  const recQuest = questById(seed.quests, street === "Docks" ? "TakeoverDocks" : "DefendNeonRow");
  const rec = recommendPlay({
    seed,
    crews,
    territory: street === "Docks" ? territories.Docks : territories.NeonRow,
    quest: recQuest,
    cityHeat: city,
  });
  const advice = debriefAdvice({
    crews,
    cityHeat: city,
    heatThreshold: seed.simRules.betrayal.heatThreshold,
    street,
  });
  const doorRows = (["Vex", "Rico"] as const).flatMap((id) => {
    const c = crews[id];
    if (!c || c.betrayed) return [];
    const armed = c.loyalty < seed.simRules.betrayal.loyaltyThreshold;
    const thin = c.loyalty < 40;
    const word = id === "Rico" && Boolean(flags.creditSelf) && !flags.ricoNamed && !armed && !thin;
    if (!armed && !thin && !word) return [];
    return [{ crew: c, id, armed, thin, word }];
  });
  const doorCrew = doorRows.find((row) => row.armed) ?? doorRows.find((row) => row.thin) ?? doorRows[0];
  const doorArmed = Boolean(doorCrew?.armed);
  const doorChance =
    doorArmed && city > seed.simRules.betrayal.heatThreshold
      ? seed.simRules.betrayal.chanceWhenBoth
      : seed.simRules.betrayal.baseChancePerTick;
  const night = nightOutlook({ seed, crews, territories, cityHeat: city, nightTick });

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

      {doorRows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => {
            playClick();
            startDoor(row.id);
          }}
          className="anim-rise rounded-xl bg-elevated px-4 py-3 text-left shadow-border transition-[transform,box-shadow] duration-150 ease-out enabled:active:scale-[0.96]"
        >
          <p className={cn("text-xs tracking-[0.22em] uppercase", row.armed ? "text-heat" : "text-muted")}>
            {row.id === "Vex" ? "The door" : "The corners"}
          </p>
          <p className="mt-1 text-sm">
            {row.crew.DisplayName} · {row.armed ? "Armed" : row.thin ? "Thin" : "Heard the name"} ·{" "}
            {Math.round(row.crew.loyalty)}
            {row.armed ? ` · ${Math.round(doorChance * 100)}%/tick` : ""}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {row.armed
              ? `Call ${row.id === "Vex" ? "her" : "him"} before the night does.`
              : row.word
                ? "Buy them back or keep them."
                : row.id === "Vex"
                  ? "Buy the door or lean."
                  : "Buy the corners or lean."}
          </p>
        </button>
      ))}

      {rec ? (
        <button
          type="button"
          onClick={() => {
            playClick();
            openWar(true);
          }}
          className="anim-rise rounded-xl bg-elevated px-4 py-3 text-left shadow-border transition-[transform,box-shadow] duration-150 ease-out enabled:active:scale-[0.96]"
        >
          <p className="text-xs tracking-[0.22em] text-muted uppercase">Tonight</p>
          <p className="mt-1 text-sm">
            {rec.play.name} · {winLabel(rec.forecast.win)} ·{" "}
            {bandShift(rec.forecast.bandNow, rec.forecast.bandAfter)}
          </p>
          <p className="mt-1 text-xs text-subtle">{advice.why}</p>
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => {
          playTick();
          tickNight();
        }}
        className="anim-rise rounded-xl bg-elevated px-4 py-3 text-left shadow-border transition-[transform,box-shadow] duration-150 ease-out enabled:active:scale-[0.96]"
      >
        <p className="text-xs tracking-[0.22em] text-muted uppercase">Night</p>
        <p className="mt-1 text-sm">
          {night.ticksToPay} tick{night.ticksToPay === 1 ? "" : "s"} · take {night.income} · {night.band.id}
        </p>
        <p className="mt-1 text-xs text-subtle">
          Patrol {Math.round(night.band.patrolChance * 100)}%. Let it run until morning.
        </p>
      </button>

      {done && !river ? (
        <div className="rounded-xl bg-surface px-4 py-3 text-sm shadow-border">
          Neon closed. Warehouse door is ajar. Two bodies on the river, then debrief Marcus.
        </div>
      ) : null}
      {river ? (
        <div className="rounded-xl bg-surface px-4 py-3 text-sm shadow-border">
          {v0.vexGone
            ? "River closed. The door is empty. Let the night run, walk Neon, or take the Docks without her."
            : "River closed. Let the night run, walk Neon, take the Docks again, or keep the door."}
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
            variant="secondary"
            onClick={() => {
              playClick();
              openWar(true);
            }}
          >
            War room
          </Button>
          <Button
            className="min-h-12"
            variant={docksOpen && !river ? "secondary" : "primary"}
            onClick={() => {
              playTick();
              tickNight();
            }}
          >
            Let the night run
          </Button>
          <Button variant="secondary" className="min-h-12" disabled={!done} onClick={startWalk}>
            Walk Neon Row again
          </Button>
          <Button
            variant={docksOpen && !river ? "primary" : "secondary"}
            className="min-h-12"
            disabled={!done}
            onClick={startDocks}
          >
            Take the Docks
          </Button>
          <Button
            variant={doorArmed ? "heat" : "secondary"}
            className="min-h-12"
            disabled={!doorCrew}
            onClick={() => {
              if (!doorCrew) return;
              playClick();
              startDoor(doorCrew.id);
            }}
          >
            {doorCrew
              ? doorCrew.armed
                ? doorCrew.id === "Vex"
                  ? "Call the door"
                  : "Call the corners"
                : doorCrew.word
                  ? "Rico wants the name"
                  : doorCrew.id === "Vex"
                    ? "Press Vex"
                    : "Press Rico"
              : v0.vexGone
                ? "The door is empty"
                : "The door is seated"}
          </Button>
          <Button variant="ghost" className="min-h-12" onClick={() => openLibrary(true)}>
            Library
          </Button>
          <Button
            variant="ghost"
            className="min-h-12"
            onClick={() => {
              playClick();
              openFame(true);
            }}
          >
            Hall of Fame
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
