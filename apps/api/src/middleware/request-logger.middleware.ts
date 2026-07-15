import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const color = statusCode >= 500 ? '🔴' : statusCode >= 400 ? '🟡' : '🟢';
      this.logger.log(
        `${color} ${method} ${originalUrl} ${statusCode} — ${duration}ms`,
      );
    });

    next();
  }
}
