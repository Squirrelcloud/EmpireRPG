#!/usr/bin/env python3
"""Generate Empire RPG DataTables, sim rules, and the web seed.

Run from anywhere:
    python3 EmpireRPG_UE5/tools/build_empire_data.py

Writes:
    EmpireRPG_UE5/Content/Data/*.csv
    EmpireRPG_UE5/Config/SimRules.json
    EmpireRPG_UE5/Config/UnrealStructs.json
    public/data/empire.json
    public/kit/  (mirrors the Unreal kit for the in-app viewer)
    src/lib/empire/seed.json
    public/EmpireRPG_UE5.zip
"""

from __future__ import annotations

import csv
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UE5 = ROOT / "EmpireRPG_UE5"
DATA = UE5 / "Content" / "Data"
CONFIG = UE5 / "Config"
PUBLIC = ROOT / "public"
SRC_SEED = ROOT / "src" / "lib" / "empire" / "seed.json"

CREWS = [
    {
        "Name": "Player",
        "DisplayName": "Ash",
        "Role": "Boss",
        "Combat": 62,
        "Influence": 80,
        "StreetSense": 55,
        "Loyalty": 100,
        "HeatTolerance": 70,
        "StartingTerritory": "Hall",
        "Portrait": "/art/crew-player.jpg",
        "Notes": "You. Hall owner. Optional on the street.",
        "Deployable": True,
        "DebriefSpeaker": False,
    },
    {
        "Name": "Rico",
        "DisplayName": "Rico Navarro",
        "Role": "Lieutenant",
        "Combat": 68,
        "Influence": 72,
        "StreetSense": 64,
        "Loyalty": 78,
        "HeatTolerance": 60,
        "StartingTerritory": "Hall",
        "Portrait": "/art/crew-rico.jpg",
        "Notes": "Runs the corners. Push-the-alley bonus. Betrayal if loyalty collapses.",
        "Deployable": True,
        "DebriefSpeaker": False,
    },
    {
        "Name": "Lena",
        "DisplayName": "Lena Park",
        "Role": "Fixer",
        "Combat": 44,
        "Influence": 70,
        "StreetSense": 88,
        "Loyalty": 74,
        "HeatTolerance": 50,
        "StartingTerritory": "Hall",
        "Portrait": "/art/crew-lena.jpg",
        "Notes": "Cameras, clerks, ledgers. Cut-the-lights bonus.",
        "Deployable": True,
        "DebriefSpeaker": False,
    },
    {
        "Name": "Marcus",
        "DisplayName": "Marcus Hale",
        "Role": "Liaison",
        "Combat": 50,
        "Influence": 66,
        "StreetSense": 80,
        "Loyalty": 62,
        "HeatTolerance": 55,
        "StartingTerritory": "Hall",
        "Portrait": "/art/crew-marcus.jpg",
        "Notes": "Does not deploy on v0 defense. Runs the debrief.",
        "Deployable": False,
        "DebriefSpeaker": True,
    },
    {
        "Name": "Ray",
        "DisplayName": "Ray Cole",
        "Role": "Enforcer",
        "Combat": 90,
        "Influence": 30,
        "StreetSense": 40,
        "Loyalty": 85,
        "HeatTolerance": 80,
        "StartingTerritory": "NeonRow",
        "Portrait": "/art/crew-ray.jpg",
        "Notes": "Holds ground. Hold-the-corners bonus.",
        "Deployable": True,
        "DebriefSpeaker": False,
    },
    {
        "Name": "Vex",
        "DisplayName": "Vex",
        "Role": "Wildcard",
        "Combat": 72,
        "Influence": 48,
        "StreetSense": 76,
        "Loyalty": 36,
        "HeatTolerance": 40,
        "StartingTerritory": "Docks",
        "Portrait": "/art/crew-vex.jpg",
        "Notes": "Already thin. First betrayal candidate.",
        "Deployable": True,
        "DebriefSpeaker": False,
    },
]

