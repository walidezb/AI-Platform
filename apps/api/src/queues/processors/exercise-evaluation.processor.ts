import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
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
          signal: AbortSignal.timeout(60_000), // 60s timeout
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
      throw error; // BullMQ will retry or call @OnQueueFailed
    }
  }

  @OnQueueFailed()
  async onFailed(job: Bull.Job, error: Error) {
    this.logger.error(
      `[ExerciseEval] Job ${job.id} failed: ${error.message}`,
    );

    const isTimeout =
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('timed out') ||
      error.message.toLowerCase().includes('etimedout');

    const feedback = isTimeout
      ? 'Evaluation timed out. Your response was saved — please try submitting again.'
      : 'An error occurred during evaluation. Please try again.';

    try {
      if (job.data?.submissionId) {
        await this.prisma.exerciseSubmission.update({
          where: { id: job.data.submissionId },
          data: {
            status: 'FAILED',
            feedback,
            evaluatedAt: new Date(),
          },
        });
      }
    } catch (dbErr) {
      this.logger.error(
        `[ExerciseEval] Could not mark submission as failed`,
        dbErr,
      );
    }
  }
}
