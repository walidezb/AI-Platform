import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface RoleDefinition {
  id: string;
  organizationId: string;
  departmentId: string | null;
  title: string;
  description: string | null;
  learningFocusAreas: string[];
  createdAt: string;
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
  roleDefinitions: RoleDefinition[];
  _count: {
    users: number;
  };
}

export function useDepartments() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: Department[] }>('/departments');
      return res.data;
    },
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: RoleDefinition[] }>('/departments/roles');
      return res.data;
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: async (dto: { name: string; description?: string }) => {
      const client = createApiClient(getToken);
      return client.post<{ success: boolean; data: Department }>('/departments', dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: { name?: string; description?: string } }) => {
      const client = createApiClient(getToken);
      return client.patch<{ success: boolean; data: Department }>(`/departments/${id}`, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = createApiClient(getToken);
      return client.delete<{ success: boolean; message: string }>(`/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (dto: { title: string; description?: string; learningFocusAreas: string[]; departmentId?: string }) => {
      const client = createApiClient(getToken);
      return client.post<{ success: boolean; data: RoleDefinition }>('/departments/roles', dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: { title?: string; description?: string; learningFocusAreas?: string[] } }) => {
      const client = createApiClient(getToken);
      return client.patch<{ success: boolean; data: RoleDefinition }>(`/departments/roles/${id}`, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = createApiClient(getToken);
      return client.delete<{ success: boolean; message: string }>(`/departments/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  return {
    departments: departmentsQuery.data ?? [],
    isDepartmentsLoading: departmentsQuery.isLoading,
    roles: rolesQuery.data ?? [],
    isRolesLoading: rolesQuery.isLoading,
    createDepartment: createDeptMutation.mutateAsync,
    isCreatingDept: createDeptMutation.isPending,
    updateDepartment: updateDeptMutation.mutateAsync,
    isUpdatingDept: updateDeptMutation.isPending,
    deleteDepartment: deleteDeptMutation.mutateAsync,
    isDeletingDept: deleteDeptMutation.isPending,
    createRole: createRoleMutation.mutateAsync,
    isCreatingRole: createRoleMutation.isPending,
    updateRole: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    deleteRole: deleteRoleMutation.mutateAsync,
    isDeletingRole: deleteRoleMutation.isPending,
  };
}