TERRITORIES = [
    {
        "Name": "Hall",
        "DisplayName": "The Hall",
        "DistrictType": "HQ",
        "Adjacent": "NeonRow,MarketStrip",
        "StartingControl": 100,
        "StartingHeat": 8,
        "Income": 40,
        "DefenseDifficulty": 20,
        "UnlockWave": 0,
        "V0Active": True,
        "MapX": 47,
        "MapY": 30,
        "Art": "/art/hall.jpg",
        "Blurb": "Brick civic hall. Your table. Control never drops below 70.",
    },
    {
        "Name": "NeonRow",
        "DisplayName": "Neon Row",
        "DistrictType": "Street",
        "Adjacent": "Hall,MarketStrip,Docks",
        "StartingControl": 48,
        "StartingHeat": 64,
        "Income": 70,
        "DefenseDifficulty": 55,
        "UnlockWave": 0,
        "V0Active": True,
        "MapX": 84,
        "MapY": 38,
        "Art": "/art/neon-row.jpg",
        "Blurb": "Wet commercial street. Contested tonight. v0 defense.",
    },
    {
        "Name": "MarketStrip",
        "DisplayName": "Market Strip",
        "DistrictType": "Market",
        "Adjacent": "Hall,NeonRow,OldWard",
        "StartingControl": 12,
        "StartingHeat": 30,
        "Income": 90,
        "DefenseDifficulty": 50,
        "UnlockWave": 1,
        "V0Active": False,
        "MapX": 50,
        "MapY": 78,
        "Art": "/art/districts.jpg",
        "Blurb": "Canvas stalls. Locked until the v0 loop is closed.",
    },
    {
        "Name": "Docks",
        "DisplayName": "The Docks",
        "DistrictType": "Industrial",
        "Adjacent": "NeonRow,OldWard",
        "StartingControl": 35,
        "StartingHeat": 44,
        "Income": 55,
        "DefenseDifficulty": 48,
        "UnlockWave": 0,
        "V0Active": True,
        "MapX": 13,
        "MapY": 56,
        "Art": "/art/docks.jpg",
        "Blurb": "River, cranes, warehouse doors. v0 territory after Neon Row.",
    },
    {
        "Name": "OldWard",
        "DisplayName": "Old Ward",
        "DistrictType": "Ruin",
        "Adjacent": "MarketStrip,Docks",
        "StartingControl": 0,
        "StartingHeat": 20,
        "Income": 25,
        "DefenseDifficulty": 70,
        "UnlockWave": 2,
        "V0Active": False,
        "MapX": 86,
        "MapY": 80,
        "Art": "/art/districts.jpg",
        "Blurb": "Crumbling masonry. Not in v0.",
    },
]

