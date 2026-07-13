import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull';
import * as Bull from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { AppModule } from './app.module';
import { QUEUE_NAMES } from './queues/queue.constants';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

// Initialize Sentry BEFORE creating the NestJS app
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 1.0,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Register Sentry Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Configure Bull Board
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const assessmentQueue = app.get<Bull.Queue>(getQueueToken(QUEUE_NAMES.ASSESSMENT));
  const pathQueue = app.get<Bull.Queue>(getQueueToken(QUEUE_NAMES.PATH_GENERATION));
  const resourceQueue = app.get<Bull.Queue>(getQueueToken(QUEUE_NAMES.RESOURCE_CURATION));
  const exerciseQueue = app.get<Bull.Queue>(getQueueToken(QUEUE_NAMES.EXERCISE_GENERATION));
  const notificationQueue = app.get<Bull.Queue>(getQueueToken(QUEUE_NAMES.NOTIFICATION));

  createBullBoard({
    queues: [
      new BullAdapter(assessmentQueue),
      new BullAdapter(pathQueue),
      new BullAdapter(resourceQueue),
      new BullAdapter(exerciseQueue),
      new BullAdapter(notificationQueue),
    ],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
