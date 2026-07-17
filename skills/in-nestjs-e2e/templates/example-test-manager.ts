import { HttpStatus, INestApplication } from '@nestjs/common';
// `import * as request` — the project does not enable esModuleInterop, so a
// default import fails under ts-jest. Keep this form unless esModuleInterop=true.
import * as request from 'supertest';

// Replace with the project's real DTO types.
interface CreateUserDto {
  name: string;
  email: string;
}
interface UpdateUserDto {
  name?: string;
}

/**
 * HTTP wrapper for the Users resource — keeps specs readable and DRY.
 *
 * The `expectedStatus` parameter (defaulted to the happy-path status) lets ONE
 * method drive both success and error scenarios:
 *   await users.createUser(payload);                                  // 201
 *   await users.createUser(bad, HttpStatus.UNPROCESSABLE_ENTITY);     // 422
 */
export class UsersTestManager {
  private readonly prefix = '/{{GLOBAL_PREFIX}}';

  constructor(private readonly app: INestApplication) {}

  // If the app is auth-guarded, centralize login here:
  // loginAs(claims: Record<string, unknown>) { setMockClaims(claims); return claims; }

  async createUser(
    payload: CreateUserDto,
    expectedStatus: number = HttpStatus.CREATED,
  ) {
    const res = await request(this.app.getHttpServer())
      .post(`${this.prefix}/users`)
      .send(payload)
      .expect(expectedStatus);
    return res.body;
  }

  async getUser(id: string, expectedStatus: number = HttpStatus.OK) {
    const res = await request(this.app.getHttpServer())
      .get(`${this.prefix}/users/${id}`)
      .expect(expectedStatus);
    return res.body;
  }

  async updateUser(
    id: string,
    payload: UpdateUserDto,
    expectedStatus: number = HttpStatus.OK,
  ) {
    const res = await request(this.app.getHttpServer())
      .patch(`${this.prefix}/users/${id}`)
      .send(payload)
      .expect(expectedStatus);
    return res.body;
  }

  async deleteUser(id: string, expectedStatus: number = HttpStatus.NO_CONTENT) {
    const res = await request(this.app.getHttpServer())
      .delete(`${this.prefix}/users/${id}`)
      .expect(expectedStatus);
    return res.body;
  }
}
