export default function Home() {
  return (
    <main>
      <h1>LogDB relay</h1>
      <p>
        The relay endpoint is <code>/api/logdb</code>. Point your browser&apos;s{" "}
        <code>@logdbhq/web</code> clients there:
      </p>
      <pre
        style={{
          background: "#f3f4f6",
          padding: 12,
          borderRadius: 6,
          overflowX: "auto",
        }}
      >{`import { LogDBClient, LogDBReader } from "@logdbhq/web";

const endpoint = "/api/logdb";
const logdb       = new LogDBClient({ endpoint, defaultApplication: "my-app" });
const logdbReader = new LogDBReader({ endpoint });

await logdb.log({ message: "hi", level: 2 });
const { items, totalCount } = await logdbReader.getLogs({ take: 20 });`}</pre>
      <p>
        Health check: <a href="/api/logdb">POST /api/logdb</a> (sends 405 on GET).
      </p>
      <p>
        See the{" "}
        <a href="https://github.com/logdbhq/logdb-samples-js/tree/main/next-api-relay">
          README
        </a>{" "}
        for full setup and deployment.
      </p>
    </main>
  );
}
