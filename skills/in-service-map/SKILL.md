---
name: in-service-map
description: Scan a single project (backend or frontend) and emit a machine-readable service-map.yaml — the endpoints it exposes, the outbound HTTP calls and message-broker topics it depends on, and identity/ArgoCD anchors — as a per-project fingerprint that a later cross-project graph builder stitches into a dependency graph. Use when the user says "service map", "scan endpoints", "map dependencies", "build service map", "карта сервиса", "просканируй эндпоинты", "собери зависимости проекта", "карта зависимостей проекта", "отпечаток сервиса".
---

# Service Map (per-project dependency fingerprint)

## Purpose
Run this on **one** repository. It produces a single machine-readable file
`docs/dependencies/service-map.yaml` that captures, for every deploy-unit in the repo:

- **`self`** — the service's identity (repo slug, kind, stack, domain summary/terms, ArgoCD app + real prod hosts).
- **`exposes`** — HTTP-family endpoints the service serves (backend only).
- **`consumes`** — outbound HTTP dependencies, **grouped by target service**, each with a proposed name/description, a confidence level, raw `evidence`, and — when ArgoCD is available — a `resolved_repo` that turns the fuzzy dependency into an exact graph edge.
- **`events`** — message-broker topics the service publishes and consumes.

The **only consumer of this file is another agent** (a future `in-service-graph` skill) that reads the
`service-map.yaml` of ~100 repos plus the ArgoCD repo and builds/visualizes the whole dependency graph.
There is **no single reliable key** across projects — every project names the same dependency differently
(different env vars, adapter classes, base URLs; real addresses only exist in staging/prod). So this skill's
job is to emit a rich **fingerprint** that a downstream agent can match **probabilistically**, anchored by
repo slug and — where possible — ArgoCD-resolved hosts.

Optimize for machine consumption and matchability, not for human reading. Humans will not open this file.

## Design decisions (locked)
- **Scope**: HTTP-family (REST / GraphQL / gRPC) in both directions **+** message-broker publish/consume as graph edges. DB / cache / other integrations are out of scope (mention only if they surface as an external SaaS host).
- **Linking is probabilistic**, not key-based — but anchored by `self.repo` (repo slug) and ArgoCD `host → app → repo` resolution.
- **Source of signals**: the project's code + config, **plus** an optional locally-cloned ArgoCD repo (GitOps manifests with prod env values and ingress hosts).
- **Grouping**: `consumes` is grouped **by target service**; raw `evidence` is always retained so the graph skill can re-cluster.
- **Fully automatic**: the only interactive moment is asking for the ArgoCD path at the start. External-service names/descriptions are proposed automatically with a `confidence` level — never prompt per service.
- **Monorepo-aware**: top-level `services:` is always an array (one element for a normal single-service repo).
- **Output**: `docs/dependencies/service-map.yaml`, **fully overwritten** each run. English keys and values (`description`/`domain_summary`); final report to the user in Russian. Not registered in `docs/INDEX.md` — it is machine data, not a routing doc.

## Output schema

```yaml
# docs/dependencies/service-map.yaml
schema_version: 1
generated_at: 2026-08-27          # today
generated_by: in-service-map
repo: git@github.com:acme/payments.git    # git remote of THIS repo — shared strong anchor
argocd:                                    # null if ArgoCD path not provided
  repo_path: /Users/dev/argocd
  resolved: true                           # false if repo given but this app/hosts not found

services:                                  # always an array; one element per deploy-unit
  - self:
      slug: payments-api                   # unique within the repo
      root: apps/payments-api              # path inside the repo (monorepo); "." for single-service
      name: Payments API                   # proposed human name
      kind: backend                        # backend | frontend | worker | lib
      stack: [NestJS, TypeScript, Postgres]
      domain_summary: >                    # semantic anchor for cross-project matching
        Charges customers, stores transactions, integrates with Stripe.
      domain_terms: [payment, charge, refund, invoice, customer]
      argocd:
        app: payments-api-prod
        manifest_path: apps/payments/prod/values.yaml
        hosts: [payments.internal.acme.io] # real prod hostnames from ArgoCD

    exposes:                               # [] for frontend / lib
      - protocol: rest                     # rest | graphql | grpc
        method: POST                       # for graphql use operation type; for grpc the RPC name
        path: /api/v1/charges
        auth: bearer                       # bearer | none | basic | apikey | unknown
        summary: Create a charge
        source: apps/payments-api/src/charges/charges.controller.ts

    consumes:                              # outbound HTTP deps, grouped by target service
      - target_slug: stripe                # proposed
        kind: external-saas                # internal-service | external-saas | unknown
        confidence: high                   # high | medium | low
        description: Payment processor (Stripe API).
        resolved_repo: null                # set to a repo slug when ArgoCD maps host -> repo
        evidence:
          env_vars: [STRIPE_API_KEY, STRIPE_BASE_URL]
          adapters: [StripeGateway]
          hosts: [api.stripe.com]          # literal in code, or resolved from ArgoCD env value
          endpoints:
            - {method: POST, path: /v1/charges}
          domain_terms: [charge, payment_intent]
          source: apps/payments-api/src/infra/stripe/

    events:
      publishes:
        - broker: kafka                    # kafka | rabbitmq | sqs | nats | ...
          topic: payments.charge.succeeded # topic/exchange/queue — shared key across projects
          event: ChargeSucceeded
          source: apps/payments-api/src/charges/charge.publisher.ts
      consumes:
        - broker: kafka
          topic: orders.order.created
          handler: OnOrderCreated
          source: apps/payments-api/src/listeners/order.listener.ts
```

