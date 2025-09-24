import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>GitHub MCP Server</h1>
      <p>This is a GitHub MCP (Model Context Protocol) server implementation.</p>
      <p>The MCP endpoint is available at <code>/mcp</code></p>
      
      <h2>Available Tools:</h2>
      <ul>
        <li><strong>get_repository_info</strong> - Get detailed repository information</li>
        <li><strong>list_repository_issues</strong> - List repository issues with filtering</li>
        <li><strong>get_pull_request</strong> - Get pull request details</li>
        <li><strong>search_repositories</strong> - Search GitHub repositories</li>
        <li><strong>get_user_info</strong> - Get user or organization information</li>
      </ul>
      
      <h2>Configuration:</h2>
      <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
{`{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://your-deployment-url.vercel.app/mcp",
      "headers": {
        "X-GITHUB-TOKEN": "your_github_personal_access_token_here"
      }
    }
  }
}`}
      </pre>
    </div>
  );
}
