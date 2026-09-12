import { clamp } from "@/lib/utils";
import { crewPower, heatBand, incomeOf, questById } from "./sim";
import type {
  CrewId,
  EmpireSeed,
  HeatBand,
  QuestRow,
  RuntimeCrew,
  RuntimeTerritory,
  Tactic,
  TacticId,
  TerritoryId,
} from "./types";

export type WalkForecast = {
  tactic: Tactic;
  bonus: boolean;
  power: number;
  threat: number;
  win: number;
  controlWin: number;
  controlLoss: number;
  heatWin: number;
  heatLoss: number;
  evControl: number;
  evHeat: number;
  heatAfter: number;
  controlAfter: number;
  bandAfter: HeatBand;
  bandNow: HeatBand;
};

export type LineupPlan = {
  crew: CrewId[];
  names: string[];
  forecast: WalkForecast;
  score: number;
};

export type NamedPlay = {
  id: string;
  name: string;
  blurb: string;
  when: string;
  debrief: string;
  crew: CrewId[];
  tacticId: TacticId;
};

export type BetrayalWatch = {
  id: CrewId;
  name: string;
  loyalty: number;
  armed: boolean;
  thin: boolean;
  gone: boolean;
  chance: number;
};

export type DebriefRow = {
  id: string;
  label: string;
  blurb: string;
  heat: number;
  control: number;
  loyalty: { id: CrewId; name: string; delta: number }[];
};

export type NightFork = {
  id: string;
  name: string;
  blurb: string;
  ready: boolean;
  blocked?: string;
  win?: number;
  evControl?: number;
  evHeat?: number;
  bandShift?: string;
  crew?: string[];
  tactic?: string;
  door?: CrewId;
};

export const NAMED_PLAYS: NamedPlay[] = [
  {
    id: "hold",
    name: "Hold the corners",
    blurb: "Rico and Ray. Slow, ugly, holds ground. Best when Neon is Warm.",
    when: "You want the street more than the heat dump.",
    debrief: "Credit Rico. Burn footage if heat is Hot. Pay the clerk if Marcus is thin.",
    crew: ["Rico", "Ray"],
    tacticId: "HoldCorners",
  },
  {
    id: "quiet",
    name: "Cut the lights",
    blurb: "Lena walks. Cameras die. You dump heat and you dump claim.",
    when: "Neon is Hot or Burning, or you are one tick from Vex flipping.",
    debrief: "Burn footage. Do not leave the cameras — Vex likes that heat.",
    crew: ["Lena", "Rico"],
    tacticId: "CutLights",
  },
  {
    id: "loud",
    name: "Push the alley",
    blurb: "Rico walks it loud. Vex optional. You keep the street and the noise.",
    when: "You can eat heat. Bank control, then burn.",
    debrief: "Credit the crew. Burn. Never leave cameras after a loud walk.",
    crew: ["Rico", "Ray", "Vex"],
    tacticId: "PushAlley",
  },
  {
    id: "bank-vex",
    name: "Bank Vex",
    blurb: "Leave Vex in the Hall. Thin loyalty is a street problem.",
    when: "Vex is under 40. City heat over 70 makes the flip likely.",
    debrief: "Do not leave cameras. Do not scapegoat Rico. Tick only when Cold or Warm.",
    crew: ["Rico", "Ray", "Lena"],
    tacticId: "HoldCorners",
  },
];

export const DOCKS_PLAYS: NamedPlay[] = [
  {
    id: "river-hold",
    name: "Hold the warehouse",
    blurb: "Rico and Ray. Takeover is noisy even when you hold. Heat stays Warm.",
    when: "You want the river more than a heat dump.",
    debrief: "Credit Vex if she's thin. Burn warehouse cameras.",
    crew: ["Rico", "Ray"],
    tacticId: "HoldCorners",
  },
  {
    id: "dark-river",
    name: "Dark warehouse",
    blurb: "Lena and Rico. Cut the lights. You dump the takeover heat.",
    when: "Docks is Warm and you cannot eat a Hot band.",
    debrief: "Burn. Do not leave river cameras.",
    crew: ["Lena", "Rico"],
    tacticId: "CutLights",
  },
  {
    id: "vex-door",
    name: "Vex's door",
    blurb: "Vex is from the river. Walk her, bank loyalty, keep the heat down.",
    when: "Vex is under 40. A win plus her name can keep her off the betrayal line.",
    debrief: "Credit Vex. Burn warehouse cameras.",
    crew: ["Vex", "Rico"],
    tacticId: "CutLights",
  },
  {
    id: "loud-river",
    name: "Loud river",
    blurb: "Rico, Ray, Vex. Push the alley. You keep the warehouse and you keep the noise.",
    when: "You can eat Hot. Bank control, then burn.",
    debrief: "Credit the crew. Burn. Never leave river cameras after a loud walk.",
    crew: ["Rico", "Ray", "Vex"],
    tacticId: "PushAlley",
  },
];

