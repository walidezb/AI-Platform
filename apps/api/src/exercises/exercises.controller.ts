import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queues/queue.service';
import { ProgressService } from '../progress/progress.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queuesService: QueueService,
    private readonly progressService: ProgressService,
  ) {}

  // ── GET EXERCISE DETAIL ────────────────────────────────
  @Get(':exerciseId')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getExercise(
    @Param('exerciseId') exerciseId: string,
    @CurrentUser() user: any,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        milestone: {
          include: {
            learningPath: {
              select: { organizationId: true, id: true, title: true },
            },
          },
        },
      },
    });

    if (!exercise) throw new NotFoundException('Exercise not found');

    // Org scope check
    if (
      exercise.milestone.learningPath.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException();
    }

    // Get user's previous submissions for this exercise
    const submissions = await this.prisma.exerciseSubmission.findMany({
      where: { userId: user.id, exerciseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        score: true,
        feedback: true,
        attemptNumber: true,
        createdAt: true,
      },
    });

    const latestSubmission = submissions[0] ?? null;
    const hasPassed = submissions.some((s) => s.status === 'PASSED');
    const attemptsUsed = submissions.length;

    // For MCQ: hide correct answers until passed or max attempts used
    let safeExercise: any = { ...exercise };
    if (
      exercise.exerciseType === 'MULTIPLE_CHOICE' &&
      !hasPassed &&
      attemptsUsed < exercise.maxAttempts
    ) {
      safeExercise = {
        ...exercise,
        multipleChoiceOptions: (
          exercise.multipleChoiceOptions as any[]
        )?.map((opt) => ({
          ...opt,
          isCorrect: undefined, // hide answer
          explanation: undefined, // hide explanation
        })) ?? null,
        sampleAnswer: null, // hide sample answer
      };
    }

    return {
      success: true,
      data: {
        exercise: safeExercise,
        submissions,
        latestSubmission,
        hasPassed,
        attemptsUsed,
        attemptsRemaining: Math.max(0, exercise.maxAttempts - attemptsUsed),
        canAttempt: !hasPassed && attemptsUsed < exercise.maxAttempts,
      },
    };
  }

  // ── SUBMIT EXERCISE ────────────────────────────────────
  @Post(':exerciseId/submit')
  @Roles(UserRole.LEARNER)
  async submitExercise(
    @Param('exerciseId') exerciseId: string,
    @Body() body: { submissionText: string },
    @CurrentUser() user: any,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: {
        id: true,
        exerciseType: true,
        passingScore: true,
        maxAttempts: true,
        multipleChoiceOptions: true,
        milestoneId: true,
      },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');

    // Check attempts
    const attemptsUsed = await this.prisma.exerciseSubmission.count({
      where: { userId: user.id, exerciseId },
    });
    if (attemptsUsed >= exercise.maxAttempts) {
      throw new BadRequestException('Maximum attempts reached');
    }

    // Create submission record
    const submission = await this.prisma.exerciseSubmission.create({
      data: {
        userId: user.id,
        exerciseId,
        submissionText: body.submissionText,
        attemptNumber: attemptsUsed + 1,
        status: 'PENDING',
      },
    });

    // MULTIPLE_CHOICE: instant grading
    if (exercise.exerciseType === 'MULTIPLE_CHOICE') {
      const result = await this.gradeMultipleChoice(
        exercise,
        body.submissionText,
      );
      const updated = await this.prisma.exerciseSubmission.update({
        where: { id: submission.id },
        data: {
          score: result.score,
          feedback: result.feedback,
          status: result.passed ? 'PASSED' : 'FAILED',
        },
      });

      // If passed: check milestone completion
      if (result.passed) {
        await this.progressService.checkMilestoneProgress(
          user.id,
          exercise.milestoneId,
        );
      }

      return {
        success: true,
        data: {
          submissionId: submission.id,
          status: updated.status,
          score: result.score,
          feedback: result.feedback,
          correctAnswers: result.correctAnswers,
          instant: true,
        },
      };
    }

    // WRITTEN / SCENARIO: queue for AI evaluation
    await this.queuesService.addExerciseEvaluationJob({
      submissionId: submission.id,
      exerciseId,
      userId: user.id,
      milestoneId: exercise.milestoneId,
    });

    return {
      success: true,
      data: {
        submissionId: submission.id,
        status: 'PENDING',
        instant: false,
        message:
          'Your submission is being evaluated by AI. Results are usually ready in under 30 seconds.',
      },
    };
  }

  // ── GET SUBMISSION STATUS ──────────────────────────────
  @Get('submissions/:submissionId')
  @Roles(UserRole.LEARNER)
  async getSubmission(
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: any,
  ) {
    const submission = await this.prisma.exerciseSubmission.findFirst({
      where: { id: submissionId, userId: user.id },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return { success: true, data: submission };
  }

  // ── MCQ INSTANT GRADING ────────────────────────────────
  private async gradeMultipleChoice(exercise: any, answer: string) {
    const options = (exercise.multipleChoiceOptions as Array<{
      label: string;
      text: string;
      isCorrect: boolean;
      explanation: string;
    }>) || [];

    const selectedLabel = answer.trim().toUpperCase();
    const selectedOption = options.find((o) => o.label === selectedLabel);
    const correctOption = options.find((o) => o.isCorrect);

    const passed = selectedOption?.isCorrect ?? false;
    const score = passed ? 100 : 0;

    const feedback = passed
      ? `✅ Correct! ${correctOption?.explanation ?? 'Well done!'}`
      : `❌ Incorrect. The correct answer was ${correctOption?.label ?? ''}: ` +
        `${correctOption?.text ?? ''}. ${correctOption?.explanation ?? ''}`;

    return {
      passed,
      score,
      feedback,
      correctAnswers: [correctOption?.label ?? ''],
    };
  }
}
