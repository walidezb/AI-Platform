import { createHash } from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class ETagMiddleware implements NestMiddleware {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  use(req: Request, res: Response & any, next: () => void) {
    if (req.method !== 'GET') return next();

    const originalSend = res.json.bind(res);
    res.json = (body: unknown) => {
      const str = JSON.stringify(body);
      const etag = `"${createHash('md5').update(str).digest('hex')}"`;

      res.setHeader('ETag', etag);

      // If client sent If-None-Match and it matches, 304
      const clientEtag = req.headers?.['if-none-match'];
      if (clientEtag === etag) {
        res.status(304).end();
        return res;
      }

      return originalSend(body);
    };
    next();
  }
}
