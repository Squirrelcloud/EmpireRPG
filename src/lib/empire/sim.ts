import { clamp, randRange } from "@/lib/utils";
import type {
  ChoiceKey,
  CrewId,
  CrewRow,
  DefenseResult,
  DialogueChoice,
  DialogueRow,
  EmpireSeed,
  HeatBand,
  QuestRow,
  RuntimeCrew,
  RuntimeTerritory,
  SimRules,
  Tactic,
  TacticId,
  TerritoryId,
} from "./types";

export function heatBand(rules: SimRules, heat: number): HeatBand {
  return (
    rules.heatBands.find((b) => heat >= b.min && heat <= b.max) ??
    rules.heatBands[rules.heatBands.length - 1]
  );
}

export function crewById(crews: CrewRow[], id: string) {
  return crews.find((c) => c.Name === id);
}

export function questById(quests: QuestRow[], id: string) {
  return quests.find((q) => q.Name === id);
}

export function dialogueById(rows: DialogueRow[], id: string) {
  return rows.find((r) => r.Name === id);
}

export function crewScore(crew: CrewRow, rules: SimRules) {
  return crew.Combat * rules.defense.combatWeight + crew.StreetSense * rules.defense.streetSenseWeight;
}

export function crewPower(assigned: CrewRow[], rules: SimRules, tactic: Tactic | undefined) {
  const scores = assigned.map((c) => crewScore(c, rules)).sort((a, b) => b - a);
  const power =
    (scores[0] ?? 0) + scores.slice(1).reduce((sum, s) => sum + s * rules.defense.secondaryShare, 0);
  const bonus =
    tactic && assigned.some((c) => tactic.bonusIf.includes(c.Name)) ? tactic.power : 0;
  return power + bonus;
}

export function resolveDefense(args: {
  seed: EmpireSeed;
  crews: Record<string, RuntimeCrew>;
  territories: Record<string, RuntimeTerritory>;
  assignedIds: CrewId[];
  tacticId: TacticId;
  territoryId: TerritoryId;
  questId: string;
}): { crews: Record<string, RuntimeCrew>; territories: Record<string, RuntimeTerritory>; result: DefenseResult } {
  const { seed, assignedIds, tacticId, territoryId, questId } = args;
  const rules = seed.simRules;
  const tactic = rules.tactics.find((t) => t.id === tacticId);
  const quest = questById(seed.quests, questId);
  const territory = args.territories[territoryId];
  const assigned = assignedIds.map((id) => args.crews[id]).filter(Boolean);
  const power = crewPower(assigned, rules, tactic);
  const threat = territory.DefenseDifficulty + territory.heat * 0.35;
  const margin = power - threat + randRange(-rules.defense.variance, rules.defense.variance);
  const won = margin >= 0;

  const controlDelta = won
    ? (quest?.ControlDeltaOnWin ?? rules.control.winBonus) + (tactic?.control ?? 0)
    : (quest?.ControlDeltaOnLoss ?? -rules.control.lossPenalty);
  const heatDelta = won
    ? (quest?.HeatDeltaOnWin ?? -8) + (tactic?.heat ?? 0)
    : 10 + (tactic?.heat ?? 0);
  const loyaltyDelta = won ? (quest?.LoyaltyDeltaOnWin ?? 3) : (quest?.LoyaltyDeltaOnLoss ?? -4);

  const territories = { ...args.territories };
  territories[territoryId] = {
    ...territory,
    control: clamp(territory.control + controlDelta, 0, 100),
    heat: clamp(territory.heat + heatDelta, 0, 100),
  };

  const crews = { ...args.crews };
  for (const id of assignedIds) {
    const c = crews[id];
    if (!c || c.betrayed) continue;
    crews[id] = { ...c, loyalty: clamp(c.loyalty + loyaltyDelta, 0, 100) };
  }

  return {
    crews,
    territories,
    result: {
      territoryId,
      tacticId,
      assigned: assignedIds,
      power,
      threat,
      margin,
      won,
      controlDelta,
      heatDelta,
    },
  };
}

