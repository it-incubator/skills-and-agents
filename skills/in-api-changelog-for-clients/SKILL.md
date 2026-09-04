---
name: in-api-changelog-for-clients
description: Generate a dated API-change journal entry under docs/for-api-clients/ from recent backend commits — a delta log (added/changed/removed endpoints, contracts, errors) written in English for client AI agents (frontend or other backends) that already consume the API and need to make targeted changes. The journal is a pure changelog focused on what changed, not a full contract reference. Use after backend API changes to tell downstream clients what to adjust. Trigger phrases: "api changelog", "changelog for clients", "document api changes", "журнал изменений api", "апи ченджлог для клиентов", "задокументируй изменения api", "дельта api для фронта".
---

# API Changelog for Clients

## Purpose
Turn recent backend commits into a **delta journal** that downstream client agents read to make fast, targeted changes:

1. Each run produces one dated entry under `docs/for-api-clients/` describing **only what these commits changed** to the HTTP API — added / changed / removed endpoints, their contract deltas, new or changed errors, and links to the e2e tests that demonstrate usage.
2. The audience is an **AI agent that already consumes the API and has repository access** — it knows its own code and the existing contract. So the journal stays focused on the delta and on "what a consumer must account for", never re-derives the full endpoint reference.
3. The whole journal is surfaced to the project's docs system through **a single pointer entry** in `docs/INDEX.md` (best-effort) plus a `README.md` manifest inside the folder.

The document is always written in **English** (the contract audience is client agents); conversation with the user follows the user's language.

## Hard boundaries (locked policies)
- **Scope is the HTTP API contract only.** Report endpoint/route changes, request/response shape, status codes, errors, auth/permission changes. Ignore refactors, renames, formatting, and internal changes that do not cross the API boundary.
- **Delta, not full reference.** For a *new* endpoint the delta is the whole endpoint; for a *changed* endpoint report only what differs. Never restate an unchanged endpoint's full contract.
- **Client impact stays at contract level.** State whether a change is breaking and what a consumer must account for (new required field, changed response shape, removed field, new error). Do **not** prescribe frontend component/store/form changes — the backend does not know the client's internals.
- **Tests are referenced, never copy-pasted.** List the test file path and the `it/describe` names; the client opens the canonical file. No inline test bodies.
- **No commit.** Leave the diff for the user to review.
- If the analyzed delta contains **no API-facing change**, say so and do not create an empty entry.

## Steps

### 1. Determine repo root and target folder
Run `git rev-parse --show-toplevel` to find `<repo_root>`. The journal lives at `<repo_root>/docs/for-api-clients/` — create it if missing. This folder works even when the project has no docs system (see step 8 for `INDEX.md` integration).

### 2. Resolve the commit range (confirm before working)
Establish which changes to document:

- **If the user passed commits explicitly** — hashes, a range (`HEAD~3..HEAD`), or a PR number (resolve via `gh pr view <n> --json ...` when available) — use them directly.
- **Otherwise, auto-detect**: default to the current branch's delta against `main` (`git diff main...HEAD` plus `git log main..HEAD --oneline`). If the branch *is* `main`, fall back to the most recent commits that touch API surface.
- **Always confirm the scope before doing any work**: show the user the detected commit range and the API-relevant files/endpoints it touches, and ask "Documenting these changes — correct?". Proceed only after the user confirms. (When the user passed an explicit range, still echo what was understood, but you may proceed without a second confirmation.)

### 3. Detect the stack (NestJS-first, otherwise heuristic)
Endpoint recognition is stack-specific. Detect the framework from the repo (`package.json` deps, imports):

- **NestJS** (first-class): read `@Controller`, `@Get/@Post/@Put/@Patch/@Delete`, route params, DTO classes, `class-validator` decorators, and Swagger `@Api*`/`@ApiProperty` decorators to derive method, path, request/response shape, status codes, and errors precisely.
- **Any other backend** (Express, Fastify, Nest-less, non-JS): apply a general heuristic — find changed route handlers and their request/response usage — and **add a warning to the report** that the contract may be read imprecisely and should be spot-checked.

### 4. Extract the API delta from the diff
Work from the commit diff (`git diff <range>` restricted to controller/route/DTO files). For each affected endpoint classify the change and pull only what differs:

- **Added** — a new `METHOD /path`: document its full contract (this endpoint is entirely new to the client).
- **Changed** — an existing endpoint whose request body, query/path params, response shape, status codes, auth, or errors changed: document **only the difference** (e.g. "response gained `phone: string` (optional)", "`items` is now required in body", "`404` added when project missing").
- **Removed** — a deleted or renamed `METHOD /path`.

