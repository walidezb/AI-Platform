'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = "Add a focus area...",
  maxTags = 15,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setInputValue('');
      return;
    }
    if (value.length >= maxTags) {
      return;
    }
    onChange([...value, trimmed]);
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  // Filter out suggestions that are already added
  const filteredSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="space-y-3">
      {/* Input container */}
      <div className="flex gap-2">
        <Input
          placeholder={value.length >= maxTags ? `Max ${maxTags} tags reached` : placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={value.length >= maxTags}
          className="bg-slate-950 border-slate-800 text-white flex-1"
        />
        <Button
          type="button"
          onClick={() => addTag(inputValue)}
          disabled={value.length >= maxTags || !inputValue.trim()}
          size="sm"
          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold"
        >
          <Plus className="h-4 w-4 shrink-0" />
        </Button>
      </div>

      {/* Tag Chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border border-slate-850 p-2.5 rounded-lg bg-slate-950/20">
          {value.map((tag, index) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold animate-fade-in"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:text-white rounded-full p-0.5"
              >
                <X className="h-3 w-3 shrink-0" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Suggestions Pills */}
      {filteredSuggestions.length > 0 && value.length < maxTags && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Suggested for this department:</p>
          <div className="flex flex-wrap gap-1.5">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-855 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