QUESTS = [
    {
        "Name": "DefendNeonRow",
        "Title": "Hold Neon Row",
        "Type": "Defense",
        "TerritoryId": "NeonRow",
        "RequiredCrewMin": 1,
        "HeatDeltaOnWin": -8,
        "ControlDeltaOnWin": 18,
        "ControlDeltaOnLoss": -22,
        "LoyaltyDeltaOnWin": 3,
        "LoyaltyDeltaOnLoss": -4,
        "DialogueStartId": "Rico_Brief_01",
        "UnlockAfter": "",
        "V0Active": True,
        "Summary": "Two crews on the east mouths. Assign bodies. Pick a tactic. Hold the street.",
    },
    {
        "Name": "DebriefMarcus",
        "Title": "Debrief with Marcus",
        "Type": "Debrief",
        "TerritoryId": "Hall",
        "RequiredCrewMin": 0,
        "HeatDeltaOnWin": 0,
        "ControlDeltaOnWin": 0,
        "ControlDeltaOnLoss": 0,
        "LoyaltyDeltaOnWin": 0,
        "LoyaltyDeltaOnLoss": 0,
        "DialogueStartId": "Marcus_Win_01",
        "UnlockAfter": "DefendNeonRow",
        "V0Active": True,
        "Summary": "Marcus wants names and a decision on the cameras. Loyalty moves here.",
    },
    {
        "Name": "TakeoverDocks",
        "Title": "Take the Docks",
        "Type": "Takeover",
        "TerritoryId": "Docks",
        "RequiredCrewMin": 2,
        "HeatDeltaOnWin": 6,
        "ControlDeltaOnWin": 24,
        "ControlDeltaOnLoss": -14,
        "LoyaltyDeltaOnWin": 2,
        "LoyaltyDeltaOnLoss": -3,
        "DialogueStartId": "Rico_Docks_01",
        "UnlockAfter": "DebriefMarcus",
        "V0Active": True,
        "Summary": "Warehouse door is ajar. After the Row is resolved, push the river.",
    },
    {
        "Name": "BetrayalVex",
        "Title": "Vex sells the route",
        "Type": "Betrayal",
        "TerritoryId": "Docks",
        "RequiredCrewMin": 0,
        "HeatDeltaOnWin": 12,
        "ControlDeltaOnWin": 0,
        "ControlDeltaOnLoss": -16,
        "LoyaltyDeltaOnWin": 0,
        "LoyaltyDeltaOnLoss": 0,
        "DialogueStartId": "Event_Vex_01",
        "UnlockAfter": "",
        "V0Active": True,
        "Summary": "Fires if Vex loyalty is under 28 and city heat is over 70.",
    },
    {
        "Name": "BetrayalRico",
        "Title": "Rico walks",
        "Type": "Betrayal",
        "TerritoryId": "Hall",
        "RequiredCrewMin": 0,
        "HeatDeltaOnWin": 8,
        "ControlDeltaOnWin": 0,
        "ControlDeltaOnLoss": -10,
        "LoyaltyDeltaOnWin": 0,
        "LoyaltyDeltaOnLoss": 0,
        "DialogueStartId": "Event_Rico_01",
        "UnlockAfter": "",
        "V0Active": True,
        "Summary": "Fires if Rico loyalty is under 28 after repeated ego debriefs.",
    },
    {
        "Name": "ReclaimMarket",
        "Title": "Reclaim Market Strip",
        "Type": "Reclamation",
        "TerritoryId": "MarketStrip",
        "RequiredCrewMin": 2,
        "HeatDeltaOnWin": 4,
        "ControlDeltaOnWin": 28,
        "ControlDeltaOnLoss": -10,
        "LoyaltyDeltaOnWin": 2,
        "LoyaltyDeltaOnLoss": -2,
        "DialogueStartId": "Rico_Market_01",
        "UnlockAfter": "TakeoverDocks",
        "V0Active": False,
        "Summary": "Post-v0. Stalls pay if you can hold them.",
    },
    {
        "Name": "ReclaimOldWard",
        "Title": "Reclaim Old Ward",
        "Type": "Reclamation",
        "TerritoryId": "OldWard",
        "RequiredCrewMin": 3,
        "HeatDeltaOnWin": 10,
        "ControlDeltaOnWin": 30,
        "ControlDeltaOnLoss": -8,
        "LoyaltyDeltaOnWin": 3,
        "LoyaltyDeltaOnLoss": -2,
        "DialogueStartId": "Rico_Ward_01",
        "UnlockAfter": "ReclaimMarket",
        "V0Active": False,
        "Summary": "Post-v0. Ruin work. Hard fight, thin income.",
    },
]


def line(
    name: str,
    speaker: str,
    text: str,
    *,
    a: tuple | None = None,
    b: tuple | None = None,
    c: tuple | None = None,
    ends: bool = False,
) -> dict:
    def pack(ch: tuple | None, prefix: str) -> dict:
        empty = {
            f"{prefix}_Text": "",
            f"{prefix}_Next": "",
            f"{prefix}_LoyaltyId": "",
            f"{prefix}_LoyaltyDelta": 0,
            f"{prefix}_HeatDelta": 0,
            f"{prefix}_ControlId": "",
            f"{prefix}_ControlDelta": 0,
            f"{prefix}_Flag": "",
        }
        if not ch:
            return empty
        text_, nxt, loy_id, loy_d, heat, ctrl_id, ctrl_d, flag = ch
        return {
            f"{prefix}_Text": text_,
            f"{prefix}_Next": nxt,
            f"{prefix}_LoyaltyId": loy_id,
            f"{prefix}_LoyaltyDelta": loy_d,
            f"{prefix}_HeatDelta": heat,
            f"{prefix}_ControlId": ctrl_id,
            f"{prefix}_ControlDelta": ctrl_d,
            f"{prefix}_Flag": flag,
        }

    row = {
        "Name": name,
        "Speaker": speaker,
        "Text": text,
        "EndsScene": ends,
    }
    row.update(pack(a, "ChoiceA"))
    row.update(pack(b, "ChoiceB"))
    row.update(pack(c, "ChoiceC"))
    return row


