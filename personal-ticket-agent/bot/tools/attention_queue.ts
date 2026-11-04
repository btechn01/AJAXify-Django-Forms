import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { readAttention } from "../lib/attention.js";
import { cloudRepos, ownerBitbucketUser, ownerJiraAccountId } from "../lib/owner.js";

export default defineTool({
  description: prompt`
    Read pull requests and tickets already recorded for the owner.
    Use this for the weekday queue. It does not call Jira or Bitbucket.
  `,
  inputSchema: z.object({}),
  effect: "read",
  async execute(_input, ctx) {
    const items = await readAttention(ctx.host.kv);
    return {
      jiraAccountConfigured: ownerJiraAccountId().length > 0,
      bitbucketUserConfigured: ownerBitbucketUser().length > 0,
      repositoryCount: cloudRepos().length,
      items,
    };
  },
});
