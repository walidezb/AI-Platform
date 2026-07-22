import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/format';
import { ExerciseSubmissionItem } from '@/hooks/learner/useExercise';

export function PreviousSubmissions({
  submissions,
}: {
  submissions: ExerciseSubmissionItem[];
}) {
  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Submission History ({submissions.length})
      </h3>
      <div className="space-y-2">
        {submissions.map((sub) => (
          <Card key={sub.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Attempt #{sub.attemptNumber}</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant={sub.status === 'PASSED' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {sub.status === 'PASSED'
                    ? '✅ Passed'
                    : sub.status === 'FAILED'
                      ? '❌ Failed'
                      : '⏳ Evaluating'}
                </Badge>
                {sub.score !== undefined && sub.score !== null && (
                  <span className="font-bold text-xs">{sub.score}%</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(sub.createdAt)}
                </span>
              </div>
            </div>
            {sub.feedback && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {sub.feedback}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
