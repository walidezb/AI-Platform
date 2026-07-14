import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Res,
  Headers,
  NotFoundException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentService } from './assessment.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrgId } from '../auth/decorators/org-id.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AssessmentThrottle } from '../auth/throttle.config';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';

@Controller('assessment')
export class AssessmentController {
  constructor(
    private service: AssessmentService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Post('start')
  @AssessmentThrottle()
  async startAssessment(@CurrentUser() user: any, @OrgId() orgId: string) {
    // Get/create assessment record in DB
    const assessment = await this.service.createAssessment(user.id, orgId);

    // Get org for AI context
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    // Start session with AI service
    const aiResponse = await this.service.startAssessmentSession(assessment, user, org);

    return {
      success: true,
      data: {
        assessmentId: assessment.id,
        firstMessage: aiResponse.firstMessage,
        isResuming: aiResponse.isResuming,
        turnCount: aiResponse.turnCount,
      },
    };
  }

  @Post('start-by-token')
  @Public()
  @AssessmentThrottle()
  async startAssessmentByToken(
    @Body() body: { onboardingToken: string }
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        onboardingToken: body.onboardingToken,
        onboardingTokenExpiry: { gte: new Date() },
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired onboarding token');
    }

    const assessment = await this.service.createAssessment(user.id, user.organizationId);
    const org = await this.prisma.organization.findUnique({ where: { id: user.organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    const aiResponse = await this.service.startAssessmentSession(assessment, user, org);

    return {
      success: true,
      data: {
        assessmentId: assessment.id,
        firstMessage: aiResponse.firstMessage,
        isResuming: aiResponse.isResuming,
        turnCount: aiResponse.turnCount,
      },
    };
  }

  @Get('active')
  async getActive(@CurrentUser() user: any) {
    const assessment = await this.service.getActiveAssessment(user.id);
    return { success: true, data: assessment };
  }

  @Get('completed')
  async getCompleted(@CurrentUser() user: any) {
    const assessment = await this.service.getCompletedAssessment(user.id);
    return { success: true, data: assessment };
  }

  // Proxy streaming endpoint
  @Post(':id/message/stream')
  @Public()
  @AssessmentThrottle()
  async streamMessage(
    @Param('id') id: string,
    @Body() body: { userMessage: string },
    @Headers('x-onboarding-token') onboardingToken: string,
    @CurrentUser() currentUser: any,
    @Res() res: any,
  ) {
    let userId: string | null = null;

    if (currentUser) {
      userId = currentUser.id;
    } else if (onboardingToken) {
      const user = await this.prisma.user.findFirst({
        where: {
          onboardingToken,
          onboardingTokenExpiry: { gte: new Date() },
        },
      });
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Unauthenticated');
    }

    // Verify assessment belongs to user
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, userId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    // Proxy to AI service as SSE stream
    const aiServiceUrl = this.config.get('AI_SERVICE_URL');
    const aiUrl = `${aiServiceUrl}/assessment/${id}/message/stream`;
    const aiResponse = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: body.userMessage }),
    });

    if (!aiResponse.ok || !aiResponse.body) {
      throw new ServiceUnavailableException('AI service error');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Pipe the AI stream to the client
    const reader = aiResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        res.write(chunk);
        // Force flush for real-time streaming
        if ((res as any).flush) (res as any).flush();
      }
    } finally {
      res.end();
    }
  }

  @Post('internal/:id/complete')
  @Public()
  @SkipThrottle()
  async markComplete(
    @Param('id') id: string,
    @Body() body: {
      skillProfile: any;
      conversationLog: any[];
      userId: string;
      organizationId: string;
    },
    @Headers('x-internal-secret') secret: string,
  ) {
    // Validate internal secret
    if (secret !== this.config.get('AI_SERVICE_SECRET')) {
      throw new UnauthorizedException();
    }

    // Update assessment in DB
    await this.prisma.assessment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        skillProfile: body.skillProfile,
        conversationLog: body.conversationLog,
        identifiedRole: body.skillProfile.identified_role,
        experienceLevel: body.skillProfile.experience_level,
        learningGoals: body.skillProfile.learning_goals,
        strongAreas: body.skillProfile.strong_areas,
        weakAreas: body.skillProfile.weak_areas,
        completedAt: new Date(),
      },
    });

    // Queue path generation job
    await this.service.queueAssessmentCompleted({
      assessmentId: id,
      userId: body.userId,
      organizationId: body.organizationId,
      skillProfile: body.skillProfile,
    });

    return { success: true };
  }

  @Get(':userId/path-status')
  @Public()
  async getPathStatus(
    @Param('userId') userId: string,
    @Query('token') onboardingToken: string,
  ) {
    // Validate via onboarding token (public route)
    const user = await this.prisma.user.findFirst({
      where: { onboardingToken, id: userId }
    });
    if (!user) throw new NotFoundException();

    // Check assessment
    const assessment = await this.prisma.assessment.findFirst({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        status: true,
        identifiedRole: true,
        experienceLevel: true,
        completedAt: true,
      }
    });

    if (!assessment) {
      return { status: 'ASSESSING', pathReady: false };
    }

    // Check if learning path exists
    const path = await this.prisma.learningPath.findFirst({
      where: { userId, status: { not: 'DRAFT' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        totalMilestones: true,
        estimatedHours: true,
        createdAt: true,
      }
    });

    if (!path) {
      return {
        status: 'GENERATING',
        pathReady: false,
        assessment: {
          identifiedRole: assessment.identifiedRole,
          experienceLevel: assessment.experienceLevel,
        }
      };
    }

    return {
      status: 'READY',
      pathReady: true,
      path: {
        id: path.id,
        title: path.title,
        totalMilestones: path.totalMilestones,
        estimatedHours: path.estimatedHours,
      },
      assessment: {
        identifiedRole: assessment.identifiedRole,
        experienceLevel: assessment.experienceLevel,
      }
    };
  }

  @Get('profile-by-token/:token')
  @Public()
  async getProfileByToken(@Param('token') token: string) {
    // Validate token and get user
    const user = await this.prisma.user.findFirst({
      where: {
        onboardingToken: token,
        onboardingTokenExpiry: { gte: new Date() },
      },
      include: {
        organization: { select: { name: true, logoUrl: true } }
      }
    });
    if (!user) throw new NotFoundException('Invalid or expired token');

    // Get their completed assessment
    const assessment = await this.prisma.assessment.findFirst({
      where: { userId: user.id, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        identifiedRole: true,
        experienceLevel: true,
        strongAreas: true,
        weakAreas: true,
        learningGoals: true,
        completedAt: true,
        skillProfile: true,
      }
    });

    if (!assessment) {
      return { hasAssessment: false };
    }

    return {
      hasAssessment: true,
      employeeName: user.fullName,
      orgName: user.organization?.name || 'Company',
      assessment: {
        identifiedRole: assessment.identifiedRole,
        experienceLevel: assessment.experienceLevel,
        strongAreas: assessment.strongAreas,
        weakAreas: assessment.weakAreas,
        learningGoals: assessment.learningGoals,
        completedAt: assessment.completedAt,
      }
    };
  }
}
