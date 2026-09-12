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
import { fameNightFromDoor, fameNightFromNight, fameNightFromWalk } from "./fame";
import type {
  CrewId,
  DefenseResult,
  EmpireSeed,
  FameNight,
  LogEntry,
  NightResult,
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
  questById,
  resolveDefense,
  runNight,
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
  lastNight: NightResult | null;
  kitOpen: boolean;
  libraryOpen: boolean;
  warOpen: boolean;
  fameOpen: boolean;
  mapArt: string;
  stash: StashItem[];
  fameNights: FameNight[];
  v0: {
    defended: boolean;
    debriefed: boolean;
    docksTaken: boolean;
    docksDebriefed: boolean;
    vexGone: boolean;
    ricoGone: boolean;
  };
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
  finishNight: () => void;
  startDocks: () => void;
  startDoor: (id: "Vex" | "Rico") => void;
  openKit: (open: boolean) => void;
  openLibrary: (open: boolean) => void;
  openWar: (open: boolean) => void;
  openFame: (open: boolean) => void;
  applyPlan: (crew: CrewId[], tacticId?: TacticId, questId?: string) => void;
  startWalk: () => void;
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
  lastNight: null,
  kitOpen: false,
  libraryOpen: false,
  warOpen: false,
  fameOpen: false,
  mapArt: HALL_MAP_ART,
  stash: [],
  fameNights: [],
  v0: { defended: false, debriefed: false, docksTaken: false, docksDebriefed: false, vexGone: false, ricoGone: false },
  selectedTerritory: "NeonRow",
});

function pushLog(log: LogEntry[], text: string, tone: LogEntry["tone"] = "neutral"): LogEntry[] {
  return [{ id: logSeq++, text, tone }, ...log].slice(0, 24);
}

function livingCrew(state: EmpireState, ids: CrewId[]): CrewId[] {
  return ids
    .filter((id) => state.crews[id]?.Deployable && !state.crews[id].betrayed)
    .slice(0, seed.simRules.defense.maxAssigned);
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
      flag === "openAssignDocks" ||
      flag === "preselectVexRico" ||
      flag === "preselectLenaRico"
    ) {
      phase = "assign";
      if (flag === "preselectRicoRay") assigned = livingCrew(state, ["Rico", "Ray"]);
      if (flag === "preselectLena" && !assigned.includes("Lena")) {
        assigned = livingCrew(state, [...assigned, "Lena"]);
      }
      if (flag === "preselectVexRico") assigned = livingCrew(state, ["Vex", "Rico"]);
      if (flag === "preselectLenaRico") assigned = livingCrew(state, ["Lena", "Rico"]);
    }
    if (flag === "completeDebrief") v0.debriefed = true;
    if (flag === "completeDocksDebrief") v0.docksDebriefed = true;
    if (flag === "vexBetrayed") v0.vexGone = true;
    if (flag === "ricoBetrayed") v0.ricoGone = true;
    if (flag === "cancelQuest") phase = "command";
  }
  return { flags: nextFlags, assigned, ...(phase ? { phase } : {}), v0 };
}

