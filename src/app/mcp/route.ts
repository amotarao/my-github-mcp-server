import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const GITHUB_API_BASE = "https://api.github.com";
const USER_AGENT = "GitHub-MCP-Server/1.0.0";

async function makeGitHubRequest(
  endpoint: string,
  githubToken?: string
): Promise<any> {
  const url = `${GITHUB_API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "Accept": "application/vnd.github.v3+json",
  };
  
  if (githubToken) {
    headers["Authorization"] = `token ${githubToken}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

const GetRepositoryInfoSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
});

const ListRepositoryIssuesSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  state: z.enum(["open", "closed", "all"]).optional().default("open").describe("Issue state filter"),
});

const GetPullRequestSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number"),
});

const SearchRepositoriesSchema = z.object({
  query: z.string().describe("Search query"),
  sort: z.enum(["stars", "forks", "help-wanted-issues", "updated"]).optional().describe("Sort field"),
  order: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort order"),
});

const GetUserInfoSchema = z.object({
  username: z.string().describe("GitHub username or organization name"),
});


export async function GET() {
  return NextResponse.json({
    name: 'GitHub MCP Server',
    version: '1.0.0',
    transport: 'http',
    status: 'running'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const githubToken = request.headers.get('x-github-token') || undefined;
    
    if (body.method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
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
        },
        id: body.id,
      });
    }
    
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;
      
      try {
        switch (name) {
          case "get_repository_info": {
            const { owner, repo } = GetRepositoryInfoSchema.parse(args);
            const content = await makeGitHubRequest(`/repos/${owner}/${repo}`, githubToken);
            
            return NextResponse.json({
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: "text",
                    text: `Repository: ${content.full_name}
Description: ${content.description || "No description"}
Stars: ${content.stargazers_count}
Forks: ${content.forks_count}
Language: ${content.language || "Not specified"}
Open Issues: ${content.open_issues_count}
Created: ${content.created_at}
Updated: ${content.updated_at}
Clone URL: ${content.clone_url}
Homepage: ${content.homepage || "None"}`,
                  },
                ],
              },
              id: body.id,
            });
          }

          case "list_repository_issues": {
            const { owner, repo, state } = ListRepositoryIssuesSchema.parse(args);
            const content = await makeGitHubRequest(`/repos/${owner}/${repo}/issues?state=${state}&per_page=10`, githubToken);
            
            const issuesList = content.map((issue: any) => 
              `#${issue.number}: ${issue.title} (${issue.state}) - ${issue.html_url}`
            ).join('\n');
            
            return NextResponse.json({
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: "text",
                    text: `Issues for ${owner}/${repo} (${state}):\n\n${issuesList}`,
                  },
                ],
              },
              id: body.id,
            });
          }

          case "get_pull_request": {
            const { owner, repo, pull_number } = GetPullRequestSchema.parse(args);
            const content = await makeGitHubRequest(`/repos/${owner}/${repo}/pulls/${pull_number}`, githubToken);
            
            return NextResponse.json({
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: "text",
                    text: `Pull Request #${content.number}: ${content.title}
State: ${content.state}
Author: ${content.user.login}
Created: ${content.created_at}
Updated: ${content.updated_at}
Mergeable: ${content.mergeable}
Additions: ${content.additions}
Deletions: ${content.deletions}
Changed Files: ${content.changed_files}
URL: ${content.html_url}

Description:
${content.body || "No description"}`,
                  },
                ],
              },
              id: body.id,
            });
          }

          case "search_repositories": {
            const { query, sort, order } = SearchRepositoriesSchema.parse(args);
            let endpoint = `/search/repositories?q=${encodeURIComponent(query)}&per_page=10`;
            if (sort) endpoint += `&sort=${sort}`;
            if (order) endpoint += `&order=${order}`;
            
            const content = await makeGitHubRequest(endpoint, githubToken);
            
            const reposList = content.items.map((repo: any) => 
              `${repo.full_name} (⭐${repo.stargazers_count}) - ${repo.description || "No description"} - ${repo.html_url}`
            ).join('\n');
            
            return NextResponse.json({
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: "text",
                    text: `Search results for "${query}" (${content.total_count} total):\n\n${reposList}`,
                  },
                ],
              },
              id: body.id,
            });
          }

          case "get_user_info": {
            const { username } = GetUserInfoSchema.parse(args);
            const content = await makeGitHubRequest(`/users/${username}`, githubToken);
            
            return NextResponse.json({
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: "text",
                    text: `User: ${content.login}
Name: ${content.name || "Not specified"}
Bio: ${content.bio || "No bio"}
Company: ${content.company || "Not specified"}
Location: ${content.location || "Not specified"}
Public Repos: ${content.public_repos}
Followers: ${content.followers}
Following: ${content.following}
Created: ${content.created_at}
Profile: ${content.html_url}`,
                  },
                ],
              },
              id: body.id,
            });
          }

          default:
            return NextResponse.json({
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: `Unknown tool: ${name}`,
              },
              id: body.id,
            });
        }
      } catch (error) {
        return NextResponse.json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
          id: body.id,
        });
      }
    }
    
    return NextResponse.json({
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: `Method not found: ${body.method}`,
      },
      id: body.id,
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    return NextResponse.json({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error',
      },
      id: null,
    }, { status: 400 });
  }
}
