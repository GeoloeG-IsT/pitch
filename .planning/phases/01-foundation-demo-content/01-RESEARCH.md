# Phase 1: Foundation + Demo Content - Research

**Researched:** 2026-03-17
**Domain:** Monorepo scaffolding (Turborepo + pnpm + uv), Next.js, FastAPI, Supabase/pgvector, demo content generation
**Confidence:** HIGH

## Summary

Phase 1 is pure scaffolding and content creation -- no complex application logic. The technical challenge is setting up a polyglot monorepo (TypeScript + Python) under Turborepo, which only natively supports npm-ecosystem workspaces. The proven pattern is a package.json wrapper in the Python service directory that delegates scripts to uv commands. Supabase provides pgvector out of the box -- enable the extension via CLI migration, create the schema, done.

The demo content (pitch deck, financial model, supporting docs) should be authored as markdown source files and generated into PDF/Excel during a build step. This keeps content version-controlled and CI-friendly, per the user's decision. For Excel generation, openpyxl is the standard Python library. For PDF generation from markdown, pandoc + weasyprint or a pure Python approach (markdown + weasyprint) are the standard tools.

**Primary recommendation:** Use `create-turbo` for initial scaffolding, add the Python backend as an apps/ workspace with a package.json wrapper, use Supabase CLI migrations for schema, and build demo content from markdown/Python source files.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pitch deck narrative: arc structure (not classic VC slide order), open with 3:44 stat, bold/visionary tone, interactive experience as primary moat, $1-2M range ask, 12-15 slides
- Financial model: VC-standard detail (TAM/SAM/SOM, 3-year projections, unit economics, burn rate, runway), hybrid pricing (SaaS + usage overage), top-down TAM / bottom-up SAM/SOM, illustrative but plausible numbers labeled as demo
- Supporting docs: investment memo (why-now thesis format), technical architecture doc (system design overview), intentional cross-references between docs for RAG stress-testing, format as markdown source generating PDF/Excel
- Supabase data models: flat chunks with metadata (content, embedding, source doc ID, section, page, chunk type), core + stubs schema (users, documents, chunks now; placeholder columns for auth/analytics), Supabase CLI migrations, Supabase Auth from the start

### Claude's Discretion
- Turborepo workspace layout and shared config structure
- Next.js app router vs pages router
- FastAPI project structure and dependency management
- Health check endpoint design
- Exact pgvector configuration (dimensions, index type)
- Build pipeline for markdown-to-PDF/Excel conversion
- Exact slide count within 12-15 range

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEMO-01 | Create Zeee Pitch Zooo's own pitch deck as demo content | Markdown source with PDF generation pipeline; narrative structure and content decisions locked in CONTEXT.md |
| DEMO-02 | Create Zeee Pitch Zooo's financial model as demo content | Python script using openpyxl to generate Excel with formulas, formatting, multiple sheets |
| DEMO-03 | Create supporting documents (investment memo, technical architecture) as demo content | Markdown source files with PDF generation; cross-references between docs for RAG testing |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| turbo | 2.8.17 | Monorepo build orchestration | Standard for pnpm monorepos; caching, task dependencies |
| pnpm | 10.32.1 | Node.js package manager + workspace management | Fastest, most disk-efficient; native workspace support |
| next | 16.1.7 | React frontend framework | App Router is stable, SSR/SSG built-in |
| typescript | 5.9.3 | Type safety | Required by Next.js ecosystem |
| fastapi | 0.135.1 | Python REST API framework | Async, auto-docs, type hints, standard for Python APIs |
| uv | 0.9.30 | Python package/project manager | Fast, lockfile support, replaces pip/poetry/venv |
| @supabase/supabase-js | 2.99.2 | Supabase client (frontend) | Official JS client for Supabase |
| @supabase/ssr | 0.9.0 | Supabase SSR auth helpers | Required for Next.js App Router auth |
| supabase (CLI) | 2.81.0 | Local dev, migrations, type generation | Official CLI for Supabase project management |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| openpyxl | 3.1.4 | Excel file generation from Python | DEMO-02: financial model spreadsheet creation |
| uvicorn | latest | ASGI server for FastAPI | Running FastAPI in development and production |
| python-dotenv | latest | Environment variable loading | Backend configuration management |
| weasyprint | latest | HTML/CSS to PDF rendering | PDF generation from markdown content (alternative to pandoc) |
| markdown | latest | Python markdown parser | Converting .md to HTML for PDF pipeline |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| weasyprint (PDF) | pandoc + LaTeX | Pandoc requires LaTeX installation (~1GB); weasyprint is pure Python + CSS styling, lighter |
| weasyprint (PDF) | md-to-pdf (npm) | Would keep PDF gen in JS ecosystem; but demo content scripts are Python-adjacent |
| openpyxl (Excel) | xlsxwriter | xlsxwriter cannot read files, only write; openpyxl does both -- more flexible for future use |
| Supabase | Raw PostgreSQL + pgvector | Supabase provides auth, RLS, dashboard, realtime out of the box -- massively reduces scope |

