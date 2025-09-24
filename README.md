# my-github-mcp-server

A GitHub MCP (Model Context Protocol) server implementation that provides tools for interacting with GitHub repositories, issues, pull requests, and user information.

## Features

This MCP server provides the following tools:

- **get_repository_info**: Get detailed information about a GitHub repository including description, stars, forks, and other metadata
- **list_repository_issues**: List issues for a GitHub repository with optional filtering by state
- **get_pull_request**: Get detailed information about a specific pull request including status, files changed, and metadata
- **search_repositories**: Search GitHub repositories by query with sorting options
- **get_user_info**: Get information about a GitHub user or organization

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

To use this server with Claude Desktop or other MCP clients, add it to your MCP configuration file.
