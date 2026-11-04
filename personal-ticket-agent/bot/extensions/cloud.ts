import cursorCloudAgents from "@grok/agent-sdk/extensions/cursor-cloud-agents";
import { cloudRepos } from "../lib/owner.js";

export default cursorCloudAgents({
  cloud: {
    repos: () => cloudRepos(),
    autoCreatePR: true,
  },
  channels: ["jira"],
  needsApproval: false,
});
