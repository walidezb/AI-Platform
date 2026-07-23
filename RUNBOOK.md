# 📖 Operations & Monitoring Runbook

## 1. System Health & Inspection

### Health Check Endpoint
- **URL**: `GET https://api.yourplatform.com/health`
- **Expected Response**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-07-23T12:00:00.000Z",
    "version": "1.0.0",
    "checks": {
      "database": "ok",
      "redis": "ok",
      "aiService": "ok"
    }
  }
  ```
- **Status Codes**:
  - `200 OK`: `healthy` (all checks `ok`) or `degraded` (optional cache/AI degraded).
  - `503 Service Unavailable`: `unhealthy` (database down).

### Background Queue Dashboard
- **URL**: `https://api.yourplatform.com/admin/queues`
- **Access**: Requires `PLATFORM_ADMIN` authentication.
- **Queues Monitored**: `assessment`, `path-generation`, `resource-curation`, `exercise-generation`, `notification`.

---

## 2. Common Incident Response Procedures

### Incident 1: Database Connection Exhaustion (P1)
**Symptoms**: Health check reports `"database": "down"`, API returns `500` or `503` errors with `P2024: Timed out fetching a new connection from the pool`.

**Action Steps**:
1. Check active database connections in Supabase / PostgreSQL dashboard:
   ```sql
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```
2. Verify PgBouncer connection pooling mode (`transaction`).
3. Increase max pool size in Railway `DATABASE_URL` (`connection_limit=20`).
4. Restart API service instance to drop leaked connections:
   ```bash
   railway restart --service api
   ```

### Incident 2: High Rate of AI Generation Timeouts / Failures (P2)
**Symptoms**: Health check reports `"aiService": "degraded"`, background queue jobs entering `failed` state with `AI service timeout` or OpenAI quota exceeded.

**Action Steps**:
1. Inspect Python AI service logs in Railway:
   ```bash
   railway logs --service ai
   ```
2. Check OpenAI API Dashboard status and usage quotas:
   - Ensure rate limit limits (`RPM`/`TPM`) have not been breached.
3. Check status of Pinecone vector index.
4. If OpenAI is degraded, switch to fallback model deployment in `apps/ai/app/config.py`.

### Incident 3: High AI Token Budget Spikes / Organization Overages (P2)
**Symptoms**: Customer reports `402 Payment Required: Token budget exceeded` or Organization Admin requests budget increase.

**Action Steps**:
1. Inspect organization usage logs in Admin Portal:
   - Navigate to `/admin/organizations/:orgId`.
2. Check `AiUsageLog` entries for unusual token consumption anomalies.
3. Offer token top-up or manually update `aiTokensBudget` via admin portal or CLI:
   ```ts
   await prisma.organization.update({
     where: { id: orgId },
     data: { aiTokensBudget: { increment: 1000000 } }
   });
   ```

### Incident 4: Stripe Webhook Signature Failures (P3)
**Symptoms**: Billing subscription status changes not reflecting in database, Stripe dashboard reporting webhook delivery retries with `400 Bad Request`.

**Action Steps**:
1. Verify `STRIPE_WEBHOOK_SECRET` in Railway API environment matches secret in Stripe Dashboard.
2. Confirm NestJS `main.ts` preserves raw body buffer for `/billing/webhook`:
   ```ts
   app.use('/billing/webhook', express.raw({ type: 'application/json' }));
   ```
3. Re-send failed events from Stripe Dashboard -> Webhooks -> Failed Events -> Resend.

---

## 3. Maintenance Commands & Operations

### Run Production Seed Script
```bash
pnpm --filter api prisma db seed
```

### Run Database Migrations
```bash
pnpm --filter api exec prisma migrate deploy
```

### Manual Redis Cache Invalidation
To clear all cached data for a specific organization:
```ts
await cacheService.delPattern('team:org-id:*');
await cacheService.delPattern('usage:org-id:*');
```

---

## 4. On-Call Escalation Matrix

| Tier | Role | Contact | SLA |
|------|------|---------|-----|
| L1 | Automated Alerting (Sentry/BetterStack) | PagerDuty | Immediate |
| L2 | Site Reliability Engineer | sre@yourplatform.com | 15 minutes |
| L3 | Lead Platform Architect | lead@yourplatform.com | 30 minutes |
