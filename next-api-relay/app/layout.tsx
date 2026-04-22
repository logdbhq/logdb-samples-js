import type { ReactNode } from "react";

export const metadata = {
  title: "LogDB relay — Next.js sample",
  description: "Sample Next.js API route that relays @logdbhq/web traffic to LogDB.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "40px auto", padding: "0 16px", lineHeight: 1.55 }}>
        {children}
      </body>
    </html>
  );
}
