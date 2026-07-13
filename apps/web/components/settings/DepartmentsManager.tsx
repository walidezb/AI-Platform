'use client';

import React, { useState } from 'react';
import { Building2, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDepartments, Department, RoleDefinition } from '@/hooks/manager/useDepartments';
import { RoleCard } from './RoleCard';
import { TagInput } from '@/components/ui/TagInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DepartmentsManager() {
  const {
    departments,
    isDepartmentsLoading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createRole,
    updateRole,
    deleteRole,
  } = useDepartments();

  // --- Department Dialog States ---
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [deptDialogMode, setDeptDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [isSavingDept, setIsSavingDept] = useState(false);

  // --- Role Dialog States ---
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleTitle, setRoleTitle] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleFocusAreas, setRoleFocusAreas] = useState<string[]>([]);
  const [roleDeptId, setRoleDeptId] = useState<string>('');
  const [isSavingRole, setIsSavingRole] = useState(false);

  // --- Delete Alert States ---
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'department' | 'role'>('department');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [deleteTargetUserCount, setDeleteTargetUserCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Suggestion Helpers ---
  const getFocusAreaSuggestions = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return [];
    const name = dept.name.toLowerCase();
    if (name.includes('engineer') || name.includes('tech') || name.includes('dev') || name.includes('soft')) {
      return ["React", "TypeScript", "Node.js", "Python", "AWS", "Docker", "Testing", "System Design", "Kubernetes", "SQL"];
    }
    if (name.includes('product') || name.includes('design') || name.includes('ux') || name.includes('ui')) {
      return ["Product Strategy", "Agile", "Analytics", "Roadmapping", "UX Research", "Figma", "Prototyping", "User Journeys"];
    }
    if (name.includes('sale') || name.includes('market') || name.includes('growth') || name.includes('biz')) {
      return ["CRM", "Negotiation", "Presentation", "Salesforce", "Prospecting", "Lead Generation", "Copywriting", "SEO"];
    }
    if (name.includes('hr') || name.includes('people') || name.includes('talent') || name.includes('recruit')) {
      return ["Recruitment", "Performance Management", "Employment Law", "Compensation", "Onboarding", "HRIS", "Culture"];
    }
    return ["Communication", "Leadership", "Project Management", "Problem Solving", "Time Management", "Collaboration"];
  };

  // --- Department CRUD Actions ---
  const handleOpenAddDept = () => {
    setDeptDialogMode('create');
    setSelectedDeptId(null);
    setDeptName('');
    setDeptDescription('');
    setIsDeptDialogOpen(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    setDeptDialogMode('edit');
    setSelectedDeptId(dept.id);
    setDeptName(dept.name);
    setDeptDescription(dept.description || '');
    setIsDeptDialogOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      toast.error('Department name is required');
      return;
    }
    setIsSavingDept(true);
    try {
      if (deptDialogMode === 'create') {
        await createDepartment({ name: deptName, description: deptDescription || undefined });
        toast.success(`Department "${deptName}" created successfully!`);
      } else {
        if (selectedDeptId) {
          await updateDepartment({
            id: selectedDeptId,
            dto: { name: deptName, description: deptDescription || undefined }
          });
          toast.success(`Department "${deptName}" updated successfully!`);
        }
      }
      setIsDeptDialogOpen(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save department';
      toast.error(errorMsg);
    } finally {
      setIsSavingDept(false);
    }
  };

  const handleConfirmDeleteDept = (dept: Department) => {
    setDeleteType('department');
    setDeleteTargetId(dept.id);
    setDeleteTargetName(dept.name);
    setDeleteTargetUserCount(dept._count?.users || 0);
    setIsDeleteDialogOpen(true);
  };

  // --- Role CRUD Actions ---
  const handleOpenAddRole = (deptId: string) => {
    setRoleDialogMode('create');
    setSelectedRoleId(null);
    setRoleTitle('');
    setRoleDescription('');
    setRoleFocusAreas([]);
    setRoleDeptId(deptId);
    setIsRoleDialogOpen(true);
  };

  const handleOpenEditRole = (role: RoleDefinition) => {
    setRoleDialogMode('edit');
    setSelectedRoleId(role.id);
    setRoleTitle(role.title);
    setRoleDescription(role.description || '');
    setRoleFocusAreas(role.learningFocusAreas || []);
    setRoleDeptId(role.departmentId || '');
    setIsRoleDialogOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim()) {
      toast.error('Role title is required');
      return;
    }
    if (!roleDeptId) {
      toast.error('Please assign a department to this role');
      return;
    }
    if (roleFocusAreas.length === 0) {
      toast.error('Please add at least one learning focus area');
      return;
    }
    setIsSavingRole(true);
    try {
      if (roleDialogMode === 'create') {
        await createRole({
          title: roleTitle,
          description: roleDescription || undefined,
          learningFocusAreas: roleFocusAreas,
          departmentId: roleDeptId,
        });
        toast.success(`Role "${roleTitle}" created successfully!`);
      } else {
        if (selectedRoleId) {
          await updateRole({
            id: selectedRoleId,
            dto: {
              title: roleTitle,
              description: roleDescription || undefined,
              learningFocusAreas: roleFocusAreas,
            }
          });
          toast.success(`Role "${roleTitle}" updated successfully!`);
        }
      }
      setIsRoleDialogOpen(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save role';
      toast.error(errorMsg);
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleConfirmDeleteRole = (role: RoleDefinition) => {
    setDeleteType('role');
    setDeleteTargetId(role.id);
    setDeleteTargetName(role.title);
    setDeleteTargetUserCount(0);
    setIsDeleteDialogOpen(true);
  };

  // --- Unified Delete Action ---
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      if (deleteType === 'department') {
        await deleteDepartment(deleteTargetId);
        toast.success(`Department "${deleteTargetName}" deleted successfully.`);
      } else {
        await deleteRole(deleteTargetId);
        toast.success(`Role "${deleteTargetName}" deleted successfully.`);
      }
      setIsDeleteDialogOpen(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : `Failed to delete ${deleteType}`;
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDepartmentsLoading) {
    return (
      <div className="flex items-center justify-center p-12 border border-slate-800 bg-slate-900/10 rounded-xl">
        <Loader2 className="h-6 w-6 animate-spin text-primary shrink-0" />
        <span className="ml-3 text-sm text-slate-400 font-semibold">Loading organization structure...</span>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No departments yet"
        description="Create departments to organize your team and help the AI generate targeted learning paths."
        action={{ label: 'Add First Department', onClick: handleOpenAddDept }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Organization Structure</h3>
          <p className="text-muted-foreground text-xs">
            Manage your company departments and specific employee learning focus templates.
          </p>
        </div>
        <Button 
          onClick={handleOpenAddDept} 
          className="bg-gradient-primary border-0 text-white font-bold text-xs"
        >
          <Plus className="h-4 w-4 mr-1 shrink-0" /> Add Department
        </Button>
      </div>

      <Accordion className="w-full space-y-4">
        {departments.map((dept) => (
          <AccordionItem 
            key={dept.id} 
            value={dept.id}
            className="bg-slate-950/20 border border-border rounded-xl px-4 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{dept.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {dept._count.users} {dept._count.users === 1 ? 'employee' : 'employees'} · {dept.roleDefinitions.length} {dept.roleDefinitions.length === 1 ? 'role' : 'roles'}
                  </p>
                </div>
              </div>
              {/* Edit + Delete Action triggers */}
              <div className="flex gap-1 mr-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleOpenEditDept(dept)}
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleConfirmDeleteDept(dept)}
                  className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-slate-900"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-1 border-t border-slate-900/40">
              <div className="pl-11 space-y-3">
                {dept.description && (
                  <p className="text-xs text-slate-400 italic mb-4 leading-relaxed">
                    {dept.description}
                  </p>
                )}

                <div className="space-y-3">
                  {dept.roleDefinitions.map((role) => (
                    <RoleCard 
                      key={role.id} 
                      role={role} 
                      onEdit={handleOpenEditRole} 
                      onDelete={handleConfirmDeleteRole} 
                    />
                  ))}
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOpenAddRole(dept.id)}
                  className="bg-slate-950 border-slate-800 text-xs font-semibold text-slate-300 mt-2"
                >
                  <Plus className="h-3.5 w-3.5 mr-1 shrink-0" /> Add Role
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* --- ADD/EDIT DEPARTMENT DIALOG --- */}
      <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white">
          <form onSubmit={handleSaveDept}>
            <DialogHeader>
              <DialogTitle className="text-white font-bold">
                {deptDialogMode === 'create' ? 'Create Department' : 'Edit Department'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Departments organize your company structure and define learning focus aggregates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name" className="text-xs font-bold text-slate-300">Department Name</Label>
                <Input
                  id="dept-name"
                  placeholder="e.g. Engineering, Sales"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dept-desc" className="text-xs font-bold text-slate-300">Description (Optional)</Label>
                <Textarea
                  id="dept-desc"
                  placeholder="Describe the department's mandate..."
                  value={deptDescription}
                  onChange={(e) => setDeptDescription(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDeptDialogOpen(false)}
                className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSavingDept}
                className="bg-gradient-primary border-0 text-white font-bold text-xs"
              >
                {isSavingDept ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                    Saving...
                  </>
                ) : (
                  'Save Department'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- ADD/EDIT ROLE DIALOG --- */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-lg">
          <form onSubmit={handleSaveRole}>
            <DialogHeader>
              <DialogTitle className="text-white font-bold">
                {roleDialogMode === 'create' ? 'Create Role' : 'Edit Role'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Roles set template skill focus areas used by the AI to build custom paths.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role-title" className="text-xs font-bold text-slate-300">Role Title</Label>
                <Input
                  id="role-title"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-dept" className="text-xs font-bold text-slate-300">Department</Label>
                {roleDialogMode === 'create' ? (
                  // Select is disabled or pre-selected
                  <Select value={roleDeptId} onValueChange={(val) => setRoleDeptId(val || '')}>
                    <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-300">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-white">
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 text-xs">
                    {departments.find(d => d.id === roleDeptId)?.name || 'Unassigned'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-desc" className="text-xs font-bold text-slate-300">Description (Optional)</Label>
                <Textarea
                  id="role-desc"
                  placeholder="A brief summary of role requirements..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Learning Focus Areas (Max 15)</Label>
                <TagInput
                  value={roleFocusAreas}
                  onChange={setRoleFocusAreas}
                  suggestions={getFocusAreaSuggestions(roleDeptId)}
                  placeholder="Type topic (e.g. React) and press enter"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsRoleDialogOpen(false)}
                className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSavingRole}
                className="bg-gradient-primary border-0 text-white font-bold text-xs"
              >
                {isSavingRole ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                    Saving...
                  </>
                ) : (
                  'Save Role'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- CONFIRM DELETE ALERT DIALOG --- */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bold">
              Delete {deleteType === 'department' ? 'Department' : 'Role'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-xs">
              {deleteType === 'department' ? (
                deleteTargetUserCount > 0 ? (
                  <span className="text-destructive font-semibold">
                    Warning: Department &quot;{deleteTargetName}&quot; currently has {deleteTargetUserCount} employee(s) assigned. You must reassign them to another department before deleting this department.
                  </span>
                ) : (
                  `Are you sure you want to delete department "${deleteTargetName}"? This action cannot be undone.`
                )
              ) : (
                `Are you sure you want to delete role template "${deleteTargetName}"? This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting || (deleteType === 'department' && deleteTargetUserCount > 0)}
              className="bg-destructive border-0 text-white font-bold hover:bg-destructive/90 text-xs disabled:opacity-40"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
