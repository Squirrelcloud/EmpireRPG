import { create } from "zustand";
import { persist } from "zustand/middleware";
import seedJson from "./seed.json";
import {
  HALL_MAP_ART,
  hallCrewArt,
  hallTerritoryArt,
  type ArtSlot,
  type StashItem,
} from "./art";
import type {
  CrewId,
  DefenseResult,
  EmpireSeed,
  LogEntry,
  Phase,
  RuntimeCrew,
  RuntimeTerritory,
  TacticId,
  TerritoryId,
} from "./types";
import {
  applyChoice,
  choicesOf,
  cityHeat,
  dialogueById,
  incomeOf,
  questById,
  resolveDefense,
  tickSim,
} from "./sim";

const seed = seedJson as EmpireSeed;
let logSeq = 1;

function hydrateCrews(): Record<string, RuntimeCrew> {
  return Object.fromEntries(
    seed.crews.map((c) => [c.Name, { ...c, loyalty: c.Loyalty, betrayed: false }]),
  );
}

function hydrateTerritories(): Record<string, RuntimeTerritory> {
  return Object.fromEntries(
    seed.territories.map((t) => [t.Name, { ...t, control: t.StartingControl, heat: t.StartingHeat }]),
  );
}

export interface EmpireState {
  phase: Phase;
  day: number;
  nightTick: number;
  cash: number;
  crews: Record<string, RuntimeCrew>;
  territories: Record<string, RuntimeTerritory>;
  assigned: CrewId[];
  tactic: TacticId | null;
  dialogueId: string | null;
  activeQuest: string | null;
  log: LogEntry[];
  flags: Record<string, boolean>;
  lastDefense: DefenseResult | null;
  kitOpen: boolean;
  libraryOpen: boolean;
  mapArt: string;
  stash: StashItem[];
  v0: { defended: boolean; debriefed: boolean };
  selectedTerritory: TerritoryId | null;
  hydrated: boolean;
}

interface FlagPatch {
  flags: Record<string, boolean>;
  assigned: CrewId[];
  phase?: Phase;
  v0: EmpireState["v0"];
}

interface EmpireActions {
  enterHall: () => void;
  pickChoice: (key: "A" | "B" | "C") => void;
  closeDialogue: () => void;
  toggleAssign: (id: CrewId) => void;
  confirmAssign: () => void;
  pickTactic: (id: TacticId) => void;
  finishResolve: () => void;
  tickNight: () => void;
  startDocks: () => void;
  openKit: (open: boolean) => void;
  openLibrary: (open: boolean) => void;
  setArt: (slot: ArtSlot, src: string) => void;
  stashDrop: (item: StashItem) => void;
  restoreHallArt: () => void;
  selectTerritory: (id: TerritoryId | null) => void;
  markHydrated: () => void;
  reset: () => void;
}

const initial = (): Omit<EmpireState, "hydrated"> => ({
  phase: "title",
  day: 1,
  nightTick: 0,
  cash: seed.simRules.startingCash,
  crews: hydrateCrews(),
  territories: hydrateTerritories(),
  assigned: [],
  tactic: null,
  dialogueId: null,
  activeQuest: null,
  log: [],
  flags: {},
  lastDefense: null,
  kitOpen: false,
  libraryOpen: false,
  mapArt: HALL_MAP_ART,
  stash: [],
  v0: { defended: false, debriefed: false },
  selectedTerritory: "NeonRow",
});

function pushLog(log: LogEntry[], text: string, tone: LogEntry["tone"] = "neutral"): LogEntry[] {
  return [{ id: logSeq++, text, tone }, ...log].slice(0, 24);
}

function applyFlags(state: EmpireState, flags: string[]): FlagPatch {
  const nextFlags = { ...state.flags };
  let assigned = [...state.assigned];
  let phase: Phase | undefined;
  const v0 = { ...state.v0 };

  for (const flag of flags) {
    nextFlags[flag] = true;
    if (
      flag === "openAssign" ||
      flag === "preselectLena" ||
      flag === "preselectRicoRay" ||
      flag === "openAssignDocks"
    ) {
      phase = "assign";
      if (flag === "preselectRicoRay") assigned = ["Rico", "Ray"];
      if (flag === "preselectLena" && !assigned.includes("Lena")) {
        assigned = [...assigned, "Lena"].slice(0, 3) as CrewId[];
      }
    }
    if (flag === "completeDebrief") v0.debriefed = true;
    if (flag === "cancelQuest") phase = "command";
  }
  return { flags: nextFlags, assigned, ...(phase ? { phase } : {}), v0 };
}

function paintSlot(
  state: Pick<EmpireState, "crews" | "territories" | "mapArt">,
  slot: ArtSlot,
  src: string,
): Partial<Pick<EmpireState, "crews" | "territories" | "mapArt">> {
  if (slot.kind === "crew") {
    const crew = state.crews[slot.id];
    if (!crew) return {};
    return { crews: { ...state.crews, [slot.id]: { ...crew, Portrait: src } } };
  }
  if (slot.kind === "territory") {
    const t = state.territories[slot.id];
    if (!t) return {};
    return { territories: { ...state.territories, [slot.id]: { ...t, Art: src } } };
  }
  return { mapArt: src };
}

