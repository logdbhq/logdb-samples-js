#!/usr/bin/env node
/**
 * logdb-query — tiny CLI for querying LogDB via @logdbhq/node.
 *
 *   LOGDB_API_KEY=pk_... tsx src/index.ts logs --level Error --app my-app --since 1h --take 20
 *   LOGDB_API_KEY=pk_... tsx src/index.ts collections
 *   LOGDB_API_KEY=pk_... tsx src/index.ts count --level Error
 *   LOGDB_API_KEY=pk_... tsx src/index.ts status
 *
 * Flags:
 *   --level <name>            Info | Warning | Error | Critical | ...
 *   --app <name>              application filter (exact)
 *   --env <name>              environment filter (exact)
 *   --collection <name>       collection filter (exact)
 *   --search <text>           free-text search
 *   --since <duration>        fromDate = now - duration (e.g. 15m, 2h, 1d, 7d)
 *   --skip <n>                offset (default 0)
 *   --take <n>                page size (default 20)
 *   --sort <field>            default "timestamp"
 *   --asc                     ascending sort (default descending)
 *   --json                    raw JSON output (no table)
 */

import { LogDBReader, type LogQueryParams } from "@logdbhq/node";

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

const apiKey = process.env.LOGDB_API_KEY;
if (!apiKey) {
  console.error("error: LOGDB_API_KEY env var is required");
  process.exit(2);
}

const flags = parseFlags(args.slice(1));
const asJson = flags.json === true;

const reader = new LogDBReader({
  apiKey,
  serviceUrl: process.env.LOGDB_GRPC_SERVER_URL,
  requestTimeout: 15_000,
});

try {
  switch (command) {
    case "logs":      await cmdLogs(flags); break;
    case "count":     await cmdCount(flags); break;
    case "collections": await cmdCollections(); break;
    case "status":    await cmdStatus(); break;
    default:
      console.error(`error: unknown command "${command}"`);
      printHelp();
      process.exit(1);
  }
} catch (err) {
  console.error("request failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await reader.dispose();
}

// ── commands ──────────────────────────────────────────────

async function cmdLogs(f: Flags): Promise<void> {
  const params = toLogParams(f);
  const page = await reader.getLogs(params);

  if (asJson) {
    console.log(JSON.stringify(page, null, 2));
    return;
  }

  if (page.items.length === 0) {
    console.log(`(no logs — 0 of ${page.totalCount} match)`);
    return;
  }

  for (const log of page.items) {
    const ts = log.timestamp?.toISOString() ?? "                    ";
    const lvl = log.level.padEnd(8);
    const app = (log.application || "—").padEnd(16);
    console.log(`${ts}  ${lvl}  ${app}  ${log.message}`);
  }
  console.log(`\nshowing ${page.items.length} of ${page.totalCount} match${page.totalCount === 1 ? "" : "es"}`);
}

async function cmdCount(f: Flags): Promise<void> {
  const params = toLogParams(f);
  const count = await reader.getLogsCount(params);
  if (asJson) console.log(JSON.stringify({ count }));
  else console.log(count);
}

async function cmdCollections(): Promise<void> {
  const list = await reader.getCollections();
  if (asJson) console.log(JSON.stringify(list));
  else {
    if (list.length === 0) console.log("(no collections)");
    for (const c of list) console.log(c);
  }
}

async function cmdStatus(): Promise<void> {
  const status = await reader.getEventLogStatus();
  if (asJson) console.log(JSON.stringify(status, null, 2));
  else {
    console.log(`Windows events: ${status.hasWindowsEvents}`);
    console.log(`IIS events:     ${status.hasIISEvents}`);
    console.log(`Windows metrics: ${status.hasWindowsMetrics}`);
  }
}

// ── helpers ───────────────────────────────────────────────

function toLogParams(f: Flags): LogQueryParams {
  return {
    application: str(f.app),
    environment: str(f.env),
    level: str(f.level),
    search: str(f.search),
    collections: str(f.collection) ? [str(f.collection) as string] : undefined,
    skip: f.skip !== undefined ? Number(f.skip) : 0,
    take: f.take !== undefined ? Number(f.take) : 20,
    fromDate: str(f.since) ? new Date(Date.now() - parseDuration(str(f.since) as string)) : undefined,
    sort: {
      field: typeof f.sort === "string" ? f.sort : "timestamp",
      ascending: f.asc === true,
    },
  };
}

/** Narrow a flag value to string (undefined if unset or was a bare boolean flag). */
function str(v: string | boolean | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

type Flags = Record<string, string | boolean | undefined>;

function parseFlags(argv: string[]): Flags {
  const out: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function parseDuration(s: string): number {
  const m = /^(\d+)([smhd])$/i.exec(s.trim());
  if (!m) throw new Error(`invalid --since value "${s}" (expected e.g. 15m, 2h, 1d)`);
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mul = unit === "s" ? 1_000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mul;
}

function printHelp(): void {
  console.log(`logdb-query — query LogDB via @logdbhq/node

Usage:
  LOGDB_API_KEY=pk_... tsx src/index.ts <command> [flags]

Commands:
  logs        List log entries (default 20)
  count       Count matching log entries
  collections List distinct collections for the API key
  status      Which event-log types are available (Windows / IIS / metrics)

Flags (for logs/count):
  --level <name>        Info | Warning | Error | Critical | ...
  --app <name>          application filter (exact)
  --env <name>          environment filter (exact)
  --collection <name>   collection filter (exact)
  --search <text>       free-text search
  --since <duration>    e.g. 15m, 2h, 1d, 7d
  --skip <n>            offset (default 0)
  --take <n>            page size (default 20)
  --sort <field>        sort field (default timestamp)
  --asc                 ascending (default descending)
  --json                raw JSON output

Env vars:
  LOGDB_API_KEY          required
  LOGDB_GRPC_SERVER_URL  override reader endpoint (skip discovery)
`);
}
