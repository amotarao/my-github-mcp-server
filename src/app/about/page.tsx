import Link from "next/link";

export default function About() {
  return (
    <div className="container">
      <nav className="nav">
        <Link href="/" className="nav-link">
          Home
        </Link>
        <Link href="/about" className="nav-link">
          About
        </Link>
      </nav>

      <main>
        <h1>About</h1>
        <p>
          This is a GitHub MCP (Model Context Protocol) server implementation
          built with Next.js and TypeScript.
        </p>

        <div>
          <h2>Technology Stack</h2>
          <ul>
            <li>Next.js 14</li>
            <li>React 18</li>
            <li>TypeScript</li>
            <li>ESLint</li>
          </ul>
        </div>
      </main>

      <footer className="footer">
        <p>&copy; 2025 GitHub MCP Server</p>
      </footer>
    </div>
  );
}
