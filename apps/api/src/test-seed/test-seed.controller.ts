import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('test/seed')
export class TestSeedController {
  constructor(private readonly prisma: PrismaService) {}

  // Guard: only works in non-production with correct secret
  private assertTestMode(request: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Test endpoints disabled in production');
    }
    const secret = request.headers['x-test-secret'];
    if (secret !== (process.env.TEST_SEED_SECRET ?? 'test-seed-secret-for-e2e')) {
      throw new ForbiddenException('Invalid test secret');
    }
  }

  @Post('org')
  async createTestOrg(@Req() req: any, @Body() body: any) {
    this.assertTestMode(req);
    const slug = (body.name || `test-org-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const org = await this.prisma.organization.create({
      data: {
        name: body.name || `Test Org ${Date.now()}`,
        slug,
        status: 'ACTIVE',
      },
    });
    return { success: true, data: org };
  }

  @Delete('org/:id')
  async deleteTestOrg(@Req() req: any, @Param('id') id: string) {
    this.assertTestMode(req);
    // Cascade: delete all related data first
    await this.prisma.organization.delete({ where: { id } }).catch(() => {});
    return { success: true };
  }

  @Post('user')
  async createTestUser(@Req() req: any, @Body() body: any) {
    this.assertTestMode(req);
    const user = await this.prisma.user.create({
      data: {
        organizationId: body.organizationId,
        role: body.role || 'LEARNER',
        email: body.email,
        fullName: body.fullName,
        clerkId: `test_${Date.now()}`,
      },
    });
    return { success: true, data: user };
  }

  @Post('invite')
  async createTestInvite(@Req() req: any, @Body() body: any) {
    this.assertTestMode(req);
    const token = `test_token_${Date.now()}`;
    const user = await this.prisma.user.create({
      data: {
        organizationId: body.organizationId,
        email: body.email,
        fullName: body.fullName,
        clerkId: `invite_${Date.now()}`,
        onboardingToken: token,
        onboardingTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitationStatus: 'PENDING',
      },
    });
    return { success: true, data: { ...user, inviteToken: token } };
  }

  @Delete('invite/:id')
  async deleteTestInvite(@Req() req: any, @Param('id') id: string) {
    this.assertTestMode(req);
    await this.prisma.user.delete({ where: { id } }).catch(() => {});
    return { success: true };
  }

  @Post('path')
  async createTestPath(@Req() req: any, @Body() body: any) {
    this.assertTestMode(req);
    const path = await this.prisma.learningPath.create({
      data: {
        organizationId: body.organizationId,
        userId: body.assignedUserId,
        title: body.title || 'Test TypeScript Path',
        description: 'Test learning path description',
        domain: body.domain || 'Software Engineering',
        status: 'ACTIVE',
        milestones: {
          create: [
            {
              sequenceOrder: 1,
              title: 'Foundations',
              description: 'Foundational objectives',
              learningObjectives: ['Learn foundations'],
              modules: {
                create: [
                  {
                    sequenceOrder: 1,
                    title: 'Introduction',
                    description: 'Introductory module',
                    moduleType: 'READING',
                    estimatedMinutes: 30,
                    resources: {
                      create: [
                        {
                          title: 'Getting Started',
                          resourceType: 'ARTICLE',
                          url: 'https://example.com/article',
                          sourcePlatform: 'Web Article',
                          description: 'Getting started resource',
                          sequenceOrder: 1,
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
    return { success: true, data: path };
  }
}
