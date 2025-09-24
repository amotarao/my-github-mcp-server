import { z } from "zod";
import { NextRequest } from "next/server";
import { createMcpHandler } from "mcp-handler";

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



const handler = createMcpHandler(
  (server) => {
    server.tool(
      "get_repository_info",
      "Get detailed information about a GitHub repository including description, stars, forks, and other metadata",
      {
        owner: z.string().describe("Repository owner (username or organization)"),
        repo: z.string().describe("Repository name"),
      },
      async ({ owner, repo }) => {
        const githubToken = process.env.GITHUB_PAT_FOR_PROJECT;
        const content = await makeGitHubRequest(`/repos/${owner}/${repo}`, githubToken);
        
        return {
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
        };
      }
    );

    server.tool(
      "list_repository_issues",
      "List issues for a GitHub repository with optional filtering by state",
      {
        owner: z.string().describe("Repository owner (username or organization)"),
        repo: z.string().describe("Repository name"),
        state: z.enum(["open", "closed", "all"]).optional().default("open").describe("Issue state filter"),
      },
      async ({ owner, repo, state }) => {
        const githubToken = process.env.GITHUB_PAT_FOR_PROJECT;
        const content = await makeGitHubRequest(`/repos/${owner}/${repo}/issues?state=${state}&per_page=10`, githubToken);
        
        const issuesList = content.map((issue: any) => 
          `#${issue.number}: ${issue.title} (${issue.state}) - ${issue.html_url}`
        ).join('\n');
        
        return {
          content: [
            {
              type: "text",
              text: `Issues for ${owner}/${repo} (${state}):\n\n${issuesList}`,
            },
          ],
        };
      }
    );

    server.tool(
      "get_pull_request",
      "Get detailed information about a specific pull request including status, files changed, and metadata",
      {
        owner: z.string().describe("Repository owner (username or organization)"),
        repo: z.string().describe("Repository name"),
        pull_number: z.number().describe("Pull request number"),
      },
      async ({ owner, repo, pull_number }) => {
        const githubToken = process.env.GITHUB_PAT_FOR_PROJECT;
        const content = await makeGitHubRequest(`/repos/${owner}/${repo}/pulls/${pull_number}`, githubToken);
        
        return {
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
        };
      }
    );

    server.tool(
      "search_repositories",
      "Search GitHub repositories by query with sorting options",
      {
        query: z.string().describe("Search query"),
        sort: z.enum(["stars", "forks", "help-wanted-issues", "updated"]).optional().describe("Sort field"),
        order: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort order"),
      },
      async ({ query, sort, order }) => {
        const githubToken = process.env.GITHUB_PAT_FOR_PROJECT;
        let endpoint = `/search/repositories?q=${encodeURIComponent(query)}&per_page=10`;
        if (sort) endpoint += `&sort=${sort}`;
        if (order) endpoint += `&order=${order}`;
        
        const content = await makeGitHubRequest(endpoint, githubToken);
        
        const reposList = content.items.map((repo: any) => 
          `${repo.full_name} (⭐${repo.stargazers_count}) - ${repo.description || "No description"} - ${repo.html_url}`
        ).join('\n');
        
        return {
          content: [
            {
              type: "text",
              text: `Search results for "${query}" (${content.total_count} total):\n\n${reposList}`,
            },
          ],
        };
      }
    );

    server.tool(
      "get_user_info",
      "Get information about a GitHub user or organization",
      {
        username: z.string().describe("GitHub username or organization name"),
      },
      async ({ username }) => {
        const githubToken = process.env.GITHUB_PAT_FOR_PROJECT;
        const content = await makeGitHubRequest(`/users/${username}`, githubToken);
        
        return {
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
        };
      }
    );
  },
  {
    serverInfo: {
      name: 'GitHub MCP Server',
      version: '1.0.0',
    },
  },
  {
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
