---
name: in-nestjs-e2e
description: Scaffold a complete E2E test layer for a NestJS project from scratch — test docker-compose (isolated test DB), .env.testing, Jest E2E config, the helper layer (global-setup schema reset, init-settings with the supertest anti-flake fix, dynamic DB cleanup), the TestManager + response-schema pattern, and real CRUD/validation/auth specs. Works on any NestJS project (single app or monorepo, TypeORM/Postgres or Mongoose/Mongo). Use when the user says "write e2e tests", "e2e tests for nestjs", "scaffold e2e", "create test layer", "add e2e infrastructure", "напиши e2e тесты", "создай e2e тесты", "сделай тестовый слой", "e2e с нуля", "подними тестовую базу для e2e", "докер-компоуз для тестов".
---

# Skill: Scaffold NestJS E2E Test Layer From Scratch

## Purpose

Stand up a production-grade E2E test layer for a NestJS project where none (or only a broken one) exists. On completion the project has:

- a **test docker-compose** with an **isolated test database** (never touches dev data);
- **`.env.testing`** with system/infra values;
- a **Jest E2E config** wired to the app;
- a **helper layer**: one-shot schema reset (`global-setup`), app boot (`init-settings`) that already contains the supertest anti-flake fix, dynamic DB cleanup (`delete-all-data`);
- the **TestManager** HTTP-wrapper pattern + **response-schema** structural checks;
- **real specs** — health check plus CRUD / validation / conflict / not-found / auth per resource;
- a `test:e2e` **runner script** with `--runInBand`.

This architecture is the **reference**. Even if the project already has ad-hoc e2e tests written differently, new tests follow this design.

## How this skill is organized (read on demand — progressive disclosure)

Keep `SKILL.md` in context; open a reference doc only for the step you're on.

- `references/detect.md` — how to profile any project (package manager, app root, ORM/DB, bootstrap fn, data source, dev DB port, global guards) into the placeholder table every template needs.
- `references/infrastructure.md` — docker-compose test DB, `.env.testing`, Jest config, package.json script.
- `references/helpers.md` — `global-setup`, `init-settings` (+ the anti-flake explainer), `delete-all-data`, TestManager, response-schemas, auth mock.
- `references/writing-tests.md` — spec structure, what to test, overriding business settings, schema validation, the final checklist.
- `references/flaky-supertest.md` — deep dive on the supertest listen/close race that `init-settings` fixes (and how to verify).
- `templates/` — copy-paste-ready files. Every `{{PLACEHOLDER}}` is resolved from the profile in Step 0.

## Input

The user points the skill at a NestJS project (the current repo, or a specific app inside a monorepo). If the target app is ambiguous in a monorepo, ask **which app** with `AskUserQuestion` before scaffolding. Optionally the user names specific resources/controllers to cover first; otherwise cover the main controllers found.

## Steps

### 0. Profile the project → resolve placeholders

Do this first — every template depends on it. Open `references/detect.md` and fill the placeholder table. In short, determine and record:

- **Package manager** (`pnpm` / `npm` / `yarn`) — from the lockfile.
- **App root `{{APP_PATH}}`** and short **`{{APP_NAME}}`** — where `main.ts` + `app.module.ts` live. Single app → `.`; monorepo → `apps/<app>`.
- **`{{ROOT_DIR_REL}}`** — relative path from `{{APP_PATH}}/test/` up to the repo root (single app: `..`; nested monorepo: `../../..`).
- **ORM / DB** — TypeORM+Postgres or Mongoose+Mongo (from deps + `app.module` imports). Drives which `global-setup` / `delete-all-data` / docker-compose variant to use.
- **Bootstrap function** — read `main.ts`. Record the global prefix, `ValidationPipe`, global filters/interceptors, and whether there's a reusable `appSetup(app)` / `setupApp(app)` you can call from `init-settings` (preferred). If it's all inline in `main.ts`, replicate the same calls inline in `init-settings`.
- **Migrations vs synchronize** — is there a TypeORM CLI `DataSource` (e.g. `data-source.ts`) with migrations? Then `runMigrations()`. Otherwise `synchronize()`.
- **PG extensions** — `SELECT extname FROM pg_extension;` on the dev DB, or infer (`uuid-ossp` for `@PrimaryGeneratedColumn('uuid')`, `pgcrypto` for `gen_random_uuid()`, `pg_trgm`/`unaccent` for search).
- **Dev DB port `{{DEV_DB_PORT}}`** — from the dev docker-compose. Test port `{{TEST_DB_PORT}} = dev + 1`.
- **Global auth guards** — any `APP_GUARD` in `app.module`? If yes, you'll need an auth mock (see `references/helpers.md` → "Auth mock").

