import Link from 'next/link'

export default function Home() {
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
        <h1>GitHub MCP Server</h1>
        <p>A GitHub MCP (Model Context Protocol) server implementation.</p>
        
        <div>
          <h2>Features</h2>
          <ul>
            <li>GitHub API integration</li>
            <li>MCP protocol support</li>
            <li>Next.js frontend</li>
          </ul>
        </div>
      </main>
      
      <footer className="footer">
        <p>&copy; 2025 GitHub MCP Server</p>
      </footer>
    </div>
  )
}