**Installation:**
```bash
# Root monorepo (pnpm)
pnpm add -Dw turbo supabase

# Frontend (apps/web)
pnpm add next react react-dom @supabase/supabase-js @supabase/ssr
pnpm add -D typescript @types/react @types/node

# Backend (apps/api) -- via uv
uv add fastapi uvicorn python-dotenv supabase
uv add --dev openpyxl weasyprint markdown
```

**Version verification:** All versions verified against npm registry and PyPI on 2026-03-17.

## Architecture Patterns

### Recommended Project Structure
```
zeee-pitch-zooo/
├── apps/
│   ├── web/                    # Next.js frontend (App Router)
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── api/
│   │   │       └── health/
│   │   │           └── route.ts    # Proxy health check
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                    # FastAPI backend
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py            # FastAPI app entry
│       │   ├── core/
│       │   │   └── config.py      # Settings via pydantic
│       │   ├── api/
│       │   │   └── v1/
│       │   │       ├── __init__.py
│       │   │       └── health.py  # Health endpoint
│       │   └── models/
│       │       └── __init__.py
│       ├── pyproject.toml
│       ├── uv.lock
│       └── package.json           # Wrapper for Turborepo integration
├── packages/
│   └── shared-types/           # Shared TypeScript types (API contracts)
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 00001_init.sql        # Core schema + pgvector
│   └── seed.sql                  # Optional seed data
├── content/                    # Demo content source files
│   ├── pitch-deck/
│   │   ├── slides.md             # Markdown source for deck
│   │   └── build.py              # PDF generation script
│   ├── financial-model/
│   │   └── build.py              # openpyxl script to generate .xlsx
│   ├── investment-memo/
│   │   └── memo.md               # Markdown source
│   ├── technical-architecture/
│   │   └── architecture.md       # Markdown source
│   └── build-all.py              # Master build script
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                # Root package.json
└── .env.example
```

### Pattern 1: Python Service in Turborepo (Package.json Wrapper)

**What:** Turborepo only discovers workspaces via package.json. Python services need a thin package.json that wraps uv commands as npm scripts.

**When to use:** Any non-JS service in a Turborepo monorepo.

