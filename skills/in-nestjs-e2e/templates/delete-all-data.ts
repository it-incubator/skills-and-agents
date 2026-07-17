import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * TRUNCATE every table (except `migrations`) with CASCADE — called in beforeEach
 * so each test starts from an empty DB. Dynamic: never hardcode table names, so
 * new entities are cleaned automatically.
 *
 * If the app already exposes a reset service (e.g. a dev-support
 * DatabaseResetService behind a flag), wrap that instead to avoid duplicating
 * the SQL:  await app.get(DatabaseResetService).truncateAll();
 */
export const deleteAllData = async (app: INestApplication): Promise<void> => {
  const dataSource = app.get(DataSource);

  const tables: { tablename: string }[] = await dataSource.query(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename != 'migrations'`,
  );
  if (tables.length === 0) return;

  const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');
  await dataSource.query(`TRUNCATE ${tableNames} CASCADE`);
};

// ─────────────────────────────────────────────────────────────────────────
// Mongo variant:
//
//   import { Connection } from 'mongoose';
//   export const deleteAllData = async (app: INestApplication): Promise<void> => {
//     const connection = app.get(Connection);
//     await connection.dropDatabase();
//   };
// ─────────────────────────────────────────────────────────────────────────
