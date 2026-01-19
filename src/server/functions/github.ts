import { createServerFn } from "@tanstack/react-start"

export const fetchGitHubTarball = createServerFn({ method: "GET" })
  .inputValidator((data: { owner: string; repo: string }) => data)
  .handler(async ({ data }) => {
    const { owner, repo } = data
    const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball`

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    }

    // Use GitHub token if available (increases rate limit from 60 to 5000 req/hr)
    const githubToken = process.env.GITHUB_TOKEN
    if (githubToken) {
      headers["Authorization"] = `Bearer ${githubToken}`
    }

    const response = await fetch(tarballUrl, { headers })

    if (!response.ok) {
      if (response.status === 403) {
        const remaining = response.headers.get("x-ratelimit-remaining")
        if (remaining === "0") {
          throw new Error(
            "GitHub API rate limit exceeded. Set GITHUB_TOKEN env var to increase limit."
          )
        }
      }
      if (response.status === 404) {
        throw new Error(`Repository not found: ${owner}/${repo}`)
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    // Return as base64 since server functions can't return raw binary
    return Buffer.from(buffer).toString("base64")
  })