**Example:**
```json
// apps/api/package.json
{
  "name": "@zeee/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000",
    "build": "uv sync",
    "lint": "uv run ruff check .",
    "test": "uv run pytest",
    "typecheck": "uv run mypy app/"
  }
}
```
Source: [Turborepo Python discussion](https://github.com/vercel/turborepo/discussions/1077), [typethon boilerplate](https://github.com/sonervergon/typethon)

### Pattern 2: Next.js Rewrite Proxy to FastAPI

**What:** Next.js rewrites forward `/api/*` requests to the FastAPI backend, avoiding CORS issues in development.

**When to use:** Development mode when frontend and backend run on different ports.

**Example:**
```typescript
// apps/web/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
```
Source: [Next.js docs - rewrites](https://nextjs.org/docs/app/api-reference/next-config-js/rewrites)

### Pattern 3: Supabase CLI Migration Workflow

**What:** Database schema changes via versioned SQL files managed by Supabase CLI.

**When to use:** All schema changes -- never use the dashboard for schema modifications in a team/versioned project.

**Example:**
```sql
-- supabase/migrations/00001_init.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Users table (Supabase Auth provides auth.users; this is the public profile)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'founder' CHECK (role IN ('founder', 'investor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'xlsx', 'md', 'txt')),
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chunks table (flat with metadata per user decision)
CREATE TABLE public.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  section_number INT,
  page_number INT,
  chunk_type TEXT NOT NULL DEFAULT 'text' CHECK (chunk_type IN ('text', 'table', 'heading', 'image_caption')),
  metadata JSONB DEFAULT '{}',
  token_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for vector similarity search (IVFFlat for PoC, upgrade to HNSW if needed)
CREATE INDEX ON public.chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Placeholder columns for future phases (per user decision: stubs to avoid migrations)
-- Analytics stubs
ALTER TABLE public.documents ADD COLUMN view_count INT DEFAULT 0;
ALTER TABLE public.documents ADD COLUMN last_viewed_at TIMESTAMPTZ;

-- RLS policies (Supabase Auth from the start per user decision)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

-- Basic RLS: users can read their own data
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view chunks of own documents"
  ON public.chunks FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );
```

### Pattern 4: App Router Health Check Route

**What:** Next.js App Router route handler that checks both frontend health and backend connectivity.

**Example:**
```typescript
// apps/web/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

  try {
    const res = await fetch(`${backendUrl}/api/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();

    return NextResponse.json({
      status: 'healthy',
      frontend: 'ok',
      backend: data.status === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: 'degraded',
      frontend: 'ok',
      backend: 'unreachable',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
```

### Anti-Patterns to Avoid
- **Importing across app boundaries:** Never import from `apps/web` in `apps/api` or vice versa. Shared types go in `packages/`.
- **Using Supabase dashboard for schema changes:** All schema must be in migration files for reproducibility.
- **Running Python outside uv:** Always use `uv run` to ensure correct virtual environment and dependencies.
- **Hardcoding Supabase URLs/keys:** Use environment variables; .env.local for Next.js, .env for FastAPI.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monorepo task orchestration | Custom shell scripts | Turborepo (turbo.json) | Caching, dependency graph, parallelization |
| Python dependency resolution | pip + requirements.txt | uv + pyproject.toml + uv.lock | Deterministic installs, speed, virtual env management |
| Database migrations | Manual SQL execution | Supabase CLI migrations | Versioned, reproducible, team-safe |
| Authentication | Custom JWT/session | Supabase Auth | Free with Supabase, RLS integration, handles edge cases |
| Excel generation | CSV files renamed to .xlsx | openpyxl with formulas/formatting | Real Excel with formulas, multiple sheets, styling |
| PDF from markdown | Raw HTML with print CSS | weasyprint (or pandoc) | Proper PDF generation with page breaks, headers, TOC |
| API documentation | Manual swagger/openapi | FastAPI auto-generated /docs | Free with FastAPI, always in sync with code |

**Key insight:** Phase 1 is scaffolding -- every component has a well-established tool. The trap is spending time on custom solutions when the standard tool works perfectly.

## Common Pitfalls

### Pitfall 1: pnpm Workspace Discovery Fails for Python App
**What goes wrong:** Turborepo can't find the Python service because pnpm-workspace.yaml doesn't include its directory.
**Why it happens:** Python projects don't naturally have package.json files.
**How to avoid:** Explicitly include `apps/api` in pnpm-workspace.yaml AND create a package.json wrapper in that directory.
**Warning signs:** `turbo run dev` only starts the frontend.

### Pitfall 2: pgvector Extension Not Available
**What goes wrong:** `CREATE EXTENSION vector` fails because pgvector isn't installed on the Postgres instance.
**Why it happens:** Self-hosted Postgres may not have pgvector. Supabase includes it by default.
**How to avoid:** Use Supabase (pgvector is pre-installed). Verify with `SELECT * FROM pg_available_extensions WHERE name = 'vector';`
**Warning signs:** Migration fails with "extension does not exist."

### Pitfall 3: IVFFlat Index Requires Data Before Creation
**What goes wrong:** IVFFlat index created on empty table has poor performance (all vectors in one list).
**Why it happens:** IVFFlat clusters data during index creation; empty table = meaningless clusters.
**How to avoid:** For Phase 1, create the index in the migration as a placeholder. Rebuild it (`REINDEX`) after data is loaded in Phase 2. Alternatively, use HNSW which does not have this limitation.
**Warning signs:** Very slow vector searches after loading data, poor recall.

### Pitfall 4: Supabase Local Dev Requires Docker
**What goes wrong:** `supabase start` fails because Docker isn't running or isn't installed.
**Why it happens:** Supabase local dev runs ~15 Docker containers (Postgres, GoTrue, PostgREST, etc.).
**How to avoid:** Ensure Docker is installed and running before `supabase init` / `supabase start`. Docker is confirmed available on this machine (v28.2.2).
**Warning signs:** `supabase start` hangs or errors with Docker connection messages.

### Pitfall 5: Next.js Rewrite Proxy Doesn't Work in Production
**What goes wrong:** API calls fail in production because rewrites point to localhost.
**Why it happens:** Rewrites are evaluated at request time; localhost doesn't exist in production.
**How to avoid:** Use environment variables for the backend URL. In production, either use a proper reverse proxy or deploy as separate services with CORS.
**Warning signs:** 502/504 errors on API routes in deployed environment.

### Pitfall 6: Content Build Dependencies Not Installed
**What goes wrong:** PDF/Excel generation scripts fail because weasyprint or openpyxl isn't installed.
**Why it happens:** Content build scripts run in a different context than the API server.
**How to avoid:** Content build scripts should use their own uv project or be part of the API project's dev dependencies.
**Warning signs:** ImportError when running build scripts.

## Code Examples

### FastAPI Health Endpoint
```python
# apps/api/app/api/v1/health.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "zeee-pitch-zooo-api",
        "version": "0.1.0",
    }
```

### FastAPI Main App
```python
# apps/api/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.health import router as health_router

app = FastAPI(
    title="Zeee Pitch Zooo API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
```

### Turborepo Configuration
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

### pnpm Workspace Configuration
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root Package.json
```json
{
  "name": "zeee-pitch-zooo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:migrate": "supabase migration new",
    "content:build": "cd content && uv run python build-all.py"
  },
  "devDependencies": {
    "turbo": "^2.8.17",
    "supabase": "^2.81.0"
  },
  "packageManager": "pnpm@10.32.1"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pip + requirements.txt | uv + pyproject.toml + uv.lock | 2024-2025 | 10-100x faster installs, deterministic resolution |
| Next.js Pages Router | Next.js App Router | 2023 (stable) | Server components, layouts, streaming; App Router is default |
| Turborepo .turbo/ config | turbo.json in root | Turbo 2.x (2024) | Simplified configuration |
| pgvector IVFFlat only | pgvector HNSW available | pgvector 0.5+ (2023) | Better recall without reindexing; slightly more memory |
| Supabase realtime only | Supabase Auth + RLS + Vector | 2024-2025 | Full-stack platform including vector search |
| pip install supabase | uv add supabase | 2025 | Python Supabase client works with uv |

**Deprecated/outdated:**
- `create-next-app` with Pages Router: Still works but App Router is the recommended default
- `turborepo` npm package (v0.x): Renamed to `turbo` (v2.x)
- Supabase `supabase-py` package: Renamed to `supabase` on PyPI

## Open Questions

1. **Pandoc availability vs pure Python PDF pipeline**
   - What we know: Pandoc is not installed on this machine. weasyprint is a Python package installable via uv.
   - What's unclear: Whether weasyprint alone produces professional-enough PDFs for a pitch deck, or if a more styled approach is needed.
   - Recommendation: Use weasyprint with custom CSS for styled PDFs. If quality is insufficient, install pandoc via system package manager. Keep the build script abstracted so the engine can be swapped.

2. **HNSW vs IVFFlat index for pgvector**
   - What we know: IVFFlat requires data for meaningful index creation. HNSW works better with incremental data. Both are supported by pgvector on Supabase.
   - What's unclear: For PoC-scale data (< 1000 chunks), index choice is irrelevant for performance.
   - Recommendation: Use HNSW -- no reindex needed after data load, simpler operational story. Switch the migration to `USING hnsw` instead of `ivfflat`.

3. **Embedding dimensions (1536 vs 3072)**
   - What we know: text-embedding-3-small defaults to 1536 dimensions. text-embedding-3-large defaults to 3072 but can be reduced. For PoC data volume, either works.
   - What's unclear: Which embedding model will be used (deferred to Phase 2).
   - Recommendation: Use 1536 dimensions in the schema. This supports text-embedding-3-small (cheapest, sufficient for PoC) and text-embedding-3-large at reduced dimensions. Can ALTER COLUMN later if needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python) + vitest (TypeScript) -- to be installed |
| Config file | None -- Wave 0 |
| Quick run command | `cd apps/api && uv run pytest tests/ -x` |
| Full suite command | `turbo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEMO-01 | Pitch deck PDF exists and has 12-15 pages | smoke | `uv run python content/build-all.py && test -f content/output/pitch-deck.pdf` | -- Wave 0 |
| DEMO-02 | Financial model Excel exists with expected sheets | smoke | `uv run python content/build-all.py && test -f content/output/financial-model.xlsx` | -- Wave 0 |
| DEMO-03 | Supporting docs (2+) exist as PDFs | smoke | `uv run python content/build-all.py && ls content/output/*.pdf \| wc -l` | -- Wave 0 |
| (infra) | FastAPI health endpoint returns 200 | integration | `cd apps/api && uv run pytest tests/test_health.py -x` | -- Wave 0 |
| (infra) | Next.js builds successfully | smoke | `cd apps/web && pnpm build` | -- Wave 0 |
| (infra) | Supabase migration applies cleanly | integration | `supabase db reset` | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `turbo test` (runs all workspace tests)
- **Per wave merge:** `turbo build && turbo test && supabase db reset`
- **Phase gate:** Full suite green + all demo content files exist in output directory

### Wave 0 Gaps
- [ ] `apps/api/tests/test_health.py` -- health endpoint integration test
- [ ] `apps/api/pyproject.toml` -- needs pytest in dev dependencies
- [ ] `apps/web/vitest.config.ts` -- if any frontend tests needed (optional for Phase 1)
- [ ] `content/test_build.py` -- smoke test that all content builds successfully
- [ ] Framework installs: `uv add --dev pytest` in api, `pnpm add -D vitest` in web (optional)

## Sources

### Primary (HIGH confidence)
- npm registry -- verified versions: turbo@2.8.17, next@16.1.7, typescript@5.9.3, @supabase/supabase-js@2.99.2, supabase@2.81.0, @supabase/ssr@0.9.0
- PyPI registry -- verified versions: fastapi@0.135.1
- uv CLI -- verified version: 0.9.30 (installed locally)
- [Supabase pgvector docs](https://supabase.com/docs/guides/database/extensions/pgvector) -- extension setup, migration patterns
- [Supabase local dev docs](https://supabase.com/docs/guides/local-development/overview) -- CLI workflow, migration management
- [uv FastAPI guide](https://docs.astral.sh/uv/guides/integration/fastapi/) -- project structure, pyproject.toml patterns

### Secondary (MEDIUM confidence)
- [Turborepo Python discussion #1077](https://github.com/vercel/turborepo/discussions/1077) -- package.json wrapper pattern for non-JS services
- [typethon boilerplate](https://github.com/sonervergon/typethon) -- pnpm + Turborepo + Python monorepo reference
- [Supabase fewer-dimensions blog](https://supabase.com/blog/fewer-dimensions-are-better-pgvector) -- pgvector dimension recommendations
- [OpenAI embeddings guide](https://platform.openai.com/docs/guides/embeddings) -- dimension options for text-embedding-3 models

### Tertiary (LOW confidence)
- weasyprint PDF quality for pitch deck styling -- needs empirical validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against registries, tools installed/available
- Architecture: HIGH -- monorepo pattern well-documented, Supabase schema straightforward
- Pitfalls: HIGH -- common issues well-documented in community discussions
- Demo content tooling: MEDIUM -- weasyprint quality for styled PDFs unverified; openpyxl is solid

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain, 30-day validity)
