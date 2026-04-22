# LogDB JS/TS samples

Sample applications for the browser and Node.js LogDB SDKs:

- [`@logdbhq/web`](https://www.npmjs.com/package/@logdbhq/web) — browser SDK (relay-based)
- [`@logdbhq/node`](https://www.npmjs.com/package/@logdbhq/node) — Node/Deno/Bun/Workers/Edge SDK (gRPC-Web)

## Samples

| Sample | Runtime | Demonstrates |
|---|---|---|
| [`react-dashboard`](./react-dashboard) | Browser (Vite + React + TanStack Query) | Reader + writer through a relay — logs list with infinite scroll, filters, collections dropdown, live count, auto error capture |
| [`node-cli`](./node-cli) | Node / Bun / Deno CLI | `@logdbhq/node`'s reader directly — no relay. `logs`, `count`, `collections`, `status` subcommands with filter flags and `--json` output. |
| [`next-api-relay`](./next-api-relay) | Next.js 15 App Router | Drop-in relay as an API route (`/api/logdb`) for Vercel / Netlify / self-hosted Next. Handles reads and writes — same wire format as the Supabase template. |

More coming: Express middleware, Cloudflare Worker relay, Deno/Bun server.

## Related docs

- Developer docs: https://docs.logdb.dev/
- .NET samples: https://github.com/logdbhq/logdb-samples

## License

MIT.
