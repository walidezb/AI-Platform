import { Controller, Get, Patch, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch('me')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async updateMe(@Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        jobTitle: dto.jobTitle,
        preferredLanguage: dto.preferredLanguage,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        jobTitle: true,
        preferredLanguage: true,
      },
    });
  }

  @Patch('me/language')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async updateLanguage(
    @CurrentUser() user: any,
    @Body() body: { language: 'en' | 'ar' },
  ) {
    const lang = (body.language || 'en').toUpperCase() as 'EN' | 'AR';
    await this.prisma.user.update({
      where: { id: user.id },
      data: { preferredLanguage: lang },
    });
    return { success: true };
  }

  @Get('me/assessment')
  @Roles(UserRole.LEARNER)
  async getMyAssessment(@CurrentUser() user: any) {
    return this.prisma.assessment.findFirst({
      where: { userId: user.id, status: 'COMPLETED' },
      select: {
        identifiedRole: true,
        experienceLevel: true,
        strongAreas: true,
        weakAreas: true,
        learningGoals: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
    });
  }
}
