export type CrewId = "Player" | "Rico" | "Lena" | "Marcus" | "Ray" | "Vex";
export type TerritoryId = "Hall" | "NeonRow" | "MarketStrip" | "Docks" | "OldWard";
export type TacticId = "HoldCorners" | "PushAlley" | "CutLights";
export type Phase =
  | "title"
  | "briefing"
  | "assign"
  | "defense"
  | "resolve"
  | "debrief"
  | "command"
  | "event"
  | "night";

export interface CrewRow {
  Name: CrewId;
  DisplayName: string;
  Role: string;
  Combat: number;
  Influence: number;
  StreetSense: number;
  Loyalty: number;
  HeatTolerance: number;
  StartingTerritory: TerritoryId;
  Portrait: string;
  Notes: string;
  Deployable: boolean;
  DebriefSpeaker: boolean;
}

export interface TerritoryRow {
  Name: TerritoryId;
  DisplayName: string;
  DistrictType: string;
  Adjacent: string;
  StartingControl: number;
  StartingHeat: number;
  Income: number;
  DefenseDifficulty: number;
  UnlockWave: number;
  V0Active: boolean;
  MapX: number;
  MapY: number;
  Art: string;
  Blurb: string;
}

export interface QuestRow {
  Name: string;
  Title: string;
  Type: "Defense" | "Debrief" | "Takeover" | "Betrayal" | "Reclamation";
  TerritoryId: TerritoryId;
  RequiredCrewMin: number;
  HeatDeltaOnWin: number;
  ControlDeltaOnWin: number;
  ControlDeltaOnLoss: number;
  LoyaltyDeltaOnWin: number;
  LoyaltyDeltaOnLoss: number;
  DialogueStartId: string;
  UnlockAfter: string;
  V0Active: boolean;
  Summary: string;
}

export interface DialogueRow {
  Name: string;
  Speaker: string;
  Text: string;
  EndsScene: boolean;
  ChoiceA_Text: string;
  ChoiceA_Next: string;
  ChoiceA_LoyaltyId: string;
  ChoiceA_LoyaltyDelta: number;
  ChoiceA_HeatDelta: number;
  ChoiceA_ControlId: string;
  ChoiceA_ControlDelta: number;
  ChoiceA_Flag: string;
  ChoiceB_Text: string;
  ChoiceB_Next: string;
  ChoiceB_LoyaltyId: string;
  ChoiceB_LoyaltyDelta: number;
  ChoiceB_HeatDelta: number;
  ChoiceB_ControlId: string;
  ChoiceB_ControlDelta: number;
  ChoiceB_Flag: string;
  ChoiceC_Text: string;
  ChoiceC_Next: string;
  ChoiceC_LoyaltyId: string;
  ChoiceC_LoyaltyDelta: number;
  ChoiceC_HeatDelta: number;
  ChoiceC_ControlId: string;
  ChoiceC_ControlDelta: number;
  ChoiceC_Flag: string;
}

export interface HeatBand {
  id: string;
  min: number;
  max: number;
  patrolChance: number;
  incomeMult: number;
  controlLeak: number;
}

export interface Tactic {
  id: TacticId;
  label: string;
  bonusIf: string[];
  power: number;
  heat: number;
  control: number;
  blurb: string;
}

export interface SimRules {
  tickSeconds: number;
  ticksPerDay: number;
  startingCash: number;
  heatBands: HeatBand[];
  betrayal: {
    loyaltyThreshold: number;
    heatThreshold: number;
    baseChancePerTick: number;
    chanceWhenBoth: number;
    primaryCrewId: CrewId;
    secondaryCrewId: CrewId;
  };
  control: {
    holdDecayPerTick: number;
    hallFloor: number;
    winBonus: number;
    lossPenalty: number;
    clampMin: number;
    clampMax: number;
  };
  defense: {
    combatWeight: number;
    streetSenseWeight: number;
    secondaryShare: number;
    variance: number;
    maxAssigned: number;
  };
  tactics: Tactic[];
  v0Scope: TerritoryId[];
  v0Quests: string[];
}

export interface EmpireSeed {
  crews: CrewRow[];
  territories: TerritoryRow[];
  quests: QuestRow[];
  dialogue: DialogueRow[];
  simRules: SimRules;
}

export interface RuntimeCrew extends CrewRow {
  loyalty: number;
  betrayed: boolean;
}

export interface RuntimeTerritory extends TerritoryRow {
  control: number;
  heat: number;
}

export interface LogEntry {
  id: number;
  text: string;
  tone: "neutral" | "good" | "bad";
}

export interface FameNight {
  id: number;
  day: number;
  title: string;
  territory: string;
  names: string[];
  tactic: string;
  won: boolean;
}

export interface DefenseResult {
  territoryId: TerritoryId;
  tacticId: TacticId;
  assigned: CrewId[];
  power: number;
  threat: number;
  margin: number;
  won: boolean;
  controlDelta: number;
  heatDelta: number;
}

export interface NightResult {
  ticks: number;
  patrols: { id: TerritoryId; name: string }[];
  neonLeak: number;
  docksLeak: number;
  gained: number;
  dayRolled: boolean;
  betrayal: "Vex" | "Rico" | null;
  bandBefore: string;
  bandAfter: string;
  cityHeatAfter: number;
}

export type ChoiceKey = "A" | "B" | "C";

export interface DialogueChoice {
  key: ChoiceKey;
  text: string;
  next: string;
  loyaltyId: string;
  loyaltyDelta: number;
  heatDelta: number;
  controlId: string;
  controlDelta: number;
  flag: string;
}
