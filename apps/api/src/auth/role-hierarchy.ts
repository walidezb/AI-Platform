export const ROLE_HIERARCHY: Record<string, number> = {
  LEARNER: 0,
  MANAGER: 1,
  ORG_ADMIN: 2,
  PLATFORM_ADMIN: 3,
};

export function hasRequiredRole(
  userRole: string,
  requiredRoles: string[]
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  return requiredRoles.some(role => {
    const requiredLevel = ROLE_HIERARCHY[role] ?? 999;
    return userLevel >= requiredLevel;
  });
}
