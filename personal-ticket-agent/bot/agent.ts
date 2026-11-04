import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  name: "Personal ticket agent",
  description: "Implements tickets assigned to you and reviews Bitbucket pull requests that request you.",
  model: {
    id: "grok-4.7",
    params: [
      { id: "reasoning_effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  local: { sandbox: true },
  tools: ["read", "grep", "glob", "ls"],
  hosting: {
    secretNames: [
      "AGENT_WEBHOOK_SECRET",
      "BITBUCKET_WEBHOOK_SECRET",
      "OWNER_JIRA_ACCOUNT_ID",
      "OWNER_BITBUCKET_USER",
      "CLOUD_REPO_URLS",
      "CLOUD_BASE_BRANCH",
    ],
    egressDomains: ["api.atlassian.com", "api.bitbucket.org", "bitbucket.org"],
  },
});