export function tickSim(args: {
  seed: EmpireSeed;
  crews: Record<string, RuntimeCrew>;
  territories: Record<string, RuntimeTerritory>;
}): {
  crews: Record<string, RuntimeCrew>;
  territories: Record<string, RuntimeTerritory>;
  events: string[];
  betrayal: "Vex" | "Rico" | null;
} {
  const { seed } = args;
  const rules = seed.simRules;
  const territories: Record<string, RuntimeTerritory> = {};
  const events: string[] = [];

  for (const [id, t] of Object.entries(args.territories)) {
    if (!t.V0Active) {
      territories[id] = t;
      continue;
    }
    if (id === "Hall") {
      territories[id] = { ...t, control: Math.max(t.control, rules.control.hallFloor) };
      continue;
    }
    const band = heatBand(rules, t.heat);
    const leak = band.controlLeak + rules.control.holdDecayPerTick;
    const patrol = Math.random() < band.patrolChance;
    territories[id] = {
      ...t,
      control: clamp(t.control - leak, 0, 100),
      heat: clamp(t.heat + (patrol ? 2 : -0.3), 0, 100),
    };
    if (patrol) events.push(`Patrol heat on ${t.DisplayName}.`);
  }

  const cityHeat = Math.max(...rules.v0Scope.map((id) => territories[id]?.heat ?? 0));
  const crews: Record<string, RuntimeCrew> = { ...args.crews };
  let betrayal: "Vex" | "Rico" | null = null;

  const suspects = [rules.betrayal.primaryCrewId, rules.betrayal.secondaryCrewId] as const;
  for (const id of suspects) {
    const crew = crews[id];
    if (!crew || crew.betrayed) continue;
    if (crew.loyalty >= rules.betrayal.loyaltyThreshold) continue;
    const chance =
      cityHeat > rules.betrayal.heatThreshold
        ? rules.betrayal.chanceWhenBoth
        : rules.betrayal.baseChancePerTick;
    if (Math.random() < chance) {
      betrayal = id === "Rico" ? "Rico" : "Vex";
      break;
    }
  }

  return { crews, territories, events, betrayal };
}

export function choicesOf(row: DialogueRow): DialogueChoice[] {
  const pack = (key: ChoiceKey): DialogueChoice => ({
    key,
    text: String(row[`Choice${key}_Text` as keyof DialogueRow] ?? ""),
    next: String(row[`Choice${key}_Next` as keyof DialogueRow] ?? ""),
    loyaltyId: String(row[`Choice${key}_LoyaltyId` as keyof DialogueRow] ?? ""),
    loyaltyDelta: Number(row[`Choice${key}_LoyaltyDelta` as keyof DialogueRow] ?? 0),
    heatDelta: Number(row[`Choice${key}_HeatDelta` as keyof DialogueRow] ?? 0),
    controlId: String(row[`Choice${key}_ControlId` as keyof DialogueRow] ?? ""),
    controlDelta: Number(row[`Choice${key}_ControlDelta` as keyof DialogueRow] ?? 0),
    flag: String(row[`Choice${key}_Flag` as keyof DialogueRow] ?? ""),
  });
  return (["A", "B", "C"] as ChoiceKey[]).map(pack).filter((c) => c.text.length > 0);
}

export function applyChoice(args: {
  seed: EmpireSeed;
  crews: Record<string, RuntimeCrew>;
  territories: Record<string, RuntimeTerritory>;
  assigned: CrewId[];
  row: DialogueRow;
  choice: DialogueChoice;
}): {
  crews: Record<string, RuntimeCrew>;
  territories: Record<string, RuntimeTerritory>;
  flags: string[];
  nextId: string | null;
} {
  const crews: Record<string, RuntimeCrew> = { ...args.crews };
  const territories: Record<string, RuntimeTerritory> = { ...args.territories };
  const flags = args.choice.flag ? [args.choice.flag] : [];

  const bumpLoyalty = (id: string, delta: number) => {
    const c = crews[id];
    if (!c || c.betrayed) return;
    crews[id] = { ...c, loyalty: clamp(c.loyalty + delta, 0, 100) };
  };

  if (args.choice.loyaltyId) bumpLoyalty(args.choice.loyaltyId, args.choice.loyaltyDelta);

  if (args.choice.flag === "creditCrew") {
    for (const id of args.assigned) bumpLoyalty(id, 3);
    bumpLoyalty("Marcus", 3);
  }
  if (args.choice.flag === "creditSelf") {
    for (const id of args.assigned) bumpLoyalty(id, -3);
    bumpLoyalty("Marcus", -2);
  }

  if (args.choice.heatDelta) {
    const neon = territories.NeonRow;
    if (neon) {
      territories.NeonRow = { ...neon, heat: clamp(neon.heat + args.choice.heatDelta, 0, 100) };
    }
  }
  if (args.choice.controlId && args.choice.controlDelta) {
    const t = territories[args.choice.controlId];
    if (t) {
      territories[args.choice.controlId] = {
        ...t,
        control: clamp(t.control + args.choice.controlDelta, 0, 100),
      };
    }
  }

  if (args.choice.flag === "vexBetrayed" && crews.Vex) {
    crews.Vex = { ...crews.Vex, loyalty: 0, betrayed: true };
  }
  if (args.choice.flag === "ricoBetrayed" && crews.Rico) {
    crews.Rico = { ...crews.Rico, loyalty: 0, betrayed: true };
  }

  const nextId = args.choice.next || null;
  return { crews, territories, flags, nextId };
}

export function cityHeat(territories: Record<string, RuntimeTerritory>, scope: TerritoryId[]) {
  return Math.max(0, ...scope.map((id) => territories[id]?.heat ?? 0));
}

export function incomeOf(territories: Record<string, RuntimeTerritory>, rules: SimRules) {
  let total = 0;
  for (const t of Object.values(territories)) {
    if (!t.V0Active || t.control < 40) continue;
    const band = heatBand(rules, t.heat);
    total += Math.round(t.Income * (t.control / 100) * band.incomeMult);
  }
  return total;
}
