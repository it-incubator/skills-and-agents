import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { UsersTestManager } from './helpers/users-test-manager';
import { deleteAllData } from './helpers/delete-all-data';
import { userDetailsSchema } from './helpers/response-schemas';

/**
 * Reference e2e spec. Copy per resource. Start with the health smoke test
 * (app.e2e-spec.ts) to prove boot + DB + supertest wiring before resource specs.
 */
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

  it('GET /{{GLOBAL_PREFIX}} health (public)', async () => {
    const res = await request(app.getHttpServer())
      .get('/{{GLOBAL_PREFIX}}')
      .expect(HttpStatus.OK);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  describe('POST /users', () => {
    it('creates a user', async () => {
      const body = await users.createUser({
        name: 'John',
        email: 'john@example.com',
      });
      expect(body.id).toBeDefined();
      expect(body.name).toBe('John');
    });

    it('422 on invalid email', async () => {
      await users.createUser(
        { name: 'John', email: 'not-an-email' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    });

    it('409 on duplicate email', async () => {
      await users.createUser({ name: 'John', email: 'john@example.com' });
      await users.createUser(
        { name: 'John', email: 'john@example.com' },
        HttpStatus.CONFLICT,
      );
    });
  });

  describe('GET /users/:id', () => {
    it('returns the user and matches the response schema', async () => {
      const created = await users.createUser({
        name: 'John',
        email: 'john@example.com',
      });

      const body = await users.getUser(created.id);

      expect(body).toMatchObject(userDetailsSchema); // structural contract
      expect(body.id).toBe(created.id); // business value
    });

    it('404 when the user does not exist', async () => {
      await users.getUser('00000000-0000-0000-0000-000000000000', HttpStatus.NOT_FOUND);
    });
  });
});
