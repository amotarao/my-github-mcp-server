# my-github-mcp-server

A GitHub MCP (Model Context Protocol) server implementation that provides tools for interacting with GitHub repositories, issues, pull requests, and user information.

## Features

This MCP server provides the following tools:

- **get_parent_of_sub_issue**: Get the parent issue of a sub-issue using GitHub Sub-Issues API
- **list_sub_issues**: List sub-issues for a GitHub issue with pagination and filtering support
- **add_sub_issues**: Add multiple sub-issues to a GitHub issue using GitHub Sub-Issues API with batch processing support
- **get_id_of_issue**: Get the internal GitHub issue ID from an issue number

## Installation

```bash
pnpm install
pnpm build
```

## Usage

### Local Development

```bash
pnpm dev
```

### Production

```bash
pnpm start
```

## Configuration

The server supports optional GitHub API authentication via environment variables:

- `GITHUB_PAT_FOR_PROJECT`: GitHub personal access token for authenticated requests (optional, but recommended for higher rate limits)

## MCP Integration

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

### Server URLs

- **Production**: `https://your-deployment-url.vercel.app/mcp`
- **Local Development**: `http://localhost:3000/mcp`

### Configuration

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "SERVER_URL_HERE",
      "headers": {
        "X-GITHUB-TOKEN": "your_github_personal_access_token_here"
      }
    }
  }
}
```

Replace `SERVER_URL_HERE` with the appropriate URL from the Server URLs section above.

### Authentication

The server reads the GitHub token from the `X-GITHUB-TOKEN` header in HTTP requests. The token should be provided as the raw token value without any prefix.

Without a token, the server works with GitHub's public API with standard rate limits.

## Deployment

This server is configured for deployment on Vercel. The `vercel.json` configuration file is included.