Decide **breaking vs non-breaking** per change (removed/renamed field or endpoint, new required input, narrowed type, changed status code → breaking; additive optional field → non-breaking) and roll up an entry-level flag.

### 5. Locate the demonstrating tests
For each changed/added endpoint, find the e2e tests that exercise it (search `test/`, `*.e2e-spec.ts`, or the project's test dir for the route/method). Record the **file path and the `it`/`describe` names** — not the bodies. If no test covers a new endpoint, note "no e2e test found" for that endpoint.

### 6. Write the journal entry
Create `docs/for-api-clients/YYYY-MM-DD-<kebab-slug>.md` (date = today; slug from the PR/branch/feature name — ask for a slug only if it is genuinely ambiguous). If a file with that name already exists (second run same day), disambiguate the slug rather than overwrite. Structure, in **English**:

```md
# API changes — <slug> (YYYY-MM-DD)

**Breaking:** yes | no
**Commits:** <range or hashes>

## POST /orders — Added
- Request body: `{ items: OrderItem[] (required), note?: string }`
- Response `201`: `{ id: string, status: "pending", ... }`
- Errors: `400` when `items` empty; `401` when unauthenticated.
- **Client impact:** new endpoint; call it to create an order. Non-breaking (additive).
- Tests: `test/orders.e2e-spec.ts`
  - `describe("POST /orders")` → `it("201 with created order")`, `it("400 when items empty")`

## GET /users/:id — Changed
- Response gained `phone: string | null`.
- **Client impact:** non-breaking; new optional field available to display.
- Tests: `test/users.e2e-spec.ts` → `it("returns phone in profile")`

## DELETE /orders/:id — Removed
- **Client impact:** breaking; stop calling this route.
```

Rules:
- Group by `METHOD /path`, tagged `Added` / `Changed` / `Removed`.
- Each change: the delta facts + one **Client impact** line at contract level + errors that are new/changed + test references.
- Include an `## Auth` note per endpoint only if permissions/auth changed.
- Keep it delta-focused — never restate unchanged parts of a changed endpoint.

### 7. Update the folder manifest
Maintain `docs/for-api-clients/README.md` — the folder's own index (one `INDEX.md` entry covers the whole folder, so this manifest is how a client navigates it). Prepend the new row so the newest entry is on top:

```md
---
type: api
status: active
system: <system/module>
answers:
  - what API changes were recently shipped for clients
  - which endpoints changed and whether the change is breaking
last_reviewed: YYYY-MM-DD
---

# API Changelog for Clients

Delta journal of backend API changes for client agents (frontend / other backends).
Newest first. Each row links a dated entry describing only what those commits changed.
Maintained by `/in-api-changelog-for-clients`.

| Date | Endpoints | Breaking | Entry |
| --- | --- | --- | --- |
| 2026-09-05 | POST /orders, GET /users/:id, DELETE /orders/:id | yes | [orders-and-users](2026-09-05-orders-and-users.md) |
```

The `README.md` carries a light `type: api` frontmatter (values in the project's doc language) so it is a legal doc under the single index entry; the individual dated entries carry **no** frontmatter.

### 8. Wire the journal into `docs/INDEX.md` (best-effort)
The skill is self-sufficient — the journal is valuable on its own. Integrate with the docs system only if it exists:

- **If `docs/INDEX.md` exists**: ensure a single pointer entry exists (add it if missing; do not add one row per journal file). Place it under `### Api`, written in the language of the existing index:

  ```md
  #### docs/for-api-clients/README.md
  - summary: API change journal for client agents — delta of recently shipped API changes
  - system: <system/module>
  - answers: what API changed recently for clients; which endpoints changed and whether breaking
  - entities: <primary endpoints/resources>
  ```

  If the `system` is new, add a line to `## Domains`.
- **If `docs/INDEX.md` does not exist**: skip index integration and note it in the report — do **not** pull in `/in-docs-audit`. The folder + `README.md` manifest still stand on their own.

### 9. Report
Print a summary:

```
Range: <commits> (confirmed with user: yes)
Stack: NestJS (precise) | <other> (heuristic — contract may be imprecise, verify)
Endpoints: added A, changed C, removed R  — breaking: yes/no
Entry: docs/for-api-clients/YYYY-MM-DD-<slug>.md
Manifest: docs/for-api-clients/README.md — row prepended
Index: docs/INDEX.md pointer added/updated | skipped (no docs system)
Notes:
- <endpoints with no e2e test / heuristic warnings / anything the user should verify>
```

Do NOT commit — leave the diff for the user to review.
