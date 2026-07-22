import React, { ReactNode } from 'react';
import { FileText, Play, PenTool, HelpCircle, BookOpen } from 'lucide-react';

export function getModuleTypeIcon(type: string): ReactNode {
  const icons: Record<string, ReactNode> = {
    READING: <FileText className="h-4 w-4 text-blue-400" />,
    VIDEO: <Play className="h-4 w-4 text-red-400" />,
    EXERCISE: <PenTool className="h-4 w-4 text-amber-400" />,
    QUIZ: <HelpCircle className="h-4 w-4 text-violet-400" />,
  };
  return icons[type] ?? <BookOpen className="h-4 w-4 text-primary" />;
}
