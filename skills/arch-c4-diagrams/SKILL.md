---
name: arch-c4-diagrams
description: Generate C4 architecture diagrams (levels 1-3 + deployment) in PlantUML format. Use when user asks to create C4 diagrams, architecture diagrams, system design diagrams, or says "c4", "c4 diagrams", "архитектурные диаграммы", "диаграммы c4", "системный дизайн", "deployment diagram".
---

# C4 Architecture Diagrams Generator (Levels 1–3 + Deployment)

Generate C4 diagrams for levels 1 (System Context), 2 (Container), 3 (Component) and the supplementary Deployment view, all in **PlantUML (.puml)** format.

For level 4 (Code diagrams), use the `c4-code` skill after reviewing and approving levels 1–3.
For dynamic scenarios (numbered flows showing data exchange), use the `dynamic-diagrams` skill.

## Step 1 — Collect Source Documents

Ask the user to provide documentation files that describe the system. Say:

> Укажите ссылки на документы (техническое задание, спецификации, требования), на основе которых нужно построить C4-диаграммы.

Wait for the user to provide document paths. Read each document using the Read tool.

If the user has already provided documents in the current conversation (via @ mentions or direct paths), proceed with those — do not ask again.

## Step 2 — Analyze and Design

Based on the documents, identify:
- User roles and actors
- The main system boundary
- External systems and integrations
- Containers (separately deployable units) — only those the team controls
- Components within each container, and whether they cluster into semantic modules
- Tech stack details
- Hosting / deployment targets (only for Deployment view)

## Step 3 — Generate Diagrams

### Output Structure

**Always PlantUML (.puml) files. Never Mermaid.**

```
docs/architecture/
├── c4-1-context.puml              Level 1: System Context
├── c4-2-container.puml            Level 2: Containers
├── c4-deployment.puml             Supplementary: Deployment (optional)
├── <container-1-slug>/
│   └── c4-3-component.puml        Level 3: Components for container 1
├── <container-2-slug>/
│   └── c4-3-component.puml        Level 3: Components for container 2
└── ...
```

**Container subfolder names:** kebab-case derived from the container name (e.g. `Web Admin` → `web-admin/`, `Bot Logic` → `bot-logic/`). The folder name carries the container identity, so the C3 file inside is just `c4-3-component.puml`.

---

## Level 1 — System Context

```plantuml
@startuml C4_Context
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

title System Context Diagram — [System Name]

Person(alias, "Name", "Description")
System(alias, "Name", "Description")
System_Ext(alias, "Name", "Description")

Rel(from, to, "description")

@enduml
```

**Rules:**
- Show people (actors), the main system, and external systems that exchange data at runtime
- Do NOT show hosting/infrastructure (Vercel, AWS, Heroku) — these belong in the Deployment view
- Managed BaaS platforms (Supabase, Firebase) ARE external systems if the team doesn't own them
- Keep descriptions business-level, not technical
- Every `Rel()` should represent a runtime data exchange or user interaction

## Level 2 — Container

```plantuml
@startuml C4_Container
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

title Container Diagram — [System Name]

System_Boundary(system, "System Name") {
    Container(alias, "Name", "Tech", "Description")
    ContainerDb(alias, "Name", "Tech", "Description")
}

@enduml
```

**Rules:**
- A container is a separately deployable/runnable unit
- Do NOT split a single deployable into multiple containers (Next.js with API Routes = one container)
- Ask: "Can I deploy this piece independently?" If no — it's a component, not a container
- Include container technology in the element (e.g., "Next.js", "Supabase Edge Functions")

## Level 3 — Component (one file per container)

**One C3 diagram per container.** Each lives in its own subfolder under `docs/architecture/<container-slug>/c4-3-component.puml`. Do NOT put multiple containers' components in a single file.

### Flat container (e.g. backend services with worker components)

```plantuml
@startuml C4_Component_<ContainerName>
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

title Component Diagram — <Container Name>

System_Ext(...)
ContainerDb(db, "...", "...")

Container_Boundary(this_container, "<Container Name>") {
    Component(comp_a, "Name", "Tech", "Description")
    Component(comp_b, "Name", "Tech", "Description")
}

Rel(comp_a, comp_b, "...")
Rel(comp_a, db, "...")

@enduml
```

### Container with semantic modules (e.g. SPA with several feature areas)

When a container has multiple distinct feature areas, group its components into **modules** using `Boundary(alias, "Module Name", "Module")` nested inside the `Container_Boundary`:

```plantuml
@startuml C4_Component_WebAdmin
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

title Component Diagram — Web Admin

ContainerDb(db, "Database", "PostgreSQL")
Container(realtime, "Realtime", "Supabase Realtime")

Container_Boundary(admin, "Web Admin — Next.js SPA") {
    Boundary(auth_mod, "Auth", "Module") {
        Component(auth_page, "Auth Page", "React", "...")
    }

    Boundary(clients_mod, "Clients", "Module") {
        Component(client_list, "Client List", "React", "...")
        Component(chat_view, "Chat View", "React", "...")
        Component(notes_panel, "Notes Panel", "React", "...")
    }

    Boundary(kb_mod, "Knowledge Base", "Module") {
        Component(kb_editor, "KB Editor", "React", "...")
    }
}

@enduml
```

