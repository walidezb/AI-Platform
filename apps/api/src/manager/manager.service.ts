import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys';

export interface TeamStats {
  total: number;
  active: number;
  completed: number;
  notStarted: number;
  avgCompletion: number;
  totalHoursLearned: number;
  onStreakToday: number;
}

export interface EmployeeOverview {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  department: string | null;
  jobTitle: string | null;
  pathTitle: string | null;
  pathDomain: string | null;
  currentMilestone: string | null;
  completionPct: number;
  timeSpentMinutes: number;
  streakDays: number;
  lastActivityAt: Date | null;
  daysSinceActive: number | null;
  isStalled: boolean;
  status: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TeamTrends {
  total?: number;
  active?: number;
  avgCompletion?: number;
  completed?: number;
  totalHoursLearned?: number;
  onStreakToday?: number;
}

export interface TeamStatsWithTrend {
  stats: TeamStats;
  trends: TeamTrends;
}

export interface VelocityPoint {
  userId: string;
  fullName: string;
  department: string | null;
  daysSinceJoined: number;
  completionPct: number;
  timeSpentHours: number;
  status: string;
}

export interface TeamFilterParams {
  department?: string;
  role?: string;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'STALLED';
  search?: string;
  sortBy?: 'name' | 'completionPct' | 'lastActive' | 'streakDays';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TeamOverviewDto {
  stats: TeamStats;
  employees: EmployeeOverview[];
  pagination?: PaginationMeta;
}

export interface TimeSeriesPoint {
  date: string;
  activeUsers: number;
  completions: number;
  hoursLearned: number;
}

export interface DeptCompletion {
  department: string;
  avgCompletion: number;
  totalEmployees: number;
  completed: number;
}

export interface TopPerformer {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  department: string | null;
  jobTitle: string | null;
  completionPct: number;
  timeSpentHours: number;
  exercisesPassed: number;
  streakDays: number;
}

export interface AtRiskLearner {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  department: string | null;
  completionPct: number;
  daysSinceActive: number | null;
  joinedDaysAgo: number;
  riskReason: string;
}

export interface RadarPoint {
  domain: string;
  teamStrength: number;
  teamGap: number;
}

export interface EmployeeDetailDto {
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    department: string | null;
    jobTitle: string | null;
    joinedAt: Date;
  };
  assessment: {
    completedAt: Date | null;
    experienceLevel: string | null;
    strongAreas: string[];
    weakAreas: string[];
    learningGoals: string[];
  } | null;
  path: {
    id: string;
    title: string;
    domain: string;
    totalMilestones: number;
    estimatedHours: number;
    status: string;
  } | null;
  progress: {
    completionPct: number;
    timeSpentHours: number;
    streakDays: number;
    lastActivityAt: Date | null;
    status: string;
    currentMilestone: string | null;
  } | null;
  milestones: Array<{
    id: string;
    sequenceOrder: number;
    title: string;
    description: string | null;
    isLocked: boolean;
    completedAt: Date | null;
    estimatedHours: number;
    modulesTotal: number;
    modulesCompleted: number;
    exercises: Array<{
      exerciseId: string;
      title: string;
      exerciseType: string;
      milestone: string;
      score: number | null;
      passed: boolean;
      attempts: number;
      submittedAt: Date | null;
      status: string;
    }>;
  }>;
  activityByDay: Array<{
    date: string;
    minutes: number;
  }>;
  exerciseResults: Array<{
    exerciseId: string;
    title: string;
    exerciseType: string;
    milestone: string;
    score: number | null;
    passed: boolean;
    attempts: number;
    submittedAt: Date | null;
    status: string;
  }>;
  recentActivity: Array<{
    date: Date;
    action: string;
    detail: string;
    module: string | null;
    type: string;
  }>;
}

@Injectable()
export class ManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Full team overview: aggregate stats + employee list.
   * Scoped to the manager's organizationId.
   */
  async getTeamOverview(orgId: string): Promise<TeamOverviewDto> {
    return this.getTeamOverviewFiltered(orgId, { page: 1, limit: 100 });
  }

  async getTeamOverviewFiltered(
    orgId: string,
    params: TeamFilterParams,
  ): Promise<{
    stats: TeamStats;
    employees: EmployeeOverview[];
    pagination: PaginationMeta;
  }> {
    const filterKey = JSON.stringify(params);
    const cacheKey = CacheKeys.teamOverview(orgId, filterKey);

    return this.cache.getOrSet(
      cacheKey,
      CacheTTL.TEAM_OVERVIEW,
      () => this._fetchTeamOverviewFiltered(orgId, params),
    );
  }

