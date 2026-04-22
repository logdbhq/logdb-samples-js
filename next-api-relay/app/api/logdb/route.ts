/**
 * Next.js App Router LogDB relay.
 *
 * Drop this file at `app/api/logdb/route.ts` in any Next.js 14+ project.
 * Accepts the same `@logdbhq/web` wire format as the Supabase Edge Function
 * template — writes (`type: "log" | "logBeat" | "logCache"` with `items`)
 * and reads (`type: "getLogs" | "getCollections" | ...` with optional
 * `params`). Forwards everything via `@logdbhq/node` (gRPC-Web).
 *
 * Runtime: Node.js (default). Keep it on Node — the Edge runtime's `fetch`
 * works, but cold starts are better on Node for a long-lived client.
 *
 * Env vars (see `.env.example`):
 *   LOGDB_API_KEY            required
 *   LOGDB_APPLICATION        optional default stamped on writes
 *   LOGDB_ENVIRONMENT        optional default stamped on writes
 *   LOGDB_SERVICE_URL        optional override (writer)
 *   LOGDB_READER_SERVICE_URL optional override (reader)
 *   LOGDB_ALLOWED_ORIGINS    optional comma-separated CORS allowlist, default "*"
 *
 * Browser config:
 *   import { LogDBClient, LogDBReader } from "@logdbhq/web";
 *   const endpoint = "/api/logdb";
 *   const logdb       = new LogDBClient({ endpoint, defaultApplication: "..." });
 *   const logdbReader = new LogDBReader({ endpoint });
 */

import { LogDBClient, LogDBReader } from "@logdbhq/node";

export const runtime = "nodejs";
// Tell Next not to cache — telemetry POSTs are never cacheable.
export const dynamic = "force-dynamic";

const apiKey = process.env.LOGDB_API_KEY;
const allowedOrigins = (process.env.LOGDB_ALLOWED_ORIGINS ?? "*")
  .split(",")
  .map((s) => s.trim());

if (!apiKey) {
  console.error("[logdb] LOGDB_API_KEY is not set — the relay will reject requests.");
}

// One writer + one reader per module instance (reused across requests on a warm lambda).
const writer = apiKey
  ? new LogDBClient({
      apiKey,
      serviceUrl: process.env.LOGDB_SERVICE_URL,
      defaultApplication: process.env.LOGDB_APPLICATION,
      defaultEnvironment: process.env.LOGDB_ENVIRONMENT,
      enableBatching: false, // browser already batches
    })
  : null;

const reader = apiKey
  ? new LogDBReader({
      apiKey,
      serviceUrl: process.env.LOGDB_READER_SERVICE_URL,
    })
  : null;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))
      ? (origin ?? "*")
      : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");

  if (!writer || !reader) {
    return new Response("Server misconfigured: LOGDB_API_KEY missing", {
      status: 500,
      headers: corsHeaders(origin),
    });
  }

  let body: { type?: string; items?: unknown[]; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders(origin) });
  }

  try {
    switch (body.type) {
      // ── Writes ─────────────────────────────────────────────
      case "log":
        // biome-ignore lint/suspicious/noExplicitAny: forwarded as-is
        await writer.sendLogBatch((body.items ?? []) as any);
        return ok204(origin);
      case "logBeat":
        // biome-ignore lint/suspicious/noExplicitAny: forwarded as-is
        await writer.sendLogBeatBatch((body.items ?? []) as any);
        return ok204(origin);
      case "logCache":
        // biome-ignore lint/suspicious/noExplicitAny: forwarded as-is
        await writer.sendLogCacheBatch((body.items ?? []) as any);
        return ok204(origin);

      // ── Reads ──────────────────────────────────────────────
      case "getLogs": {
        // biome-ignore lint/suspicious/noExplicitAny: forwarded as-is
        const page = await reader.getLogs((body.params ?? {}) as any);
        return okJson(page, origin);
      }
      case "getLogCaches": {
        // biome-ignore lint/suspicious/noExplicitAny: forwarded as-is
        const page = await reader.getLogCaches((body.params ?? {}) as any);
        return okJson(page, origin);
      }
      case "getLogBeats": {
        // biome-ignore lint/suspicious/noExplicitAny: forwarded as-is
        const page = await reader.getLogBeats((body.params ?? {}) as any);
        return okJson(page, origin);
      }
      case "getCollections":
        return okJson({ collections: await reader.getCollections() }, origin);
      case "getLogsCount": {
        // biome-ignore lint/suspicious/noExplicitAny: forwarded as-is
        const count = await reader.getLogsCount((body.params ?? {}) as any);
        return okJson({ count }, origin);
      }
      case "getEventLogStatus":
        return okJson(await reader.getEventLogStatus(), origin);

      default:
        return new Response(`Unknown type: ${body.type ?? "(missing)"}`, {
          status: 400,
          headers: corsHeaders(origin),
        });
    }
  } catch (err) {
    console.error("[logdb] forwarding failed:", err);
    return new Response("Upstream LogDB unavailable", {
      status: 502,
      headers: corsHeaders(origin),
    });
  }
}

function ok204(origin: string | null): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
function okJson(payload: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders(origin), "content-type": "application/json" },
  });
}