Confirm the resolved profile with the user in one short message before writing files (especially app choice, DB port, ORM).

### 1. Infrastructure

Open `references/infrastructure.md`. Create / patch, using resolved placeholders:

1. `{{APP_PATH}}/docker-compose.test.yml` — isolated test DB on `{{TEST_DB_PORT}}` (from `templates/docker-compose.test.yml`).
2. `{{APP_PATH}}/.env.testing` — copy `.env.production`/`.env.example` as a template; fill system/infra values; point `POSTGRES_URL`/`MONGO_URL` at the test DB. **Do not** override business settings here.
3. `{{APP_PATH}}/test/jest-e2e.ts` — from `templates/jest-e2e.ts` (path aliases + `globalSetup`).
4. `package.json` → `"test:e2e:{{APP_NAME}}"` script with **`--runInBand`** (required — the suite shares one DB).

### 2. Helper layer

Open `references/helpers.md`. Create under `{{APP_PATH}}/test/helpers/`:

1. `global-setup.ts` — DROP SCHEMA + CREATE EXTENSION + migrations/synchronize (Postgres) or drop database (Mongo). Runs **once** per run. First line must be `import 'tsconfig-paths/register';`.
2. `init-settings.ts` — boots the Nest app per file, applies the bootstrap setup, and calls `preListenHttpServerOnce(app)` after `app.init()` (the anti-flake fix — see `references/flaky-supertest.md`).
3. `delete-all-data.ts` — dynamic TRUNCATE (Postgres) / dropDatabase (Mongo), called in `beforeEach`.

### 3. TestManager + schemas (+ auth mock if guarded)

Still in `references/helpers.md`. Per main resource create `test/helpers/<resource>-test-manager.ts` (HTTP wrapper with an `expectedStatus` param so one method drives both happy-path and error cases). Add `test/helpers/response-schemas.ts`. If the app has a global auth guard, add `test/helpers/auth-mock.ts` and wire it into `init-settings`.

### 4. Write the specs

Open `references/writing-tests.md`. Create `{{APP_PATH}}/test/app.e2e-spec.ts` (health/public endpoint) first as a smoke test, then per resource a `<resource>.e2e-spec.ts` covering: happy-path CRUD, validation (422), conflict (409), not-found (404), auth (401/403), and at least one response-schema check. Isolate tests with `beforeEach(deleteAllData)`.

### 5. Boot the DB, run, stabilize

1. Start the test DB: `docker compose -f {{APP_PATH}}/docker-compose.test.yml up -d`.
2. Run: `<pm> test:e2e:{{APP_NAME}}`.
3. Fix failures until green. If any endpoints/DTOs are unknown, read the controllers rather than guessing.
4. **Flakiness gate:** run the suite ~15–20× (`references/flaky-supertest.md` has the loop). It must pass ≥19/20. If it flakes with cascading 401/404/`Parse Error: Expected HTTP/`, confirm `preListenHttpServerOnce` is present and called after `app.init()`.

### 6. Report

Summarize: files created, the run command, the docker-compose up command, coverage added, and the pre-flight checklist state from `references/writing-tests.md`. Do **not** commit unless the user explicitly asks.

## Locked policies

- **Isolated test DB, always.** Test DB port = dev port + 1, separate container/volume. Schema is DROP/CREATE'd per run; tables TRUNCATE'd per test. Never point tests at the dev DB.
- **`--runInBand` is mandatory.** The suite shares one DB; parallel workers would wipe each other's data mid-test.
- **Business settings match production.** Never override intervals/limits/prices in `.env.testing`; override per-test via `overrideProvider(<Config>)` in `init-settings`. See `references/writing-tests.md`.
- **`init-settings` must pre-listen the HTTP server** (`preListenHttpServerOnce` after `app.init()`) — this is the supertest 7.x anti-flake fix, not optional.
- **Import supertest as `import * as request from 'supertest'`** unless the project enables `esModuleInterop`.

## Trigger phrases
- "write e2e tests", "e2e tests for nestjs", "scaffold e2e", "create the test layer", "add e2e infrastructure", "generate e2e from scratch", "docker-compose for tests"
- "напиши e2e тесты", "создай e2e тесты для nestjs", "сделай тестовый слой", "e2e с нуля", "подними тестовую базу для e2e", "докер-компоуз для тестов", "настрой e2e инфраструктуру"