# Choice tuple: text, next, loyaltyId, loyaltyDelta, heat, controlId, controlDelta, flag
DIALOGUE = [
    line(
        "Rico_Brief_01",
        "Rico",
        "Neon Row is leaking. Two crews on the east mouths, cameras still live. Marcus wants a debrief after — he always does. Who do you put on the street?",
        a=(
            "I'll pick the crew.",
            "Rico_Brief_Pick",
            "",
            0,
            0,
            "",
            0,
            "openAssign",
        ),
        b=(
            "Rico and Ray. Hold the corners.",
            "Rico_Brief_Ray",
            "Rico",
            2,
            0,
            "",
            0,
            "preselectRicoRay",
        ),
        c=(
            "Ask Lena before anyone walks.",
            "Rico_Brief_Lena",
            "Lena",
            2,
            0,
            "",
            0,
            "",
        ),
    ),
    line(
        "Rico_Brief_Pick",
        "Rico",
        "Your table. Keep it to three. Marcus stays in the Hall — he is the debrief, not the street.",
        a=("Open the roster.", "", "", 0, 0, "", 0, "openAssign"),
        ends=True,
    ),
    line(
        "Rico_Brief_Ray",
        "Rico",
        "Ray already knows the corners. I'll walk with him. You can still swap bodies on the roster.",
        a=("Open the roster.", "", "Ray", 1, 0, "", 0, "openAssign"),
        ends=True,
    ),
    line(
        "Rico_Brief_Lena",
        "Lena",
        "The alley cameras dump to a clerk on Market. If we cut the lights we lose claim but we lose heat. If we leave them, Marcus will smell it.",
        a=(
            "Lena walks. Cut the lights if it comes to it.",
            "",
            "Lena",
            3,
            0,
            "",
            0,
            "preselectLena",
        ),
        b=("Keep Lena off the street. I'll pick.", "", "", 0, 0, "", 0, "openAssign"),
        ends=True,
    ),
    line(
        "Marcus_Win_01",
        "Marcus",
        "You held the Row. The corners are ours until morning. I don't want the story you tell the Hall. I want names. Who called the shots on the ground?",
        a=(
            "Rico ran the corners.",
            "Marcus_Win_Rico",
            "Rico",
            6,
            0,
            "",
            0,
            "",
        ),
        b=(
            "The crew held it together.",
            "Marcus_Win_Crew",
            "",
            0,
            0,
            "",
            0,
            "creditCrew",
        ),
        c=(
            "I called it from the Hall.",
            "Marcus_Win_Ego",
            "",
            0,
            0,
            "",
            0,
            "creditSelf",
        ),
    ),
    line(
        "Marcus_Win_Rico",
        "Marcus",
        "Rico can carry a street. Cameras still have us. Burn the footage, pay the clerk, or leave them and hope.",
        a=("Burn the footage.", "Marcus_Win_End", "Lena", 4, -10, "NeonRow", 0, "completeDebrief"),
        b=("Pay the clerk.", "Marcus_Win_End", "Marcus", 6, -4, "NeonRow", 0, "completeDebrief"),
        c=("Leave the cameras.", "Marcus_Win_End", "Vex", 6, 8, "NeonRow", -4, "completeDebrief"),
    ),
    line(
        "Marcus_Win_Crew",
        "Marcus",
        "Shared credit keeps them. Cameras still have us. Burn, pay, or leave them.",
        a=("Burn the footage.", "Marcus_Win_End", "Lena", 4, -10, "NeonRow", 0, "completeDebrief"),
        b=("Pay the clerk.", "Marcus_Win_End", "Marcus", 6, -4, "NeonRow", 0, "completeDebrief"),
        c=("Leave the cameras.", "Marcus_Win_End", "Vex", 6, 8, "NeonRow", -4, "completeDebrief"),
    ),
    line(
        "Marcus_Win_Ego",
        "Marcus",
        "They noticed. Loyalty thins when the Hall takes the name. Cameras still have us.",
        a=("Burn the footage.", "Marcus_Win_End", "Marcus", -2, -10, "NeonRow", 0, "completeDebrief"),
        b=("Pay the clerk.", "Marcus_Win_End", "Marcus", 4, -4, "NeonRow", 0, "completeDebrief"),
        c=("Leave the cameras.", "Marcus_Win_End", "Vex", 8, 10, "NeonRow", -6, "completeDebrief"),
    ),
    line(
        "Marcus_Win_End",
        "Marcus",
        "That's the debrief. Watch the meters. Neon Row will leak if you stop putting bodies on it.",
        ends=True,
    ),
    line(
        "Marcus_Loss_01",
        "Marcus",
        "We lost the Row. Heat is going to crawl toward the Hall. I still need names. Who do we put on the next walk, and what do we do about the cameras?",
        a=(
            "Rico owns the miss. He'll fix it.",
            "Marcus_Loss_Rico",
            "Rico",
            -6,
            4,
            "NeonRow",
            0,
            "",
        ),
        b=(
            "The crew takes it together.",
            "Marcus_Loss_Crew",
            "",
            0,
            2,
            "",
            0,
            "creditCrew",
        ),
        c=(
            "I called a bad walk.",
            "Marcus_Loss_Ego",
            "Marcus",
            4,
            0,
            "",
            0,
            "creditSelf",
        ),
    ),
    line(
        "Marcus_Loss_Rico",
        "Marcus",
        "Rico will remember that. Cameras still have the miss. Burn, pay, or leave them.",
        a=("Burn the footage.", "Marcus_Loss_End", "Lena", 3, -8, "NeonRow", 0, "completeDebrief"),
        b=("Pay the clerk.", "Marcus_Loss_End", "Marcus", 5, -2, "NeonRow", 0, "completeDebrief"),
        c=("Leave the cameras.", "Marcus_Loss_End", "Vex", 8, 12, "NeonRow", -6, "completeDebrief"),
    ),
    line(
        "Marcus_Loss_Crew",
        "Marcus",
        "Shared blame is cheaper than a scapegoat. Cameras still have the miss.",
        a=("Burn the footage.", "Marcus_Loss_End", "Lena", 3, -8, "NeonRow", 0, "completeDebrief"),
        b=("Pay the clerk.", "Marcus_Loss_End", "Marcus", 5, -2, "NeonRow", 0, "completeDebrief"),
        c=("Leave the cameras.", "Marcus_Loss_End", "Vex", 8, 12, "NeonRow", -6, "completeDebrief"),
    ),
    line(
        "Marcus_Loss_Ego",
        "Marcus",
        "Owning it from the Hall is rare. They'll give you one more night. Cameras still have the miss.",
        a=("Burn the footage.", "Marcus_Loss_End", "Lena", 4, -8, "NeonRow", 0, "completeDebrief"),
        b=("Pay the clerk.", "Marcus_Loss_End", "Marcus", 6, -2, "NeonRow", 0, "completeDebrief"),
        c=("Leave the cameras.", "Marcus_Loss_End", "Vex", 6, 12, "NeonRow", -6, "completeDebrief"),
    ),
    line(
        "Marcus_Loss_End",
        "Marcus",
        "That's the debrief. The Row is thin. Tick the night and watch control leak — or go take it back.",
        ends=True,
    ),
    line(
        "Rico_Docks_01",
        "Rico",
        "Warehouse door on the river is ajar. We can take the Docks if the Row isn't on fire. Two bodies minimum.",
        a=("Open the roster.", "", "", 0, 0, "", 0, "openAssignDocks"),
        b=("Not tonight.", "", "", 0, 0, "", 0, "cancelQuest"),
        ends=True,
    ),
    line(
        "Rico_Market_01",
        "Rico",
        "Stalls on the Strip will pay if we reclaim them. Not v0. Don't open this until the Row loop is boring.",
        a=("Understood.", "", "", 0, 0, "", 0, ""),
        ends=True,
    ),
    line(
        "Rico_Ward_01",
        "Rico",
        "Old Ward is masonry and empty lots. Reclamation work. Not v0.",
        a=("Understood.", "", "", 0, 0, "", 0, ""),
        ends=True,
    ),
    line(
        "Event_Vex_01",
        "Marcus",
        "Vex didn't show. Someone sold the Docks route. Loyalty was already thin. They're gone.",
        a=("Cut them loose.", "", "Vex", -100, 8, "Docks", -16, "vexBetrayed"),
        ends=True,
    ),
    line(
        "Event_Rico_01",
        "Marcus",
        "Rico's phone is dead. Hall keys are gone. He left a note: You wanted the name on the door. Keep it.",
        a=("Let him walk.", "", "Rico", -100, 6, "Hall", -8, "ricoBetrayed"),
        ends=True,
    ),
]

