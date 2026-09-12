import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AssignView } from "@/components/empire/AssignView";
import { CommandBoard } from "@/components/empire/CommandBoard";
import { DefenseView } from "@/components/empire/DefenseView";
import { DialogueView } from "@/components/empire/DialogueView";
import { KitPanel } from "@/components/empire/KitPanel";
import { LibraryPanel } from "@/components/empire/LibraryPanel";
import { TitleScreen } from "@/components/empire/TitleScreen";
import { useEmpire } from "@/lib/empire/store";

export function EmpireApp() {
  const hydrated = useEmpire((s) => s.hydrated);
  const phase = useEmpire((s) => s.phase);
  const markHydrated = useEmpire((s) => s.markHydrated);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      }),
  );

  useEffect(() => {
    void Promise.resolve(useEmpire.persist.rehydrate()).finally(() => markHydrated());
  }, [markHydrated]);

  if (!hydrated) {
    return <div className="min-h-dvh bg-bg" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-dvh bg-bg text-fg">
        {phase === "title" ? <TitleScreen /> : null}
        {phase === "briefing" || phase === "debrief" || phase === "event" ? <DialogueView /> : null}
        {phase === "assign" ? <AssignView /> : null}
        {phase === "defense" || phase === "resolve" ? <DefenseView /> : null}
        {phase === "command" ? <CommandBoard /> : null}
        <KitPanel />
        <LibraryPanel />
      </div>
    </QueryClientProvider>
  );
}
