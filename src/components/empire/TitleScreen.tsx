import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { playOpen, unlockAudio } from "@/lib/empire/audio";
import { useEmpire } from "@/lib/empire/store";

export function TitleScreen() {
  const enterHall = useEmpire((s) => s.enterHall);
  const openKit = useEmpire((s) => s.openKit);
  const openLibrary = useEmpire((s) => s.openLibrary);
  const hallArt = useEmpire((s) => s.territories.Hall?.Art ?? "/art/hall.jpg");

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
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-[0.28em] text-muted uppercase">Hall Command · v0</p>
          <h1 className="font-display text-6xl font-medium tracking-tight text-fg sm:text-7xl">Empire</h1>
          <p className="max-w-md text-base leading-relaxed text-muted">
            Defend Neon Row. Debrief Marcus. Watch control and loyalty move. No city until that loop works.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
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
