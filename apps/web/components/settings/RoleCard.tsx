'use client';

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoleDefinition } from '@/hooks/manager/useDepartments';

interface RoleCardProps {
  role: RoleDefinition;
  onEdit: (role: RoleDefinition) => void;
  onDelete: (role: RoleDefinition) => void;
}

export function RoleCard({ role, onEdit, onDelete }: RoleCardProps) {
  return (
    <div className="flex items-start justify-between p-3.5 rounded-lg bg-slate-900/40 border border-slate-850 hover:border-slate-800 transition-colors">
      <div>
        <p className="font-bold text-sm text-white">{role.title}</p>
        {role.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{role.description}</p>
        )}
        {/* Focus areas as tags */}
        {role.learningFocusAreas && role.learningFocusAreas.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {role.learningFocusAreas.map(area => (
              <span 
                key={area}
                className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold"
              >
                {area}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1 shrink-0 ml-2">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => onEdit(role)}
          className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-900"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => onDelete(role)}
          className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-slate-900"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
