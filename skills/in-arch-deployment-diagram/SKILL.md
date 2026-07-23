---
name: in-arch-deployment-diagram
description: Generate a C4 Deployment diagram in PlantUML format — show how container instances are mapped onto physical / virtual / cloud infrastructure in a given environment (production, staging). Use when user asks to create a deployment diagram, infrastructure diagram, "where things run" view, or says "deployment diagram", "c4 deployment", "диаграмма развертывания", "диаграмма развёртывания", "деплой диаграмма", "инфраструктурная диаграмма", "где что развернуто".
---

# C4 Deployment Diagram Generator

Generate a C4 **Deployment** diagram in **PlantUML (.puml)** format for one environment. A deployment diagram maps the containers from your C2 (Container) diagram onto the **infrastructure** — physical machines, VMs, containers, serverless runtimes, managed cloud platforms — that runs them in a specific environment.

Requires an existing Container (C2) view or a clear understanding of the system's containers. If levels 1–3 don't exist yet, use the `c4-diagrams` skill first, then come back here.

## Core concept — read this before drawing anything

Three ideas govern what belongs on a deployment diagram. Getting these wrong produces a diagram that looks like C4 but violates the model.

### 1. Deployment is a supplementary view, NOT "Level 5"

The C4 model has **exactly four** hierarchical levels of static structure: **System Context (1) → Container (2) → Component (3) → Code (4)**. That is the whole hierarchy.

A Deployment diagram is **not a fifth level.** It is one of the three *supplementary* diagrams (alongside System Landscape and Dynamic diagrams) that show the architecture from a different angle. Never label it "Level 5", "C5", or slot it into the numbered hierarchy. In titles, filenames, and prose call it the **Deployment view / Deployment diagram**, and describe it as *supplementary*.

### 2. A container is a runtime construct — source code and CI/CD are NOT

In C4, a **container is strictly a runtime construct**: a running application, a running script, or a running data store — something that is *executing* and holds/processes data. The deployment diagram exists to show how **instances** of software systems and containers are distributed across physical, virtual, or cloud infrastructure **in a specific environment** (e.g. production).

Consequences:

- **Source code and a Git repository are NOT running instances of your system.** A GitHub repo has no runtime; it is not a container and must not appear as one on a deployment diagram.
- **CI/CD describes the *delivery* of code, not the *runtime* architecture.** A "GitHub → build → push image" pipeline is a delivery process, not something deployed onto the environment's infrastructure. Leave GitHub, the repository, and the build/deploy pipeline **off** the deployment diagram. (If the delivery pipeline itself must be documented, that is a separate CI/CD diagram, not this one.)

If you find yourself drawing a repo, a registry push, or a build step as part of the running environment — remove it.

### 3. External services you don't control are Software Systems, NOT your containers

Third-party services you **do not develop, own, or operate** (public HTTP APIs like Telegram Bot API, a currency API such as Frankfurter, OpenAI, Stripe) are **external software systems** — not your containers.

- Model them with `System_Ext` (or `System_Ext` placed via a deployment node representing "the internet / external", depending on which macros your `C4_Deployment.puml` version supports). **Never** wrap a third-party public API in a `Container(...)` macro — a `Container` inside your boundary claims it is a runtime unit *you* deploy and control.
- The **only** time an external/managed service is legitimately part of *your* architecture is when you have full control over your slice of it — e.g. your own schema in a managed Amazon RDS instance, or your own S3 bucket. Those are an integral part of what you deploy, so `Container` / `ContainerDb` inside the relevant `Deployment_Node` is correct.
- Rule of thumb: **Can we deploy, configure, and version it?** Yes → it can be our container inside a deployment node. No (it's someone else's public API) → `System_Ext`, outside our infrastructure nodes.

## Step 1 — Collect Source Documents

Ask the user to provide the container (C2) diagram and any infrastructure/hosting documentation. Say:

> Укажите ссылки на C2-диаграмму (контейнеры) и документы об инфраструктуре/хостинге (где что развёрнуто, какое окружение), на основе которых нужно построить диаграмму развёртывания.

If the C2 diagram or the infrastructure is already established in the current conversation, proceed with that — do not ask again.

## Step 2 — Analyze and Design

Identify:
- The **environment** this diagram describes (production, staging, …) — one diagram per environment.
- The **containers** from C2 that actually run in this environment (only units the team controls).
- The **infrastructure / hosting nodes** that run them: cloud platforms (Vercel, AWS, GCP, Supabase Cloud), VMs, Kubernetes clusters/pods, serverless runtimes, managed databases.
- **Instances / replicas** where relevant (e.g. "×3", load-balanced pool).
- **External software systems** the environment talks to at runtime (third-party APIs) — as `System_Ext`, outside your infra nodes.
- Explicitly **exclude**: source repos, CI/CD pipelines, and any third-party API drawn as a container (see Core concept above).

## Step 3 — Generate the Diagram

**Always PlantUML (.puml). Never Mermaid.**

Output file: `docs/architecture/c4-deployment.puml` (one per environment; suffix the env when there are several, e.g. `c4-deployment-production.puml`, `c4-deployment-staging.puml`).

