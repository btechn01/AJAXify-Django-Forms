import { defineConnection } from "@grok/agent-sdk/connections";

export default defineConnection({
  cursorAccount: true,
  advertiseTools: true,
  servers: ["Atlassian"],
  optional: true,
});
