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

    // Sanitized response
    const rawResponse = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };

    const errorResponseObj = typeof rawResponse === 'string'
      ? { message: rawResponse }
      : (rawResponse as Record<string, unknown>);

    const formattedMessage = Array.isArray(errorResponseObj.message)
      ? errorResponseObj.message.join(', ')
      : (errorResponseObj.message || 'Something went wrong');

    response.status(status).json({
      success: false,
      statusCode: status,
      ...errorResponseObj,
      message: formattedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
