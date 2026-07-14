'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, Send, Loader2, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

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
  const [turnCount, setTurnCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

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
          setAssessmentId(json.data.assessmentId);
          setTurnCount(json.data.turnCount);
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
              setTurnCount(data.turnCount);
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

  const goToPathPage = () => {
    router.push(`/onboarding/${token}/path-ready`);
  };

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
          <div className="flex items-center justify-between mb-3">
            <Logo size="sm" />
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="text-indigo-400 font-medium tracking-wide uppercase">AI Interview</span>
              <span className="text-slate-700">•</span>
              <span>Turn {turnCount} of ~10</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((turnCount / 10) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

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
            className="fixed inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="max-w-md w-full"
            >
              <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-md p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                
                {/* Animated checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                </motion.div>

                <h2 className="font-heading text-2xl font-bold text-white mb-2">
                  Assessment Complete! 🎉
                </h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  Your AI-powered learning path is being generated.
                  This takes about 30 seconds.
                </p>

                {/* Animated progress dots */}
                <div className="flex justify-center gap-2 mb-8">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>

                <Button
                  onClick={goToPathPage}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg text-white"
                  size="lg"
                >
                  View My Learning Path →
                </Button>
                <p className="text-xs text-slate-500 mt-4 tracking-wide font-light">
                  Your path will be ready in a few moments
                </p>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
