# Empire RPG — Unreal 5 build kit

Unreal Editor cannot run in this workspace. This folder is the importable kit
for a Third Person project named **EmpireRPG**.

v0 is done when you can **defend Neon Row**, **debrief Marcus**, and **watch
control / loyalty change**. No city, no cars, no MetaHuman until that loop
works. Scope for v0 volumes: **Hall**, **Neon Row**, **Docks**.

## Regenerate tables

```
python3 EmpireRPG_UE5/tools/build_empire_data.py
```

## Contents

| Path | What |
| --- | --- |
| `Content/Data/DT_Crews.csv` | Ash, Rico, Lena, Marcus, Ray, Vex |
| `Content/Data/DT_Territories.csv` | Hall, Neon Row, Market Strip, Docks, Old Ward |
| `Content/Data/DT_Quests.csv` | takeover, defense, debrief, 2 betrayals, 2 reclamations |
| `Content/Data/DT_Dialogue.csv` | Rico / Marcus / debrief branches |
| `Config/SimRules.json` | tick, heat bands, betrayal thresholds, tactics |
| `Config/UnrealStructs.json` | USTRUCT field types |
| `UE5_First10Tasks.md` | exact editor steps |
| `Docs/BP_EmpireSim.md` | TickSim + debrief widget node list |
| `Source/EmpireRPG/Public/EmpireTypes.h` | C++ structs |
| `Source/EmpireRPG/Public/EmpireSimSubsystem.h` | C++ subsystem stub |

## Import rules

1. Create the four structs from `UnrealStructs.json` **before** importing CSVs.
2. First CSV column is the DataTable **row name** (`Name`).
3. `Adjacent` is a comma-separated string. Split with `ParseIntoArray`.
4. `Portrait` / `Art` are web paths. Leave empty in Unreal or retarget to textures.
5. Bools are `True` / `False`. CSVs are UTF-8 with BOM.

## Formula (keep in sync with SimRules.json)

Crew power:

```
score(c) = Combat * 0.55 + StreetSense * 0.45
power    = best score + 0.42 * sum(the rest)
         + tactic.power if a bonusIf crew is assigned
threat   = DefenseDifficulty + Heat * 0.35
margin   = power - threat + Random(-12, 12)
win      = margin >= 0
```

Tick:

- Heat-band `controlLeak` plus `holdDecayPerTick` on every non-Hall district.
- Hall control never below 70.
- Betrayal roll if loyalty < 28. Extra chance if city max heat > 70.
