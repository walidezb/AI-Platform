# 🚀 Launch Checklist

## Infrastructure
- [ ] Vercel project created for apps/web
  - [ ] GitHub repo connected
  - [ ] Root directory set to apps/web
  - [ ] Framework preset: Next.js
  - [ ] Vercel Analytics enabled
- [ ] Railway project created for apps/api
  - [ ] Service connected from GitHub (apps/api directory)
  - [ ] Build command: `npm run build`
  - [ ] Start command: `node dist/main.js`
  - [ ] Health check URL: `/health` → 200
  - [ ] Custom domain configured
- [ ] Railway project created for apps/ai
  - [ ] Python service configured
  - [ ] Start: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- [ ] Supabase production project
  - [ ] Production database created
  - [ ] `npx prisma migrate deploy` run
  - [ ] Row Level Security enabled on all tables
  - [ ] Automatic daily backups enabled
  - [ ] Connection pooling enabled (PgBouncer)
- [ ] Pinecone production index
  - [ ] Dimension: 1536, Metric: cosine
  - [ ] Index name noted in env vars
- [ ] Upstash Redis
  - [ ] Redis database created
  - [ ] REST URL and token in env vars
  - [ ] TLS enabled

## Environment Variables

### apps/api (Railway)
- [ ] NODE_ENV=production
- [ ] DATABASE_URL (Supabase connection string)
- [ ] CLERK_SECRET_KEY (production instance)
- [ ] CLERK_WEBHOOK_SECRET
- [ ] AI_SERVICE_URL (Railway apps/ai URL)
- [ ] INTERNAL_SERVICE_SECRET (64+ char random string)
- [ ] REDIS_URL (Upstash URL)
- [ ] REDIS_TLS=true
- [ ] STRIPE_SECRET_KEY (live key)
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] STRIPE_AI_TOKENS_PRICE_ID
- [ ] STRIPE_SEATS_PRICE_ID
- [ ] SENDGRID_API_KEY
- [ ] EMAIL_FROM (verified sender)
- [ ] JWT_SECRET (64+ char random string)
- [ ] SENTRY_DSN
- [ ] APP_URL (production Vercel URL)

### apps/web (Vercel)
- [ ] NEXT_PUBLIC_API_URL (Railway API URL)
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (production)
- [ ] CLERK_SECRET_KEY
- [ ] NEXT_PUBLIC_POSTHOG_KEY
- [ ] NEXT_PUBLIC_SENTRY_DSN

### apps/ai (Railway)
- [ ] OPENAI_API_KEY
- [ ] PINECONE_API_KEY
- [ ] PINECONE_INDEX_NAME
- [ ] INTERNAL_SERVICE_SECRET (same as API)
- [ ] DATABASE_URL
- [ ] REDIS_URL

## Services
- [ ] Stripe webhook endpoint registered
      URL: https://api.yourplatform.com/billing/webhook
      Events: customer.subscription.*, invoice.*, payment_intent.succeeded
- [ ] SendGrid sender email verified
- [ ] SendGrid domain authentication set up (SPF, DKIM)
- [ ] Sentry projects created (API + Web)
      DSNs added to env vars
- [ ] Clerk production instance configured
      - Allowed redirect URLs set
      - Webhook endpoint: https://api.yourplatform.com/webhooks/clerk
- [ ] PostHog production project
      Key added to web env vars
- [ ] Pinecone index accessible from Railway IP

## Database
- [ ] `npx prisma migrate deploy` run on production DB
- [ ] `npx prisma db seed` run (creates demo data)
- [ ] Verify: 6 seed users created
- [ ] Verify: Acme Corp org exists
- [ ] Connection pool tested under load

## Security
- [ ] All JWT_SECRET and INTERNAL_SERVICE_SECRET are
      64+ char random strings (never reused from dev)
- [ ] STRIPE_SECRET_KEY is live key (not test)
- [ ] No sk_live_ or whsec_ in codebase
      `grep -r "sk_live_" apps/` → 0 results
- [ ] First PLATFORM_ADMIN user created in Clerk
      publicMetadata.role = "PLATFORM_ADMIN"
- [ ] Admin email added to platform admin DB record

## Testing
- [ ] Full onboarding flow tested end-to-end in production
      1. Register new company
      2. Send invite
      3. Employee completes assessment
      4. Learning path generated
      5. Module completed
      6. Manager views dashboard
- [ ] Billing flow tested with Stripe test clock
- [ ] Email delivery tested (invite + budget alert)

## Performance & Quality
- [ ] Security headers verified: https://securityheaders.com
      Target: A or A+
- [ ] SSL certificate active on all domains
      https://www.ssllabs.com/ssltest/
- [ ] Lighthouse score ≥85 on production URL
- [ ] DNS configured for all domains
      - app.yourplatform.com → Vercel
      - api.yourplatform.com → Railway
- [ ] CORS configured: API allows only production web domain

## Monitoring
- [ ] Railway health check passing (GET /health → 200)
- [ ] Sentry receiving test error (trigger from admin)
- [ ] PostHog receiving events (page views visible)
- [ ] Bull Board accessible at /admin/queues (internal only)
- [ ] Alert: set up uptime monitoring (e.g. Better Uptime)
      Monitor: https://api.yourplatform.com/health
