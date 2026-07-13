## Required GitHub Secrets

### Global Secrets
| Secret | Description |
|--------|-------------|
| DATABASE_URL | Neon PostgreSQL production URL |
| TEST_DATABASE_URL | Neon PostgreSQL test/staging URL |
| REDIS_URL | Upstash Redis URL |
| OPENAI_API_KEY | OpenAI API key |
| CLERK_SECRET_KEY | Clerk backend secret key |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk publishable key |

### Vercel Secrets
| Secret | Description |
|--------|-------------|
| VERCEL_TOKEN | Vercel personal access token |
| VERCEL_ORG_ID | Vercel team/org ID |
| VERCEL_PROJECT_ID | Vercel project ID for apps/web |

### Railway Secrets
| Secret | Description |
|--------|-------------|
| RAILWAY_TOKEN | Railway API token |

### How to set secrets
Go to: GitHub Repo → Settings → Secrets and Variables → Actions
