# BP_EmpireSim node lists

Keep Blueprints dumb. Numbers live in DataTables + `SimRules.json`.

## TickSim (`BP_EmpireSim`)

Event: Custom event `TickSim` (timer 1s, or key `T`).

1. **Sequence** (then 0, then 1, then 2).
2. Then 0 — **ForEach** `DT_Territories` rows:
   - Branch `V0Active` (skip false).
   - Branch `Name == Hall` → `Control[Hall] = Max(Control[Hall], 70)`, continue.
   - `HeatBand` = first band in SimRules where `Heat[Name]` is inside `[min, max]`.
   - `Leak = HeatBand.controlLeak + SimRules.control.holdDecayPerTick`.
   - `Control[Name] = Clamp(Control[Name] - Leak, 0, 100)`.
   - `Heat[Name] = Clamp(Heat[Name] + (patrol roll < HeatBand.patrolChance ? 2 : -0.3), 0, 100)`.
3. Then 1 — **Betrayal**:
   - `CityHeat = Max` of v0 heat values.
   - For crew in `{Vex, Rico}`:
     - If `Loyalty[crew] >= 28` or crew already flagged `Betrayed`, skip.
     - `Chance = 0.03` ; if `CityHeat > 70` then `Chance = 0.16`.
     - Random bool → if true, fire `BetrayalVex` or `BetrayalRico` (open dialogue — buy, cut, or let the sale. Cut/sale sets loyalty 0, flag Betrayed, Docks/Hall penalty from the choice). Press while thin is a Hall talk, not a tick.
4. Then 2 — **Dispatch** `OnSimTick` (control, heat, loyalty snapshots).
   Print `NeonRow control` and `Vex loyalty`.

Do not simulate Market Strip / Old Ward in v0.

## Defense resolve (`ResolveDefense`)

Inputs: `Assigned` (array of Names, 1–3), `TacticId` (Name), `TerritoryId` (default `NeonRow`).

1. Get territory row. `Threat = DefenseDifficulty + Heat * 0.35`.
2. For each assigned crew, `Score = Combat * 0.55 + StreetSense * 0.45`.
3. Sort scores descending. `Power = Scores[0] + 0.42 * Sum(Scores[1..])`.
4. Get tactic from SimRules. If any `bonusIf` crew is in Assigned, `Power += tactic.power`.
5. `Margin = Power - Threat + RandomFloat(-12, 12)`.
6. Branch `Margin >= 0`:
   - Win: `Control += ControlDeltaOnWin + tactic.control`, `Heat += HeatDeltaOnWin + tactic.heat`, each assigned `Loyalty += LoyaltyDeltaOnWin`.
   - Loss: `Control += ControlDeltaOnLoss`, `Heat += 10 + tactic.heat`, each assigned `Loyalty += LoyaltyDeltaOnLoss`.
7. Clamp all 0–100. Set `LastDefenseWon`. Open debrief.

## WBP_Debrief

Widgets: `Img_Portrait`, `Txt_Speaker`, `Txt_Body`, `Btn_A`, `Btn_B`, `Btn_C`.

Event `OpenDebrief(StartId)`:

1. `CurrentId = StartId`.
2. `LoadLine`: Get `DT_Dialogue` row. Set speaker text, body, portrait from crew row of Speaker.
3. For A/B/C: if `ChoiceN_Text` empty → collapse button, else set text and enable.

On `Btn_N` clicked:

1. `ApplyDeltas(ChoiceN_*)`:
   - If `LoyaltyId` is set, `Loyalty[Id] += Delta` (special flags: `creditCrew` adds +3 to every assigned crew; `creditSelf` adds -3 to assigned, -2 to Marcus on a win ego line — those flags are already baked into the following line's numbers except `creditCrew` / `creditSelf`, which the web sim applies when the flag is seen).
   - `Heat[NeonRow] += HeatDelta` (if HeatDelta != 0).
   - If `ControlId` set, `Control[Id] += ControlDelta`.
   - Store `Flag` on the sim (openAssign, completeDebrief, vexBetrayed, …).
2. If `ChoiceN_Next` is none: close widget, `completeDebrief` → return to command.
3. Else `CurrentId = Next`, `LoadLine`.
4. If the loaded row `EndsScene` and has no choices: delay 0.4s, close.

Start id: `LastDefenseWon ? Marcus_Win_01 : Marcus_Loss_01`.
