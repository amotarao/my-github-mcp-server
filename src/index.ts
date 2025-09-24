#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import express, { Request, Response } from "express";
import { IncomingMessage, ServerResponse } from "node:http";

const GITHUB_API_BASE = "https://api.github.com";
const USER_AGENT = "GitHub-MCP-Server/1.0.0";

interface GitHubApiResponse<T = any> {
  data?: T;
  error?: string;
  status?: number;
}

async function makeGitHubRequest<T = any>(
  endpoint: string,
  githubToken?: string,
  options: RequestInit = {}
): Promise<GitHubApiResponse<T>> {
  try {
    const url = endpoint.startsWith("http") ? endpoint : `${GITHUB_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      "Accept": "application/vnd.github.v3+json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (githubToken) {
      headers["Authorization"] = `token ${githubToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: `GitHub API error: ${response.status} ${response.statusText} - ${errorText}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return { data, status: response.status };
  } catch (error) {
    return {
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

const GetRepositoryInfoSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
});

const ListRepositoryIssuesSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  state: z.enum(["open", "closed", "all"]).default("open").describe("Issue state filter"),
  limit: z.number().min(1).max(100).default(10).describe("Maximum number of issues to return"),
});

const GetPullRequestSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number"),
});

const SearchRepositoriesSchema = z.object({
  query: z.string().describe("Search query for repositories"),
  sort: z.enum(["stars", "forks", "updated"]).default("stars").describe("Sort criteria"),
  limit: z.number().min(1).max(100).default(10).describe("Maximum number of repositories to return"),
});

const GetUserInfoSchema = z.object({
  username: z.string().describe("GitHub username or organization name"),
});

const server = new Server(
  {
    name: "github-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_repository_info",
        description: "Get detailed information about a GitHub repository including description, stars, forks, and other metadata",
        inputSchema: GetRepositoryInfoSchema,
      },
      {
        name: "list_repository_issues",
        description: "List issues for a GitHub repository with optional filtering by state",
        inputSchema: ListRepositoryIssuesSchema,
      },
      {
        name: "get_pull_request",
        description: "Get detailed information about a specific pull request including status, files changed, and metadata",
        inputSchema: GetPullRequestSchema,
      },
      {
        name: "search_repositories",
        description: "Search GitHub repositories by query with sorting options",
        inputSchema: SearchRepositoriesSchema,
      },
      {
        name: "get_user_info",
        description: "Get information about a GitHub user or organization",
        inputSchema: GetUserInfoSchema,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const { name, arguments: args } = request.params;

  const authHeader = extra?.requestInfo?.headers?.authorization;
  const githubToken = typeof authHeader === 'string' 
    ? (authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7)
        : authHeader.startsWith('token ')
        ? authHeader.slice(6)
        : undefined)
    : undefined;

  try {
    switch (name) {
      case "get_repository_info": {
        const { owner, repo } = GetRepositoryInfoSchema.parse(args);
        const result = await makeGitHubRequest(`/repos/${owner}/${repo}`, githubToken);
        
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
          };
        }

        const repoData = result.data;
        const content = `# ${repoData.full_name}

**Description:** ${repoData.description || "No description available"}

**Statistics:**
- ⭐ Stars: ${repoData.stargazers_count.toLocaleString()}
- 🍴 Forks: ${repoData.forks_count.toLocaleString()}
- 👀 Watchers: ${repoData.watchers_count.toLocaleString()}
- 📂 Size: ${repoData.size} KB
- 🐛 Open Issues: ${repoData.open_issues_count}

**Details:**
- Language: ${repoData.language || "Not specified"}
- License: ${repoData.license?.name || "No license"}
- Created: ${new Date(repoData.created_at).toLocaleDateString()}
- Updated: ${new Date(repoData.updated_at).toLocaleDateString()}
- Default Branch: ${repoData.default_branch}
- Private: ${repoData.private ? "Yes" : "No"}
- Fork: ${repoData.fork ? "Yes" : "No"}

**URLs:**
- Repository: ${repoData.html_url}
- Clone URL: ${repoData.clone_url}
${repoData.homepage ? `- Homepage: ${repoData.homepage}` : ""}`;

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "list_repository_issues": {
        const { owner, repo, state, limit } = ListRepositoryIssuesSchema.parse(args);
        const result = await makeGitHubRequest(`/repos/${owner}/${repo}/issues?state=${state}&per_page=${limit}`, githubToken);
        
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
          };
        }

        const issues = result.data;
        if (!Array.isArray(issues) || issues.length === 0) {
          return {
            content: [{ type: "text", text: `No ${state} issues found in ${owner}/${repo}` }],
          };
        }

        const content = `# Issues in ${owner}/${repo} (${state})

${issues.map((issue: any) => `## #${issue.number}: ${issue.title}
- **State:** ${issue.state}
- **Author:** ${issue.user.login}
- **Created:** ${new Date(issue.created_at).toLocaleDateString()}
- **Labels:** ${issue.labels.map((label: any) => label.name).join(", ") || "None"}
- **URL:** ${issue.html_url}
${issue.body ? `- **Description:** ${issue.body.substring(0, 200)}${issue.body.length > 200 ? "..." : ""}` : ""}
`).join("\n")}`;

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "get_pull_request": {
        const { owner, repo, pull_number } = GetPullRequestSchema.parse(args);
        const result = await makeGitHubRequest(`/repos/${owner}/${repo}/pulls/${pull_number}`, githubToken);
        
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
          };
        }

        const pr = result.data;
        const content = `# Pull Request #${pr.number}: ${pr.title}

**Status:** ${pr.state} ${pr.merged ? "(Merged)" : ""}
**Author:** ${pr.user.login}
**Created:** ${new Date(pr.created_at).toLocaleDateString()}
${pr.merged_at ? `**Merged:** ${new Date(pr.merged_at).toLocaleDateString()}` : ""}

**Branch:** ${pr.head.ref} → ${pr.base.ref}
**Commits:** ${pr.commits}
**Files Changed:** ${pr.changed_files}
**Additions:** +${pr.additions}
**Deletions:** -${pr.deletions}

**Labels:** ${pr.labels.map((label: any) => label.name).join(", ") || "None"}

**Description:**
${pr.body || "No description provided"}

**URLs:**
- Pull Request: ${pr.html_url}
- Diff: ${pr.diff_url}
- Patch: ${pr.patch_url}`;

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "search_repositories": {
        const { query, sort, limit } = SearchRepositoriesSchema.parse(args);
        const result = await makeGitHubRequest(`/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&per_page=${limit}`, githubToken);
        
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
          };
        }

        const searchData = result.data;
        const repositories = searchData.items;
        
        if (!Array.isArray(repositories) || repositories.length === 0) {
          return {
            content: [{ type: "text", text: `No repositories found for query: "${query}"` }],
          };
        }

        const content = `# Search Results for "${query}" (${searchData.total_count.toLocaleString()} total)

${repositories.map((repo: any) => `## ${repo.full_name}
- **Description:** ${repo.description || "No description"}
- **Language:** ${repo.language || "Not specified"}
- **Stars:** ⭐ ${repo.stargazers_count.toLocaleString()}
- **Forks:** 🍴 ${repo.forks_count.toLocaleString()}
- **Updated:** ${new Date(repo.updated_at).toLocaleDateString()}
- **URL:** ${repo.html_url}
`).join("\n")}`;

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "get_user_info": {
        const { username } = GetUserInfoSchema.parse(args);
        const result = await makeGitHubRequest(`/users/${username}`, githubToken);
        
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
          };
        }

        const user = result.data;
        const content = `# ${user.login} ${user.name ? `(${user.name})` : ""}

**Type:** ${user.type}
${user.bio ? `**Bio:** ${user.bio}` : ""}
${user.company ? `**Company:** ${user.company}` : ""}
${user.location ? `**Location:** ${user.location}` : ""}
${user.email ? `**Email:** ${user.email}` : ""}
${user.blog ? `**Website:** ${user.blog}` : ""}

**Statistics:**
- 📚 Public Repositories: ${user.public_repos}
- 👥 Followers: ${user.followers.toLocaleString()}
- 👤 Following: ${user.following.toLocaleString()}
${user.public_gists !== undefined ? `- 📝 Public Gists: ${user.public_gists}` : ""}

**Account:**
- Created: ${new Date(user.created_at).toLocaleDateString()}
- Updated: ${new Date(user.updated_at).toLocaleDateString()}
- Profile: ${user.html_url}`;

        return {
          content: [{ type: "text", text: content }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const app = express();
  
  app.use(express.json({ limit: '4mb' }));
  
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  
  await server.connect(transport);
  
  app.all('/mcp', async (req: IncomingMessage, res: ServerResponse) => {
    await transport.handleRequest(req, res, (req as any).body);
  });
  
  app.get('/', (req: Request, res: Response) => {
    res.json({ 
      name: 'GitHub MCP Server',
      version: '1.0.0',
      transport: 'http',
      status: 'running'
    });
  });
  
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.error(`GitHub MCP Server running on HTTP port ${port}`);
  });
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
