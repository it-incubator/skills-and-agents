# Infrastructure: test DB, env, Jest config, runner script

All paths use the profile placeholders from `references/detect.md`.

## 1. Test database — `docker-compose.test.yml`

Isolated from dev so `DROP SCHEMA` in tests can never touch dev data. Test port = **dev port + 1**. Use `templates/docker-compose.test.yml` (Postgres) or its Mongo variant at the bottom of that file.

- **If a dev `docker-compose.yml` exists** — do **not** edit it. Add a separate `{{APP_PATH}}/docker-compose.test.yml` with only the test DB (and only the test infra a spec actually needs — Redis/Kafka only if realtime/broker specs exist).
- **If none exists** — create both a dev compose and the test compose, or at minimum the test compose.

Bring it up before running the suite:

```bash
docker compose -f {{APP_PATH}}/docker-compose.test.yml up -d
# down: docker compose -f {{APP_PATH}}/docker-compose.test.yml down
```

## 2. `.env.testing` — system/infra values only

Create `{{APP_PATH}}/.env.testing`. Copy `.env.production` (or `.env.example`) as the template, then:

```bash
NODE_ENV=testing
PORT={{DEV_PORT + 100}}
APP_GLOBAL_PREFIX={{GLOBAL_PREFIX}}
SERVICE_NAME={{APP_NAME}}
IS_SWAGGER_ENABLED=false

# Test DB — points at the isolated test container (dev port + 1)
POSTGRES_URL=postgresql://postgres:postgres@localhost:{{TEST_DB_PORT}}/{{DB_NAME}}_test
# (Mongo) MONGO_URL=mongodb://localhost:{{TEST_DB_PORT}}/{{DB_NAME}}_test

# Secrets — deterministic test values (≥32 chars where a length is enforced)
AUTH_SERVICE_SECRET=test-secret-key-for-jwt-validation-min-32-chars

# External service URLs — any localhost; they get mocked via overrideProvider in tests
FRONTEND_URLS=http://localhost:3000
```

**Rules:**
- Fill **system/infra** values (ports, DB URL, secrets, feature flags that gate test modules like `DEV_ENDPOINTS_ENABLED=true`).
- External API URLs → any localhost; they are mocked in tests via `overrideProvider`.
- **Do NOT override business settings** (`SCHEDULER_INTERVAL`, `MIN_PRICE`, `MAX_RETRIES`, …) — keep production values. If a specific test needs a different value, override the Config class per-test (see `references/writing-tests.md` → "Overriding business settings").
- Make sure `.env.testing` is git-ignored if it contains anything sensitive (test secrets usually are fine to commit — match the project's convention for other `.env.*`).

## 3. Jest E2E config — `{{APP_PATH}}/test/jest-e2e.ts`

Use `templates/jest-e2e.ts`. It:
- sets `rootDir` to the repo root so path aliases resolve;
- scopes `testRegex` to this app's e2e specs (`{{TEST_REGEX}}`);
- wires `globalSetup` to `helpers/global-setup.ts` (the once-per-run schema reset);
- maps `tsconfig` `paths` via `pathsToModuleNameMapper` (needed for `@app/...` aliases in monorepos; harmless otherwise).

A minimal `jest-e2e.json` (no aliases, single app) is also fine — the `.ts` form is preferred because it supports `globalSetup` + alias mapping cleanly.

## 4. Runner script — `package.json`

```json
"test:e2e:{{APP_NAME}}": "cross-env NODE_ENV=testing jest --config {{APP_PATH}}/test/jest-e2e.ts --runInBand --verbose"
```

- **`--runInBand` is mandatory** — the whole suite shares one DB; without it Jest spawns parallel workers and `deleteAllData` in one file wipes another file's rows mid-run.
- `cross-env` keeps `NODE_ENV=testing` working on Windows. If the project doesn't have it and the team is unix-only, `NODE_ENV=testing jest ...` is acceptable — match project convention.
- If `.env.testing` isn't auto-loaded by the app's config module, add `dotenv -e {{APP_PATH}}/.env.testing --` or an `env-cmd` prefix, matching how the app loads env elsewhere.
