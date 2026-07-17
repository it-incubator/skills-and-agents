# Deep dive: the supertest listen/close race (and how init-settings fixes it)

This is the single most common source of flaky NestJS e2e suites. `init-settings.ts` already contains the fix (`preListenHttpServerOnce`); this doc explains why, so you can recognize the symptom and verify the cure.

## Symptoms

One or more of these in a NestJS + supertest suite:

- Tests fail **rarely** and **inconsistently** — 401 instead of 200, 404 instead of 401, 200 instead of 409.
- Failures are **very fast** (4–20 ms) — before business logic runs.
- Logs show, at least once: `Parse Error: Expected HTTP/, RTSP/ or ICE/`.
- There's a test with parallel requests: `Promise.all([request(...)..., request(...)...])`.
- The failure **cascades** — not just that test, but subsequent tests in the same or neighboring suites fail too.
- Mocking HTTP services, disabling background intervals, and `--detectOpenHandles` do **not** help.

Any one of these ≈ this problem.

## Root cause

`supertest@7.x`, in the `Test` constructor:

```js
serverAddress(app, path) {
  const addr = app.address();
  if (!addr) this._server = app.listen(0);   // listen if not already listening
  ...
}
```

and in `end()`:

```js
if (server && server._handle) {
  return server.close((closeError) => { ... });  // close it back
}
```

So **every** supertest request opens and closes the http server. With parallel supertest calls (`Promise.all`), two instances call `listen(0)` then both `server.close()`. One response is cut off mid-transfer → the client's HTTP parser throws `Parse Error`. The server is left dirty and corrupts later fast requests.

## The fix

After `app.init()`, pre-listen the server once for the whole suite. Then `app.address()` is non-null, supertest skips its listen/close, and the server is closed once in `afterAll` via `app.close()`. No changes to the tests themselves.

```ts
import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';

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

// in initSettings, after `await app.init()` and before `return { app }`:
await preListenHttpServerOnce(app);
```

Keep it as a named helper next to `initSettings` so it's easy to find and remove once supertest fixes this upstream.

## Verify the fix

Run the suite 15–20× back to back:

```bash
for i in $(seq 1 20); do
  {{PM}} test:e2e:{{APP_NAME}} > /tmp/e2e-$i.log 2>&1
  echo "Run $i: exit=$?"
done
```

Before the fix: 20–40% of runs fail with 401/404/Parse Error. After: 19–20/20 pass (a lone 1/20 is usually unrelated OS-level noise).

## What does NOT help (don't waste time)

- Mocking HTTP clients / fire-and-forget services — removes log noise, not the cause.
- Disabling background `@Interval`/`SchedulerRegistry` — not the cause (still fine to reduce load).
- `keepAliveTimeout = 1` + `setKeepAlive(false)` — not a keep-alive issue.
- `--detectOpenHandles` — finds nothing (there's no leak), slows the run, creates timeout cascades.
- `--runInBand` — already required for DB isolation; changes nothing here.

## When this fix can be removed

When supertest upstream stops managing the passed server's lifecycle (or adds `request(server, { manageServer: false })`). Periodically check the supertest changelog and drop `preListenHttpServerOnce` if the behaviour changes.
