import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const makeCtx = (
    userRole: string | null,
    requiredRoles: string[] | null,
  ): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRole ? { role: userRole } : null,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  // ── NO ROLE RESTRICTION ──
  it('should allow access when no roles are specified', () => {
    const ctx = makeCtx('LEARNER', null);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ── LEARNER ──
  it('should allow LEARNER to access LEARNER-only route', () => {
    const ctx = makeCtx('LEARNER', ['LEARNER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny LEARNER access to MANAGER-only route', () => {
    const ctx = makeCtx('LEARNER', ['MANAGER']);
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('should deny LEARNER access to ORG_ADMIN route', () => {
    const ctx = makeCtx('LEARNER', ['ORG_ADMIN']);
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  // ── MANAGER ──
  it('should allow MANAGER to access MANAGER route', () => {
    const ctx = makeCtx('MANAGER', ['MANAGER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow MANAGER to access LEARNER route (hierarchy)', () => {
    const ctx = makeCtx('MANAGER', ['LEARNER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny MANAGER access to ORG_ADMIN route', () => {
    const ctx = makeCtx('MANAGER', ['ORG_ADMIN']);
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  // ── ORG_ADMIN ──
  it('should allow ORG_ADMIN access to MANAGER route (hierarchy)', () => {
    const ctx = makeCtx('ORG_ADMIN', ['MANAGER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow ORG_ADMIN access to LEARNER route (hierarchy)', () => {
    const ctx = makeCtx('ORG_ADMIN', ['LEARNER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow ORG_ADMIN access to ORG_ADMIN route', () => {
    const ctx = makeCtx('ORG_ADMIN', ['ORG_ADMIN']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ── PLATFORM_ADMIN ──
  it('should allow PLATFORM_ADMIN to access any route', () => {
    ['LEARNER', 'MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN'].forEach((role) => {
      const ctx = makeCtx('PLATFORM_ADMIN', [role]);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ── MULTI-ROLE DECORATOR ──
  it('should allow access when user has ANY of the required roles', () => {
    // @Roles('LEARNER', 'MANAGER') — user is LEARNER
    const ctx = makeCtx('LEARNER', ['LEARNER', 'MANAGER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny access when user has NONE of the required roles', () => {
    // @Roles('MANAGER', 'ORG_ADMIN') — user is LEARNER
    const ctx = makeCtx('LEARNER', ['MANAGER', 'ORG_ADMIN']);
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  // ── EDGE CASES ──
  it('should throw 401 when no user on request (unauthenticated)', () => {
    const ctx = makeCtx(null, ['LEARNER']);
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('should deny access for unknown role', () => {
    const ctx = makeCtx('UNKNOWN_ROLE', ['LEARNER']);
    expect(() => guard.canActivate(ctx)).toThrow();
  });
});