SIM_RULES = {
    "tickSeconds": 1.0,
    "ticksPerDay": 8,
    "startingCash": 120,
    "heatBands": [
        {"id": "Cold", "min": 0, "max": 24, "patrolChance": 0.05, "incomeMult": 1.15, "controlLeak": 0.15},
        {"id": "Warm", "min": 25, "max": 49, "patrolChance": 0.18, "incomeMult": 1.0, "controlLeak": 0.35},
        {"id": "Hot", "min": 50, "max": 74, "patrolChance": 0.42, "incomeMult": 0.72, "controlLeak": 0.7},
        {"id": "Burning", "min": 75, "max": 100, "patrolChance": 0.7, "incomeMult": 0.4, "controlLeak": 1.4},
    ],
    "betrayal": {
        "loyaltyThreshold": 28,
        "heatThreshold": 70,
        "baseChancePerTick": 0.03,
        "chanceWhenBoth": 0.16,
        "primaryCrewId": "Vex",
        "secondaryCrewId": "Rico",
    },
    "control": {
        "holdDecayPerTick": 0.45,
        "hallFloor": 70,
        "winBonus": 18,
        "lossPenalty": 22,
        "clampMin": 0,
        "clampMax": 100,
    },
    "defense": {
        "combatWeight": 0.55,
        "streetSenseWeight": 0.45,
        "secondaryShare": 0.42,
        "variance": 12,
        "maxAssigned": 3,
    },
    "tactics": [
        {
            "id": "HoldCorners",
            "label": "Hold the corners",
            "bonusIf": ["Ray"],
            "power": 8,
            "heat": -6,
            "control": 2,
            "blurb": "Ray's work. Slow, ugly, holds ground.",
        },
        {
            "id": "PushAlley",
            "label": "Push the alley",
            "bonusIf": ["Rico"],
            "power": 8,
            "heat": 10,
            "control": 8,
            "blurb": "Rico walks it loud. You keep the street and you keep the noise.",
        },
        {
            "id": "CutLights",
            "label": "Cut the lights",
            "bonusIf": ["Lena", "Vex"],
            "power": 8,
            "heat": -12,
            "control": -4,
            "blurb": "Cameras go dark. Less claim, less heat.",
        },
    ],
    "v0Scope": ["Hall", "NeonRow", "Docks"],
    "v0Quests": ["DefendNeonRow", "DebriefMarcus"],
}

