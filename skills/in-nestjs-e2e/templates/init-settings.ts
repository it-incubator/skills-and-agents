import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import type { Server } from 'http';
// If the project exposes a reusable bootstrap fn (recommended), import it and
// call it below instead of replicating main.ts inline:
// import { appSetup } from '{{APP_SETUP_IMPORT}}';
// If the app has a global auth guard, install the mock before AppModule loads:
// import { installAuthGuardMonkeyPatch } from './auth-mock';

/**
 * Explicitly starts the http server ONCE for the whole suite (after app.init()).
 *
 * supertest@7.x calls `app.listen(0)` before every request when the server is
 * not yet listening, then `server.close()` right after. Parallel supertest
 * calls (Promise.all) race on listen/close and corrupt the server → flaky
 * 401/404 and "Parse Error: Expected HTTP/, RTSP/ or ICE/" cascading into later
 * suites. Pre-listening once makes `app.address()` non-null, so supertest skips
 * its listen/close; the server is closed once in afterAll via app.close().
 *
 * Full diagnosis + verification: references/flaky-supertest.md.
 * Remove when supertest stops managing the passed server's lifecycle upstream.
 */
const preListenHttpServerOnce = async (
  app: INestApplication,
): Promise<void> => {
  const httpServer = app.getHttpServer() as Server;
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, () => {
      httpServer.removeListener('error', reject);
      resolve();
    });
  });
};

/**
 * Boots the Nest app for e2e. The schema reset already happened once in
 * global-setup.ts — here we only assemble the TestingModule and boot.
 *
 * @param overrideProviders  mock external I/O or override Config providers
 *                           (see references/writing-tests.md).
 */
export const initSettings = async (
  overrideProviders?: (moduleBuilder: TestingModuleBuilder) => void,
): Promise<{ app: INestApplication }> => {
  // Install the auth mock BEFORE AppModule loads (the global APP_GUARD is
  // instantiated at compile()). Remove if the app has no global guard.
  // installAuthGuardMonkeyPatch();

  // Dynamic import — so overrideProviders applies to a freshly built graph
  // rather than a module cached at file-load time.
  const { AppModule } = await import('{{ROOT_DIR_REL_FROM_HELPERS}}/src/app.module');

  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (overrideProviders) {
    overrideProviders(builder);
  }

  const testingModule = await builder.compile();
  const app = testingModule.createNestApplication();

  // If the graph has a @WebSocketGateway, install the WS adapter BEFORE init:
  // app.useWebSocketAdapter(new WsAdapter(app));

  // Apply the SAME bootstrap as production so validation/serialization match.
  // Preferred — call the project's reusable setup:
  // appSetup(app);
  // Otherwise replicate main.ts inline, e.g.:
  // app.setGlobalPrefix('{{GLOBAL_PREFIX}}');
  // app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.init();

  // Anti-flake: supertest 7.x must NOT manage the server lifecycle itself.
  await preListenHttpServerOnce(app);

  return { app };
};
