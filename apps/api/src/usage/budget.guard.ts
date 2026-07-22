import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { UsageService } from './usage.service';
import type { User } from '@prisma/client';

@Injectable()
export class BudgetGuard implements CanActivate {
  constructor(private readonly usageService: UsageService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    // Only enforce for authenticated learner/manager actions
    if (!user?.organizationId) return true;
    if (user.role === 'PLATFORM_ADMIN') return true;

    // Check budget — throws 402 if exceeded
    await this.usageService.checkAndEnforceBudget(user.organizationId);
    return true;
  }
}
