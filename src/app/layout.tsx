import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub MCP Server",
  description: "A GitHub MCP (Model Context Protocol) server implementation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
