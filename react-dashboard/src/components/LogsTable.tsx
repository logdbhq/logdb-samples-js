import { useState } from "react";
import type { LogEntry } from "../lib/logdb";

interface LogsTableProps {
  logs: LogEntry[];
  loading: boolean;
  skip: number;
  totalCount: number;
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}

export function LogsTable({
  logs,
  loading,
  skip,
  totalCount,
  page,
  pageCount,
  onPrev,
  onNext,
}: LogsTableProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="logs-table">
      {logs.length === 0 && !loading ? (
        <div className="empty">
          <p>No logs found.</p>
          <p className="hint">Try clearing filters or writing a test log.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-time">Timestamp</th>
              <th className="col-level">Level</th>
              <th className="col-app">Application</th>
              <th className="col-msg">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <RowPair
                key={`${log.id}-${log.guid}`}
                rowNum={skip + i + 1}
                log={log}
                expanded={expanded === log.id}
                onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
              />
            ))}
          </tbody>
        </table>
      )}

      <div className="status-bar">
        <span className="status-info">
          {loading ? (
            <>
              <span className="spinner" aria-label="Loading" /> loading…
            </>
          ) : (
            <>
              Page <b>{page + 1}</b> of <b>{Math.max(pageCount, 1)}</b>
              {" · "}
              {totalCount.toLocaleString()} total
            </>
          )}
        </span>
        <span className="status-nav">
          <button type="button" onClick={onPrev} disabled={page === 0 || loading}>
            ← Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={page + 1 >= pageCount || loading}
          >
            Next →
          </button>
        </span>
      </div>
    </div>
  );
}

function RowPair({
  rowNum,
  log,
  expanded,
  onToggle,
}: {
  rowNum: number;
  log: LogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const lvl = log.level.toLowerCase();
  return (
    <>
      <tr className={`row level-${lvl}`} onClick={onToggle}>
        <td className="col-num">{rowNum}</td>
        <td className="col-time">{formatTs(log.timestamp)}</td>
        <td className="col-level">
          <span className={`level-badge level-${lvl}`}>{log.level}</span>
        </td>
        <td className="col-app">{log.application || <em>—</em>}</td>
        <td className="col-msg">{truncate(log.message, 140)}</td>
      </tr>
      {expanded && (
        <tr className="detail">
          <td colSpan={5}>
            <LogDetail log={log} />
          </td>
        </tr>
      )}
    </>
  );
}

function LogDetail({ log }: { log: LogEntry }) {
  const meta: Array<[string, string]> = (
    [
      ["id", String(log.id)],
      ["guid", log.guid],
      ["timestamp", log.timestamp?.toISOString() ?? ""],
      ["collection", log.collection],
      ["environment", log.environment],
      ["source", log.source],
      ["correlationId", log.correlationId],
      ["userEmail", log.userEmail],
      ["userId", log.userId ? String(log.userId) : ""],
      ["requestPath", log.requestPath],
      ["httpMethod", log.httpMethod],
      ["statusCode", log.statusCode ? String(log.statusCode) : ""],
      ["ipAddress", log.ipAddress],
    ] as Array<[string, string]>
  ).filter(([, v]) => v);

  const attrs: Array<[string, string]> = [
    ...Object.entries(log.attributesS),
    ...Object.entries(log.attributesN).map(
      ([k, v]) => [k, String(v)] as [string, string],
    ),
    ...Object.entries(log.attributesB).map(
      ([k, v]) => [k, String(v)] as [string, string],
    ),
    ...Object.entries(log.attributesD).map(
      ([k, v]) => [k, v.toISOString()] as [string, string],
    ),
  ];

  return (
    <div className="log-detail">
      {log.description && (
        <div className="panel">
          <div className="detail-label">Description</div>
          <div>{log.description}</div>
        </div>
      )}

      <div className="detail-fields">
        {meta.map(([k, v]) => (
          <div key={k} className="detail-row">
            <span className="label">{k}</span>
            <span className="value">{v}</span>
          </div>
        ))}
      </div>

      {attrs.length > 0 && (
        <div className="panel">
          <div className="detail-label">Attributes</div>
          <table className="attrs-table">
            <tbody>
              {attrs.map(([k, v]) => (
                <tr key={k}>
                  <td className="attr-key">{k}</td>
                  <td className="attr-val">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {log.label.length > 0 && (
        <div className="panel">
          <div className="detail-label">Labels</div>
          <div className="labels">
            {log.label.map((l) => (
              <span key={l} className="label-chip">
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {log.exception && (
        <div className="panel">
          <div className="detail-label">Exception</div>
          <pre>{log.exception}</pre>
        </div>
      )}

      {log.stackTrace && (
        <div className="panel">
          <div className="detail-label">Stack trace</div>
          <pre>{log.stackTrace}</pre>
        </div>
      )}

      {log.additionalData && (
        <div className="panel">
          <div className="detail-label">Additional data</div>
          <pre>{prettyJson(log.additionalData)}</pre>
        </div>
      )}
    </div>
  );
}

function formatTs(ts: Date | undefined): string {
  if (!ts) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())} ` +
    `${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
