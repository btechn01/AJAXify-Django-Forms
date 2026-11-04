import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { cloudRepos } from "../lib/owner.js";

const inputSchema = z.object({
  issueKey: z.string().min(1),
  summary: z.string().min(1),
  status: z.string().optional(),
  description: z.string().optional(),
  repoUrl: z.string().optional(),
  force: z.boolean().optional(),
});

export default defineTool({
  description: prompt`
    Gate a cloud-agent launch for one Jira issue assigned to the owner.
    Call this before cloud__launch. Same issue key does not launch twice
    unless force is true because the owner asked for a retry.
  `,
  inputSchema,
  effect: "idempotent",
  async execute({ issueKey, summary, status, description, repoUrl, force }, ctx) {
    const normalized = (status ?? "").toLowerCase();
    if (
      normalized.includes("review") ||
      normalized.includes("done") ||
      normalized.includes("block") ||
      normalized.includes("reject")
    ) {
      return {
        launch: false,
        reason: "This status is not implementation work. Record it for the owner instead.",
      };
    }

    const repos = cloudRepos();
    if (repos.length === 0) {
      return {
        launch: false,
        reason: "CLOUD_REPO_URLS is empty. Tell the owner to set it before any implementation starts.",
      };
    }

    const selected = repoUrl
      ? repos.find((repo) => repo.url === repoUrl)
      : repos.length === 1
        ? repos[0]
        : undefined;
    if (!selected) {
      return {
        launch: false,
        reason: "Pass repoUrl set to one URL from CLOUD_REPO_URLS.",
        repos: repos.map((repo) => repo.url),
      };
    }

    const key = `launched:${issueKey}`;
    const existing = await ctx.host.kv.get(key);
    if (existing && !force) {
      return {
        launch: false,
        reason: "A cloud agent was already claimed for this issue.",
        existing,
      };
    }

    const claimedAt = new Date().toISOString();
    await ctx.host.kv.put(key, {
      issueKey,
      repoUrl: selected.url,
      at: claimedAt,
    });

    return {
      launch: true,
      repoUrl: selected.url,
      startingRef: selected.startingRef,
      prompt: [
        `Implement Jira ${issueKey}: ${summary}`,
        description ?? "",
        "Open a pull request. Stay inside this ticket.",
      ]
        .filter((part) => part.length > 0)
        .join("\n\n"),
    };
  },
});
