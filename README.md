# my-github-mcp-server

A GitHub MCP (Model Context Protocol) server implementation that provides tools for interacting with GitHub repositories, issues, pull requests, and user information.

## Features

This MCP server provides the following tools:

- **get_repository_info**: Get detailed information about a GitHub repository including description, stars, forks, and other metadata
- **list_repository_issues**: List issues for a GitHub repository with optional filtering by state
- **get_pull_request**: Get detailed information about a specific pull request including status, files changed, and metadata
- **search_repositories**: Search GitHub repositories by query with sorting options
- **get_user_info**: Get information about a GitHub user or organization
- **get_parent_of_sub_issue**: Get the parent issue of a sub-issue using GitHub Sub-Issues API
- **list_sub_issues**: List sub-issues for a GitHub issue with pagination and filtering support
- **add_sub_issues**: Add multiple sub-issues to a GitHub issue using GitHub Sub-Issues API with batch processing support

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

- `GITHUB_TOKEN`: GitHub personal access token for authenticated requests (optional, but recommended for higher rate limits)

## Deployment

This server is configured for deployment on Vercel. The `vercel.json` configuration file is included.

## MCP Integration

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://your-deployment-url.vercel.app/mcp",
      "headers": {
        "X-GITHUB-TOKEN": "your_github_personal_access_token_here"
      }
    }
  }
}
```

### Local Development

For local testing, start the server:

```bash
pnpm dev
```

Then configure your MCP client to use:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "X-GITHUB-TOKEN": "your_github_personal_access_token_here"
      }
    }
  }
}
```

### Authentication

The server reads the GitHub token from the `X-GITHUB-TOKEN` header in HTTP requests. The token should be provided as the raw token value without any prefix.

Without a token, the server works with GitHub's public API with standard rate limits.

### Available Tools

Once configured, the following tools will be available in your MCP client:

- `get_repository_info` - Get detailed repository information
- `list_repository_issues` - List repository issues with filtering
- `get_pull_request` - Get pull request details
- `search_repositories` - Search GitHub repositories
- `get_user_info` - Get user or organization information
- `get_parent_of_sub_issue` - Get parent issue of a sub-issue
- `list_sub_issues` - List sub-issues with pagination and filtering
- `add_sub_issues` - Add multiple sub-issues to a parent issue with batch processing
