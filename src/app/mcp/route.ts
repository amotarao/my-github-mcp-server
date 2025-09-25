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



const handler = async (request: Request) => {
  const githubTokenHeader = request.headers.get("X-GITHUB-TOKEN");
  const githubToken = Array.isArray(githubTokenHeader) ? githubTokenHeader[0] : githubTokenHeader || undefined;
  
  const mcpHandler = createMcpHandler(
    (server) => {
      server.tool(
        "get_parent_of_sub_issue",
        "Get the parent issue of a sub-issue using GitHub Sub-Issues API",
        {
          owner: z.string().describe("Repository owner (username or organization)"),
          repo: z.string().describe("Repository name"),
          issue_number: z.number().describe("Sub-issue number to get parent for"),
        },
        async ({ owner, repo, issue_number }) => {
          const token = githubToken || process.env.GITHUB_PAT_FOR_PROJECT;
          
          try {
            const content = await makeGitHubRequest(`/repos/${owner}/${repo}/issues/${issue_number}/parent`, token);
            
            return {
              content: [
                {
                  type: "text",
                  text: `Parent Issue for #${issue_number}:
Issue #${content.number}: ${content.title}
State: ${content.state}
Author: ${content.user.login}
Created: ${content.created_at}
Updated: ${content.updated_at}
URL: ${content.html_url}

Description:
${content.body || "No description"}`,
                },
              ],
            };
          } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Issue #${issue_number} in ${owner}/${repo} does not have a parent issue or does not exist.`,
                  },
                ],
              };
            }
            throw error;
          }
        }
      );

      server.tool(
        "list_sub_issues",
        "List sub-issues for a GitHub issue with pagination and filtering support",
        {
          owner: z.string().describe("Repository owner (username or organization)"),
          repo: z.string().describe("Repository name"),
          issue_number: z.number().describe("Parent issue number to list sub-issues for"),
          per_page: z.number().optional().default(30).describe("Number of results per page (max 100)"),
          page: z.number().optional().default(1).describe("Page number of results to fetch"),
          state: z.enum(["open", "closed", "all"]).optional().describe("Filter sub-issues by state"),
          labels: z.string().optional().describe("Comma-separated list of label names to filter by"),
        },
        async ({ owner, repo, issue_number, per_page, page, state, labels }) => {
          const token = githubToken || process.env.GITHUB_PAT_FOR_PROJECT;
          
          try {
            let endpoint = `/repos/${owner}/${repo}/issues/${issue_number}/sub_issues?per_page=${per_page}&page=${page}`;
            
            if (state) {
              endpoint += `&state=${state}`;
            }
            if (labels) {
              endpoint += `&labels=${encodeURIComponent(labels)}`;
            }
            
            const content = await makeGitHubRequest(endpoint, token);
            
            if (!Array.isArray(content) || content.length === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: `No sub-issues found for issue #${issue_number} in ${owner}/${repo}.`,
                  },
                ],
              };
            }
            
            const subIssuesList = content.map((issue: any) => 
              `#${issue.number}: ${issue.title} (${issue.state}) - ${issue.html_url}`
            ).join('\n');
            
            const totalText = content.length === per_page ? ` (showing page ${page})` : '';
            
            return {
              content: [
                {
                  type: "text",
                  text: `Sub-issues for #${issue_number} in ${owner}/${repo}${totalText}:\n\n${subIssuesList}`,
                },
              ],
            };
          } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Issue #${issue_number} in ${owner}/${repo} does not exist or has no sub-issues.`,
                  },
                ],
              };
            }
            throw error;
          }
        }
      );

      server.tool(
        "get_id_of_issue",
        "Get the internal GitHub issue ID from an issue number",
        {
          owner: z.string().describe("Repository owner (username or organization)"),
          repo: z.string().describe("Repository name"),
          issue_number: z.number().describe("Issue number to get the ID for"),
        },
        async ({ owner, repo, issue_number }) => {
          const token = githubToken || process.env.GITHUB_PAT_FOR_PROJECT;
          
          try {
            const content = await makeGitHubRequest(`/repos/${owner}/${repo}/issues/${issue_number}`, token);
            
            return {
              content: [
                {
                  type: "text",
                  text: `Issue #${issue_number} in ${owner}/${repo} has ID: ${content.id}`,
                },
              ],
            };
          } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Issue #${issue_number} not found in ${owner}/${repo}.`,
                  },
                ],
              };
            }
            throw error;
          }
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
  
  return mcpHandler(request);
};

export { handler as GET, handler as POST, handler as DELETE };
