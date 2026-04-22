# logdb-next-api-relay — sample

Next.js App Router relay for [`@logdbhq/web`](https://www.npmjs.com/package/@logdbhq/web).
Drop-in alternative to the Supabase Edge Function template when you're on
Vercel, Netlify, or self-hosted Next.js.

One route, 150 lines. Handles both writes and reads with the same wire
format the Supabase template uses, so browser code is identical — just
change the `endpoint` URL.

## Architecture

```
Browser (same-origin)            Next.js app                 LogDB
┌─────────────┐  JSON     ┌──────────────────┐  gRPC-Web  ┌─────────────┐
│ @logdbhq/web│ ─────────▶│ /api/logdb       │ ─────────▶│ grpc-logger │
│             │           │ (Route Handler)  │           │ grpc-server │
│             │  200/204  │ @logdbhq/node    │           │             │
│             │ ◀─────────│ LOGDB_API_KEY    │           │             │
└─────────────┘           └──────────────────┘           └─────────────┘
```

## Install + run locally

```bash
cd next-api-relay
npm install
cp .env.example .env.local
# edit .env.local — set LOGDB_API_KEY

npm run dev
# open http://localhost:3000
```

## Wire up a browser client

In a sibling Vite/React/Next.js app:

```ts
import { LogDBClient, LogDBReader, LogLevel } from "@logdbhq/web";

// Same-origin fetch — no CORS configuration needed.
const endpoint = "/api/logdb";

export const logdb       = new LogDBClient({
  endpoint,
  defaultApplication: "my-nextjs-app",
  defaultEnvironment: process.env.NODE_ENV,
});
export const logdbReader = new LogDBReader({ endpoint });

await logdb.log({ message: "user signed in", level: LogLevel.Info });
const { items, totalCount } = await logdbReader.getLogs({ level: "Error", take: 50 });
```

If the browser runs on a different origin (e.g. split frontend/backend), set
`LOGDB_ALLOWED_ORIGINS=https://my-app.com` so the relay emits CORS headers.

## Deploy to Vercel

```bash
vercel
```

In Vercel dashboard → Project Settings → Environment Variables, set:

| Variable | Required | Notes |
|---|---|---|
| `LOGDB_API_KEY` | Yes | Your LogDB key. |
| `LOGDB_APPLICATION` | No | Default stamped on writes. |
| `LOGDB_ENVIRONMENT` | No | Default stamped on writes. |
| `LOGDB_ALLOWED_ORIGINS` | No | CORS allowlist, comma-separated. Defaults to `*`. |
| `LOGDB_SERVICE_URL` | No | Pin the writer endpoint (skip discovery). |
| `LOGDB_READER_SERVICE_URL` | No | Pin the reader endpoint. |

Redeploy after setting. The relay handles both reads and writes through
the same `/api/logdb` route.

## Runtime

Defaults to **Node.js runtime** (`export const runtime = "nodejs"`). The
long-lived `LogDBClient` / `LogDBReader` instances stay warm between
requests on the same container, amortizing discovery + connection setup
across the cold start.

You *can* flip it to the Edge Runtime by removing the `runtime` export.
`@logdbhq/node` works there too (gRPC-Web over `fetch`). But Edge lambdas
cycle more aggressively, so you pay the discovery cost more often.

## Deploy elsewhere

- **Netlify** — same code, set env vars in Netlify dashboard.
- **Self-hosted** — `npm run build && npm start`.
- **Cloudflare Pages** — switch `runtime` to `"edge"`.

## What's inside

- [`app/api/logdb/route.ts`](./app/api/logdb/route.ts) — the relay. One POST handler, 12-case switch on `body.type`.
- [`app/page.tsx`](./app/page.tsx) — minimal landing page with code snippets (not needed for a production deploy; delete if you only want the API).
- [`app/layout.tsx`](./app/layout.tsx) — standard Next.js shell.

## License

MIT.