  private async _fetchTeamOverviewFiltered(
    orgId: string,
    params: TeamFilterParams,
  ): Promise<{
    stats: TeamStats;
    employees: EmployeeOverview[];
    pagination: PaginationMeta;
  }> {
    const {
      department,
      role,
      status,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 10,
    } = params;

    // ── Build where clause for User ──
    const userWhere: any = {
      organizationId: orgId,
      role: 'LEARNER',
      ...(department && { department: { name: department } }),
      ...(role && { jobTitle: { contains: role, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // ── Fetch ALL users for stats (unfiltered by status) ──
    const allUsers = await this.prisma.user.findMany({
      where: { organizationId: orgId, role: 'LEARNER' },
      include: {
        department: { select: { name: true } },
        progress: {
          select: {
            status: true,
            overallCompletionPct: true,
            timeSpentMinutes: true,
            streakDays: true,
            lastActivityAt: true,
          },
        },
      },
    });

    // Aggregate stats (always from full team)
    const total = allUsers.length;
    const active = allUsers.filter((u) => u.progress?.status === 'IN_PROGRESS').length;
    const completed = allUsers.filter((u) => u.progress?.status === 'COMPLETED').length;
    const notStarted = allUsers.filter((u) => !u.progress || u.progress.status === 'NOT_STARTED').length;

    const avgCompletion =
      total > 0
        ? Math.round(
            allUsers.reduce((s, u) => s + (u.progress?.overallCompletionPct ?? 0), 0) /
              total,
          )
        : 0;

    const totalHoursLearned = Math.round(
      allUsers.reduce((s, u) => s + (u.progress?.timeSpentMinutes ?? 0), 0) / 60,
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const onStreakToday = allUsers.filter(
      (u) =>
        (u.progress?.streakDays ?? 0) > 0 &&
        u.progress?.lastActivityAt &&
        new Date(u.progress.lastActivityAt) >= sevenDaysAgo,
    ).length;

    // ── Filtered users ──
    const filteredUsers = await this.prisma.user.findMany({
      where: userWhere,
      include: {
        department: { select: { name: true } },
        progress: {
          include: {
            learningPath: { select: { id: true, title: true, domain: true } },
          },
        },
      },
    });

    // Map to employee rows with stalled flag
    let employees: EmployeeOverview[] = await Promise.all(
      filteredUsers.map(async (u) => {
        const p = u.progress;
        const daysSinceActive = p?.lastActivityAt
          ? Math.floor(
              (Date.now() - new Date(p.lastActivityAt).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;
        const isStalled =
          p?.status === 'IN_PROGRESS' &&
          daysSinceActive !== null &&
          daysSinceActive >= 7;

        const currentMilestone = p?.currentMilestoneId
          ? await this.prisma.milestone.findUnique({
              where: { id: p.currentMilestoneId },
              select: { title: true, sequenceOrder: true },
            })
          : null;

        return {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          avatarUrl: u.avatarUrl,
          role: u.role,
          department: u.department?.name ?? null,
          jobTitle: u.jobTitle,
          pathTitle: p?.learningPath?.title ?? null,
          pathDomain: p?.learningPath?.domain ?? null,
          currentMilestone: currentMilestone?.title ?? null,
          completionPct: p?.overallCompletionPct ?? 0,
          timeSpentMinutes: p?.timeSpentMinutes ?? 0,
          streakDays: p?.streakDays ?? 0,
          lastActivityAt: p?.lastActivityAt ?? null,
          daysSinceActive,
          isStalled,
          status: p?.status ?? 'NOT_STARTED',
        };
      }),
    );

    // ── Filter by status (including STALLED pseudo-status) ──
    if (status) {
      employees = employees.filter((e) => {
        if (status === 'STALLED') return e.isStalled;
        if (status === 'IN_PROGRESS') return e.status === 'IN_PROGRESS' && !e.isStalled;
        return e.status === status;
      });
    }

    // ── Sort ──
    employees.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'completionPct':
          cmp = a.completionPct - b.completionPct;
          break;
        case 'lastActive':
          cmp =
            (a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0) -
            (b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0);
          break;
        case 'streakDays':
          cmp = a.streakDays - b.streakDays;
          break;
        default: // 'name'
          cmp = a.fullName.localeCompare(b.fullName);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    // ── Paginate ──
    const totalFiltered = employees.length;
    const totalPages = Math.ceil(totalFiltered / limit) || 1;
    const paginated = employees.slice((page - 1) * limit, page * limit);

    return {
      stats: {
        total,
        active,
        completed,
        notStarted,
        avgCompletion,
        totalHoursLearned,
        onStreakToday,
      },
      employees: paginated,
      pagination: {
        total: totalFiltered,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Completion % grouped by department.
   */
  async getCompletionByDept(orgId: string): Promise<DeptCompletion[]> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: 'LEARNER',
        departmentId: { not: null },
      },
      include: {
        department: { select: { name: true } },
        progress: {
          select: { overallCompletionPct: true, status: true },
        },
      },
    });

    const deptMap: Record<
      string,
      { total: number; sumPct: number; completed: number }
    > = {};

    for (const u of users) {
      const dept = u.department?.name;
      if (!dept) continue;
      if (!deptMap[dept]) deptMap[dept] = { total: 0, sumPct: 0, completed: 0 };
      const p = u.progress;
      if (p) {
        deptMap[dept].total++;
        deptMap[dept].sumPct += p.overallCompletionPct;
        deptMap[dept].completed += p.status === 'COMPLETED' ? 1 : 0;
      }
    }

    return Object.entries(deptMap)
      .map(([dept, data]) => ({
        department: dept,
        avgCompletion:
          data.total > 0 ? Math.round(data.sumPct / data.total) : 0,
        totalEmployees: data.total,
        completed: data.completed,
      }))
      .sort((a, b) => b.avgCompletion - a.avgCompletion);
  }

  /**
   * Top 5 performers.
   */
  async getTopPerformers(orgId: string): Promise<TopPerformer[]> {
    const progress = await this.prisma.userProgress.findMany({
      where: {
        user: { organizationId: orgId },
        status: { not: 'NOT_STARTED' },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            department: { select: { name: true } },
            jobTitle: true,
          },
        },
      },
      orderBy: [
        { overallCompletionPct: 'desc' },
        { timeSpentMinutes: 'asc' },
      ],
      take: 5,
    });

    const userIds = progress.map((p) => p.userId);
    const passedByUser = await this.prisma.exerciseSubmission.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, status: 'PASSED' },
      _count: { id: true },
    });
    const passedMap = new Map(passedByUser.map((r) => [r.userId, r._count.id]));

    return progress.map((p, i) => ({
      rank: i + 1,
      userId: p.user.id,
      fullName: p.user.fullName,
      avatarUrl: p.user.avatarUrl,
      department: p.user.department?.name ?? null,
      jobTitle: p.user.jobTitle,
      completionPct: p.overallCompletionPct,
      timeSpentHours: Math.round((p.timeSpentMinutes / 60) * 10) / 10,
      exercisesPassed: passedMap.get(p.userId) ?? 0,
      streakDays: p.streakDays,
    }));
  }

  /**
   * At-risk learners (< 20% completion after 14 days or 7+ days inactive).
   */
  async getAtRiskLearners(
    orgId: string,
    department?: string,
  ): Promise<AtRiskLearner[]> {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const users = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: 'LEARNER',
        ...(department && { department: { name: department } }),
        createdAt: { lte: fourteenDaysAgo },
      },
      include: {
        department: { select: { name: true } },
        progress: {
          select: {
            overallCompletionPct: true,
            status: true,
            lastActivityAt: true,
            streakDays: true,
          },
        },
      },
    });

    return users
      .filter((u) => {
        const p = u.progress;
        if (!p) return true;
        if (p.status === 'COMPLETED') return false;
        const lowCompletion = p.overallCompletionPct < 20;
        const longInactive =
          !p.lastActivityAt || new Date(p.lastActivityAt) < sevenDaysAgo;
        return lowCompletion || longInactive;
      })
      .map((u) => {
        const p = u.progress;
        const daysSinceActive = p?.lastActivityAt
          ? Math.floor(
              (Date.now() - new Date(p.lastActivityAt).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        return {
          userId: u.id,
          fullName: u.fullName,
          email: u.email,
          avatarUrl: u.avatarUrl,
          department: u.department?.name ?? null,
          completionPct: p?.overallCompletionPct ?? 0,
          daysSinceActive,
          joinedDaysAgo: Math.floor(
            (Date.now() - new Date(u.createdAt).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          riskReason:
            !p || p.status === 'NOT_STARTED'
              ? 'Never started'
              : daysSinceActive !== null && daysSinceActive >= 7
              ? `${daysSinceActive} days inactive`
              : 'Low completion',
        };
      })
      .sort((a, b) => b.joinedDaysAgo - a.joinedDaysAgo);
  }

  /**
   * Skill/domain radar data.
   */
  async getSkillRadar(orgId: string): Promise<RadarPoint[]> {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        organizationId: orgId,
        status: 'COMPLETED',
      },
      select: { skillProfile: true },
    });

    const domainCounts: Record<string, { strong: number; weak: number }> = {};

    for (const a of assessments) {
      const profile = a.skillProfile as any;
      const strong: string[] = profile?.strong_areas ?? [];
      const weak: string[] = profile?.weak_areas ?? [];
      const domains: string[] = profile?.recommended_domains ?? [];

      const all = [...new Set([...strong, ...weak, ...domains])];
      for (const d of all) {
        if (!domainCounts[d]) domainCounts[d] = { strong: 0, weak: 0 };
        if (strong.includes(d)) domainCounts[d].strong++;
        if (weak.includes(d)) domainCounts[d].weak++;
      }
    }

    const total = assessments.length || 1;
    return Object.entries(domainCounts)
      .map(([domain, counts]) => ({
        domain,
        teamStrength: Math.round((counts.strong / total) * 100),
        teamGap: Math.round((counts.weak / total) * 100),
      }))
      .sort(
        (a, b) => b.teamStrength + b.teamGap - (a.teamStrength + a.teamGap),
      )
      .slice(0, 8);
  }

  /**
   * Send motivational email / nudge to an at-risk employee.
   */
  async sendNudge(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Learner not found');
    return { success: true, message: `Nudge sent to ${user.email}` };
  }

  /**
   * Deep-dive employee detail view for a manager.
   */
  async getEmployeeDetail(
    employeeId: string,
    managerId: string,
  ): Promise<EmployeeDetailDto> {
    // 1. Fetch the manager to get their orgId
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
      select: { organizationId: true },
    });
    if (!manager) throw new NotFoundException('Manager not found');

    // 2. Fetch employee — must be in same org
    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        organizationId: manager.organizationId,
      },
      include: {
        department: { select: { name: true } },
        progress: {
          include: {
            learningPath: {
              include: {
                milestones: {
                  orderBy: { sequenceOrder: 'asc' },
                  include: {
                    modules: { orderBy: { sequenceOrder: 'asc' } },
                    exercises: {
                      include: {
                        submissions: {
                          where: { userId: employeeId },
                          orderBy: { createdAt: 'desc' },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or not in your organization',
      );
    }

    const progress = employee.progress;

    // 3. Fetch assessment
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        userId: employeeId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    // 4. Activity log — last 30 days of resource completions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completions = await this.prisma.resourceCompletion.findMany({
      where: {
        userId: employeeId,
        completedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { completedAt: 'desc' },
      include: {
        resource: { select: { title: true, resourceType: true } },
        module: { select: { title: true } },
      },
    });

    // 5. Daily activity for bar chart
    const dailyActivity: Record<string, number> = {};
    for (const c of completions) {
      const key = c.completedAt.toISOString().split('T')[0];
      dailyActivity[key] = (dailyActivity[key] ?? 0) + (c.timeSpentSeconds ?? 0);
    }

    // Fill all 30 days (including zeros)
    const activityByDay = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0];
      return {
        date: key,
        minutes: Math.round((dailyActivity[key] ?? 0) / 60),
      };
    });

    // 6. Exercise results
    const exerciseResults =
      progress?.learningPath?.milestones.flatMap((m) =>
        m.exercises.map((ex) => {
          const lastSub = ex.submissions[0];
          return {
            exerciseId: ex.id,
            title: ex.title,
            exerciseType: ex.exerciseType,
            milestone: m.title,
            score: lastSub?.score ?? null,
            passed: lastSub?.status === 'PASSED',
            attempts: lastSub?.attemptNumber ?? 0,
            submittedAt: lastSub?.createdAt ?? null,
            status: lastSub?.status ?? 'NOT_ATTEMPTED',
          };
        }),
      ) ?? [];

    // 7. Milestone timeline
    const milestones =
      progress?.learningPath?.milestones.map((m) => {
        const completedModules = m.modules.filter((mod) => !mod.isLocked);
        return {
          id: m.id,
          sequenceOrder: m.sequenceOrder,
          title: m.title,
          description: m.description,
          isLocked: m.isLocked,
          completedAt: m.completedAt ?? null,
          estimatedHours: m.estimatedHours,
          modulesTotal: m.modules.length,
          modulesCompleted: completedModules.length,
          exercises: exerciseResults.filter((e) => e.milestone === m.title),
        };
      }) ?? [];

    return {
      user: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        avatarUrl: employee.avatarUrl,
        role: employee.role,
        department: employee.department?.name ?? null,
        jobTitle: employee.jobTitle,
        joinedAt: employee.createdAt,
      },
      assessment: assessment
        ? {
            completedAt: assessment.completedAt,
            experienceLevel: assessment.experienceLevel,
            strongAreas: (assessment.skillProfile as any)?.strong_areas ?? [],
            weakAreas: (assessment.skillProfile as any)?.weak_areas ?? [],
            learningGoals: (assessment.skillProfile as any)?.learning_goals ?? [],
          }
        : null,
      path: progress?.learningPath
        ? {
            id: progress.learningPath.id,
            title: progress.learningPath.title,
            domain: progress.learningPath.domain,
            totalMilestones: progress.learningPath.totalMilestones,
            estimatedHours: progress.learningPath.estimatedHours,
            status: progress.learningPath.status,
          }
        : null,
      progress: progress
        ? {
            completionPct: progress.overallCompletionPct,
            timeSpentHours: Math.round((progress.timeSpentMinutes / 60) * 10) / 10,
            streakDays: progress.streakDays,
            lastActivityAt: progress.lastActivityAt,
            status: progress.status,
            currentMilestone:
              milestones.find((m) => m.id === progress.currentMilestoneId)?.title ?? null,
          }
        : null,
      milestones,
      activityByDay,
      exerciseResults,
      recentActivity: completions.slice(0, 10).map((c) => ({
        date: c.completedAt,
        action: 'Completed resource',
        detail: c.resource.title,
        module: c.module?.title ?? null,
        type: c.resource.resourceType,
      })),
    };
  }

  /**
   * Time series: daily active users + completions + hours
   * for the last N days. Used for dashboard charts.
   */
  async getStatsTimeSeries(
    orgId: string,
    days = 30,
  ): Promise<TimeSeriesPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Resource completions per day (activity proxy)
    const completions = await this.prisma.resourceCompletion.findMany({
      where: {
        completedAt: { gte: startDate },
        user: { organizationId: orgId },
      },
      select: {
        completedAt: true,
        userId: true,
        timeSpentSeconds: true,
      },
    });

    // Group by date
    const byDate: Record<
      string,
      {
        activeUsers: Set<string>;
        completions: number;
        hoursLearned: number;
      }
    > = {};

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      byDate[key] = { activeUsers: new Set(), completions: 0, hoursLearned: 0 };
    }

    for (const c of completions) {
      const key = c.completedAt.toISOString().split('T')[0];
      if (byDate[key]) {
        byDate[key].activeUsers.add(c.userId);
        byDate[key].completions++;
        byDate[key].hoursLearned += (c.timeSpentSeconds ?? 0) / 3600;
      }
    }

    return Object.entries(byDate).map(([date, data]) => ({
      date,
      activeUsers: data.activeUsers.size,
      completions: data.completions,
      hoursLearned: Math.round(data.hoursLearned * 10) / 10,
    }));
  }

  /**
   * CSV export of full team data.
   */
  async exportTeamCsv(orgId: string): Promise<string> {
    const { employees } = await this.getTeamOverview(orgId);

    const header = [
      'Name',
      'Email',
      'Department',
      'Job Title',
      'Status',
      'Completion %',
      'Hours Spent',
      'Streak Days',
      'Last Active',
      'Current Milestone',
    ].join(',');

    const rows = employees.map((e) =>
      [
        `"${e.fullName}"`,
        e.email,
        `"${e.department ?? ''}"`,
        `"${e.jobTitle ?? ''}"`,
        e.status,
        e.completionPct.toFixed(1),
        Math.round((e.timeSpentMinutes ?? 0) / 60),
        e.streakDays,
        e.lastActivityAt ? new Date(e.lastActivityAt).toISOString().split('T')[0] : 'Never',
        `"${e.currentMilestone ?? ''}"`,
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Activity stream for recent events.
   */
  async getRecentActivity(orgId: string, limit = 8) {
    const completions = await this.prisma.completion.findMany({
      where: { user: { organizationId: orgId } },
      include: {
        user: { select: { fullName: true, avatarUrl: true, id: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    const newUsers = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: 'LEARNER',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const activities = [
      ...completions.map((c) => ({
        id: c.id,
        employeeName: c.user.fullName,
        avatarUrl: c.user.avatarUrl,
        action:
          c.entityType === 'MILESTONE'
            ? 'completed milestone'
            : 'completed module',
        type: c.passed ? 'completed' : 'in-progress',
        createdAt: c.completedAt,
      })),
      ...newUsers.map((u) => ({
        id: u.id,
        employeeName: u.fullName,
        avatarUrl: u.avatarUrl,
        action: 'joined the platform',
        type: 'active',
        createdAt: u.createdAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);

    return activities;
  }

  async getTeamStatsWithTrend(orgId: string): Promise<TeamStatsWithTrend> {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenAgo = new Date(now);
    fourteenAgo.setDate(now.getDate() - 14);

    const [currentWeekProgress, lastWeekProgress] = await Promise.all([
      this.prisma.userProgress.findMany({
        where: { user: { organizationId: orgId } },
        select: {
          status: true,
          overallCompletionPct: true,
          timeSpentMinutes: true,
          streakDays: true,
          lastActivityAt: true,
          userId: true,
        },
      }),
      this.prisma.resourceCompletion.findMany({
        where: {
          user: { organizationId: orgId },
          completedAt: { gte: fourteenAgo, lt: sevenDaysAgo },
        },
        select: { userId: true, timeSpentSeconds: true },
      }),
    ]);

    const thisWeekCompletions = await this.prisma.resourceCompletion.findMany({
      where: {
        user: { organizationId: orgId },
        completedAt: { gte: sevenDaysAgo },
      },
      select: { userId: true, timeSpentSeconds: true },
    });

    const total = currentWeekProgress.length;
    const active = currentWeekProgress.filter((p) => p.status === 'IN_PROGRESS').length;
    const completed = currentWeekProgress.filter((p) => p.status === 'COMPLETED').length;
    const notStarted = currentWeekProgress.filter((p) => p.status === 'NOT_STARTED').length;

    const avgCompletion =
      total > 0
        ? Math.round(
            currentWeekProgress.reduce((s, p) => s + p.overallCompletionPct, 0) / total,
          )
        : 0;

    const totalHoursLearned = Math.round(
      currentWeekProgress.reduce((s, p) => s + p.timeSpentMinutes, 0) / 60,
    );

    const onStreakToday = currentWeekProgress.filter(
      (p) =>
        p.streakDays > 0 &&
        p.lastActivityAt &&
        p.lastActivityAt >= sevenDaysAgo,
    ).length;

    const lastWeekActiveUsers = new Set(lastWeekProgress.map((c) => c.userId)).size;
    const thisWeekActiveUsers = new Set(thisWeekCompletions.map((c) => c.userId)).size;

    const lastWeekHours = Math.round(
      lastWeekProgress.reduce((s, c) => s + (c.timeSpentSeconds ?? 0), 0) / 3600,
    );
    const thisWeekHours = Math.round(
      thisWeekCompletions.reduce((s, c) => s + (c.timeSpentSeconds ?? 0), 0) / 3600,
    );

    const trend = (current: number, prior: number): number | undefined => {
      if (prior === 0) return undefined;
      return Math.round(((current - prior) / prior) * 100);
    };

    return {
      stats: {
        total,
        active,
        completed,
        notStarted,
        avgCompletion,
        totalHoursLearned,
        onStreakToday,
      },
      trends: {
        total: undefined,
        active: trend(thisWeekActiveUsers, lastWeekActiveUsers),
        avgCompletion: undefined,
        completed: undefined,
        totalHoursLearned: trend(thisWeekHours, lastWeekHours),
        onStreakToday: undefined,
      },
    };
  }

  async getLearningVelocity(orgId: string): Promise<VelocityPoint[]> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: 'LEARNER',
      },
      include: {
        department: { select: { name: true } },
        progress: {
          select: {
            overallCompletionPct: true,
            status: true,
            timeSpentMinutes: true,
          },
        },
      },
    });

    return users
      .filter((u) => u.createdAt && u.progress)
      .map((u) => {
        const daysSinceJoined = Math.floor(
          (Date.now() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          userId: u.id,
          fullName: u.fullName,
          department: u.department?.name ?? null,
          daysSinceJoined,
          completionPct: u.progress?.overallCompletionPct ?? 0,
          timeSpentHours:
            Math.round(((u.progress?.timeSpentMinutes ?? 0) / 60) * 10) / 10,
          status: u.progress?.status ?? 'NOT_STARTED',
        };
      })
      .filter((p) => p.daysSinceJoined >= 0)
      .sort((a, b) => a.daysSinceJoined - b.daysSinceJoined);
  }
}
