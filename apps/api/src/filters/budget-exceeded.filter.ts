import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class BudgetExceededFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (status === 402) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const bodyObj = typeof body === 'object' ? (body as any) : {};
      response.status(402).json({
        statusCode: 402,
        error: 'Budget Exceeded',
        message:
          bodyObj.message ||
          'AI token budget exceeded for this billing period.',
        upgradeUrl: bodyObj.upgradeUrl ?? null,
        percentUsed: bodyObj.percentUsed ?? null,
      });
    } else {
      response.status(status).json(body);
    }
  }
}
