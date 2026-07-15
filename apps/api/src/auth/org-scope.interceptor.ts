import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class OrgScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip for public routes and internal service calls
    if (!user || user.id === 'internal') return next.handle();

    // Inject organizationId into request for use in services
    request.organizationId = user.organizationId;

    // For PLATFORM_ADMIN: allow orgId override via header
    // X-Org-Override: {orgId} (admin viewing another org's data)
    if (user.role === 'PLATFORM_ADMIN') {
      const orgOverride = request.headers['x-org-override'];
      if (orgOverride) {
        request.organizationId = orgOverride;
      }
    }

    return next.handle();
  }
}
