import { toast as sonner } from 'sonner';

export const toast = {
  success: (title: string, description?: string) =>
    sonner.success(title, { description }),

  error: (title: string, description?: string) =>
    sonner.error(title, {
      description,
      duration: 6000,   // errors stay longer
    }),

  warning: (title: string, description?: string) =>
    sonner.warning(title, { description }),

  info: (title: string, description?: string) =>
    sonner(title, { description }),

  loading: (title: string) =>
    sonner.loading(title, { duration: Infinity }),

  dismiss: (id?: string | number) =>
    sonner.dismiss(id),

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    }
  ) => sonner.promise(promise, messages),
};

export const notify = toast;