### Modules are NOT Containers

Strict C4 says a Container is a "separately deployable/runnable unit." Modules inside one SPA / one service share the same process and bundle — they are **components grouped semantically**, not containers.

- Don't promote modules to top-level containers in `c4-2-container.puml`
- Don't use `Container_Boundary` for nested modules — use `Boundary(..., "Module")` to make the type explicit

If something genuinely deploys independently (e.g. micro-frontend via Module Federation, separate Lambda), then it IS a container — promote it in C2 instead of grouping it as a module here.

### When to flat vs module-group

- **Flat** — backend services where components are workers with single responsibilities (webhook handler, RAG engine, message sender). Forcing module grouping adds noise.
- **Modules** — frontends / services with clear feature clusters (Auth / Clients / Knowledge Base / Settings). The grouping aids readability.

### C3 Rules

- One file per controlled container, in `<container-slug>/c4-3-component.puml`
- Show external systems / databases / sibling containers as `System_Ext`, `ContainerDb`, `Container` at the top of the file (not inside the boundary) so cross-container relations have endpoints
- Components are NOT separately deployable
- Show relationships between components, and to external systems / databases / sibling containers

---

## Deployment View (supplementary)

When the user wants to show **where things run**, generate `docs/architecture/c4-deployment.puml`. Deployment is a supplementary C4 view — not a numbered level.

```plantuml
@startuml C4_Deployment
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml

title Deployment Diagram — [System Name]

Person(...)
System_Ext(...)

Deployment_Node(vercel, "Vercel", "Edge Network / CDN") {
    Container(webapp, "Web Admin", "Next.js", "...")
}

Deployment_Node(supabase, "Supabase Cloud", "supabase.com") {
    Deployment_Node(edge_runtime, "Edge Functions Runtime", "Deno") {
        Container(edge_functions, "Bot Logic", "...", "...")
    }
    ContainerDb(db, "Database", "PostgreSQL", "...")
    Container(auth, "Auth", "Supabase Auth", "...")
    ...
}

Rel(...)

@enduml
```

**Rules:**
- Show hosting platforms (Vercel, AWS, Supabase Cloud, GCP) as `Deployment_Node`s
- Containers from C2 sit inside the deployment nodes that host them
- External SaaS providers (Telegram, OpenAI) stay as `System_Ext` at top level — we don't deploy there
- Nested deployment nodes are fine (e.g. Edge Functions Runtime inside Supabase Cloud)
- Keep relations consistent with C2 — same containers, same connections, just placed on infrastructure

---

## PlantUML General Rules

- Each .puml file must be self-contained and renderable independently
- Use meaningful IDs for elements (e.g., `webapp`, `db`, `webhook_handler` — not `a`, `b`, `c`)
- Include descriptions in all elements explaining their purpose
- Relationships must specify protocol/technology where applicable (e.g., "HTTPS", "SQL", "Webhook POST")
- Ensure consistency across levels: actors on Level 1 must be traceable through Levels 2–3
- Keep title and `@startuml` name unique per file (e.g. `@startuml C4_Component_BotLogic`)
- Write in the same language as the source documents (typically Russian for this project)

## ER diagram is NOT part of this skill

Do not generate ER diagrams. Use the `er-diagram` skill separately for database diagrams.

## Dynamic diagrams are NOT part of this skill

Do not generate dynamic / scenario diagrams here. Use the `dynamic-diagrams` skill — it produces numbered runtime flows per use case.

## File Placement

- If `docs/architecture/` exists, place files there
- Otherwise, create it
- Each controlled container gets its own subfolder under `docs/architecture/`

## Quality Checklist

Before finishing, verify:
- [ ] Level 1: All actors and external systems from spec are present
- [ ] Level 2: Only separately deployable units are containers
- [ ] Level 3: One file per controlled container, in `<container-slug>/c4-3-component.puml`
- [ ] Level 3: Modules used only for genuine feature-area grouping, via `Boundary(..., "Module")`
- [ ] Level 3: No module is also a top-level container in C2
- [ ] Deployment (if generated): containers placed inside the platforms that host them
- [ ] No managed/external services have component diagrams
- [ ] All files render independently
- [ ] Relationships are consistent across all levels

## What's Next

After the user reviews levels 1–3, suggest:

> Диаграммы уровней 1–3 готовы. Дальше можно:
> — `/c4-code` — code-диаграммы (уровень 4) по каждому компоненту
> — `/dynamic-diagrams` — динамические диаграммы (нумерованные сценарии) по юзкейсам из `docs/use-cases/`