UNREAL_STRUCTS = {
    "FCrewRow": {
        "base": "FTableRowBase",
        "fields": [
            {"name": "DisplayName", "type": "FText"},
            {"name": "Role", "type": "FName"},
            {"name": "Combat", "type": "int32"},
            {"name": "Influence", "type": "int32"},
            {"name": "StreetSense", "type": "int32"},
            {"name": "Loyalty", "type": "int32"},
            {"name": "HeatTolerance", "type": "int32"},
            {"name": "StartingTerritory", "type": "FName"},
            {"name": "Portrait", "type": "FSoftObjectPath"},
            {"name": "Notes", "type": "FString"},
            {"name": "Deployable", "type": "bool"},
            {"name": "DebriefSpeaker", "type": "bool"},
        ],
    },
    "FTerritoryRow": {
        "base": "FTableRowBase",
        "fields": [
            {"name": "DisplayName", "type": "FText"},
            {"name": "DistrictType", "type": "FName"},
            {"name": "Adjacent", "type": "FString", "note": "Comma-separated row names. Split with ParseIntoArray."},
            {"name": "StartingControl", "type": "int32"},
            {"name": "StartingHeat", "type": "int32"},
            {"name": "Income", "type": "int32"},
            {"name": "DefenseDifficulty", "type": "int32"},
            {"name": "UnlockWave", "type": "int32"},
            {"name": "V0Active", "type": "bool"},
            {"name": "MapX", "type": "int32", "note": "Percent of map texture, web/debug only."},
            {"name": "MapY", "type": "int32"},
            {"name": "Art", "type": "FSoftObjectPath"},
            {"name": "Blurb", "type": "FString"},
        ],
    },
    "FQuestRow": {
        "base": "FTableRowBase",
        "fields": [
            {"name": "Title", "type": "FText"},
            {"name": "Type", "type": "FName", "note": "Defense | Debrief | Takeover | Betrayal | Reclamation"},
            {"name": "TerritoryId", "type": "FName"},
            {"name": "RequiredCrewMin", "type": "int32"},
            {"name": "HeatDeltaOnWin", "type": "int32"},
            {"name": "ControlDeltaOnWin", "type": "int32"},
            {"name": "ControlDeltaOnLoss", "type": "int32"},
            {"name": "LoyaltyDeltaOnWin", "type": "int32"},
            {"name": "LoyaltyDeltaOnLoss", "type": "int32"},
            {"name": "DialogueStartId", "type": "FName"},
            {"name": "UnlockAfter", "type": "FName"},
            {"name": "V0Active", "type": "bool"},
            {"name": "Summary", "type": "FString"},
        ],
    },
    "FDialogueRow": {
        "base": "FTableRowBase",
        "fields": [
            {"name": "Speaker", "type": "FName"},
            {"name": "Text", "type": "FText"},
            {"name": "ChoiceA_Text", "type": "FText"},
            {"name": "ChoiceA_Next", "type": "FName"},
            {"name": "ChoiceA_LoyaltyId", "type": "FName"},
            {"name": "ChoiceA_LoyaltyDelta", "type": "int32"},
            {"name": "ChoiceA_HeatDelta", "type": "int32"},
            {"name": "ChoiceA_ControlId", "type": "FName"},
            {"name": "ChoiceA_ControlDelta", "type": "int32"},
            {"name": "ChoiceA_Flag", "type": "FName"},
            {"name": "ChoiceB_Text", "type": "FText"},
            {"name": "ChoiceB_Next", "type": "FName"},
            {"name": "ChoiceB_LoyaltyId", "type": "FName"},
            {"name": "ChoiceB_LoyaltyDelta", "type": "int32"},
            {"name": "ChoiceB_HeatDelta", "type": "int32"},
            {"name": "ChoiceB_ControlId", "type": "FName"},
            {"name": "ChoiceB_ControlDelta", "type": "int32"},
            {"name": "ChoiceB_Flag", "type": "FName"},
            {"name": "ChoiceC_Text", "type": "FText"},
            {"name": "ChoiceC_Next", "type": "FName"},
            {"name": "ChoiceC_LoyaltyId", "type": "FName"},
            {"name": "ChoiceC_LoyaltyDelta", "type": "int32"},
            {"name": "ChoiceC_HeatDelta", "type": "int32"},
            {"name": "ChoiceC_ControlId", "type": "FName"},
            {"name": "ChoiceC_ControlDelta", "type": "int32"},
            {"name": "ChoiceC_Flag", "type": "FName"},
            {"name": "EndsScene", "type": "bool"},
        ],
    },
}


