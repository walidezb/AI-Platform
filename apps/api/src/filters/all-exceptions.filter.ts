import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log and capture non-4xx errors
    if (status >= 500) {
      this.logger.error(exception);
      Sentry.captureException(exception);
    }

    // Sanitized response (no stack traces in production)
    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    const getErrorMessage = (msg: unknown): string => {
      if (typeof msg === 'string') return msg;
      if (typeof msg === 'object' && msg !== null) {
        const record = msg as Record<string, unknown>;
        if (typeof record.message === 'string') return record.message;
        if (Array.isArray(record.message)) return record.message.join(', ');
      }
      return 'Something went wrong';
    };

    response.status(status).json({
      success: false,
      statusCode: status,
      message: getErrorMessage(message),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
