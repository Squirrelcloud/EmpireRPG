# First 10 editor tasks (Hall + Neon Row + Docks only)

Create a UE 5.5 **Third Person** project named `EmpireRPG`. Do not add a city,
vehicles, or MetaHuman. Stop after step 10 and play the loop.

1. **Project**
   File → New → Games → Third Person → Blueprint (or C++ if you will paste the headers). Name: `EmpireRPG`. Default map is fine.

2. **Four structs**
   Content Browser → `Content/Data/` (create the folder).
   New → Blueprint → Structure, four times, matching `Config/UnrealStructs.json`:
   `FCrewRow`, `FTerritoryRow`, `FQuestRow`, `FDialogueRow`.
   Field names and types must match the JSON exactly. Parent conceptually `FTableRowBase` (DataTable will wrap it).

3. **Import DataTables**
   Drag the four CSVs from `Content/Data/` into `/Game/Data`.
   Import as **DataTable**, pick the matching struct.
   Rename assets: `DT_Crews`, `DT_Territories`, `DT_Quests`, `DT_Dialogue`.
   Confirm row names: Player, Rico, Lena, Marcus, Ray, Vex / Hall, NeonRow, MarketStrip, Docks, OldWard.

4. **Sim object**
   Create Blueprint class `BP_EmpireSim` based on `Actor` (or use `UEmpireSimSubsystem` from the C++ header).
   Variables: `DT_Crews`, `DT_Territories`, `DT_Quests`, `DT_Dialogue` (DataTable refs).
   Runtime maps: `Control` (Name → float), `Heat` (Name → float), `Loyalty` (Name → float).
   Copy `SimRules.json` numbers into a `BP_SimRules` data asset or literal constants.

5. **Three volumes only**
   In the Third Person map, place three `Box Collision` actors:
   - `Vol_Hall` (tag `Hall`)
   - `Vol_NeonRow` (tag `NeonRow`)
   - `Vol_Docks` (tag `Docks`)
   Skip Market Strip and Old Ward. No traffic, no vehicles.

6. **BeginPlay hydrate**
   For each row in `DT_Territories` where `V0Active` is true, set `Control[Name] = StartingControl`, `Heat[Name] = StartingHeat`.
   For each row in `DT_Crews`, set `Loyalty[Name] = Loyalty`.
   `Print String` those values so you can see them change later.

7. **TickSim**
   On a 1s timer (or debug key `T`), run the node list in `Docs/BP_EmpireSim.md` → TickSim.
   Apply heat-band leak + hold decay to Neon Row and Docks.
   Clamp Hall control to min 70.
   Print Neon Row control and Vex loyalty every tick.

8. **Defense trigger**
   Overlap `Vol_NeonRow` **or** debug key `1` starts quest `DefendNeonRow`.
   Widget or debug keys pick 1–3 deployable crew (Marcus is not deployable).
   Debug keys `7/8/9` pick tactic `HoldCorners` / `PushAlley` / `CutLights`.
   Run the power formula from `BUILD.md`. Apply win/loss control, heat, loyalty deltas from the quest row + tactic.

9. **Debrief widget**
   After defense resolves, open `WBP_Debrief`.
   Start at `Marcus_Win_01` or `Marcus_Loss_01` from `DT_Dialogue`.
   Three buttons bound to Choice A/B/C. On click: apply loyalty/heat/control deltas, load `Next` or close if empty / `EndsScene`.
   Node list: `Docs/BP_EmpireSim.md` → Debrief.

10. **PIE the loop**
    Play → trigger Neon Row defense → resolve → debrief Marcus → take the Docks
    (debug key `2` / overlap `Vol_Docks`) → debrief the river → watch `Control[Docks]`
    and `Loyalty[Vex]` change on screen.
    If Neon, Docks, and both debriefs move meters, v0 is done. Do not build a city.

Optional after 10: debug key `2` for `TakeoverDocks`. Betrayal events fire from TickSim when thresholds hit.
