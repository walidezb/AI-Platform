export const CacheKeys = {
  // Manager: team overview (invalidate on progress update)
  teamOverview: (orgId: string, filters: string) =>
    `team:${orgId}:overview:${filters}`,

  // Learning paths (invalidate on path update)
  path: (pathId: string) =>
    `path:${pathId}`,

  pathList: (orgId: string, userId: string) =>
    `paths:${orgId}:${userId}`,

  // Org stats (invalidate on any update)
  orgStats: (orgId: string) =>
    `org:${orgId}:stats`,

  // Resume: last active module (invalidate on completion)
  resumePoint: (userId: string) =>
    `resume:${userId}`,

  // Usage dashboard (invalidate on new usage log)
  usageDashboard: (orgId: string) =>
    `usage:${orgId}:dashboard`,

  // Admin stats (invalidate on org changes)
  adminStats: () => 'admin:stats',
};

// TTLs (seconds)
export const CacheTTL = {
  TEAM_OVERVIEW: 60, // 1 minute
  PATH: 5 * 60, // 5 minutes
  PATH_LIST: 2 * 60, // 2 minutes
  ORG_STATS: 2 * 60, // 2 minutes
  RESUME_POINT: 30, // 30 seconds
  USAGE_DASHBOARD: 5 * 60, // 5 minutes
  ADMIN_STATS: 2 * 60, // 2 minutes
};
