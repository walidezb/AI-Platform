import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queues/queue.service';
import { Assessment, Organization, User } from '@prisma/client';

@Injectable()
export class AssessmentService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private queue: QueueService,
  ) {}

  private get aiServiceUrl() {
    return this.config.get('AI_SERVICE_URL');
  }

  private get aiServiceSecret() {
    return this.config.get('AI_SERVICE_SECRET');
  }

  async createAssessment(userId: string, orgId: string): Promise<Assessment> {
    // Check if active assessment exists
    const existing = await this.prisma.assessment.findFirst({
      where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } }
    });
    if (existing) return existing;

    return this.prisma.assessment.create({
      data: {
        userId,
        organizationId: orgId,
        status: 'IN_PROGRESS',
      }
    });
  }

  async startAssessmentSession(assessment: Assessment, user: User, org: Organization) {
    let departmentName: string | null = null;
    if (user.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: user.departmentId }
      });
      if (dept) departmentName = dept.name;
    }

    const res = await fetch(`${this.aiServiceUrl}/assessment/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        organizationId: org.id,
        assessmentId: assessment.id,
        jobTitle: user.jobTitle,
        department: departmentName,
        orgName: org.name,
        language: user.preferredLanguage,
      }),
    });

    if (!res.ok) {
      throw new ServiceUnavailableException('AI service unavailable');
    }

    return res.json();
  }

  async getActiveAssessment(userId: string) {
    return this.prisma.assessment.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompletedAssessment(userId: string) {
    return this.prisma.assessment.findFirst({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });
  }

  async queueAssessmentCompleted(payload: any) {
    return this.queue.addAssessmentCompleted(payload);
  }
}
