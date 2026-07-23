import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { assertOrgScope } from '../common/assert-org-scope';
import { PathsService } from '../paths/paths.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';

describe('Multi-Tenant Isolation', () => {
  // ── assertOrgScope unit tests ──

  describe('assertOrgScope()', () => {
    it('passes when resource orgId matches requesting orgId', () => {
      expect(() =>
        assertOrgScope('org-A', 'org-A', 'LearningPath'),
      ).not.toThrow();
    });

    it('throws ForbiddenException when orgIds differ', () => {
      expect(() =>
        assertOrgScope('org-B', 'org-A', 'LearningPath'),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when resource orgId is null', () => {
      expect(() =>
        assertOrgScope(null, 'org-A', 'LearningPath'),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when resource orgId is undefined', () => {
      expect(() =>
        assertOrgScope(undefined, 'org-A', 'User'),
      ).toThrow(ForbiddenException);
    });

    it('includes resource name in exception message', () => {
      try {
        assertOrgScope('org-B', 'org-A', 'Exercise');
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
        expect((e as ForbiddenException).message).toContain('Exercise');
      }
    });
  });

  // ── Integration: PathsService cross-org ──

  describe('PathsService cross-org isolation', () => {
    let service: PathsService;
    let prisma: { learningPath: { findUnique: jest.Mock } };

    beforeEach(async () => {
      prisma = {
        learningPath: {
          findUnique: jest.fn(),
        },
      };
      const module = await Test.createTestingModule({
        providers: [
          PathsService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: CacheService,
            useValue: {
              getOrSet: jest.fn((_k, _t, fn) => fn()),
              del: jest.fn(),
            },
          },
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      }).compile();
      service = module.get(PathsService);
    });

    it('throws ForbiddenException when path belongs to different org', async () => {
      prisma.learningPath.findUnique.mockResolvedValue({
        id: 'path-1',
        userId: 'user-other',
        organizationId: 'org-B', // ← belongs to org-B
        title: 'Test Path',
      });

      // User from org-A requests path-1
      await expect(
        service.getPathById('path-1', {
          id: 'user-1',
          role: 'LEARNER',
          organizationId: 'org-A',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns path when org matches and requesting user is self', async () => {
      prisma.learningPath.findUnique.mockResolvedValue({
        id: 'path-1',
        userId: 'user-1',
        organizationId: 'org-A',
        title: 'Test Path',
      });

      const result = await service.getPathById('path-1', {
        id: 'user-1',
        role: 'LEARNER',
        organizationId: 'org-A',
      });
      expect(result.id).toBe('path-1');
    });

    it('throws NotFoundException when path does not exist', async () => {
      prisma.learningPath.findUnique.mockResolvedValue(null);

      await expect(
        service.getPathById('nonexistent', {
          id: 'user-1',
          role: 'LEARNER',
          organizationId: 'org-A',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Integration: Exercise cross-org scope check ──

  describe('Exercise cross-org scope assertion', () => {
    it('throws ForbiddenException for cross-org exercise access', () => {
      const exercisePathOrg = 'org-B';
      const requestingOrg = 'org-A';

      expect(() =>
        assertOrgScope(exercisePathOrg, requestingOrg, 'Exercise'),
      ).toThrow(ForbiddenException);
    });
  });
});
