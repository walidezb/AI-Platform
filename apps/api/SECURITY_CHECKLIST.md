# OWASP Top 10 — Security Checklist

## A01 — Broken Access Control ✅
- [x] RBAC enforced: ClerkGuard + RolesGuard on all endpoints
- [x] Org scoping: assertOrgScope() on all resource fetches
- [x] OrgActiveGuard: suspended orgs receive 403 globally
- [x] PLATFORM_ADMIN bypasses org scope (intentional)
- [x] Cross-tenant test: user from org A cannot read org B data
- [x] Admin endpoints: PLATFORM_ADMIN role required

## A02 — Cryptographic Failures ✅
- [x] TLS enforced in production (HSTS header set)
- [x] Stripe webhook: signature verification (raw body)
- [x] Clerk webhooks: svix signature verification
- [x] JWT secret: min 64 chars, from env var
- [x] Internal service secret: min 64 chars, from env var
- [x] No secrets in code or git history

## A03 — Injection ✅
- [x] Prisma: parameterized queries only (no raw SQL)
- [x] No string interpolation in DB queries
- [x] Input sanitization: class-sanitizer / Sanitize decorator strips HTML
- [x] SSRF prevention: validateResourceUrl() on all external URLs

## A04 — Insecure Design ✅
- [x] Rate limiting: global 100/min, AI 20/min, chat 30/10min
- [x] Budget guard: prevents runaway AI costs (402)
- [x] Impersonation: audit log + 1h expiry + visible banner
- [x] Assessment: 30 msg/session rate limit
- [x] Org suspension: immediate 403 for all users

## A05 — Security Misconfiguration ✅
- [x] Helmet: CSP, HSTS, noSniff, frameguard, referrerPolicy
- [x] ValidationPipe: whitelist=true, forbidNonWhitelisted=true
- [x] NODE_ENV checked — verbose errors only in development
- [x] No default credentials anywhere
- [x] .env.example: no real secrets, all placeholders

## A06 — Vulnerable Components ✅
- [x] Run: pnpm audit (verified no high/critical vulnerabilities)
- [x] Dependency scanning enabled

## A07 — Authentication Failures ✅
- [x] Auth: Clerk (battle-tested authentication)
- [x] Rate limiting: 5/min on registration/invite endpoints
- [x] Session expiry: 401 handler auto-redirects to sign-in
- [x] PLATFORM_ADMIN: role checked from Clerk public metadata

## A08 — Software and Data Integrity Failures ✅
- [x] Stripe webhooks: signature verified before processing
- [x] Clerk webhooks: svix verification
- [x] No eval() or dynamic code execution anywhere
- [x] Package integrity: pnpm lockfile committed

## A09 — Security Logging ✅
- [x] All impersonation logged to AdminAuditLog
- [x] Budget alerts logged with logger.warn()
- [x] Org suspension logged with logger.warn()
- [x] Sentry: error reporting configured

## A10 — Server-Side Request Forgery ✅
- [x] validateResourceUrl(): blocks private IPs and non-HTTPS
- [x] No user-controlled URLs passed to HTTP clients
- [x] AI service: internal-only via X-Internal-Secret
