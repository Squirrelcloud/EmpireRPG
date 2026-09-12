import type { CrewId, FameNight, RuntimeCrew, RuntimeTerritory } from "./types";

export const HALL_FAME_ART = "/art/hall-fame.jpg";
export const FAME_PLAQUE_ART = "/art/fame-plaque.jpg";

export const CREW_SEATS: Record<CrewId, string> = {
  Player: "The table",
  Rico: "The corners",
  Lena: "The cameras",
  Marcus: "The debrief",
  Ray: "The east mouths",
  Vex: "The river door",
};

export function crewSeatStatus(crew: RuntimeCrew): "seated" | "thin" | "armed" | "gone" {
  if (crew.betrayed) return "gone";
  if (crew.loyalty < 28) return "armed";
  if (crew.loyalty < 40) return "thin";
  return "seated";
}

export function districtPlate(
  t: RuntimeTerritory,
  v0: { defended: boolean; docksTaken: boolean },
): { seat: string; seated: boolean } {
  if (t.Name === "Hall") return { seat: "Always seated", seated: true };
  if (t.Name === "NeonRow") return { seat: v0.defended ? "Held" : "Empty plate", seated: v0.defended };
  if (t.Name === "Docks") return { seat: v0.docksTaken ? "Taken" : "Empty plate", seated: v0.docksTaken };
  return { seat: "Later", seated: false };
}

export function fameNightFromWalk(args: {
  day: number;
  territoryName: string;
  names: string[];
  tacticLabel: string;
  won: boolean;
}): Omit<FameNight, "id"> {
  return {
    day: args.day,
    title: args.won ? `${args.territoryName} held` : `${args.territoryName} slipped`,
    territory: args.territoryName,
    names: args.names,
    tactic: args.tacticLabel,
    won: args.won,
  };
}

export function fameNightFromDoor(args: {
  day: number;
  crewName: string;
  seat: string;
}): Omit<FameNight, "id"> {
  return {
    day: args.day,
    title: `${args.seat} emptied`,
    territory: args.seat,
    names: [args.crewName],
    tactic: "Walked",
    won: false,
  };
}

export function fameNightFromNight(args: {
  day: number;
  ticks: number;
  gained: number;
  dayRolled: boolean;
  betrayal: "Vex" | "Rico" | null;
  patrols: { name: string }[];
}): Omit<FameNight, "id"> {
  const title = args.betrayal
    ? `${args.betrayal} has a buyer`
    : args.dayRolled
      ? `Morning take ${args.gained}`
      : args.patrols.length
        ? `Patrol on ${args.patrols[0].name}`
        : `${args.ticks} ticks`;
  return {
    day: args.day,
    title,
    territory: args.patrols[0]?.name ?? "The Hall",
    names: args.patrols.length ? args.patrols.map((p) => p.name) : ["The Hall"],
    tactic: "Night",
    won: args.dayRolled && !args.betrayal,
  };
}
