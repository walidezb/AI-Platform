import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bull';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import * as Bull from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import helmet from 'helmet';

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

  // Apply Helmet Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // needed for embedded videos
  }));

  // CORS Configuration
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.APP_URL,              // Next.js frontend
        process.env.AI_SERVICE_URL,       // FastAPI AI service
        'http://localhost:3000',           // local dev
        'http://localhost:8000',           // local AI dev
      ].filter(Boolean);

      // Allow requests with no origin (mobile apps, Postman, internal)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Internal-Secret',
      'X-Org-Override',
    ],
    credentials: true,
  });

  // Strict Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,              // strip unknown properties
    forbidNonWhitelisted: true,   // throw error on unknown properties
    transform: true,              // auto-transform types (string -> number etc)
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      // Format validation errors into a clean structure
      const messages = errors.map(err => ({
        field: err.property,
        errors: Object.values(err.constraints || {}),
      }));
      return new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    },
  }));

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
