import { LogDBClient, LogDBReader, LogEventBuilder, LogLevel, logLevelToString } from "@logdbhq/web";

const endpoint = import.meta.env.VITE_LOGDB_RELAY_URL;
const app = import.meta.env.VITE_APP_NAME ?? "logdb-react-dashboard";

if (!endpoint) {
  // biome-ignore lint/suspicious/noConsole: intentional startup warning
  console.error(
    "[logdb] VITE_LOGDB_RELAY_URL is not set — copy .env.example to .env and fill in your relay URL.",
  );
}

export const logdb = new LogDBClient({
  endpoint: endpoint ?? "http://invalid-endpoint.local",
  defaultApplication: app,
  defaultEnvironment: import.meta.env.MODE,
});

export const logdbReader = new LogDBReader({
  endpoint: endpoint ?? "http://invalid-endpoint.local",
});

export { LogEventBuilder, LogLevel, logLevelToString };
export type { LogEntry, LogQueryParams } from "@logdbhq/web";
