import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LogLevel, logdb } from "./lib/logdb";
import "./styles.css";

// One QueryClient per app. Keep caching modest — telemetry data goes stale fast.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
    },
  },
});

// Ship uncaught errors to LogDB automatically.
window.addEventListener("error", (e) => {
  void logdb.log({
    message: e.message,
    level: LogLevel.Error,
    source: "window.error",
    exception: e.error?.name ?? "Error",
    stackTrace: e.error?.stack,
    requestPath: window.location.pathname,
  });
});

window.addEventListener("unhandledrejection", (e) => {
  void logdb.log({
    message: String(e.reason),
    level: LogLevel.Error,
    source: "window.unhandledrejection",
    stackTrace: e.reason instanceof Error ? e.reason.stack : undefined,
    requestPath: window.location.pathname,
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