export function playsFor(questId: string | null | undefined): NamedPlay[] {
  return questId === "TakeoverDocks" ? DOCKS_PLAYS : NAMED_PLAYS;
}

export function winChance(power: number, threat: number, variance: number): number {
  if (variance <= 0) return power >= threat ? 1 : 0;
  const need = threat - power;
  if (need <= -variance) return 1;
  if (need > variance) return 0;
  return (variance - need) / (2 * variance);
}

export function districtThreat(territory: RuntimeTerritory): number {
  return territory.DefenseDifficulty + territory.heat * 0.35;
}

export function forecastWalk(args: {
  seed: EmpireSeed;
  bodies: RuntimeCrew[];
  tactic: Tactic;
  territory: RuntimeTerritory;
  quest: QuestRow | undefined;
}): WalkForecast {
  const { seed, bodies, tactic, territory, quest } = args;
  const rules = seed.simRules;
  const power = crewPower(bodies, rules, tactic);
  const threat = districtThreat(territory);
  const win = winChance(power, threat, rules.defense.variance);
  const controlWin = (quest?.ControlDeltaOnWin ?? rules.control.winBonus) + tactic.control;
  const controlLoss = quest?.ControlDeltaOnLoss ?? -rules.control.lossPenalty;
  const heatWin = (quest?.HeatDeltaOnWin ?? -8) + tactic.heat;
  const heatLoss = 10 + tactic.heat;
  const evControl = win * controlWin + (1 - win) * controlLoss;
  const evHeat = win * heatWin + (1 - win) * heatLoss;
  const heatAfter = clamp(territory.heat + evHeat, 0, 100);
  const controlAfter = clamp(territory.control + evControl, 0, 100);
  return {
    tactic,
    bonus: bodies.some((c) => tactic.bonusIf.includes(c.Name)),
    power,
    threat,
    win,
    controlWin,
    controlLoss,
    heatWin,
    heatLoss,
    evControl,
    evHeat,
    heatAfter,
    controlAfter,
    bandNow: heatBand(rules, territory.heat),
    bandAfter: heatBand(rules, heatAfter),
  };
}

function combos<T>(xs: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (xs.length < k) return [];
  const [head, ...tail] = xs;
  return [...combos(tail, k - 1).map((c) => [head, ...c]), ...combos(tail, k)];
}

export function scorePlan(
  plan: WalkForecast,
  crew: RuntimeCrew[],
  city: number,
  threshold: number,
  quest?: QuestRow,
): number {
  let score = plan.win * 10 + plan.evControl * 0.08 - plan.evHeat * 0.05;
  const vex = crew.find((c) => c.Name === "Vex");
  if (vex && !vex.betrayed && vex.loyalty < 40) score -= 1.4;
  if (quest?.TerritoryId === "Docks" && vex && !vex.betrayed && vex.loyalty < 40) score += 1.8;
  if (city > threshold && plan.evHeat > 0) score -= 2;
  if (city >= 50 && plan.evHeat < 0) score += 0.8;
  if (plan.bandAfter.min < plan.bandNow.min) score += 1.5;
  if (plan.bandAfter.min > plan.bandNow.min) score -= 1.5;
  if (plan.bonus) score += 0.4;
  return score;
}