def write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys())
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        for row in rows:
            out = {}
            for key, value in row.items():
                if isinstance(value, bool):
                    out[key] = "True" if value else "False"
                else:
                    out[key] = value
            writer.writerow(out)


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def bundle() -> dict:
    return {
        "crews": CREWS,
        "territories": TERRITORIES,
        "quests": QUESTS,
        "dialogue": DIALOGUE,
        "simRules": SIM_RULES,
        "structs": UNREAL_STRUCTS,
    }


def mirror_kit() -> None:
    dest = PUBLIC / "kit"
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(
        UE5,
        dest,
        ignore=shutil.ignore_patterns("*.zip", "__pycache__"),
    )


def zip_kit() -> None:
    zip_path = PUBLIC / "EmpireRPG_UE5.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file in UE5.rglob("*"):
            if file.is_file() and "__pycache__" not in file.parts:
                zf.write(file, file.relative_to(ROOT))


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    CONFIG.mkdir(parents=True, exist_ok=True)

    write_csv(DATA / "DT_Crews.csv", CREWS)
    write_csv(DATA / "DT_Territories.csv", TERRITORIES)
    write_csv(DATA / "DT_Quests.csv", QUESTS)
    write_csv(DATA / "DT_Dialogue.csv", DIALOGUE)
    write_json(CONFIG / "SimRules.json", SIM_RULES)
    write_json(CONFIG / "UnrealStructs.json", UNREAL_STRUCTS)

    payload = bundle()
    write_json(PUBLIC / "data" / "empire.json", payload)
    write_json(SRC_SEED, payload)

    mirror_kit()
    zip_kit()

    print("Wrote:")
    for path in [
        DATA / "DT_Crews.csv",
        DATA / "DT_Territories.csv",
        DATA / "DT_Quests.csv",
        DATA / "DT_Dialogue.csv",
        CONFIG / "SimRules.json",
        CONFIG / "UnrealStructs.json",
        PUBLIC / "data" / "empire.json",
        SRC_SEED,
        PUBLIC / "EmpireRPG_UE5.zip",
    ]:
        print(f"  {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
