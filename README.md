# Empire — Hall Command

Defend Neon Row. Debrief Marcus. Watch control and loyalty move.

Playable Hall sim plus an Unreal-ready data kit (`EmpireRPG_UE5/`). v0 is Hall, Neon Row, and the Docks. No city until that loop works.

## Play

1. Enter the Hall.
2. Assign crew (three bodies, max). Marcus stays at the table.
3. Pick a tactic. Hold or slip.
4. Debrief Marcus. Meters move.
5. Tick the night.

**Library** (title + Command): paint crew and districts from Hall stills, Drive photos, or dropped files.

## Unreal kit

Same tables the Hall is running.

- `EmpireRPG_UE5/Content/Data/` — CSVs for crews, territories, quests, dialogue
- `EmpireRPG_UE5/Config/` — SimRules + UnrealStructs
- `EmpireRPG_UE5/UE5_First10Tasks.md` — first ten editor tasks
- `EmpireRPG_UE5/tools/build_empire_data.py` — regenerates CSVs and `src/lib/empire/seed.json`

```bash
python3 EmpireRPG_UE5/tools/build_empire_data.py
```

## Web

```bash
npm install
npm run dev
```

TanStack Start + React 19. Auth off. Progress is local.

## License

Private. All rights reserved unless you say otherwise.