export function bestLineups(args: {
  seed: EmpireSeed;
  crews: Record<string, RuntimeCrew>;
  territory: RuntimeTerritory;
  quest: QuestRow | undefined;
  cityHeat: number;
  limit?: number;
}): LineupPlan[] {
  const deployable = Object.values(args.crews).filter((c) => c.Deployable && !c.betrayed);
  const max = args.seed.simRules.defense.maxAssigned;
  const min = Math.max(1, args.quest?.RequiredCrewMin ?? 1);
  const ids = deployable.map((c) => c.Name as CrewId);
  if (ids.length < min) return [];
  const plans: LineupPlan[] = [];
  for (let k = min; k <= Math.min(max, ids.length); k += 1) {
    for (const crew of combos(ids, k)) {
      const bodies = crew.map((id) => args.crews[id]).filter(Boolean);
      for (const tactic of args.seed.simRules.tactics) {
        const forecast = forecastWalk({
          seed: args.seed,
          bodies,
          tactic,
          territory: args.territory,
          quest: args.quest,
        });
        plans.push({
          crew,
          names: bodies.map((c) => c.DisplayName),
          forecast,
          score: scorePlan(forecast, bodies, args.cityHeat, args.seed.simRules.betrayal.heatThreshold, args.quest),
        });
      }
    }
  }
  plans.sort((a, b) => b.score - a.score);
  return plans.slice(0, args.limit ?? 4);
}

export function playForecast(
  play: NamedPlay,
  args: {
    seed: EmpireSeed;
    crews: Record<string, RuntimeCrew>;
    territory: RuntimeTerritory;
    quest: QuestRow | undefined;
  },
): WalkForecast | null {
  const bodies = play.crew.map((id) => args.crews[id]).filter((c) => c && !c.betrayed);
  const min = Math.max(1, args.quest?.RequiredCrewMin ?? 1);
  if (bodies.length < min) return null;
  const tactic = args.seed.simRules.tactics.find((t) => t.id === play.tacticId);
  if (!tactic) return null;
  return forecastWalk({ ...args, bodies, tactic });
}

export function recommendPlay(args: {
  seed: EmpireSeed;
  crews: Record<string, RuntimeCrew>;
  territory: RuntimeTerritory;
  quest: QuestRow | undefined;
  cityHeat: number;
  plays?: NamedPlay[];
}): { play: NamedPlay; forecast: WalkForecast; score: number } | null {
  const list = args.plays ?? playsFor(args.quest?.Name);
  const scored = list.map((play) => {
    const forecast = playForecast(play, args);
    if (!forecast) return null;
    const bodies = play.crew.map((id) => args.crews[id]).filter((c) => c && !c.betrayed);
    return {
      play,
      forecast,
      score: scorePlan(forecast, bodies, args.cityHeat, args.seed.simRules.betrayal.heatThreshold, args.quest),
    };
  }).filter((row): row is { play: NamedPlay; forecast: WalkForecast; score: number } => Boolean(row));
  scored.sort((a, b) => b.score - a.score);
  return scored[0] ?? null;
}

export function nightOutlook(args: {
  seed: EmpireSeed;
  crews: Record<string, RuntimeCrew>;
  territories: Record<string, RuntimeTerritory>;
  cityHeat: number;
  nightTick: number;
}): {
  band: HeatBand;
  leak: { id: TerritoryId; name: string; leak: number; control: number }[];
  income: number;
  ticksToPay: number;
  betrayal: BetrayalWatch[];
  docksReady: boolean;
} {
  const rules = args.seed.simRules;
  const band = heatBand(rules, args.cityHeat);
  const leak = rules.v0Scope
    .filter((id) => id !== "Hall")
    .map((id) => {
      const t = args.territories[id];
      const b = heatBand(rules, t.heat);
      return {
        id,
        name: t.DisplayName,
        leak: b.controlLeak + rules.control.holdDecayPerTick,
        control: t.control,
      };
    });
  const ticksToPay = rules.ticksPerDay - (args.nightTick % rules.ticksPerDay);
  const betrayal: BetrayalWatch[] = [rules.betrayal.primaryCrewId, rules.betrayal.secondaryCrewId].map((id) => {
    const c = args.crews[id];
    const armed = Boolean(c && !c.betrayed && c.loyalty < rules.betrayal.loyaltyThreshold);
    const thin = Boolean(c && !c.betrayed && c.loyalty < 40);
    const chance = !armed
      ? 0
      : args.cityHeat > rules.betrayal.heatThreshold
        ? rules.betrayal.chanceWhenBoth
        : rules.betrayal.baseChancePerTick;
    return {
      id,
      name: c?.DisplayName ?? id,
      loyalty: c?.loyalty ?? 0,
      armed,
      thin,
      gone: Boolean(c?.betrayed),
      chance,
    };
  });
  return {
    band,
    leak,
    income: incomeOf(args.territories, rules),
    ticksToPay,
    betrayal,
    docksReady: args.territories.NeonRow.heat <= 80,
  };
}

