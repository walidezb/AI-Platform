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
import express from 'express';
import compression from 'compression';

import { AppModule } from './app.module';
import { QUEUE_NAMES } from './queues/queue.constants';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { BudgetExceededFilter } from './filters/budget-exceeded.filter';
import { ThrottlerExceptionFilter } from './filters/throttler-exception.filter';

// Initialize Sentry BEFORE creating the NestJS app
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 1.0,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // ── Compression ──
  app.use(
    compression({
      level: 6, // balance between CPU and size
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      filter: (req: any, res: any) => {
        // Don't compress streaming responses
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
      threshold: 1024, // only compress responses > 1KB
    }),
  );

  // Stripe raw body middleware for webhooks
  app.use('/billing/webhook', express.raw({ type: 'application/json' }));

  // Apply Helmet Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      frameguard: { action: 'sameorigin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS Configuration
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.APP_URL, // Next.js frontend
        process.env.AI_SERVICE_URL, // FastAPI AI service
        'http://localhost:3000', // local dev
        'http://localhost:8000', // local AI dev
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
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // throw error on unknown properties
      transform: true, // auto-transform types (string -> number etc)
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        // Format validation errors into a clean structure
        const messages = errors.map((err) => ({
          field: err.property,
          errors: Object.values(err.constraints || {}),
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  // Register Sentry Exception Filter, Throttler Filter & Budget Exceeded Filter
  app.useGlobalFilters(
    new ThrottlerExceptionFilter(),
    new BudgetExceededFilter(),
    new AllExceptionsFilter(),
  );

  // Configure Bull Board
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const assessmentQueue = app.get<Bull.Queue>(
    getQueueToken(QUEUE_NAMES.ASSESSMENT),
  );
  const pathQueue = app.get<Bull.Queue>(
    getQueueToken(QUEUE_NAMES.PATH_GENERATION),
  );
  const resourceQueue = app.get<Bull.Queue>(
    getQueueToken(QUEUE_NAMES.RESOURCE_CURATION),
  );
  const exerciseQueue = app.get<Bull.Queue>(
    getQueueToken(QUEUE_NAMES.EXERCISE_GENERATION),
  );
  const notificationQueue = app.get<Bull.Queue>(
    getQueueToken(QUEUE_NAMES.NOTIFICATION),
  );
  const stripeUsageQueue = app.get<Bull.Queue>(
    getQueueToken(QUEUE_NAMES.STRIPE_USAGE),
  );

  createBullBoard({
    queues: [
      new BullAdapter(assessmentQueue),
      new BullAdapter(pathQueue),
      new BullAdapter(resourceQueue),
      new BullAdapter(exerciseQueue),
      new BullAdapter(notificationQueue),
      new BullAdapter(stripeUsageQueue),
    ],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
