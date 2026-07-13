---
name: learning-platform
description: Guide and instructions for styling themes, multi-tenant databases, local testing, and build setup for the B2B AI Learning Platform.
---

# AI Learning Platform Developer Guide

This guide details the standard patterns, configurations, and troubleshooting steps for development in this workspace.

## 1. Brand Theme & Styling

The platform uses a custom light mode design system by default. 

### Color Palette Tokens
- **Primary**: `Sky Catalyst` (`#4A90D9`) — Brand primary accent and interactive indicators.
- **Secondary**: `Sapphire Depth` (`#2C5F9E`) — Support indicators and header items.
- **Accent**: `Aqua Spark` (`#34C9B0`) — Highlighting states and status indicators.
- **Neutral Light**: `Cloud Mist` (`#F0F5FB`) — Default background variable.
- **Neutral Dark**: `Slate Ink` (`#1A2433`) — Default text and secondary frames.

### Theme CSS Variables
Theme variables are mapped in [globals.css](file:///Users/walidshat/Desktop/Antigravity/AI%20Learning%20Platform/apps/web/app/globals.css):
- `:root` holds the Light Mode values.
- `.dark` holds the Dark Mode overrides.
- Use `bg-background` and `text-foreground` rather than hardcoded slate styles (`bg-slate-950`) to ensure views adapt seamlessly to theme toggles.

---

## 2. Authentication & Local Development

### Clerk Environment Setup
To prevent ClerkJS bootstrap runtime crashes, local environment variables must have a syntactically correct structure:
```bash
# Valid Clerk test key structure
CLERK_SECRET_KEY=sk_test_533FzTy121a91A6D2F996611D3C
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZW5hYmxlZC1zaHJpbXAtNzIuY2xlcmsuYWNjb3VudHMuZGV2JA
```
Ensure these are configured in both:
- [apps/web/.env](file:///Users/walidshat/Desktop/Antigravity/AI%20Learning%20Platform/apps/web/.env)
- [apps/api/.env](file:///Users/walidshat/Desktop/Antigravity/AI%20Learning%20Platform/apps/api/.env)

### Clerk Security Bypass in Tests
For unit/e2e testing, the security guard bypasses validation if `process.env.NODE_ENV === 'test'` and a mock user header is supplied:
```typescript
// Bypass in ClerkGuard
if (process.env.NODE_ENV === 'test' && request.headers['x-mock-user']) {
  return true;
}
```

---

## 3. Troubleshooting Builds

### Next.js Cache Conflict (ENOENT during prerendering)
If files are restructured during dynamic hot-reloading dev watch mode, the production compiler may fail static page checks with an `ENOENT: Cannot find module` error.
- **Solution**: Wipe the local cache folder before building:
  ```bash
  rm -rf apps/web/.next && pnpm --filter web build
  ```

### NestJS Bull Queue Mocking
Mock queues inside test configurations scanner scan scopes must mock the process, client listeners, and event hooks:
```typescript
const mockQueue = {
  process: jest.fn(),
  on: jest.fn(),
  client: {
    ping: jest.fn().mockResolvedValue('PONG'),
  },
};
```
