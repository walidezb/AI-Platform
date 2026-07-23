'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

type FormFieldProps = {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  description?: string;
};

export function FormField({
  label,
  error,
  required,
  children,
  description,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-rose-400 text-xs">*</span>}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground -mt-1">{description}</p>
      )}
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-rose-400 flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </motion.p>
      )}
    </div>
  );
}
