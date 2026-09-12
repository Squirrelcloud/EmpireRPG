import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import { playClick } from "@/lib/empire/audio";
import { choicesOf, dialogueById } from "@/lib/empire/sim";
import { seed, useEmpire } from "@/lib/empire/store";

export function DialogueView() {
  const dialogueId = useEmpire((s) => s.dialogueId);
  const pickChoice = useEmpire((s) => s.pickChoice);
  const closeDialogue = useEmpire((s) => s.closeDialogue);
  const crews = useEmpire((s) => s.crews);
  const row = dialogueId ? dialogueById(seed.dialogue, dialogueId) : undefined;
  if (!row) return null;

  const speaker = crews[row.Speaker] ?? seed.crews.find((c) => c.Name === row.Speaker);
  const fallback = seed.crews.find((c) => c.Name === row.Speaker)?.Portrait ?? "/art/hall.jpg";
  const choices = choicesOf(row);
  const terminal = row.EndsScene && choices.length === 0;

  return (
    <main className="relative flex min-h-dvh flex-col md:flex-row">
      <div className="relative h-56 shrink-0 md:h-auto md:w-[42%]">
        <ArtImage
          src={speaker?.Portrait ?? fallback}
          fallback={fallback}
          alt=""
          className="absolute inset-0 size-full object-cover object-top outline outline-1 -outline-offset-1 outline-white/10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent md:bg-gradient-to-r" />
      </div>
      <div className="relative flex flex-1 flex-col justify-end gap-6 px-5 py-8 md:justify-center md:px-12">
        <div className="max-w-xl space-y-4">
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
            {speaker?.DisplayName ?? row.Speaker}
          </p>
          <p className="font-display text-2xl font-medium leading-snug text-fg sm:text-3xl">{row.Text}</p>
        </div>
        <div className="flex max-w-xl flex-col gap-2">
          {choices.map((c) => (
            <Button
              key={c.key}
              variant="secondary"
              className="h-auto min-h-12 justify-start py-3 text-left"
              onClick={() => {
                playClick();
                pickChoice(c.key);
              }}
            >
              {c.text}
            </Button>
          ))}
          {terminal ? (
            <Button
              className="min-h-12"
              onClick={() => {
                playClick();
                closeDialogue();
              }}
            >
              Return to the table
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
