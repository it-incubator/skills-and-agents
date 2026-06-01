---
name: in-arch-dynamic-diagrams
description: Generate C4 dynamic diagrams in PlantUML — numbered runtime scenarios at the container level showing what data crosses each boundary. One diagram per use case in docs/use-cases/. Use when user asks for "dynamic diagram", "c4 dynamic", "динамическая диаграмма", "динамические диаграммы c4", "сценарий взаимодействия", or to convert use cases into runtime flows.
---

# C4 Dynamic Diagrams Generator

Generate C4 **dynamic** diagrams: numbered, container-level runtime flows for specific scenarios. One diagram per use case.

This skill is distinct from:
- `c4-diagrams` — static structure (Levels 1–3 + Deployment)
- `sequence-diagrams` — component-level technical sequence
- `use-case-diagrams` — business-level black-box scenarios

A dynamic diagram answers "what happens at runtime in scenario X, step by step, between which containers, with what data."

## Step 1 — Find Use Cases

Look in `docs/use-cases/**/uc-*.puml`. Each use case file → one dynamic diagram.

If no use cases exist, ask the user to:
1. provide scenarios in plain text, OR
2. first run `/use-case-diagrams` to generate them.

Also read `docs/architecture/c4-2-container.puml` to know which containers to draw between. If C2 doesn't exist, run `/c4-diagrams` first.

## Step 2 — File Layout

```
docs/architecture/
└── dynamic/
    ├── c4-dynamic-<scenario-1>.puml
    ├── c4-dynamic-<scenario-2>.puml
    └── ...
```

**Naming convention:** mirror the use case file name.
`docs/use-cases/client/uc-new-conversation.puml` → `docs/architecture/dynamic/c4-dynamic-new-conversation.puml`.

The actor folder (`client/`, `manager/`, `system/`) is NOT preserved in the dynamic folder — all dynamic diagrams sit flat under `dynamic/`.

## Step 3 — Diagram Template

```plantuml
@startuml C4_Dynamic_<PascalCaseScenario>
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Dynamic.puml

title Dynamic Diagram — <Scenario title> (Container Level)

' Actors involved in this scenario
Person(...)

' External systems crossed
System_Ext(...)

' Containers from c4-2 that participate
Container(...)
ContainerDb(...)

Rel(a, b, "1. ...")
Rel(b, a, "2. resp: ...")
Rel(...)

@enduml
```

Use a unique `@startuml` name per file (e.g. `@startuml C4_Dynamic_NewConversation`).

---

## Conventions for Data Flow

The whole point of a dynamic diagram is showing **what data crosses each boundary** — not just who calls whom. Labels must carry payload information for runtime interactions.

### Granularity

- Show **key field names**, not full schemas (5–10 fields is plenty)
- Full schemas live in OpenAPI / ER-diagram — don't duplicate them here
- Prefer concrete (`POST /sendMessage { chat_id, text }`) over abstract (`Bot API call`)

### Request vs Response — Two Arrows or One?

**Two arrows (request forward + response back):** when the response carries data the caller actually uses
- DB SELECT (returns rows)
- AI Provider `/embeddings` (returns vector)
- AI Provider `/chat/completions` (returns content)
- Telegram `/getFile` (returns file_path)
- Storage upload (returns URL)
- Auth login (returns tokens)

```
Rel(edge_functions, ai_provider, "6. POST /embeddings { input: text }")
Rel(ai_provider, edge_functions, "7. resp: { embedding: vector[1536] }")
```

**One arrow only:** for fire-and-forget or trivial-ack interactions
- DB INSERT / UPDATE / DELETE (when caller doesn't use the returned id)
- Telegram `/sendMessage` (just `ok: true`)
- Realtime push (one-way)
- Cron / scheduler triggers
- Webhook deliveries

```
Rel(edge_functions, telegram, "13. POST /sendMessage { chat_id, text: <answer> }")
```

**No payload at all:** UI clicks
- `Manager → webapp`: action labels like "Нажимает 'Завершить сессию'", "Применяет фильтр"
- Don't fake JSON for button presses

### Numbering

- Number every `Rel()` sequentially: `"1. ..."`, `"2. ..."`, `"3. ..."`
- A request and its response each get their own number
- Numbers reflect time order
- For long-running self-actions (debounce timer, polling tick), use a self-loop `Rel(edge_functions, edge_functions, "N. debounce-таймер сработал")`

### Label Format Reference

| Interaction        | Label form                                                                  |
| ------------------ | --------------------------------------------------------------------------- |
| DB read            | `SELECT field1, field2 FROM table WHERE ...` + separate `resp: rows[]`      |
| DB write           | `INSERT/UPDATE/DELETE table(...) WHERE ...`                                 |
| HTTP/REST          | `METHOD /path { key1, key2, ... }` + separate `resp: { ... }` if meaningful |
| Bot API send       | `POST /sendMessage { chat_id, text }` (no resp arrow)                       |
| Realtime push      | `push: { event: INSERT\|UPDATE\|DELETE, table, new\|old }`                  |
| Realtime subscribe | `Subscribe channel='...' table='...' filter=...`                            |
| UI click           | Action verb in plain language, no payload                                   |
| Self-action        | Self-loop with description, no payload                                      |

---

## What Belongs in Each Diagram

- Only the **containers** that participate in this scenario
- Only the **external systems** the scenario actually crosses
- Only the **persons (actors)** that initiate or observe

Don't drag in every container from C2 — keep each diagram scoped to its scenario.

## Cross-Validation with C4-2

Every container or external system referenced must exist in `c4-2-container.puml`. If a flow needs a relation that's not in C2, that's a structural gap — flag it and ask the user whether to update C2 or restructure the flow.

Common gaps that surface from dynamic diagrams:
- `webapp → edge_functions` invoke for sending messages back through the bot
- `db trigger → edge_functions` for embedding recompute on KB changes
- `Scheduler / Cron` external system for timeout sweeps and periodic jobs

After generating dynamic diagrams, report any gaps to the user and offer to update C2.

---

## Workflow

1. List all `uc-*.puml` files in `docs/use-cases/`
2. Read `c4-2-container.puml`
3. For each use case:
   - Identify which containers and externals participate
   - Translate the abstract "Система" of the use case into specific containers
   - Build a numbered Rel sequence following the data-flow conventions above
   - Write to `docs/architecture/dynamic/c4-dynamic-<scenario>.puml`
4. Report:
   - Generated files
   - Any gaps between dynamic flows and `c4-2-container.puml`

If there are many use cases (≥10), batch the file writes in parallel rather than serially.

## Quality Checklist

- [ ] One file per use case in `docs/use-cases/`
- [ ] File name mirrors use case (`uc-X.puml` → `c4-dynamic-X.puml`), all flat under `dynamic/`
- [ ] Every step numbered sequentially starting at 1
- [ ] Synchronous calls with non-trivial responses use two arrows (req + resp)
- [ ] Fire-and-forget calls use a single arrow
- [ ] UI clicks have action labels but NO payload
- [ ] DB / HTTP labels show key field names, not full schemas
- [ ] All containers / external systems referenced exist in `c4-2-container.puml`
- [ ] Title format: `Dynamic Diagram — <scenario name> (Container Level)`
- [ ] Each `@startuml` has a unique name
- [ ] Files render independently

## What's Next

After generating dynamic diagrams, suggest:

> Динамические диаграммы готовы. Если в процессе всплыли связи, которых нет в `c4-2-container.puml` — обновите контейнерную диаграмму через `/c4-diagrams`, чтобы dynamic и static оставались согласованными.