export function debriefAdvice(args: {
  crews: Record<string, RuntimeCrew>;
  cityHeat: number;
  heatThreshold: number;
  street?: TerritoryId;
}): { credit: string; cameras: string; why: string } {
  const vex = args.crews.Vex;
  const marcus = args.crews.Marcus;
  const rico = args.crews.Rico;
  if (args.street === "Docks") {
    if (vex && !vex.betrayed && vex.loyalty < 40) {
      return {
        credit: "Vex",
        cameras: "Burn warehouse cameras",
        why: "Vex is from the river. Put her name on the door.",
      };
    }
    if (args.cityHeat > args.heatThreshold) {
      return {
        credit: "The crew",
        cameras: "Burn warehouse cameras",
        why: "City is past 70. Dump takeover heat before you tick.",
      };
    }
    return {
      credit: "The crew",
      cameras: "Burn warehouse cameras",
      why: "Takeover heat is real. Dump it on the river cameras.",
    };
  }
  if (vex && !vex.betrayed && vex.loyalty < 40) {
    return { credit: "The crew", cameras: "Burn the footage", why: "Vex is thin. Do not leave cameras." };
  }
  if (args.cityHeat > args.heatThreshold) {
    return { credit: "Rico", cameras: "Burn the footage", why: "City is past 70. Dump heat before you tick." };
  }
  if (marcus && marcus.loyalty < 50) {
    return { credit: "The crew", cameras: "Pay the clerk", why: "Marcus is thin. Pay keeps him." };
  }
  if (rico && rico.loyalty < 50) {
    return { credit: "Rico", cameras: "Burn the footage", why: "Rico is thinning. Put his name on the hold." };
  }
  return { credit: "Rico", cameras: "Burn the footage", why: "Credit the corners. Burn the cameras." };
}

export function debriefTable(args: {
  crews: Record<string, RuntimeCrew>;
  assigned: CrewId[];
  won: boolean;
  street?: TerritoryId;
}): { credit: DebriefRow[]; cameras: DebriefRow[] } {
  const nameOf = (id: CrewId) => args.crews[id]?.DisplayName ?? id;
  const street = args.assigned.filter((id) => args.crews[id] && !args.crews[id].betrayed);
  const docks = args.street === "Docks";
  const crewHits = [
    ...street.map((id) => ({ id, name: nameOf(id), delta: 3 })),
    { id: "Marcus" as CrewId, name: nameOf("Marcus"), delta: 3 },
  ];
  const egoHits = [
    ...street.map((id) => ({ id, name: nameOf(id), delta: -3 })),
    { id: "Marcus" as CrewId, name: nameOf("Marcus"), delta: args.won ? -2 : 2 },
  ];

  const credit: DebriefRow[] = args.won
    ? [
        docks
          ? {
              id: "vex",
              label: "Credit Vex",
              blurb: "Her door. Her name.",
              heat: 0,
              control: 0,
              loyalty: [{ id: "Vex", name: nameOf("Vex"), delta: 6 }],
            }
          : {
              id: "rico",
              label: "Credit Rico",
              blurb: "His name on the corners.",
              heat: 0,
              control: 0,
              loyalty: [{ id: "Rico", name: nameOf("Rico"), delta: 6 }],
            },
        {
          id: "crew",
          label: "Credit the crew",
          blurb: "Shared names. Safer loyalty.",
          heat: 0,
          control: 0,
          loyalty: crewHits,
        },
        {
          id: "ego",
          label: "Take the name",
          blurb: docks ? "Hall takes a river. Loyalty thins." : "Hall takes credit. Loyalty thins.",
          heat: 0,
          control: 0,
          loyalty: egoHits,
        },
      ]
    : [
        docks
          ? {
              id: "vex",
              label: "Vex owns the miss",
              blurb: "She's already thin. Do not.",
              heat: 4,
              control: 0,
              loyalty: [{ id: "Vex", name: nameOf("Vex"), delta: -6 }],
            }
          : {
              id: "rico",
              label: "Rico owns the miss",
              blurb: "He eats it. Heat crawls.",
              heat: 4,
              control: 0,
              loyalty: [{ id: "Rico", name: nameOf("Rico"), delta: -6 }],
            },
        {
          id: "crew",
          label: "Crew takes it",
          blurb: "Shared miss. Less rot.",
          heat: 2,
          control: 0,
          loyalty: crewHits,
        },
        {
          id: "ego",
          label: "You called a bad walk",
          blurb: "Marcus likes honesty. The street does not.",
          heat: 0,
          control: 0,
          loyalty: egoHits,
        },
      ];

  const cameras: DebriefRow[] = args.won
    ? [
        {
          id: "burn",
          label: docks ? "Burn warehouse cameras" : "Burn the footage",
          blurb: docks ? "Lena's work. Takeover heat dies." : "Lena's work. Heat drops hard.",
          heat: -10,
          control: 0,
          loyalty: [{ id: "Lena", name: nameOf("Lena"), delta: 4 }],
        },
        {
          id: "pay",
          label: docks ? "Pay the dock clerk" : "Pay the clerk",
          blurb: docks ? "Marcus keeps a friend on the river." : "Marcus keeps a friend in the hall of records.",
          heat: -4,
          control: 0,
          loyalty: [{ id: "Marcus", name: nameOf("Marcus"), delta: 6 }],
        },
        {
          id: "leave",
          label: docks ? "Leave the river cameras" : "Leave the cameras",
          blurb: docks ? "Vex likes the noise. The warehouse leaks." : "Vex likes the noise. Neon leaks.",
          heat: 8,
          control: -4,
          loyalty: [{ id: "Vex", name: nameOf("Vex"), delta: 6 }],
        },
      ]
    : [
        {
          id: "burn",
          label: docks ? "Burn warehouse cameras" : "Burn the footage",
          blurb: "Cut the leftover heat.",
          heat: -8,
          control: 0,
          loyalty: [{ id: "Lena", name: nameOf("Lena"), delta: 3 }],
        },
        {
          id: "pay",
          label: docks ? "Pay the dock clerk" : "Pay the clerk",
          blurb: docks ? "Quiet the river clerk." : "Quiet the hall of records.",
          heat: -3,
          control: 0,
          loyalty: [{ id: "Marcus", name: nameOf("Marcus"), delta: 5 }],
        },
        {
          id: "leave",
          label: docks ? "Leave the river cameras" : "Leave the cameras",
          blurb: "Worst night for Vex. Do not.",
          heat: 10,
          control: -6,
          loyalty: [{ id: "Vex", name: nameOf("Vex"), delta: 8 }],
        },
      ];

  return { credit, cameras };
}

