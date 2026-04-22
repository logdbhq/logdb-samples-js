import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FilterBar, type FilterState } from "./components/FilterBar";
import { LogsTable } from "./components/LogsTable";
import {
  LogEventBuilder,
  LogLevel,
  type LogQueryParams,
  logdb,
  logdbReader,
} from "./lib/logdb";

const PAGE_SIZE = 50;

const INITIAL_FILTER: FilterState = {
  search: "",
  level: "",
  collection: "",
};

const RELAY_URL = import.meta.env.VITE_LOGDB_RELAY_URL;
const RELAY_MISCONFIGURED =
  !RELAY_URL || RELAY_URL.includes("<your-project-ref>");

export function App() {
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  const [page, setPage] = useState(0);
  const [writing, setWriting] = useState(false);
  const qc = useQueryClient();

  const queryParams = useMemo<LogQueryParams>(
    () => ({
      search: filter.search || undefined,
      level: filter.level || undefined,
      collections: filter.collection ? [filter.collection] : undefined,
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      sort: { field: "timestamp", ascending: false },
    }),
    [filter, page],
  );

  const logs = useQuery({
    queryKey: ["logs", queryParams],
    queryFn: () => logdbReader.getLogs(queryParams),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });

  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: () => logdbReader.getCollections(),
    staleTime: 5 * 60_000,
  });

  const totalCount = logs.data?.totalCount ?? 0;
  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  const updateFilter = (next: FilterState) => {
    setFilter(next);
    setPage(0);
  };

  const writeTestLog = async () => {
    setWriting(true);
    try {
      await LogEventBuilder.create(logdb)
        .setMessage(`test log from dashboard at ${new Date().toISOString()}`)
        .setLogLevel(LogLevel.Info)
        .setSource("react-dashboard")
        .addAttribute("trigger", "button")
        .addAttribute("random", Math.floor(Math.random() * 1000))
        .addLabel("sample")
        .log();
      await logdb.flush();
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["logs"] });
      }, 1200);
    } finally {
      setWriting(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>LogDB viewer</h1>
        <p className="sub">
          Super-lite log table viewer using{" "}
          <a
            href="https://www.npmjs.com/package/@logdbhq/web"
            target="_blank"
            rel="noreferrer"
          >
            @logdbhq/web
          </a>
          . Reader via <code>LogDBReader.getLogs</code>, writer via{" "}
          <code>LogEventBuilder</code>. Click any row to expand.
        </p>
      </header>

      {RELAY_MISCONFIGURED && (
        <div className="config-warning">
          <strong>LogDB relay URL is not configured.</strong>
          <p>
            This dashboard never holds the LogDB API key — it talks to a relay
            you deploy, and the relay injects the key server-side. You don't
            paste a key into this project; you point it at your relay.
          </p>
          <ol>
            <li>
              In <code>react-dashboard/</code>, copy{" "}
              <code>.env.example</code> to <code>.env</code>.
            </li>
            <li>
              Edit <code>.env</code> and set{" "}
              <code>VITE_LOGDB_RELAY_URL</code> to your deployed relay's URL
              (e.g.{" "}
              <code>https://your-project.supabase.co/functions/v1/logdb-relay</code>
              ).
            </li>
            <li>
              Restart <code>npm run dev</code> — Vite only reads env vars at
              startup.
            </li>
          </ol>
          <p>
            Don't have a relay yet? Deploy the{" "}
            <a
              href="https://github.com/logdbhq/logdb-web/tree/main/templates/supabase-edge-function"
              target="_blank"
              rel="noreferrer"
            >
              Supabase Edge Function template
            </a>{" "}
            from <code>@logdbhq/web</code> (with <code>--no-verify-jwt</code>),
            then use its URL above.
          </p>
        </div>
      )}

      <FilterBar
        value={filter}
        onChange={updateFilter}
        collections={collections.data ?? []}
        collectionsLoading={collections.isLoading}
        onRefresh={() => {
          qc.invalidateQueries({ queryKey: ["logs"] });
          qc.invalidateQueries({ queryKey: ["collections"] });
        }}
        onWriteTestLog={writeTestLog}
        writingTestLog={writing}
      />

      {logs.error && !RELAY_MISCONFIGURED ? (
        <div className="error-banner">
          <strong>Failed to load logs.</strong>{" "}
          {logs.error instanceof Error ? logs.error.message : String(logs.error)}
          <div className="error-actions">
            <button
              type="button"
              onClick={() => logs.refetch()}
              disabled={logs.isFetching}
            >
              {logs.isFetching ? "Retrying…" : "Retry"}
            </button>
          </div>
        </div>
      ) : (
        <LogsTable
          logs={logs.data?.items ?? []}
          loading={logs.isFetching}
          skip={page * PAGE_SIZE}
          totalCount={totalCount}
          page={page}
          pageCount={pageCount}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => (p + 1 < pageCount ? p + 1 : p))}
        />
      )}

      <footer>
        <span>
          Relay: <code>{import.meta.env.VITE_LOGDB_RELAY_URL ?? "(not set)"}</code>
        </span>
        <span>
          Env: <code>{import.meta.env.MODE}</code>
        </span>
      </footer>
    </div>
  );
}