`confidence` semantics: `high` = ArgoCD-resolved or an unambiguous literal host/SDK; `medium` = strong local
signal (dedicated adapter + env prefix) but target not resolved; `low` = a guess from scattered signals.

## Steps

### 1. Locate repo and ask for ArgoCD (only interactive step)
- `git rev-parse --show-toplevel` → repo root; read the `origin` remote for `repo`.
- Ask the user **once**:
  > Укажите путь к локально склонированному ArgoCD-репозиторию (манифесты с прод-env и ingress-хостами). Если его нет — ответьте «нет», соберу карту только по коду.
- If a path is given, verify it looks like an ArgoCD/GitOps repo (Argo `Application` manifests / `values.yaml` with env + ingress). If it does not, warn and continue **without** ArgoCD.
- If no path (or invalid): set `argocd: null`, skip all resolution phases, keep the code-only scan fully working.

### 2. Determine service boundaries (ArgoCD-first, structural fallback)
1. **ArgoCD-first** — if an ArgoCD path is available, find every Argo `Application` whose source repo equals this repo. Each such app = one service; its `path` / `values` define the service's root folder. Attach the app name, manifest path, and ingress `hosts` to that service.
2. **Structural fallback** — if no ArgoCD or no matching app: detect deploy-units by workspace config (`pnpm-workspace.yaml`, `package.json` workspaces, Nx/Turbo), `apps/*` / `packages/*`, or standalone `Dockerfile` / `package.json` / `go.mod` / `pom.xml`.
3. **Monolith last resort** — if nothing splits, treat the whole repo as one service (`root: "."`) and note in the report that boundaries were not found.

Do this once; every later step runs **per service**, scoped to that service's `root`.

### 3. Scan `exposes` (backend only)
Within each service root, find served HTTP-family endpoints — framework-agnostic:
- REST: route decorators/registrations (`@Controller`/`@Get`/`@Post`, Express/Fastify routers, Flask/FastAPI/Django routes, Spring `@RequestMapping`, Go handlers), or an OpenAPI/Swagger spec if present.
- GraphQL: schema SDL / resolvers (record operation type + field as `method`/`path`).
- gRPC: `.proto` services + RPCs.
Record method, full path (with prefix/version), auth requirement, a one-line summary, and `source`.
Frontends / libs with no served endpoints → `exposes: []`.

### 4. Scan `consumes` (outbound HTTP), grouped by target service
Find outbound HTTP calls: `fetch`/`axios`/`got`/`HttpClient`, generated SDK clients, `requests`/`httpx`,
Feign/RestTemplate/WebClient, Go `http.Client`, etc.
**Group calls into one target service** using local context — a dedicated adapter/gateway class, a shared
env-var prefix (`PAYMENTS_*`), a common base-URL constant, a folder like `infra/<service>/`.
For each target service record: proposed `target_slug`, `kind`, `confidence`, `description`, and full
`evidence` (env vars, adapter class names, literal hosts, called endpoints, domain terms, source paths).
**Always keep `evidence`** even when grouping is confident — the graph skill re-checks it.

### 5. Scan `events` (message brokers)
Detect broker clients (Kafka/RabbitMQ/SQS/NATS/…): producers/publishers vs consumers/subscribers/handlers.
Record `broker`, `topic` (topic/exchange/queue — the shared key across projects), the event/handler name, and
`source`. Split into `events.publishes` and `events.consumes`.

### 6. ArgoCD resolution (best-effort; skipped if no ArgoCD)
This is the phase that turns fuzzy dependencies into exact graph edges. It must **never** break the code-only scan.
1. Build once, from the ArgoCD repo, an index `host → ingress → app → source-repo`.
2. For each service, fill `self.argocd.hosts` from its own app's ingress.
3. For each `consumes` target: read this service's ArgoCD env values to resolve outbound env vars
   (e.g. `PAYMENTS_SERVICE_URL`) to a real host, then look that host up in the index to get the target's
   source repo. On success set `consumes[].resolved_repo` and raise `confidence` to `high`; add the host to
   `evidence.hosts`. If any link in the chain breaks, leave `resolved_repo: null` and keep the evidence.

### 7. Auto-name and describe (no prompting)
For every `consumes` target and each `self`, propose `name`/`target_slug`/`description`/`domain_terms`
automatically from the collected signals. Never ask the user to confirm names. Express all uncertainty
through `confidence`, not through questions.

### 8. Write the file (full overwrite)
Write `docs/dependencies/service-map.yaml` (create `docs/dependencies/` if missing), fully replacing any
prior version. English keys and values. Do **not** register it in `docs/INDEX.md`.

### 9. Report (Russian)
Print a short summary and do **not** commit:

```
Репозиторий: <repo slug>
ArgoCD: подключён (<path>) | не использован
Сервисы: N  (разбивка: ArgoCD | структура | монолит — <как поделили>)
Эндпоинты (exposes): E
Исходящие зависимости (consumes): C  — дорезолвлено до репы: R, low-confidence: L
События: P publish / S consume
Файл: docs/dependencies/service-map.yaml (перезаписан)
```

## Trigger phrases
English: "service map", "scan endpoints", "map dependencies", "build service map", "service fingerprint".
Russian: «карта сервиса», «просканируй эндпоинты», «собери зависимости проекта», «карта зависимостей проекта», «отпечаток сервиса».
