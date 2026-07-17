# Detect: profile any NestJS project into the placeholder table

Every template in `templates/` contains `{{PLACEHOLDER}}` tokens. Resolve them **once** here, then reuse. This is what makes the skill work on any project instead of only the monorepo it was distilled from.

## Placeholder table (fill this)

| Placeholder | Meaning | How to find it | Example (single app) | Example (monorepo) |
|---|---|---|---|---|
| `{{PM}}` | package manager | lockfile: `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, else npm | `npm` | `pnpm` |
| `{{APP_PATH}}` | app root (holds `main.ts`, `app.module.ts`), relative to repo root | find `main.ts` | `.` | `apps/core-api` |
| `{{APP_NAME}}` | short slug for containers + script name | folder name / package name | `api` | `core-api` |
| `{{ROOT_DIR_REL}}` | from `{{APP_PATH}}/test/` up to repo root | count segments | `..` | `../../..` |
| `{{ROOT_DIR_REL_FROM_HELPERS}}` | from `{{APP_PATH}}/test/helpers/` to app root (holds `src/`) | count segments | `../..` | `../..` |
| `{{APP_SETUP_IMPORT}}` | import path of the reusable bootstrap fn, if any | read `main.ts` | `../../src/app-setup` | `@app/.../app-setup` |
| `{{TEST_REGEX}}` | Jest testRegex for e2e specs | based on APP_PATH | `.e2e-spec.ts$` | `apps/core-api/test/.*\\.e2e-spec\\.ts$` |
| `{{ORM}}` | `typeorm` or `mongoose` | deps + `app.module` imports | `typeorm` | `typeorm` |
| `{{DB}}` | `postgres` or `mongo` | ORM + docker-compose image | `postgres` | `postgres` |
| `{{DB_NAME}}` | logical DB name | dev compose / env | `myapp` | `core_api` |
| `{{DEV_DB_PORT}}` | dev DB host port | dev docker-compose `ports:` | `5432` | `55434` |
| `{{TEST_DB_PORT}}` | test DB host port = **dev + 1** | compute | `5433` | `55435` |
| `{{PG_EXTENSIONS}}` | extensions to recreate after DROP SCHEMA | see below | `uuid-ossp` | `uuid-ossp` |
| `{{DATA_SOURCE_IMPORT}}` | import of the TypeORM CLI DataSource (migrations) | find `data-source.ts` | `../../src/data-source` | `@app/.../data-source` |
| `{{SCHEMA_STRATEGY}}` | `runMigrations` or `synchronize` | migrations present? | `synchronize` | `runMigrations` |
| `{{APP_SETUP}}` | reusable bootstrap fn (or `inline`) | read `main.ts` | `inline` | `appSetup` |
| `{{GLOBAL_PREFIX}}` | global route prefix | `app.setGlobalPrefix(...)` in `main.ts` | `api` | `api/v1` |
| `{{HAS_AUTH_GUARD}}` | global `APP_GUARD`? → needs auth mock | grep `app.module` | `no` | `yes` |

## Detection commands

Run from the repo root. Adapt paths to what you find.

```bash
# Package manager
ls pnpm-lock.yaml yarn.lock package-lock.json 2>/dev/null

# App root(s): every main.ts that bootstraps Nest
grep -rl "NestFactory.create" --include=main.ts . 2>/dev/null

# Monorepo signals
cat nest-cli.json 2>/dev/null            # "projects" map → monorepo
ls apps packages pnpm-workspace.yaml 2>/dev/null

# ORM / DB
grep -E '"(typeorm|@nestjs/typeorm|mongoose|@nestjs/mongoose)"' package.json

# Bootstrap: what main.ts does (prefix, pipes, filters, reusable setup fn)
sed -n '1,80p' <APP_PATH>/src/main.ts

# Global guards → auth mock needed
grep -rn "APP_GUARD" <APP_PATH>/src

# Dev DB port + name
cat <existing docker-compose.yml>

# TypeORM CLI DataSource (migrations)
grep -rl "new DataSource" <APP_PATH>/src

# Live check of PG extensions (if the dev DB is up)
# psql "$POSTGRES_URL" -c "SELECT extname FROM pg_extension;"
```

## Which PG extensions to recreate

`DROP SCHEMA public CASCADE` also drops extensions living in that schema, so `global-setup` must recreate them before migrations:

- `uuid-ossp` — entities use `@PrimaryGeneratedColumn('uuid')` (TypeORM default `uuid_generate_v4()`).
- `pgcrypto` — `gen_random_uuid()` / crypto functions.
- `pg_trgm`, `unaccent` — trigram / accent-insensitive search.

If unsure, query the running dev DB: `SELECT extname FROM pg_extension;` and list every non-default one.

## Monorepo vs single app — the two shapes

**Single app** (`main.ts` at `src/main.ts`, repo root = app root):
- `{{APP_PATH}}` = `.`, `{{ROOT_DIR_REL}}` = `..`, `{{TEST_REGEX}}` = `.e2e-spec.ts$`.
- `test/` lives at `test/`. `tsconfig.json` at repo root.

**Monorepo** (Nest workspace, app at `apps/<app>`):
- `{{APP_PATH}}` = `apps/<app>`, `{{ROOT_DIR_REL}}` = `../../..` (from `apps/<app>/test/` to root).
- `rootDir` in Jest config points at the repo root so path aliases (`@app/...`) resolve.
- `{{TEST_REGEX}}` scopes to that app: `apps/<app>/test/.*\\.e2e-spec\\.ts$`.

## Confirm before writing

Show the user the resolved profile (app, DB + ports, ORM, schema strategy, whether an auth mock is needed) in one short message. Correcting a wrong app/port here is far cheaper than after files are written.
