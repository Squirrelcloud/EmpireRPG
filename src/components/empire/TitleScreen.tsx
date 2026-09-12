import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { playOpen, unlockAudio } from "@/lib/empire/audio";
import { useEmpire } from "@/lib/empire/store";

export function TitleScreen() {
  const enterHall = useEmpire((s) => s.enterHall);
  const openKit = useEmpire((s) => s.openKit);
  const openLibrary = useEmpire((s) => s.openLibrary);
  const openWar = useEmpire((s) => s.openWar);
  const openFame = useEmpire((s) => s.openFame);
  const hallArt = useEmpire((s) => s.territories.Hall?.Art ?? "/art/hall.jpg");
  const playerArt = useEmpire((s) => s.crews.Player?.Portrait ?? "/art/crew-player.jpg");

  return (
    <main className="relative flex min-h-dvh flex-col justify-end overflow-hidden">
      <ArtImage
        src={hallArt}
        fallback="/art/hall.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/20" />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-8 px-5 pb-10 pt-24">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <ArtImage
            src={playerArt}
            fallback="/art/crew-player.jpg"
            alt=""
            className="anim-rise h-36 w-24 shrink-0 rounded-lg object-cover outline outline-1 -outline-offset-1 outline-white/10 sm:h-48 sm:w-32"
          />
          <div className="space-y-3">
            <p className="anim-rise anim-d1 text-xs font-medium tracking-[0.28em] text-muted uppercase">
              Hall Command · v0
            </p>
            <h1 className="anim-rise anim-d2 font-display text-6xl font-medium tracking-tight text-fg sm:text-7xl">
              Empire
            </h1>
            <p className="anim-rise anim-d3 max-w-md text-base leading-relaxed text-muted">
              Defend Neon Row. Take the Docks. Keep the door. Watch control and loyalty move.
            </p>
          </div>
        </div>
        <div className="anim-rise anim-d4 flex flex-col gap-3 sm:flex-row">
          <Button
            className="min-h-12 flex-1"
            onClick={() => {
              unlockAudio();
              playOpen();
              enterHall();
            }}
          >
            Enter the Hall
          </Button>
          <Button variant="ghost" className="min-h-12" onClick={() => openWar(true)}>
            War room
          </Button>
          <Button variant="ghost" className="min-h-12" onClick={() => openFame(true)}>
            Hall of Fame
          </Button>
          <Button variant="ghost" className="min-h-12" onClick={() => openLibrary(true)}>
            Library
          </Button>
          <Button variant="ghost" className="min-h-12" onClick={() => openKit(true)}>
            Data kit
          </Button>
        </div>
      </div>
    </main>
  );
}