export const useEmpire = create<EmpireState & EmpireActions>()(
  persist(
    (set, get) => ({
      ...initial(),
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),

      enterHall: () =>
        set((s) => ({
          phase: "briefing",
          activeQuest: "DefendNeonRow",
          dialogueId: "Rico_Brief_01",
          assigned: [],
          tactic: null,
          log: pushLog(s.log, "Rico is waiting in the Hall."),
        })),

      pickChoice: (key) => {
        const s = get();
        if (!s.dialogueId) return;
        const row = dialogueById(seed.dialogue, s.dialogueId);
        if (!row) return;
        const choice = choicesOf(row).find((c) => c.key === key);
        if (!choice) return;
        const applied = applyChoice({
          seed,
          crews: s.crews,
          territories: s.territories,
          assigned: s.assigned,
          row,
          choice,
        });
        const flagged = applyFlags({ ...s, crews: applied.crews, territories: applied.territories }, applied.flags);

        if (choice.flag === "vexBetrayed" || choice.flag === "ricoBetrayed") {
          set({
            flags: flagged.flags,
            assigned: flagged.assigned,
            v0: flagged.v0,
            crews: applied.crews,
            territories: applied.territories,
            phase: "command",
            dialogueId: null,
            log: pushLog(s.log, row.Text, "bad"),
          });
          return;
        }

        if (flagged.phase === "assign") {
          set({
            flags: flagged.flags,
            assigned: flagged.assigned,
            v0: flagged.v0,
            crews: applied.crews,
            territories: applied.territories,
            phase: "assign",
            dialogueId: null,
            log: pushLog(s.log, "Roster is open. Three bodies, max."),
          });
          return;
        }

        if (choice.flag === "cancelQuest") {
          set({
            flags: flagged.flags,
            assigned: flagged.assigned,
            v0: flagged.v0,
            crews: applied.crews,
            territories: applied.territories,
            activeQuest: null,
            dialogueId: null,
            phase: "command",
            log: pushLog(s.log, "Rico stands down."),
          });
          return;
        }

        if (!applied.nextId) {
          set({
            flags: flagged.flags,
            assigned: flagged.assigned,
            v0: flagged.v0,
            crews: applied.crews,
            territories: applied.territories,
            dialogueId: null,
            phase: flagged.v0.debriefed ? "command" : (flagged.phase ?? "command"),
            log: pushLog(s.log, flagged.v0.debriefed ? "Debrief closed. Watch the meters." : row.Text),
          });
          return;
        }

        const nextRow = dialogueById(seed.dialogue, applied.nextId);
        set({
          flags: flagged.flags,
          assigned: flagged.assigned,
          v0: flagged.v0,
          crews: applied.crews,
          territories: applied.territories,
          dialogueId: applied.nextId,
          phase: nextRow ? s.phase : "command",
        });
      },

      closeDialogue: () =>
        set((s) => ({
          phase: "command",
          dialogueId: null,
          log: s.v0.debriefed
            ? pushLog(s.log, "Loop closed. Control and loyalty moved.", "good")
            : s.log,
        })),

      toggleAssign: (id) =>
        set((s) => {
          const crew = s.crews[id];
          if (!crew?.Deployable || crew.betrayed) return {};
          const max = seed.simRules.defense.maxAssigned;
          const has = s.assigned.includes(id);
          const assigned = has
            ? s.assigned.filter((x) => x !== id)
            : s.assigned.length < max
              ? [...s.assigned, id]
              : s.assigned;
          return { assigned };
        }),

      confirmAssign: () => {
        const s = get();
        const quest = questById(seed.quests, s.activeQuest ?? "DefendNeonRow");
        if (!quest) return;
        if (s.assigned.length < Math.max(1, quest.RequiredCrewMin)) return;
        set({
          phase: "defense",
          selectedTerritory: quest.TerritoryId,
          log: pushLog(s.log, `${s.assigned.length} on the street.`),
        });
      },

      pickTactic: (id) => {
        const s = get();
        const questId = s.activeQuest === "TakeoverDocks" ? "TakeoverDocks" : "DefendNeonRow";
        const territoryId = (questById(seed.quests, questId)?.TerritoryId ?? "NeonRow") as TerritoryId;
        const { crews, territories, result } = resolveDefense({
          seed,
          crews: s.crews,
          territories: s.territories,
          assignedIds: s.assigned,
          tacticId: id,
          territoryId,
          questId,
        });
        set({
          crews,
          territories,
          tactic: id,
          lastDefense: result,
          phase: "resolve",
          v0: { ...s.v0, defended: true },
          log: pushLog(
            s.log,
            result.won
              ? `${territories[territoryId].DisplayName} held. Control ${result.controlDelta >= 0 ? "+" : ""}${Math.round(result.controlDelta)}.`
              : `${territories[territoryId].DisplayName} slipped. Control ${Math.round(result.controlDelta)}.`,
            result.won ? "good" : "bad",
          ),
        });
      },

      finishResolve: () => {
        const s = get();
        if (s.activeQuest === "TakeoverDocks") {
          set({
            phase: "command",
            activeQuest: null,
            assigned: [],
            tactic: null,
            log: pushLog(s.log, "Docks walk is over."),
          });
          return;
        }
        set({
          phase: "debrief",
          dialogueId: s.lastDefense?.won ? "Marcus_Win_01" : "Marcus_Loss_01",
          activeQuest: "DebriefMarcus",
          log: pushLog(s.log, "Marcus is at the table."),
        });
      },

      tickNight: () => {
        const s = get();
        const { crews, territories, events, betrayal } = tickSim({
          seed,
          crews: s.crews,
          territories: s.territories,
        });
        const nextTick = s.nightTick + 1;
        const dayRoll = nextTick % seed.simRules.ticksPerDay === 0;
        const gained = dayRoll ? incomeOf(territories, seed.simRules) : 0;
        let log = s.log;
        for (const e of events) log = pushLog(log, e);
        if (dayRoll) log = pushLog(log, `Day ${s.day + 1}. Take from the districts: ${gained}.`);

        if (betrayal && !s.flags[`${betrayal.toLowerCase()}Betrayed`]) {
          set({
            crews,
            territories,
            nightTick: nextTick,
            day: dayRoll ? s.day + 1 : s.day,
            cash: s.cash + gained,
            phase: "event",
            dialogueId: betrayal === "Vex" ? "Event_Vex_01" : "Event_Rico_01",
            log: pushLog(log, `${betrayal} is off the board.`, "bad"),
          });
          return;
        }

        set({
          crews,
          territories,
          nightTick: nextTick,
          day: dayRoll ? s.day + 1 : s.day,
          cash: s.cash + gained,
          log,
        });
      },

      startDocks: () => {
        const s = get();
        if (!s.v0.debriefed) return;
        if (s.territories.NeonRow.heat > 80) {
          set({ log: pushLog(s.log, "Neon Row is too hot to leave.", "bad") });
          return;
        }
        set({
          phase: "briefing",
          activeQuest: "TakeoverDocks",
          dialogueId: "Rico_Docks_01",
          assigned: [],
          tactic: null,
          log: pushLog(s.log, "Rico wants the river."),
        });
      },

      openKit: (open) => set({ kitOpen: open, libraryOpen: open ? false : get().libraryOpen }),
      openLibrary: (open) => set({ libraryOpen: open, kitOpen: open ? false : get().kitOpen }),
      setArt: (slot, src) =>
        set((s) => {
          const painted = paintSlot(s, slot, src);
          return {
            ...painted,
            log: pushLog(s.log, `Still set: ${slot.label}`),
          };
        }),
      stashDrop: (item) =>
        set((s) => ({
          stash: [item, ...s.stash.filter((x) => x.src !== item.src)].slice(0, 8),
        })),
      restoreHallArt: () =>
        set((s) => {
          const portraits = hallCrewArt();
          const places = hallTerritoryArt();
          const crews = Object.fromEntries(
            Object.entries(s.crews).map(([id, crew]) => [id, { ...crew, Portrait: portraits[id] ?? crew.Portrait }]),
          );
          const territories = Object.fromEntries(
            Object.entries(s.territories).map(([id, t]) => [id, { ...t, Art: places[id] ?? t.Art }]),
          );
          return {
            crews,
            territories,
            mapArt: HALL_MAP_ART,
            log: pushLog(s.log, "Hall stills restored."),
          };
        }),
      selectTerritory: (id) => set({ selectedTerritory: id }),
      reset: () => set({ ...initial(), hydrated: true, kitOpen: false, libraryOpen: false }),
    }),
    {
      name: "empire-hall-v0",
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<EmpireState>;
        return {
          ...current,
          ...p,
          mapArt: p.mapArt || HALL_MAP_ART,
          stash: Array.isArray(p.stash) ? p.stash : [],
        };
      },
      partialize: (s) => ({
        phase: s.phase,
        day: s.day,
        nightTick: s.nightTick,
        cash: s.cash,
        crews: s.crews,
        territories: s.territories,
        assigned: s.assigned,
        tactic: s.tactic,
        dialogueId: s.dialogueId,
        activeQuest: s.activeQuest,
        log: s.log,
        flags: s.flags,
        lastDefense: s.lastDefense,
        v0: s.v0,
        selectedTerritory: s.selectedTerritory,
        mapArt: s.mapArt,
        stash: s.stash,
      }),
    },
  ),
);

export { seed };

export function loopClosed(v0: EmpireState["v0"]) {
  return v0.defended && v0.debriefed;
}

export function heatNow(territories: Record<string, RuntimeTerritory>) {
  return cityHeat(territories, seed.simRules.v0Scope);
}
