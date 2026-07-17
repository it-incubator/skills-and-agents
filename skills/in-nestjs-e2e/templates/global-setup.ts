// MUST be the first import: Jest globalSetup runs in a separate process and
// does NOT use the Jest moduleNameMapper, so path aliases (@app/..., src/...)
// won't resolve without registering tsconfig-paths first.
import 'tsconfig-paths/register';

// The same DataSource TypeORM's CLI uses for migration:run — it knows the
// entity/migration paths and loads .env.testing via dotenv.
import cliDataSource from '{{DATA_SOURCE_IMPORT}}';

/**
 * Jest globalSetup — runs ONCE before the whole e2e suite.
 * Fully recreates the public schema so every run starts from a clean,
 * current schema (no leftover tables/enums from old branches).
 *
 * Between tests we TRUNCATE instead (see delete-all-data.ts) — faster, and the
 * schema does not change within a single run.
 */
export default async function globalSetup(): Promise<void> {
  if (!cliDataSource.isInitialized) {
    await cliDataSource.initialize();
  }

  await cliDataSource.query('DROP SCHEMA public CASCADE');
  await cliDataSource.query('CREATE SCHEMA public');

  // Extensions live INSIDE the schema — DROP SCHEMA removed them. Recreate every
  // extension the project uses BEFORE migrations. List them all here.
  // (Check the dev DB: SELECT extname FROM pg_extension;)
  await cliDataSource.query('CREATE EXTENSION IF NOT EXISTS "{{PG_EXTENSIONS}}"');

  // {{SCHEMA_STRATEGY}}: runMigrations() if the project has TypeORM migrations,
  // synchronize() if it's synchronize-only.
  await cliDataSource.runMigrations();
  // await cliDataSource.synchronize();

  await cliDataSource.destroy();
}

// ─────────────────────────────────────────────────────────────────────────
// Mongo variant — replace the whole body with:
//
//   import { connect } from 'mongoose';
//   export default async function globalSetup(): Promise<void> {
//     const conn = await connect(process.env.MONGO_URL!);
//     await conn.connection.dropDatabase();
//     await conn.disconnect();
//   }
// ─────────────────────────────────────────────────────────────────────────
