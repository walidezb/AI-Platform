import { ForbiddenException } from '@nestjs/common';

export function assertOrgScope(
  resourceOrgId: string | null | undefined,
  requestOrgId: string,
  resourceName = 'Resource',
): void {
  if (!resourceOrgId || resourceOrgId !== requestOrgId) {
    throw new ForbiddenException(
      `${resourceName} does not belong to your organization`,
    );
  }
}
