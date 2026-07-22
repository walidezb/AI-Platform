'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAssessmentDraft, DraftMessage } from '@/hooks/onboarding/useAssessmentDraft';
import { formatRelativeTime } from '@/lib/utils/date';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  token: string;
  user: unknown;
}

export function ChatInterface({ token }: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Draft restore states
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoredMessages, setRestoredMessages] = useState<DraftMessage[] | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string>('');

  const { saveDraft, clearDraft } = useAssessmentDraft(assessmentId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Save draft after message updates
  useEffect(() => {
    if (messages.length > 0 && assessmentId) {
      saveDraft(messages, isComplete);
    }
  }, [messages, isComplete, assessmentId, saveDraft]);

  // Clear draft when completed
  useEffect(() => {
    if (isComplete && assessmentId) {
      clearDraft();
    }
  }, [isComplete, assessmentId, clearDraft]);

  // Initialize assessment session on mount
  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch('/api/assessment/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ onboardingToken: token }),
        });

        if (!res.ok) {
          throw new Error('Failed to initialize session');
        }

        const json = await res.json();
        if (json.success && json.data) {
          const currentId = json.data.assessmentId;
          setAssessmentId(currentId);

          // Check if a saved draft exists for this assessment
          try {
            const rawDraft = localStorage.getItem(`assessment-draft:${currentId}`);
            if (rawDraft) {
              const draftObj = JSON.parse(rawDraft);
              const hoursSince = (Date.now() - new Date(draftObj.savedAt).getTime()) / 3_600_000;
              if (hoursSince <= 2 && draftObj.messages && draftObj.messages.length > 1) {
                setRestoredMessages(draftObj.messages);
                setDraftSavedAt(draftObj.savedAt);
                setShowRestorePrompt(true);
                setMessages([
                  {
                    id: 'initial',
                    role: 'assistant',
                    content: json.data.firstMessage,
                  },
                ]);
                return;
              }
            }
          } catch {
            /* ignore parse errors */
          }

          setMessages([
            {
              id: 'initial',
              role: 'assistant',
              content: json.data.firstMessage,
            },
          ]);
        } else {
          throw new Error('Invalid format returned');
        }
      } catch (err: unknown) {
        toast.error('Could not load your AI interview. Please refresh.');
        console.error(err);
      } finally {
        setIsInitializing(false);
      }
    }
    initSession();
  }, [token]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming || isComplete || !assessmentId) return;

    const userMsg = inputValue.trim();
    setInputValue('');

    // Add user message immediately
    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMsg,
      },
    ]);

    // Add empty AI message placeholder
    const aiMsgId = crypto.randomUUID();
    setMessages(prev => [
      ...prev,
      {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      },
    ]);

    setIsStreaming(true);

    try {
      const response = await fetch(
        `/api/assessment/${assessmentId}/message/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-onboarding-token': token,
          },
          body: JSON.stringify({ userMessage: userMsg }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Failed to start stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const rawJSON = line.slice(6).trim();
          if (!rawJSON) continue;

          try {
            const data = JSON.parse(rawJSON);

            if (data.type === 'token') {
              streamedContent += data.token;
              // Update the streaming message in real time
              setMessages(prev =>
                prev.map(m =>
                  m.id === aiMsgId ? { ...m, content: streamedContent } : m
                )
              );
            }

            if (data.type === 'done') {
              if (data.isComplete) {
                setIsComplete(true);
              }
            }

            if (data.type === 'complete') {
              setIsComplete(true);
            }
          } catch (e) {
            console.error('Error parsing line:', rawJSON, e);
          }
        }
      }

      // Mark streaming done
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (error) {
      console.error(error);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? {
                ...m,
                content: 'Sorry, something went wrong. Please try again.',
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const goToCompletionPage = React.useCallback(() => {
    router.push(`/onboarding/${token}/assessment-complete`);
  }, [router, token]);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        goToCompletionPage();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, goToCompletionPage]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950 to-slate-950" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <h3 className="text-lg font-medium text-slate-200">Preparing your AI assessment...</h3>
        </div>
      </div>
    );
  }

  const userTurnCount = messages.filter((m) => m.role === 'user').length;
  const TOTAL_TURNS = 8;
  const progressPct = Math.min(Math.round((userTurnCount / TOTAL_TURNS) * 100), 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Visual background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* HEADER (sticky top) */}
      <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Logo size="sm" />
            <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
              <span className="text-indigo-400 font-medium uppercase tracking-wide">Question {userTurnCount + 1} of ~{TOTAL_TURNS}</span>
              <span className="text-slate-700">•</span>
              <span>{progressPct}% complete</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* DRAFT RESTORE PROMPT BANNER */}
      {showRestorePrompt && restoredMessages && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl px-6 pt-4 relative z-30 w-full"
        >
          <Card className="p-4 border-amber-500/30 bg-amber-500/10 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2 text-amber-300">
                💾 Continue your previous assessment?
              </p>
              <p className="text-xs text-slate-400 mt-1">
                We saved your conversation from earlier ({restoredMessages.length} messages
                {draftSavedAt ? ` — saved ${formatRelativeTime(draftSavedAt)}` : ''}).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                onClick={() => {
                  setMessages(restoredMessages);
                  setShowRestorePrompt(false);
                  toast.success('Restored previous conversation draft');
                }}
              >
                Resume
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-slate-400 hover:text-white"
                onClick={() => {
                  clearDraft();
                  setShowRestorePrompt(false);
                  toast.info('Started fresh assessment');
                }}
              >
                Start Over
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* MESSAGES AREA (scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 py-8 relative z-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-4 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-md ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>

                {/* Message Box */}
                <div className="max-w-[75%]">
                  <div
                    className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed border ${
                      message.role === 'assistant'
                        ? 'bg-slate-900/60 border-slate-800/80 rounded-tl-sm text-slate-100 shadow-xl'
                        : 'bg-indigo-600/10 border-indigo-500/20 rounded-tr-sm text-slate-100 shadow-md'
                    }`}
                  >
                    <div className="prose prose-invert max-w-none text-slate-200">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>

                    {message.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT BAR (sticky bottom) */}
      <div className="sticky bottom-0 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md p-6 z-20">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleFormSubmit} className="flex gap-4">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isComplete ? "Assessment complete!" : "Type your answer..."}
              disabled={isStreaming || isComplete}
              className="flex-1 bg-slate-900 border-slate-850 text-slate-100 text-sm h-12 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 px-4"
              maxLength={2000}
              autoFocus
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isStreaming || isComplete}
              className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg text-white"
              size="icon"
            >
              {isStreaming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
          <p className="text-center text-[10px] text-slate-500 mt-3 font-light tracking-wider">
            🔒 Your answers are confidential and used only to personalize your learning path
          </p>
        </div>
      </div>

      {/* COMPLETION MODAL */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="text-center space-y-4">
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-3 w-3 rounded-full bg-indigo-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="font-heading text-xl font-semibold text-white">
                Analyzing your results...
              </p>
              <p className="text-slate-400 text-sm">
                Preparing your skill profile
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
