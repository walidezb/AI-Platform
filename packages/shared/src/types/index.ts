export type UserRole = 'LEARNER' | 'MANAGER' | 'ORG_ADMIN' | 'PLATFORM_ADMIN';
export type PlanTier = 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type PathStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type ModuleType = 'READING' | 'VIDEO' | 'EXERCISE' | 'QUIZ';
export type ResourceType = 'ARTICLE' | 'VIDEO' | 'DOCUMENTATION' | 'PODCAST';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
