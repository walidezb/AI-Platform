import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private logger = new Logger('AUDIT');

  use(req: Request, res: Response, next: NextFunction) {
    const writeMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

    if (writeMethods.includes(req.method)) {
      res.on('finish', () => {
        const user = (req as any).user;
        this.logger.log(
          JSON.stringify({
            type: 'AUDIT',
            method: req.method,
            path: req.path,
            userId: user?.id ?? 'anonymous',
            orgId: user?.organizationId ?? null,
            status: res.statusCode,
            timestamp: new Date().toISOString(),
          }),
        );
      });
    }

    next();
  }
}
