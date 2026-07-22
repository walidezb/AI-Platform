import { Processor, Process } from '@nestjs/bull';
import * as Bull from 'bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.EXERCISE_EVALUATION)
export class ExerciseEvaluationProcessor {
  private readonly logger = new Logger(ExerciseEvaluationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Process()
  async processJob(
    job: Bull.Job<{
      submissionId: string;
      exerciseId: string;
      userId: string;
      milestoneId: string;
    }>,
  ) {
    const { submissionId, exerciseId, userId, milestoneId } = job.data;

    this.logger.log(
      `Processing evaluation job for submission ${submissionId}`,
    );

    // Fetch full submission + exercise data
    const submission = await this.prisma.exerciseSubmission.findUnique({
      where: { id: submissionId },
      select: { submissionText: true, attemptNumber: true },
    });

    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        milestone: {
          include: {
            learningPath: {
              select: { organizationId: true },
            },
          },
        },
      },
    });

    if (!submission || !exercise) {
      throw new Error(`Submission or exercise not found: ${submissionId}`);
    }

    const organizationId = exercise.milestone.learningPath.organizationId;
    const internalSecret =
      this.config.get<string>('INTERNAL_SERVICE_SECRET') || '';

    try {
      // Call FastAPI evaluation endpoint
      const response = await fetch(
        `${this.config.get('AI_SERVICE_URL')}/exercises/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': internalSecret,
          },
          body: JSON.stringify({
            submissionId,
            submissionText: submission.submissionText,
            exerciseId,
            exerciseTitle: exercise.title,
            instructions: exercise.instructions,
            exerciseType: exercise.exerciseType,
            rubric: exercise.rubric,
            passingScore: exercise.passingScore,
            scenarioContext: exercise.scenarioContext,
            expectedOutput: exercise.expectedOutput,
            userId,
            organizationId,
            milestoneId,
          }),
          signal: AbortSignal.timeout(90_000), // 90s timeout
        },
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`AI service returned ${response.status}: ${err}`);
      }

      const result: any = await response.json();
      this.logger.log(
        `Evaluation complete: ${submissionId} → ` +
          `${result.passed ? 'PASSED' : 'FAILED'} (${result.score?.toFixed(1)}%)`,
      );
    } catch (error) {
      this.logger.error(`Evaluation failed for ${submissionId}: ${error}`);

      // Mark submission as FAILED on error (don't leave it PENDING)
      await this.prisma.exerciseSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'FAILED',
          score: 0,
          feedback:
            'Evaluation failed due to a technical error. ' +
            'Please try submitting again.',
        },
      });

      throw error; // BullMQ will retry
    }
  }
}