```plantuml
@startuml C4_Deployment
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml

title Deployment Diagram — [System Name] ([Environment])

Person(user, "User", "...")

' External software systems — NOT our containers, live outside our infra nodes
System_Ext(telegram, "Telegram Bot API", "Third-party messaging API")
System_Ext(frankfurter, "Frankfurter API", "Third-party currency-rates API")

Deployment_Node(vercel, "Vercel", "Edge Network / CDN") {
    Container(webapp, "Web Admin", "Next.js", "...")
}

Deployment_Node(supabase, "Supabase Cloud", "supabase.com") {
    Deployment_Node(edge_runtime, "Edge Functions Runtime", "Deno") {
        Container(edge_functions, "Bot Logic", "Supabase Edge Functions", "...")
    }
    ContainerDb(db, "Database", "PostgreSQL", "...")
    Container(auth, "Auth", "Supabase Auth", "...")
}

Rel(user, webapp, "Uses", "HTTPS")
Rel(edge_functions, telegram, "Sends messages", "HTTPS")
Rel(edge_functions, frankfurter, "Fetches rates", "HTTPS")
Rel(webapp, db, "Reads/writes", "SQL")

@enduml
```

**Rules:**
- Show hosting platforms and runtimes (Vercel, AWS, GCP, Supabase Cloud, K8s pods, VMs) as `Deployment_Node`s.
- Place each C2 container **inside** the deployment node that hosts it, using `Container` / `ContainerDb` — but only for units the team controls (see Core concept #3).
- Nested deployment nodes are fine (e.g. Edge Functions Runtime inside Supabase Cloud; a pod inside a cluster).
- Third-party services stay as `System_Ext` **outside** your infrastructure nodes — never as `Container`.
- **No source repos, no Git, no CI/CD pipeline** on this diagram (see Core concept #2).
- Do not label the diagram as a numbered C4 level — it is supplementary (see Core concept #1).
- Keep containers and their connections consistent with C2 — same containers, same relationships, just placed on infrastructure. Every relationship should specify a protocol (HTTPS, SQL, gRPC, Webhook POST).
- Show instance counts / replicas where they matter to the architecture.
- Write in the same language as the source documents (typically Russian for this project).

## Technology labels are mandatory

Every `Container` / `ContainerDb` must carry an explicit implementation technology in its `"Tech"` slot (3rd argument) — `Next.js`, `Supabase Edge Functions`, `PostgreSQL`, `Node.js`, `Relational Database Schema`. Deployment nodes name the platform/runtime in their 2nd slot (`Vercel`, `Deno`, `Kubernetes Pod`). Never put an architectural-layer word (`business logic`, `application`, `infrastructure`, `domain`) in a tech slot.

## Validate Syntax by Rendering

After writing the `.puml`, render it to PNG to confirm the PlantUML syntax is valid — a file that fails to render is broken no matter how correct the source looks. C4 files pull in a remote `!include`, so a render is the only real syntax check.

1. Render every generated `.puml` to PNG, e.g. `plantuml -tpng docs/architecture/c4-deployment*.puml`. If PlantUML is not installed locally, fall back to any available renderer (Docker image `plantuml/plantuml`, the PlantUML server, etc.).
2. If a render fails, read the error, fix the `.puml` source, and re-render until it succeeds.
3. **Delete the generated PNG files once rendering succeeds** — they are only a syntax check, not an artifact of this skill. Leave only the `.puml` sources.

Never leave `.png` files behind.

## Register in the docs index (if the project uses one)

The `.puml` this skill produces is architecture documentation. If the project has adopted the docs-index convention (`docs/INDEX.md` — see the `in-docs-audit` / `in-docs-write` skills), register the diagram; otherwise an agent routing through `docs/INDEX.md` never sees it.

1. Find the repo root (`git rev-parse --show-toplevel`) and check whether **`docs/INDEX.md` exists**.
2. **If it does not exist** — the project does not use the convention. Leave the `.puml` source as generated; do not bootstrap an index. Done.
3. **If it exists** — apply the `in-docs-write` contract:
   - Insert a metadata header as a `'` comment block immediately after `@startuml`, with every field: `type: diagram`, `subtype: c4-deployment`, `status`, `system`, `entities`, `answers` (2–5 concrete questions the diagram answers), `related`, `source_files`, `last_reviewed` (today). Values in the project's documentation language; field names stay English.
   - Add or update the diagram's entry under `### Diagram` in `docs/INDEX.md`, carrying `subtype: c4-deployment`. If the diagram's `system` is new, add it to `## Domains`.
   - Index the file **in place** — never move a diagram just to register it.
4. Verify: the generated `.puml` has a complete header **and** a matching `docs/INDEX.md` entry.

## Quality Checklist

Before finishing, verify:
- [ ] The diagram is titled/described as a supplementary **Deployment** view — never as "Level 5" or a numbered level
- [ ] One diagram per environment; the environment is named in the title
- [ ] Every C2 container the team controls sits inside the `Deployment_Node` that hosts it
- [ ] Every `Container` / `ContainerDb` has an explicit technology in its `"Tech"` slot; no layer/abstraction words
- [ ] No source repository, Git, or CI/CD pipeline appears on the diagram
- [ ] Third-party services (Telegram, Frankfurter, OpenAI, …) are `System_Ext` outside the infra nodes — none wrapped in `Container`
- [ ] Managed services appear as our containers **only** where we fully control our slice (own RDS schema, own S3 bucket)
- [ ] Relationships match C2 (same containers/connections) and specify a protocol
- [ ] The `.puml` was rendered to PNG to verify syntax, and the PNG was deleted afterward
