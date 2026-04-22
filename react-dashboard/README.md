# LogDB React dashboard — sample

A tiny React dashboard showing the full `@logdbhq/web` surface end-to-end:

- **Reader**: `LogDBReader.getLogs` via TanStack Query `useInfiniteQuery`,
  plus `getCollections()` for the collection filter and `getLogsCount()`
  for the live count.
- **Writer**: `LogDBClient.log()` on the "Write test log" button, plus
  `window.error` / `unhandledrejection` capture in `main.tsx`.
- **No API key in the bundle**. All traffic goes through a relay you deploy
  (Supabase Edge Function template ships with `@logdbhq/web`).

## Run it

### 1. Deploy the relay (one-time)

Follow [`@logdbhq/web/templates/supabase-edge-function/README.md`](https://github.com/logdbhq/logdb-web/tree/main/templates/supabase-edge-function).
Deploy with `--no-verify-jwt` so anonymous browser requests reach your
function. Remember the URL — you'll paste it below.

### 2. Install

```bash
cd react-dashboard
npm install
cp .env.example .env
# edit .env and set VITE_LOGDB_RELAY_URL to your relay URL
```

### 3. Dev server

```bash
npm run dev
```

Open the URL Vite prints and you should see your logs. Click **Write test
log** — after ~1.5s it'll appear at the top of the list (the button
invalidates queries post-flush).

### 4. Build

```bash
npm run build
npm run preview
```

## What to look at

**Query hook** (App.tsx):

```ts
const logs = useInfiniteQuery({
  queryKey: ["logs", queryParams],
  initialPageParam: 0,
  queryFn: ({ pageParam }) => logdbReader.getLogs({ ...queryParams, skip: pageParam }),
  getNextPageParam: (last, _all, lastParam) => {
    const next = (lastParam as number) + last.items.length;
    return next < last.totalCount ? next : undefined;
  },
});
```

Plain TanStack pattern — `getNextPageParam` compares `skip + items.length`
to `totalCount` (stable for the same filter, so no cursor needed).

**Singleton clients** (src/lib/logdb.ts):

```ts
export const logdb       = new LogDBClient({ endpoint: VITE_LOGDB_RELAY_URL, ... });
export const logdbReader = new LogDBReader({ endpoint: VITE_LOGDB_RELAY_URL });
```

One relay, two clients. Same URL for reads and writes — the relay
switches on the request body's `type` field.

**Global error capture** (src/main.tsx):

```ts
window.addEventListener("error", (e) => {
  void logdb.log({
    message: e.message,
    level: LogLevel.Error,
    stackTrace: e.error?.stack,
    ...
  });
});
```

Any uncaught error in the tab shows up in the log list seconds later.

## Deploy this dashboard

The sample is a standard Vite React app, so it deploys anywhere:

- **Lovable / Vite-compatible hosts** — set `VITE_LOGDB_RELAY_URL` in the
  host's env, no code change needed.
- **Vercel / Netlify / Cloudflare Pages** — same.
- **GitHub Pages** — need to set the Vite `base` in `vite.config.ts`.

The relay URL must be reachable from the hostname you deploy to. If you
restricted `LOGDB_ALLOWED_ORIGINS` on the relay, add your deploy origin.

## License

MIT.
