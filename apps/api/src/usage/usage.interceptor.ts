import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UsageService } from './usage.service';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UsageInterceptor.name);

  constructor(
    private readonly usageService: UsageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async (responseData) => {
        // Only act if the response contains AI token usage or is internal log
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const orgId = user?.organizationId || request.body?.organizationId;
        if (!orgId) return;

        try {
          // Check budget AFTER logging usage
          const budget = await this.usageService.checkBudget(orgId);

          // 80% WARNING — emit event
          if (budget.isNearLimit && !budget.isOverBudget) {
            this.eventEmitter.emit('usage.near_limit', {
              organizationId: orgId,
              percentUsed: budget.percentUsed,
              used: budget.used,
              budget: budget.budget,
              remainingUsd: budget.remainingUsd,
            });
            this.logger.warn(
              `Org ${orgId} at ${budget.percentUsed.toFixed(1)}% of budget`,
            );
          }

          // 100% EXCEEDED — emit event
          if (budget.isOverBudget) {
            this.eventEmitter.emit('usage.exceeded', {
              organizationId: orgId,
              used: budget.used,
              budget: budget.budget,
            });
          }
        } catch (err) {
          // Non-critical — don't fail the response
          this.logger.error(`Budget check failed in interceptor: ${err}`);
        }
      }),
    );
  }
}
