import { Transform } from 'class-transformer';

/**
 * Strips HTML tags and dangerous script tags from input strings to prevent XSS.
 */
export function Sanitize() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  });
}
