# Pinme Template

Pinme Official Template - Frontend-Backend separated architecture with Vite + React frontend and Cloudflare Workers backend.

## Project Structure (Monorepo)

```
.
├── pinme.toml              # Pinme config
├── package.json            # Root config
├── pnpm-workspace.yaml     # pnpm workspace config
├── frontend/               # Frontend app (React + Vite)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── components/
│   │   │   └── Header.tsx
│   │   ├── pages/
│   │   │   ├── Records/
│   │   │   ├── About/
│   │   │   ├── Email/
│   │   │   └── Auth/
│   │   └── utils/
│   │       └── api.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/                # Backend Worker
│   ├── src/
│   │   └── worker.ts       # <- User edits this file
│   ├── wrangler.toml       # Wrangler config
│   └── package.json
├── db/                     # D1 database migrations
│   └── 001_init.sql
└── README.md
```

## Quick Start

### 1. Create Project

```bash
pinme create <project-name>
```

### 2. Install Dependencies

```bash
cd <project-name>
npm install
```

### 3. Development

```bash
# Frontend development
npm run dev:frontend

# Backend development
# Edit backend/src/worker.ts directly
npm run dev  # Local preview
```

### 4. Save to Platform

```bash
pinme save
```

---

## Usage Guide

### Create Project

```bash
pinme create my-app
```

Will call `create_worker` API, returns:
- `backend/metadata.json` - Worker metadata
- `backend/src/worker.ts` - Worker source code

### Develop Backend

Edit `backend/src/worker.ts`:

```typescript
export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/records' && request.method === 'GET') {
      return Response.json({ data: [] });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
```

Local preview:
```bash
npm run dev
```

### Save & Deploy

```bash
pinme save
```

Flow:
1. `wrangler deploy --dry-run --outdir` - Build `backend/src/worker.ts` -> `dist-worker/`
2. Upload `dist-worker/*.js` + `backend/metadata.json` to platform API

### Frontend Development

```bash
npm run dev:frontend
```

Access `http://localhost:5173`

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Local preview of backend Worker |
| `npm run dev:frontend` | Start frontend dev server |
| `npm run build` | Build frontend + backend |
| `npm run build:worker` | Build backend Worker |
| `npm run build:frontend` | Build frontend |
| `pinme save` | **One-click deploy** (build + deploy frontend to IPFS + save Worker to platform) |

---

## Configuration

Edit `pinme.toml`:

```toml
project_name = "my-app"

[vars]
VITE_API_URL = ""

[d1]
migrations_dir = "db"
# database_id = "xxx"
```

### Auth Configuration

Auth demo 需要在 `frontend/.env.local` 中填入 Firebase Web 配置（来自 `pinme create` 响应的 `auth_config`）：

```bash
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_TENANT_ID=your-tenant-id
```

Worker 侧需通过 secrets 配置以下变量（用于服务端代理 auth API）：

```bash
API_KEY=your-pinme-api-key
PROJECT_NAME=your-project-name
```

Edit `backend/wrangler.toml` to configure D1, etc:

```toml
name = "my-app"
compatibility_date = "2026-03-01"
main = "src/worker.ts"

[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "xxx"
```

---

## File Description

| File | Description |
|------|-------------|
| `backend/src/worker.ts` | User-editable Worker source code |
| `backend/metadata.json` | Worker metadata (contains bindings, etc.) |
| `backend/wrangler.toml` | Wrangler config |
| `pinme.toml` | Project config |

---

## Tech Stack

- **Frontend**: Vite + React + TypeScript + React Router + Firebase Auth
- **Backend**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Pinme Identity Platform (Firebase multi-tenant)
- **Deployment**: Pinme Platform API

---

## License

MIT
