# Writing tests: structure, coverage, overrides, checklist

## Spec structure

```ts
import { INestApplication, HttpStatus } from '@nestjs/common';
import { initSettings } from '../helpers/init-settings';
import { UsersTestManager } from '../helpers/users-test-manager';
import { deleteAllData } from '../helpers/delete-all-data';
import { userDetailsSchema } from '../helpers/response-schemas';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let users: UsersTestManager;

  beforeAll(async () => {
    const result = await initSettings();
    app = result.app;
    users = new UsersTestManager(app);
  });

  afterAll(async () => {
    await app.close(); // closes the pre-listened server once
  });

  beforeEach(async () => {
    await deleteAllData(app); // isolate every test
  });

  describe('POST /users', () => {
    it('creates a user', async () => {
      const body = await users.createUser({ name: 'John', email: 'john@example.com' });
      expect(body.id).toBeDefined();
      expect(body.name).toBe('John');
    });

    it('422 on invalid email', async () => {
      await users.createUser({ name: 'John', email: 'nope' }, HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('409 on duplicate email', async () => {
      await users.createUser({ name: 'John', email: 'john@example.com' });
      await users.createUser({ name: 'John', email: 'john@example.com' }, HttpStatus.CONFLICT);
    });
  });

  describe('GET /users/:id', () => {
    it('returns the user, matching schema', async () => {
      const created = await users.createUser({ name: 'John', email: 'john@example.com' });
      const body = await users.getUser(created.id);
      expect(body).toMatchObject(userDetailsSchema); // structural contract
      expect(body.id).toBe(created.id);              // business value
    });

    it('404 when missing', async () => {
      await users.getUser('does-not-exist', HttpStatus.NOT_FOUND);
    });
  });
});
```

## What to test (per resource)

1. **CRUD happy paths** — create/read/update/delete succeed.
2. **Validation** — 422 on invalid payloads (relies on the same `ValidationPipe` as prod).
3. **Conflicts** — 409 on duplicates / broken business constraints.
4. **Not found** — 404 on missing resources.
5. **Auth** — 401/403 with no token / a bad token / wrong role.
6. **Business rules** — domain-specific invariants.
7. **Response schema** — at least one `toMatchObject(<schema>)`.
8. **Edge cases** — parallel requests (races), boundary values, pagination cursors.

Start with `app.e2e-spec.ts` hitting a public health endpoint — it proves the whole boot + DB + supertest wiring before you write resource specs.

## Overriding business settings per test

Business settings stay at production values in `.env.testing`. When a single test needs a different value, override the Config provider in `initSettings` — not the env:

```ts
import { HomeworksConfig } from '../../src/homeworks/homeworks.config';

const result = await initSettings((builder) => {
  builder.overrideProvider(HomeworksConfig).useValue({
    MAX_RETRIES: 0,
    SUBMISSION_COOLDOWN: 0,
  } as HomeworksConfig);
});
```

Same mechanism mocks external services: `builder.overrideProvider(PAYMENTS_PORT).useValue(fakePayments)`. This keeps every other test on real prod values and confines the change to the test that needs it.

## Mocking external I/O

Anything that leaves the process (payment APIs, object storage, email, other microservices, rate limiters) should be replaced with a fake via `overrideProvider` so the suite is deterministic and offline. Put fakes in `test/helpers/fake-*.ts`, each implementing the port/interface the app depends on.

## Unit tests still matter

E2E is necessary but not sufficient (slow, misses branches). Also unit-test: domain entity methods & state transitions, command/query handlers (mocked deps), services. Coverage priority: domain entities + command handlers + controllers first.

## Pre-flight checklist

**Infrastructure**
1. [ ] `docker-compose.test.yml` — isolated test DB on dev_port + 1, separate container/volume.
2. [ ] `.env.testing` — system/infra values; DB URL → test DB; no business overrides.
3. [ ] `test/jest-e2e.ts` — `pathsToModuleNameMapper` + `globalSetup` wired.
4. [ ] `test:e2e:<app>` script with `--runInBand`.
5. [ ] `global-setup.ts` — DROP SCHEMA + CREATE EXTENSION + migrations/synchronize, first line `import 'tsconfig-paths/register'`.
6. [ ] Every needed PG extension listed in `global-setup.ts`.
7. [ ] `init-settings.ts` — boot only (no schema reset), bootstrap setup applied, `preListenHttpServerOnce` after `app.init()`.
8. [ ] `delete-all-data.ts` — dynamic TRUNCATE / dropDatabase.
9. [ ] TestManager per resource.

**Test quality**
10. [ ] Tests isolated via `beforeEach(deleteAllData)`.
11. [ ] Negative scenarios use `expectedStatus`.
12. [ ] Business settings overridden via Config-provider override, not `.env.testing`.
13. [ ] `response-schemas.ts` exists; each e2e file has ≥1 schema test.
14. [ ] External I/O mocked via `overrideProvider` + fakes.
15. [ ] Suite passes ≥19/20 runs (flakiness gate — `references/flaky-supertest.md`).
