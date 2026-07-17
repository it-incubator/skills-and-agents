import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// Replace with the project's real guard + "is public" metadata key.
import { AppAuthGuard } from '{{ROOT_DIR_REL_FROM_HELPERS}}/src/auth/app-auth.guard';
import { IS_PUBLIC_KEY } from '{{ROOT_DIR_REL_FROM_HELPERS}}/src/auth/public.decorator';

/**
 * Auth mock for e2e when the app has a GLOBAL guard (APP_GUARD).
 *
 * Why monkey-patch, not overrideGuard(): a guard registered via
 * `APP_GUARD: useClass` is instantiated by Nest OUTSIDE the TestingModule
 * override machinery, so overrideGuard() misses it. All instances share one
 * prototype, so patching `prototype.canActivate` is reliable and idempotent.
 *
 * Keep req.user shaped EXACTLY like production so controllers behave the same.
 */
let mockUser: Record<string, unknown> | null = null;

/** Set the current user for subsequent requests (call from TestManager.loginAs). */
export function setMockClaims(user: Record<string, unknown> | null): void {
  mockUser = user;
}

/** Reset between tests (call in beforeEach). Default null → requests 401. */
export function resetMockUser(): void {
  mockUser = null;
}

const reflector = new Reflector();

function mockCanActivate(context: ExecutionContext): boolean {
  const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  if (isPublic) return true;

  if (!mockUser) return false; // → 401, same as the real guard with no token

  const req = context.switchToHttp().getRequest<{ user: unknown }>();
  req.user = mockUser;
  return true;
}

/** Idempotent — install once before AppModule loads in init-settings. */
export function installAuthGuardMonkeyPatch(): void {
  AppAuthGuard.prototype.canActivate =
    mockCanActivate as AppAuthGuard['canActivate'];
}
