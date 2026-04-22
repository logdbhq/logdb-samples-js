import type { ChangeEvent } from "react";
import { LogLevel, logLevelToString } from "../lib/logdb";

export interface FilterState {
  search: string;
  level: string;
  collection: string;
}

interface FilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  collections: string[];
  collectionsLoading: boolean;
  onRefresh: () => void;
  onWriteTestLog: () => void;
  writingTestLog: boolean;
}

const LEVEL_OPTIONS = [
  LogLevel.Trace,
  LogLevel.Debug,
  LogLevel.Info,
  LogLevel.Warning,
  LogLevel.Error,
  LogLevel.Critical,
].map((l) => logLevelToString(l));

export function FilterBar({
  value,
  onChange,
  collections,
  collectionsLoading,
  onRefresh,
  onWriteTestLog,
  writingTestLog,
}: FilterBarProps) {
  const upd =
    <K extends keyof FilterState>(key: K) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [key]: e.target.value });

  return (
    <div className="filter-bar">
      <label>
        <span>Search</span>
        <input
          type="text"
          placeholder="message, exception, source…"
          value={value.search}
          onChange={upd("search")}
        />
      </label>

      <label>
        <span>Level</span>
        <select value={value.level} onChange={upd("level")}>
          <option value="">Any</option>
          {LEVEL_OPTIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Collection</span>
        <select value={value.collection} onChange={upd("collection")}>
          <option value="">{collectionsLoading ? "Loading…" : "All"}</option>
          {collections.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="filter-actions">
        <button type="button" onClick={onRefresh}>
          Refresh
        </button>
        <button
          type="button"
          onClick={onWriteTestLog}
          className="secondary"
          disabled={writingTestLog}
        >
          {writingTestLog ? "Writing…" : "Write test log"}
        </button>
      </div>
    </div>
  );
}
