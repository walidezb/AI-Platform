'use client';

import React, { useState, useMemo } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Search,
  Users,
  AlertTriangle,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/date';
import { EmployeeOverview as Employee, PaginationMeta } from '@/hooks/manager/useTeamOverview';

const STATUS_CONFIG = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-slate-800 text-slate-400 border border-slate-700' },
  IN_PROGRESS: { label: 'Active', color: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  STALLED: { label: 'Stalled', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
};

export function EmployeeTable({
  employees,
  onViewEmployee,
  serverPagination,
  onPageChange,
}: {
  employees: Employee[];
  onViewEmployee: (id: string) => void;
  serverPagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: 'fullName',
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xs bg-indigo-500/20 text-indigo-300 font-bold">
              {row.original.fullName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-slate-200">{row.original.fullName}</p>
            <p className="text-xs text-slate-400">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => (
        <span className="text-sm text-slate-400">
          {row.original.department ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'currentMilestone',
      header: 'Current Milestone',
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[160px] block text-slate-300">
          {row.original.currentMilestone ?? (
            <span className="text-slate-500 italic">Not started</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'completionPct',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-slate-400 hover:text-slate-200"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Progress
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${row.original.completionPct}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 w-8 text-right tabular-nums">
            {Math.round(row.original.completionPct)}%
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'lastActivityAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-slate-400 hover:text-slate-200"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Last Active
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-slate-400">
          {row.original.lastActivityAt
            ? formatRelativeTime(row.original.lastActivityAt)
            : 'Never'}
        </span>
      ),
    },
    {
      accessorKey: 'streakDays',
      header: 'Streak',
      cell: ({ row }) => (
        <span className="text-sm flex items-center gap-1 text-slate-300">
          {row.original.streakDays > 0 ? (
            <>
              <span>🔥</span>
              {row.original.streakDays}d
            </>
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </span>
      ),
    },
    {
      id: 'statusBadge',
      header: 'Status',
      cell: ({ row }) => {
        const key = row.original.isStalled ? 'STALLED' : row.original.status;
        const cfg = STATUS_CONFIG[key as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.NOT_STARTED;
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-md',
              'text-xs font-medium',
              cfg.color,
            )}
          >
            {row.original.isStalled && (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
          onClick={(e) => {
            e.stopPropagation();
            onViewEmployee(row.original.id);
          }}
        >
          View →
        </Button>
      ),
    },
  ];

  // Client-side filter fallback if serverPagination is not provided
  const filtered = useMemo(() => {
    if (serverPagination) return employees;
    if (!filter) return employees;
    const q = filter.toLowerCase();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q),
    );
  }, [employees, filter, serverPagination]);

  const displayRows = useMemo(() => {
    if (serverPagination) return employees;
    return filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [employees, filtered, page, serverPagination]);

  const table = useReactTable({
    data: displayRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  const clientTotalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Search bar — only render if not using serverPagination */}
      {!serverPagination && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name, email, or department..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            className="pl-9 bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
          />
        </div>
      )}

      {/* Desktop: Table */}
      <div className="hidden md:block rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent border-slate-800 bg-slate-900/80">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-slate-400 h-10">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <Users className="h-8 w-8 text-slate-600" />
                    <p className="text-sm font-medium text-slate-300">No employees found</p>
                    <p className="text-xs text-slate-500">
                      Try a different search term or filter criteria
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-slate-800/50 border-slate-800/60 transition-colors"
                  onClick={() => onViewEmployee(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Card List */}
      <div className="md:hidden space-y-3">
        {displayRows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 rounded-xl border border-slate-800 bg-slate-900/40">
            <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No employees found</p>
            <p className="text-xs text-slate-500 mt-1">Try a different search or filter</p>
          </div>
        ) : (
          displayRows.map((emp) => {
            const key = emp.isStalled ? 'STALLED' : emp.status;
            const cfg = STATUS_CONFIG[key as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.NOT_STARTED;

            return (
              <div
                key={emp.id}
                onClick={() => onViewEmployee?.(emp.id)}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 cursor-pointer hover:border-indigo-500/30 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={emp.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs bg-indigo-500/20 text-indigo-300 font-bold">
                      {emp.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-slate-200">
                      {emp.fullName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {emp.department ?? 'No Dept'} · {emp.jobTitle ?? 'Employee'}
                    </p>
                  </div>
                  {/* Status badge */}
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium shrink-0', cfg.color)}>
                    {emp.isStalled && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {cfg.label}
                  </span>
                </div>

                {/* Progress bar */}
                {(emp.currentMilestone || emp.completionPct !== undefined) && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="truncate max-w-[60%]">{emp.currentMilestone ?? 'Learning Path'}</span>
                      <span className="font-medium text-slate-200">
                        {Math.round(emp.completionPct)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${emp.completionPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <span className="flex items-center gap-1">
                    🔥 {emp.streakDays}d streak
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {emp.lastActivityAt
                      ? formatRelativeTime(emp.lastActivityAt)
                      : 'Never'
                    }
                  </span>
                  <span className="ms-auto text-indigo-400 text-xs font-medium">
                    View →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {serverPagination ? (
        serverPagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-400 pt-2">
            <span>
              Page {serverPagination.page} of {serverPagination.totalPages} ({serverPagination.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!serverPagination.hasPrev}
                onClick={() => onPageChange?.(serverPagination.page - 1)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!serverPagination.hasNext}
                onClick={() => onPageChange?.(serverPagination.page + 1)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Next
              </Button>
            </div>
          </div>
        )
      ) : (
        clientTotalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-400 pt-2">
            <span>
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} employees
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= clientTotalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Next
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
