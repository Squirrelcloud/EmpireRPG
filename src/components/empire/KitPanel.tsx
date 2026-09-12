import { Button } from "@/components/ui/button";
import { useOverlayPresence } from "@/lib/empire/motion";
import { seed, useEmpire } from "@/lib/empire/store";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const TASKS = [
  "Create a UE5 Third Person project named EmpireRPG.",
  "Make four structs from UnrealStructs.json.",
  "Import the four CSVs as DataTables.",
  "Create BP_EmpireSim and hydrate Control / Heat / Loyalty.",
  "Place Hall, Neon Row, and Docks volumes only.",
  "Print starting meters on BeginPlay.",
  "TickSim: heat bands and hold decay.",
  "Defense trigger on Neon Row with tactics.",
  "WBP_Debrief driven by DT_Dialogue.",
  "PIE: defend Neon, take Docks, debrief, watch meters.",
];

export function KitPanel() {
  const open = useEmpire((s) => s.kitOpen);
  const openKit = useEmpire((s) => s.openKit);
  const { present, leaving } = useOverlayPresence(open);
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
            <p className="text-xs tracking-[0.22em] text-muted uppercase">Unreal kit</p>
            <h2 className="font-display text-xl">EmpireRPG_UE5</h2>
          </div>
          <Button variant="ghost" className="size-11 p-0" onClick={() => openKit(false)} aria-label="Close kit">
            <X className="size-5" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 pb-8">
          <p className="text-sm leading-relaxed text-muted">
            Same tables the Hall is running. Import them as DataTables. v0 is Hall, Neon Row, Docks — nothing else until
            the loop works.
          </p>
          <a
            href="/EmpireRPG_UE5.zip"
            download
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
          >
            Download kit
          </a>
          <section className="space-y-3">
            <h3 className="text-xs tracking-[0.22em] text-muted uppercase">First 10 tasks</h3>
            <ol className="space-y-2 text-sm leading-relaxed text-fg">
              {TASKS.map((t, i) => (
                <li key={t} className="grid grid-cols-[2rem_1fr] gap-2">
                  <span className="font-mono text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </section>
          <Table title="Crews" rows={seed.crews.map((c) => [c.Name, c.Role, `Loy ${c.Loyalty}`])} />
          <Table
            title="Territories"
            rows={seed.territories.map((t) => [t.Name, t.V0Active ? "v0" : "later", `Ctl ${t.StartingControl}`])}
          />
          <Table title="Quests" rows={seed.quests.map((q) => [q.Name, q.Type, q.V0Active ? "v0" : "later"])} />
          <section className="space-y-2">
            <h3 className="text-xs tracking-[0.22em] text-muted uppercase">Heat bands</h3>
            <ul className="space-y-1 font-mono text-xs tabular-nums text-muted">
              {seed.simRules.heatBands.map((b) => (
                <li key={b.id}>
                  {b.id} {b.min}–{b.max} · leak {b.controlLeak}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              Betrayal under loyalty {seed.simRules.betrayal.loyaltyThreshold}, extra chance above heat{" "}
              {seed.simRules.betrayal.heatThreshold}.
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs tracking-[0.22em] text-muted uppercase">{title}</h3>
      <div className="overflow-hidden rounded-lg shadow-border">
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.join("-")} className="border-t border-border first:border-0">
                {r.map((cell) => (
                  <td key={cell} className="px-3 py-2 text-muted first:text-fg">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
