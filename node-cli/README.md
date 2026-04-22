# logdb-node-cli — sample

Tiny CLI that queries LogDB via [`@logdbhq/node`](https://www.npmjs.com/package/@logdbhq/node).
Direct gRPC-Web — no relay. Runs on Node, Bun, and Deno.

## Install

```bash
cd node-cli
npm install
```

## Use

```bash
export LOGDB_API_KEY=pk_your_key

# List the 20 most recent logs
npm run dev -- logs

# Filter: errors in the last 2 hours from "my-app"
npm run dev -- logs --level Error --app my-app --since 2h --take 50

# Count matches (cheaper than listing)
npm run dev -- count --level Error --since 1d

# List all collections for this key
npm run dev -- collections

# Which event-log types are available in the tenant?
npm run dev -- status

# Raw JSON output (for piping to jq, scripts, etc.)
npm run dev -- logs --level Error --since 1h --json | jq '.items[].message'
```

## Flags

| Flag | Description |
|---|---|
| `--level` | `Info` / `Warning` / `Error` / `Critical` / `Exception` / `Debug` / `Trace` |
| `--app` | exact-match application filter |
| `--env` | exact-match environment filter |
| `--collection` | exact-match collection filter |
| `--search` | free-text search across indexed string fields |
| `--since` | `15m`, `2h`, `1d`, `7d` — sets `fromDate = now - duration` |
| `--skip` | offset, default 0 |
| `--take` | page size, default 20 |
| `--sort` | sort field, default `timestamp` |
| `--asc` | ascending order (default descending) |
| `--json` | raw JSON output |

## Env vars

| Variable | Purpose |
|---|---|
| `LOGDB_API_KEY` | **required** — your LogDB account-scoped key |
| `LOGDB_GRPC_SERVER_URL` | optional — override the reader endpoint (skips discovery) |

## The code

The CLI is about 150 lines, mostly arg parsing. The actual reader call is:

```ts
import { LogDBReader } from "@logdbhq/node";

const reader = new LogDBReader({ apiKey: process.env.LOGDB_API_KEY! });
const { items, totalCount } = await reader.getLogs({
  level: "Error",
  fromDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
  take: 50,
});
await reader.dispose();
```

That's it. Swap `tsx` for `bun` or `deno run --allow-net --allow-env` and
it runs identically.

## License

MIT.
