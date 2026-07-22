'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Headphones,
  Loader2,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ModuleResource, useMarkResourceComplete } from '@/hooks/learner/useModule';

interface ResourceCardProps {
  resource: ModuleResource;
  index: number;
  startTime: React.MutableRefObject<number>;
}

export function ResourceCard({
  resource,
  index,
  startTime,
}: ResourceCardProps) {
  const [showEmbed, setShowEmbed] = useState(false);
  const markComplete = useMarkResourceComplete();

  const isVideo = resource.resourceType === 'VIDEO';
  const isComplete = resource.isCompleted;

  const handleMarkComplete = () => {
    if (isComplete) return;
    const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
    markComplete.mutate({
      resourceId: resource.id,
      timeSpentSeconds: timeSpent,
    });
  };

  // Extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };
  const youtubeId = isVideo ? getYouTubeId(resource.url) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card
        className={cn(
          'overflow-hidden transition-all duration-200',
          isComplete && 'border-emerald-500/30 bg-emerald-500/5',
        )}
      >
        {/* ── VIDEO RESOURCE ── */}
        {isVideo && (
          <div className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Play className="h-4 w-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-snug">
                  {resource.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {resource.sourcePlatform}
                  {resource.durationMinutes && (
                    <> · {resource.durationMinutes} min</>
                  )}
                </p>
              </div>
              {isComplete && (
                <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </div>
              )}
            </div>

            {resource.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {resource.description}
              </p>
            )}

            {/* YouTube embed */}
            {youtubeId && (
              <div>
                {!showEmbed ? (
                  // Thumbnail with play button
                  <div
                    className="relative aspect-video rounded-lg overflow-hidden bg-secondary cursor-pointer group"
                    onClick={() => setShowEmbed(true)}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                      alt={resource.title}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-14 w-14 rounded-full bg-red-600/90 flex items-center justify-center group-hover:bg-red-600 transition-colors shadow-lg">
                        <Play className="h-6 w-6 text-white ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                      YouTube
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                      title={resource.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Non-YouTube video link */}
            {!youtubeId && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Video
              </a>
            )}

            {/* Mark as watched */}
            <Button
              size="sm"
              variant={isComplete ? 'secondary' : 'default'}
              className={cn('w-full', !isComplete && 'bg-gradient-primary')}
              disabled={isComplete || markComplete.isPending}
              onClick={handleMarkComplete}
            >
              {isComplete ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                  Watched
                </>
              ) : markComplete.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-2" />
                  Mark as Watched
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── ARTICLE / DOCUMENTATION / PODCAST RESOURCE ── */}
        {!isVideo && (
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              {/* Type icon */}
              <div
                className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  resource.resourceType === 'DOCUMENTATION'
                    ? 'bg-blue-500/10'
                    : resource.resourceType === 'PODCAST'
                      ? 'bg-violet-500/10'
                      : 'bg-emerald-500/10',
                )}
              >
                {resource.resourceType === 'DOCUMENTATION' ? (
                  <FileText className="h-4 w-4 text-blue-400" />
                ) : resource.resourceType === 'PODCAST' ? (
                  <Headphones className="h-4 w-4 text-violet-400" />
                ) : (
                  <BookOpen className="h-4 w-4 text-emerald-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-snug">
                  {resource.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  {resource.sourcePlatform}
                  {resource.durationMinutes && (
                    <>
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      {resource.durationMinutes} min read
                    </>
                  )}
                </p>
              </div>

              {isComplete && (
                <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </div>
              )}
            </div>

            {/* Description */}
            {resource.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {resource.description}
              </p>
            )}

            {/* URL preview card */}
            <div className="bg-secondary/50 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground truncate">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{resource.url}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'flex-1',
                )}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Open{' '}
                {resource.resourceType === 'DOCUMENTATION'
                  ? 'Docs'
                  : resource.resourceType === 'PODCAST'
                    ? 'Podcast'
                    : 'Article'}
              </a>

              <Button
                size="sm"
                variant={isComplete ? 'secondary' : 'default'}
                className={cn('flex-1', !isComplete && 'bg-gradient-primary')}
                disabled={isComplete || markComplete.isPending}
                onClick={handleMarkComplete}
              >
                {isComplete ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                    Done
                  </>
                ) : markComplete.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-2" />
                    Mark as Read
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