export function nightForks(args: {
  seed: EmpireSeed;
  crews: Record<string, RuntimeCrew>;
  territories: Record<string, RuntimeTerritory>;
  cityHeat: number;
  debriefed: boolean;
  nightTick: number;
  egoRico?: boolean;
}): NightFork[] {
  const neonQuest = questById(args.seed.quests, "DefendNeonRow");
  const docksQuest = questById(args.seed.quests, "TakeoverDocks");
  const walk = bestLineups({
    seed: args.seed,
    crews: args.crews,
    territory: args.territories.NeonRow,
    quest: neonQuest,
    cityHeat: args.cityHeat,
    limit: 1,
  })[0];
  const docks = bestLineups({
    seed: args.seed,
    crews: args.crews,
    territory: args.territories.Docks,
    quest: docksQuest,
    cityHeat: args.cityHeat,
    limit: 1,
  })[0];
  const night = nightOutlook({
    seed: args.seed,
    crews: args.crews,
    territories: args.territories,
    cityHeat: args.cityHeat,
    nightTick: args.nightTick,
  });
  const neonLeak = night.leak.find((row) => row.id === "NeonRow");
  const docksReady = args.debriefed && night.docksReady;
  const doors = doorForks(args, night);
  return [
    {
      id: "walk",
      name: "Walk Neon Row",
      blurb: walk
        ? `${walk.forecast.tactic.label}. ${walk.names.join(" · ")}.`
        : "No bodies left.",
      ready: Boolean(walk),
      win: walk?.forecast.win,
      evControl: walk?.forecast.evControl,
      evHeat: walk?.forecast.evHeat,
      bandShift: walk ? bandShift(walk.forecast.bandNow, walk.forecast.bandAfter) : undefined,
      crew: walk?.names,
      tactic: walk?.forecast.tactic.label,
    },
    ...doors,
    {
      id: "tick",
      name: "Let the night run",
      blurb: `Pay in ${night.ticksToPay} tick${night.ticksToPay === 1 ? "" : "s"}. Take ${night.income}. Neon leaks ${neonLeak ? neonLeak.leak.toFixed(2) : "—"} · ${night.band.id} patrol ${Math.round(night.band.patrolChance * 100)}%.`,
      ready: true,
      evControl: neonLeak ? -neonLeak.leak : 0,
      evHeat: night.band.patrolChance * 2 - (1 - night.band.patrolChance) * 0.3,
      bandShift: night.band.id,
    },
    {
      id: "docks",
      name: "Take the Docks",
      blurb: docks ? `${docks.forecast.tactic.label}. ${docks.names.join(" · ")}.` : "No bodies left.",
      ready: docksReady && Boolean(docks),
      blocked: !args.debriefed
        ? "Close the Neon loop first."
        : !night.docksReady
          ? "Neon is too hot to leave."
          : undefined,
      win: docks?.forecast.win,
      evControl: docks?.forecast.evControl,
      evHeat: docks?.forecast.evHeat,
      bandShift: docks ? bandShift(docks.forecast.bandNow, docks.forecast.bandAfter) : undefined,
      crew: docks?.names,
      tactic: docks?.forecast.tactic.label,
    },
  ];
}

