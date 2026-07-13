# AI-Powered B2B Learning Platform

[![CI](https://github.com/walidshat/learning-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/walidshat/learning-platform/actions/workflows/ci.yml)
[![Deploy Staging](https://github.com/walidshat/learning-platform/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/walidshat/learning-platform/actions/workflows/deploy-staging.yml)

An AI-powered B2B learning platform for enterprises designed to onboard employees via an AI skill assessment interview and auto-generate personalized learning paths with curated internet resources.

## Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | [Next.js 15 (App Router)](https://nextjs.org/) | React framework for web, TypeScript, Tailwind CSS, TanStack React Query, Zustand, Axios |
| **Backend API** | [NestJS](https://nestjs.org/) | Node.js MVC framework, TypeScript, Prisma ORM, Class Validator |
| **AI Service** | [FastAPI](https://fastapi.tiangolo.com/) | Python high-performance async framework, LangChain, Pydantic, Redis |
| **Database** | PostgreSQL | Relational database (connected via Prisma) |
| **Caching & Queue** | Redis | Fast in-memory key-value cache and message broker |
| **Infrastructure** | PNPM Workspaces | Monorepo structure, Clerk (Auth), Pinecone (Vector DB), Stripe (Payments), SendGrid (Email) |

## Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `20.x` or higher
- **pnpm**: `9.x` or higher
- **Python**: `3.11.x` or higher

## Getting Started

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd learning-platform
   ```

2. **Copy Environment Variables**
   ```bash
   cp .env.example .env
   ```
   *(Update any API keys and connection strings inside `.env` as required)*

3. **Install Dependencies**
   ```bash
   pnpm install
   ```

4. **Start the Development Servers**
   To launch the Next.js frontend, NestJS API, and FastAPI AI service concurrently, run:
   ```bash
   pnpm dev:all
   ```
   Or start them individually:
   - Next.js Web: `pnpm dev:web`
   - NestJS API: `pnpm dev:api`
   - FastAPI AI: `pnpm dev:ai`

## Project Structure

```
├── apps/
│   ├── web/          ← Next.js 15 (App Router, TypeScript)
│   ├── api/          ← NestJS (TypeScript)
│   └── ai/           ← FastAPI (Python)
├── packages/
│   └── shared/       ← Shared TypeScript types and utilities
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## Deployment

The application runs across three different environments:

- **Local Development**: Spin up all systems concurrently using `pnpm dev:all`.
- **Staging environment**: Automated deployments trigger when code is pushed to the `develop` branch.
  - Frontend app deploys to Vercel Staging.
  - API and AI backend services deploy to Railway Staging.
- **Production environment**: Triggered on push or merge to the `main` branch.
  - Depends on successful completion of the CI test suite.
  - Requires manual approval on the GitHub Actions console before deployment.
  - API database migrations (`prisma migrate deploy`) are executed automatically prior to container upgrades.

## Documentation & References

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Prisma ORM](https://www.prisma.io/docs)
- [LangChain Python](https://python.langchain.com/docs/get_started/introduction)