function doorFame(state: EmpireState, flags: string[]) {
  const extra = flags.flatMap((flag) => {
    if (flag === "vexBetrayed") {
      return [
        {
          id: Date.now(),
          ...fameNightFromDoor({
            day: state.day,
            crewName: state.crews.Vex?.DisplayName ?? "Vex",
            seat: "The river door",
          }),
        },
      ];
    }
    if (flag === "ricoBetrayed") {
      return [
        {
          id: Date.now() + 1,
          ...fameNightFromDoor({
            day: state.day,
            crewName: state.crews.Rico?.DisplayName ?? "Rico",
            seat: "The corners",
          }),
        },
      ];
    }
    return [];
  });
  return extra.length ? [...extra, ...state.fameNights].slice(0, 8) : state.fameNights;
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
        const fameNights = doorFame(s, applied.flags);
        const cash = applied.flags.includes("morningPayCrew") ? Math.max(0, s.cash - 40) : s.cash;

        if (flagged.phase === "assign") {
          set({
            flags: flagged.flags,
            assigned: flagged.assigned,
            v0: flagged.v0,
            crews: applied.crews,
            territories: applied.territories,
            fameNights,
            cash,
            phase: "assign",
            dialogueId: null,
            selectedTerritory: s.activeQuest === "TakeoverDocks" ? "Docks" : "NeonRow",
            log: pushLog(
              s.log,
              s.activeQuest === "TakeoverDocks"
                ? "Roster is open. Two bodies on the river."
                : "Roster is open. Three bodies, max.",
            ),
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
            fameNights,
            cash,
            activeQuest: null,
            dialogueId: null,
            phase: "command",
            log: pushLog(
              s.log,
              s.activeQuest === "BetrayalRico"
                ? "The corners wait."
                : s.activeQuest === "BetrayalVex"
                  ? "The door waits."
                  : "Rico stands down.",
            ),
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
            fameNights,
            cash,
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
          fameNights,
          cash,
          dialogueId: applied.nextId,
          phase: nextRow ? s.phase : "command",
        });
      },

      closeDialogue: () =>
        set((s) => {
          const id = s.dialogueId;
          const morning = id === "Marcus_Morning_End";
          const held = id === "Marcus_Vex_Held" || id === "Marcus_Rico_Held";
          const lean = id === "Marcus_Vex_Lean" || id === "Marcus_Rico_Lean";
          const word = id === "Marcus_Rico_Word";
          const doorEnd = id === "Marcus_Vex_End" || id === "Marcus_Rico_End";
          const doorQuest = s.activeQuest === "BetrayalVex" || s.activeQuest === "BetrayalRico";
          const ricoHeard =
            Boolean(s.flags.creditSelf) &&
            !s.flags.ricoNamed &&
            !s.v0.ricoGone &&
            (s.crews.Rico?.loyalty ?? 0) >= 40;
          const doorLog = held
            ? {
                text: id === "Marcus_Vex_Held" ? "Vex is seated." : "Rico is seated.",
                tone: "good" as const,
              }
            : lean
              ? {
                  text: id === "Marcus_Vex_Lean" ? "Vex is closer to a buyer." : "Rico is closer to walking.",
                  tone: "neutral" as const,
                }
              : word
                ? {
                    text: "Rico is thin. The corners are on the table.",
                    tone: "neutral" as const,
                  }
                : doorEnd
                ? s.activeQuest === "BetrayalRico"
                  ? {
                      text: s.v0.ricoGone ? "The corners are empty." : "Rico is seated.",
                      tone: s.v0.ricoGone ? ("bad" as const) : ("good" as const),
                    }
                  : {
                      text: s.v0.vexGone ? "The river door is empty." : "Vex is seated.",
                      tone: s.v0.vexGone ? ("bad" as const) : ("good" as const),
                    }
                : null;
          return {
            phase: "command" as const,
            dialogueId: null,
            activeQuest: doorQuest ? null : s.activeQuest,
            flags: id === "Marcus_Rico_Held" ? { ...s.flags, ricoNamed: true } : s.flags,
            log: morning
              ? pushLog(s.log, "Morning. The take is on the books.", "good")
              : doorLog
                ? pushLog(s.log, doorLog.text, doorLog.tone)
                : ricoHeard
                  ? pushLog(
                      s.log,
                      s.v0.docksDebriefed ? "River closed. Rico heard the name." : "Loop closed. Rico heard the name.",
                      "good",
                    )
                  : s.v0.docksDebriefed
                    ? pushLog(s.log, "River closed. Control and loyalty moved.", "good")
                    : s.v0.debriefed
                      ? pushLog(s.log, "Loop closed. The warehouse door is open.", "good")
                      : s.log,
          };
        }),

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
        const docks = questId === "TakeoverDocks";
        const tacticLabel = seed.simRules.tactics.find((t) => t.id === id)?.label ?? id;
        const night = fameNightFromWalk({
          day: s.day,
          territoryName: territories[territoryId].DisplayName,
          names: s.assigned.map((crewId) => s.crews[crewId]?.DisplayName ?? crewId),
          tacticLabel,
          won: result.won,
        });
        set({
          crews,
          territories,
          tactic: id,
          lastDefense: result,
          phase: "resolve",
          v0: docks ? { ...s.v0, docksTaken: true } : { ...s.v0, defended: true },
          fameNights: [{ id: Date.now(), ...night }, ...s.fameNights].slice(0, 8),
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
            phase: "debrief",
            dialogueId: s.lastDefense?.won ? "Marcus_Docks_Win_01" : "Marcus_Docks_Loss_01",
            activeQuest: "DebriefDocks",
            log: pushLog(s.log, "Marcus wants the warehouse names."),
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
        if (s.phase !== "command" && s.phase !== "title") return;
        const ran = runNight({
          seed,
          crews: s.crews,
          territories: s.territories,
          nightTick: s.nightTick,
        });
        const dayRoll = ran.result.dayRolled;
        const gained = ran.result.gained;
        let log = s.log;
        for (const e of ran.events) log = pushLog(log, e);
        if (ran.result.betrayal) log = pushLog(log, `${ran.result.betrayal} has a buyer.`, "bad");
        else if (dayRoll) log = pushLog(log, `Day ${s.day + 1}. Take from the districts: ${gained}.`, "good");
        else log = pushLog(log, `Night ran ${ran.result.ticks} ticks.`);
        const fame = fameNightFromNight({
          day: dayRoll ? s.day + 1 : s.day,
          ticks: ran.result.ticks,
          gained,
          dayRolled: dayRoll,
          betrayal: ran.result.betrayal,
          patrols: ran.result.patrols,
        });
        set({
          crews: ran.crews,
          territories: ran.territories,
          nightTick: s.nightTick + ran.result.ticks,
          day: dayRoll ? s.day + 1 : s.day,
          cash: s.cash + gained,
          lastNight: ran.result,
          phase: "night",
          warOpen: false,
          fameNights: [{ id: Date.now(), ...fame }, ...s.fameNights].slice(0, 8),
          log,
        });
      },

      finishNight: () => {
        const s = get();
        if (s.phase !== "night" || !s.lastNight) return;
        const betrayal = s.lastNight.betrayal;
        if (betrayal && !s.flags[`${betrayal.toLowerCase()}Betrayed`]) {
          set({
            phase: "event",
            lastNight: null,
            activeQuest: betrayal === "Vex" ? "BetrayalVex" : "BetrayalRico",
            dialogueId: betrayal === "Vex" ? "Event_Vex_01" : "Event_Rico_01",
          });
          return;
        }
        if (s.lastNight.dayRolled) {
          set({
            phase: "debrief",
            lastNight: null,
            dialogueId: "Marcus_Morning_01",
            activeQuest: null,
            log: pushLog(s.log, "Marcus has the books."),
          });
          return;
        }
        set({
          phase: "command",
          lastNight: null,
        });
      },

      startDoor: (id) => {
        const s = get();
        if (s.phase !== "command" && s.phase !== "title") return;
        if (!s.v0.debriefed) return;
        const crew = s.crews[id];
        if (!crew || crew.betrayed) return;
        const armed = crew.loyalty < seed.simRules.betrayal.loyaltyThreshold;
        const thin = crew.loyalty < 40;
        const egoWord = id === "Rico" && Boolean(s.flags.creditSelf) && !s.flags.ricoNamed && !armed && !thin;
        if (!armed && !thin && !egoWord) return;
        const dialogueId = armed
          ? id === "Rico"
            ? "Event_Rico_01"
            : "Event_Vex_01"
          : egoWord
            ? "Rico_Table_01"
            : id === "Rico"
              ? "Event_Rico_Press_01"
              : "Event_Vex_Press_01";
        set({
          phase: "event",
          activeQuest: id === "Rico" ? "BetrayalRico" : "BetrayalVex",
          dialogueId,
          warOpen: false,
          log: pushLog(
            s.log,
            egoWord
              ? `${crew.DisplayName} wants the name.`
              : armed
                ? `${crew.DisplayName} has a buyer.`
                : `${crew.DisplayName} is at the table.`,
            armed ? "bad" : "neutral",
          ),
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
          selectedTerritory: "Docks",
          log: pushLog(s.log, "Rico wants the river."),
        });
      },

      openKit: (open) =>
        set({
          kitOpen: open,
          libraryOpen: open ? false : get().libraryOpen,
          warOpen: open ? false : get().warOpen,
          fameOpen: open ? false : get().fameOpen,
        }),
      openLibrary: (open) =>
        set({
          libraryOpen: open,
          kitOpen: open ? false : get().kitOpen,
          warOpen: open ? false : get().warOpen,
          fameOpen: open ? false : get().fameOpen,
        }),
      openWar: (open) =>
        set({
          warOpen: open,
          kitOpen: open ? false : get().kitOpen,
          libraryOpen: open ? false : get().libraryOpen,
          fameOpen: open ? false : get().fameOpen,
        }),
      openFame: (open) =>
        set({
          fameOpen: open,
          kitOpen: false,
          libraryOpen: false,
          warOpen: false,
        }),
      applyPlan: (crew, tacticId, questId) => {
        const s = get();
        const living = livingCrew(s, crew);
        if (living.length < 1) return;
        const quest =
          questId === "TakeoverDocks" || (!questId && s.activeQuest === "TakeoverDocks")
            ? "TakeoverDocks"
            : "DefendNeonRow";
        const row = questById(seed.quests, quest);
        if (living.length < Math.max(1, row?.RequiredCrewMin ?? 1)) return;
        if (quest === "TakeoverDocks") {
          if (!s.v0.debriefed) return;
          if (s.territories.NeonRow.heat > 80) {
            set({
              warOpen: false,
              log: pushLog(s.log, "Neon Row is too hot to leave.", "bad"),
            });
            return;
          }
        }
        const tactic = tacticId && seed.simRules.tactics.some((t) => t.id === tacticId) ? tacticId : null;
        set({
          assigned: living,
          activeQuest: quest,
          phase: "assign",
          dialogueId: null,
          tactic,
          warOpen: false,
          selectedTerritory: (row?.TerritoryId ?? "NeonRow") as TerritoryId,
          log: pushLog(
            s.log,
            tactic
              ? `War room set ${living.join(", ")} · ${seed.simRules.tactics.find((t) => t.id === tactic)?.label}.`
              : `War room set ${living.join(", ")}.`,
          ),
        });
      },
      startWalk: () => {
        const s = get();
        if (!s.v0.debriefed) return;
        set({
          phase: "assign",
          activeQuest: "DefendNeonRow",
          assigned: [],
          tactic: null,
          dialogueId: null,
          log: pushLog(s.log, "Roster is open. Walk Neon Row again."),
        });
      },
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
      reset: () => set({ ...initial(), hydrated: true, kitOpen: false, libraryOpen: false, warOpen: false, fameOpen: false }),
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
          fameNights: Array.isArray(p.fameNights) ? p.fameNights : [],
          lastNight: p.lastNight ?? null,
          v0: {
            defended: false,
            debriefed: false,
            docksTaken: false,
            docksDebriefed: false,
            vexGone: false,
            ricoGone: false,
            ...p.v0,
          },
          phase: p.phase === "night" && !p.lastNight ? "command" : (p.phase ?? current.phase),
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
        lastNight: s.lastNight,
        v0: s.v0,
        selectedTerritory: s.selectedTerritory,
        mapArt: s.mapArt,
        stash: s.stash,
        fameNights: s.fameNights,
      }),
    },
  ),
);

export { seed };

export function loopClosed(v0: EmpireState["v0"]) {
  return v0.defended && v0.debriefed;
}

export function riverClosed(v0: EmpireState["v0"]) {
  return Boolean(v0.docksTaken && v0.docksDebriefed);
}

export function docksUnlocked(v0: EmpireState["v0"], territories: Record<string, RuntimeTerritory>) {
  return v0.debriefed && territories.NeonRow.heat <= 80;
}

export function heatNow(territories: Record<string, RuntimeTerritory>) {
  return cityHeat(territories, seed.simRules.v0Scope);
}
