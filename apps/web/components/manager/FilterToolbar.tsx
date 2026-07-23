'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { TeamFilters } from '@/hooks/manager/useTeamOverview';

type FilterToolbarProps = {
  departments: string[];
  roles?: string[];
  filters: TeamFilters;
  total: number;
  allTotal: number;
  onChange: (f: TeamFilters) => void;
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'IN_PROGRESS', label: 'Active' },
  { value: 'STALLED', label: '⚠️ Stalled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NOT_STARTED', label: 'Not Started' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'completionPct', label: 'Progress' },
  { value: 'lastActive', label: 'Last Active' },
  { value: 'streakDays', label: 'Streak' },
];

export function FilterToolbar({
  departments,
  roles = [],
  filters,
  total,
  allTotal,
  onChange,
}: FilterToolbarProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    if (debouncedSearch !== (filters.search ?? '')) {
      onChange({ ...filters, search: debouncedSearch || undefined, page: 1 });
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [debouncedSearch]);

  const activeFilters: { key: keyof TeamFilters; label: string }[] = [
    ...(filters.department
      ? [{ key: 'department' as const, label: `Dept: ${filters.department}` }]
      : []),
    ...(filters.role
      ? [{ key: 'role' as const, label: `Role: ${filters.role}` }]
      : []),
    ...(filters.status
      ? [
          {
            key: 'status' as const,
            label:
              STATUS_OPTIONS.find((o) => o.value === filters.status)?.label ??
              filters.status,
          },
        ]
      : []),
    ...(filters.search
      ? [{ key: 'search' as const, label: `"${filters.search}"` }]
      : []),
  ];

  const clearAll = () => {
    setSearchInput('');
    onChange({ sortBy: filters.sortBy, sortOrder: filters.sortOrder, page: 1 });
  };

  const isFiltered = activeFilters.length > 0;

  return (
    <div className="space-y-3">
      {/* ── Main filter row ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9 h-9 border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500"
            id="team-search"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Department filter */}
        <Select
          value={filters.department ?? '__all__'}
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          onValueChange={(v: any) =>
            onChange({
              ...filters,
              department: v && v !== '__all__' ? v : undefined,
              page: 1,
            })
          }
        >
          <SelectTrigger className="h-9 w-[160px] border-slate-800 bg-slate-950 text-slate-100" id="dept-filter">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
            <SelectItem value="__all__">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Role filter */}
        <Select
          value={filters.role ?? '__all__'}
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          onValueChange={(v: any) =>
            onChange({
              ...filters,
              role: v && v !== '__all__' ? v : undefined,
              page: 1,
            })
          }
        >
          <SelectTrigger className="h-9 w-[150px] border-slate-800 bg-slate-950 text-slate-100" id="role-filter">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
            <SelectItem value="__all__">All Roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filters.status ?? '__all__'}
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          onValueChange={(v: any) =>
            onChange({
              ...filters,
              status: v && v !== '__all__' ? v : undefined,
              page: 1,
            })
          }
        >
          <SelectTrigger className="h-9 w-[150px] border-slate-800 bg-slate-950 text-slate-100" id="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value || '__all__'} value={o.value || '__all__'}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ms-auto">
          <span className="text-xs text-muted-foreground shrink-0">Sort by</span>
          <Select
            value={filters.sortBy ?? 'name'}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            onValueChange={(v: any) =>
              onChange({ ...filters, sortBy: v, page: 1 })
            }
          >
            <SelectTrigger className="h-9 w-[130px] border-slate-800 bg-slate-950 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Asc / Desc toggle */}
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0 border-slate-800 bg-slate-950 text-slate-100 hover:bg-slate-800"
            onClick={() =>
              onChange({
                ...filters,
                sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc',
                page: 1,
              })
            }
          >
            {filters.sortOrder === 'desc' ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <ArrowUpAZ className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* ── Active filter chips row ── */}
      <AnimatePresence>
        {(isFiltered || total !== allTotal) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap overflow-hidden pt-1"
          >
            {/* Result count */}
            <span className="text-xs text-muted-foreground">
              Showing <strong className="text-foreground">{total}</strong> of{' '}
              <strong className="text-foreground">{allTotal}</strong> employees
            </span>

            {/* Filter chips */}
            {activeFilters.map((f) => (
              <motion.button
                type="button"
                key={f.key}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={() =>
                  onChange({ ...filters, [f.key]: undefined, page: 1 })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                {f.label}
                <X className="h-3 w-3" />
              </motion.button>
            ))}

            {/* Clear all */}
            {activeFilters.length > 1 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Clear all
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
