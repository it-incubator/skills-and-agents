# Helper layer: schema reset, app boot, cleanup, TestManager, schemas, auth mock

Reference test layout under `{{APP_PATH}}/test/`:

```
test/
├── helpers/
│   ├── global-setup.ts            # DROP SCHEMA + extensions + migrations (once per run)
│   ├── init-settings.ts           # boot Nest app per file (+ anti-flake pre-listen)
│   ├── delete-all-data.ts         # TRUNCATE / dropDatabase between tests
│   ├── <resource>-test-manager.ts # HTTP wrapper per resource
│   ├── response-schemas.ts        # structural response contracts
│   └── auth-mock.ts               # only if the app has a global auth guard
├── app.e2e-spec.ts                # health / smoke
└── <resource>.e2e-spec.ts
```

Templates: `templates/global-setup.ts`, `init-settings.ts`, `delete-all-data.ts`, `example-test-manager.ts`, `response-schemas.ts`, `auth-mock.ts`.

---

## global-setup.ts — schema reset once per run

Recreates the public schema **once** per `test:e2e` run via Jest `globalSetup` (not per file). Between tests we `TRUNCATE` instead (faster, schema is stable within a run).

**Why DROP SCHEMA, not just TRUNCATE:** guarantees a clean schema every run — no leftover tables/enums/sequences from old branches or removed entities. The container survives runs (fast start); each run logically sees a freshly built schema.

**Why globalSetup, not `beforeAll`:** `beforeAll` is scoped to a file's `describe` → the reset would run N times (once per spec file) even with `--runInBand`. `globalSetup` runs exactly once.

**Why `import 'tsconfig-paths/register'` as the first line:** Jest globalSetup loads in a separate process and does **not** use the Jest `moduleNameMapper`. Without registration, `@app/...` aliases throw `Cannot find module`. Registration must precede any aliased import (TS keeps import order).

**Why the CLI `DataSource`:** it's the same one TypeORM's `migration:run` uses — it knows entity/migration paths and loads `.env.testing` via dotenv. For synchronize-only projects (no migrations), swap `runMigrations()` for `synchronize()` (`{{SCHEMA_STRATEGY}}`).

**Mongo:** no schema — `global-setup` just connects and `dropDatabase()`; between tests `delete-all-data` drops it again (or clears collections). See the Mongo block in the templates.

## init-settings.ts — boot the app per file (+ anti-flake)

Assembles the `TestingModule` and boots the app. The schema reset already happened in `global-setup`, so this only:

1. optionally installs the auth mock (if a global guard exists — see below);
2. **dynamically** imports `AppModule` (so `overrideProviders` applies to a fresh graph, not a cached one);
3. builds + compiles the testing module, applying any `overrideProviders` callback;
4. applies the project's bootstrap setup — call the reusable `{{APP_SETUP}}(app)` if one exists, otherwise replicate `main.ts` inline (global prefix, `ValidationPipe`, global filters/interceptors). **Tests must exercise the same pipeline as prod**, or validation/serialization behaviour diverges;
5. if the graph has a `@WebSocketGateway`, installs the matching WS adapter **before** `app.init()` (else Nest throws "No driver (WebSockets) has been selected");
6. `await app.init()`;
7. **`await preListenHttpServerOnce(app)`** — the supertest anti-flake fix (below);
8. returns `{ app }`.

### preListenHttpServerOnce — the anti-flake fix (non-optional)

supertest 7.x calls `app.listen(0)` before every request when the server isn't already listening, and `server.close()` right after. Parallel supertest calls (`Promise.all`) race on listen/close and corrupt the server → cascading 401/404 and `Parse Error: Expected HTTP/, RTSP/ or ICE/`. Pre-listening the server once (so `app.address()` is non-null) makes supertest skip its listen/close entirely; the server is closed once in `afterAll` via `app.close()`. Full diagnosis + verification loop: `references/flaky-supertest.md`.

```ts
const preListenHttpServerOnce = async (app: INestApplication): Promise<void> => {
  const httpServer = app.getHttpServer() as Server;
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, () => {
      httpServer.removeListener('error', reject);
      resolve();
    });
  });
};
```

## delete-all-data.ts — cleanup between tests

Called in `beforeEach`. **Dynamic** — never hardcode table names.

- **Postgres/TypeORM:** query `pg_tables` (schema `public`, excluding `migrations`) and `TRUNCATE ... CASCADE`.
- **Mongo/Mongoose:** `connection.dropDatabase()`.
- If the app already exposes a reset service (e.g. a dev-support `DatabaseResetService` behind a flag), wrap that instead of duplicating the SQL — single source of truth.

## TestManager pattern

An HTTP wrapper per resource. **Key idea:** an `expectedStatus` parameter (defaulted to the happy-path status) lets one method drive both success and error scenarios — `createUser(payload)` vs `createUser(bad, HttpStatus.UNPROCESSABLE_ENTITY)`. See `templates/example-test-manager.ts`. Managers also centralize auth headers / login (`loginAs`) so specs stay readable.

**Import supertest** as `import * as request from 'supertest'` unless the project enables `esModuleInterop` (default import fails under ts-jest without it).

## response-schemas.ts — structural contracts

Coarse structural checks with `expect.any()` + `toMatchObject()` — catch forgotten fields, mapping regressions, accidental nulls. Rules:
- required fields → `expect.any(String|Number|Boolean)`;
- arrays → `expect.any(Array)` or `expect.arrayContaining([itemSchema])`;
- enums → `expect.stringMatching(/^a$|^b$/)`;
- nullable fields → omit from the schema, assert separately (`toBeNull` / `toBeDefined`);
- nested objects → nested schemas.

Every e2e file should have at least one "matches expected response schema" test. Schemas **complement**, not replace, business-value assertions.

## Auth mock (only if `{{HAS_AUTH_GUARD}} = yes`)

If a global `APP_GUARD` protects routes, unauthenticated requests 401 before business logic. Two options:

1. **Real token path** (preferred when the app can mint test tokens): use a dev/token endpoint or sign a JWT with the test secret, set `Authorization: Bearer <token>`. Highest fidelity.
2. **Guard monkey-patch** (when tokens are awkward to mint): patch `<Guard>.prototype.canActivate` to accept mock claims and populate `req.user` with the same shape prod uses. Use a monkey-patch (not `overrideGuard`) when the guard is registered via `APP_GUARD: useClass` — Nest instantiates it outside the override, but all instances share the prototype. See `templates/auth-mock.ts`; install it at the top of `init-settings` (before `AppModule` import), and expose `loginAs(claims)` on the TestManager. Provide a `resetMockUser()` for `beforeEach`.

Whichever you pick, keep the **shape** of `req.user` identical to production so controllers behave the same.