function doorForks(
  args: {
    seed: EmpireSeed;
    crews: Record<string, RuntimeCrew>;
    cityHeat: number;
    debriefed: boolean;
    egoRico?: boolean;
  },
  night: { betrayal: BetrayalWatch[] },
): NightFork[] {
  const heatLine = args.cityHeat > args.seed.simRules.betrayal.heatThreshold ? "16%" : "3%";
  return night.betrayal.flatMap((row): NightFork[] => {
    if (row.gone) return [];
    const word = row.id === "Rico" && Boolean(args.egoRico) && !row.armed && !row.thin;
    if (!row.armed && !row.thin && !word) return [];
    if (!args.debriefed) {
      return [
        {
          id: `${row.armed ? "flip" : row.thin ? "press" : "word"}-${row.id}`,
          name: row.id === "Vex" ? (row.armed ? "Call the door" : "Press Vex") : row.armed ? "Call the corners" : row.thin ? "Press Rico" : "Rico wants the name",
          blurb: "Close Neon first.",
          ready: false,
          blocked: "Close the Neon loop first.",
          door: row.id,
        },
      ];
    }
    if (row.armed) {
      return [
        {
          id: `flip-${row.id}`,
          name: row.id === "Vex" ? "Call the door" : "Call the corners",
          blurb: `Loyalty ${Math.round(row.loyalty)}. ${heatLine}/tick if you wait. Buy, cut, or let the sale.`,
          ready: true,
          evControl: row.id === "Vex" ? -16 : -10,
          evHeat: row.id === "Vex" ? 12 : 8,
          bandShift: "Armed",
          door: row.id,
        },
      ];
    }
    if (row.thin) {
      return [
        {
          id: `press-${row.id}`,
          name: row.id === "Vex" ? "Press Vex" : "Press Rico",
          blurb: `Loyalty ${Math.round(row.loyalty)}. Thin. Buy the ${row.id === "Vex" ? "door" : "corners"} or lean.`,
          ready: true,
          evHeat: 4,
          bandShift: "Thin",
          door: row.id,
        },
      ];
    }
    if (word) {
      return [
        {
          id: "word-Rico",
          name: "Rico wants the name",
          blurb: "You took the name. He's at the table. Buy the corners back or keep them.",
          ready: true,
          evHeat: 4,
          bandShift: "Name",
          door: "Rico",
        },
      ];
    }
    return [];
  });
}

export function walkTarget(
  seed: EmpireSeed,
  questId: string | null,
  territories: Record<string, RuntimeTerritory>,
): { quest: QuestRow | undefined; territory: RuntimeTerritory; territoryId: TerritoryId } {
  const quest = questById(seed.quests, questId ?? "DefendNeonRow");
  const territoryId = (quest?.TerritoryId ?? "NeonRow") as TerritoryId;
  return { quest, territory: territories[territoryId], territoryId };
}

export function bandShift(from: HeatBand, to: HeatBand): string {
  return from.id === to.id ? from.id : `${from.id} → ${to.id}`;
}

export function pct(n: number): string {
  return `${Math.round(clamp(n, 0, 1) * 100)}%`;
}

export function signed(n: number): string {
  const v = Math.round(n);
  return v > 0 ? `+${v}` : String(v);
}

export function winLabel(win: number): string {
  if (win >= 0.999) return "Locks";
  if (win <= 0.001) return "Miss";
  return pct(win);
}
