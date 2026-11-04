import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "A new To Do ticket claims start_ticket and does not launch when no repository is configured.",
  async test(t) {
    await t.send(
      'Call start_ticket with issueKey "DEMO-1", summary "Add a ping route", and status "To Do". Then stop. Do not call cloud__launch.',
    );
    t.succeeded();
    t.calledTool("start_ticket");
    t.notCalledTool("cloud__launch");
  },
});
