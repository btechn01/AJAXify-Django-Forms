import { defineChannel, POST, sharedSecretAuth } from "@grok/agent-sdk/channels";
import { z } from "zod";
import { recordAttention } from "../lib/attention.js";
import { assigneeMatchesOwner } from "../lib/owner.js";

type JiraState = {
  issueKey: string;
};

const bodySchema = z.object({
  issueKey: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  projectKey: z.string().optional(),
  assigneeAccountId: z.string().optional(),
});

function needsImplementation(status: string | undefined): boolean {
  const normalized = (status ?? "").toLowerCase();
  if (!normalized) {
    return true;
  }
  return !normalized.includes("review") && !normalized.includes("done") && !normalized.includes("block");
}

export default defineChannel<JiraState>({
  state: { issueKey: "" },
  auth: [sharedSecretAuth({ header: "X-Agent-Secret", secret: "AGENT_WEBHOOK_SECRET" })],
  routes: [
    POST("/assigned", {
      description: "Jira assignment for the owner",
      bodySchema,
      handler: async (_request, { send, waitUntil, body, host }) => {
        if (!assigneeMatchesOwner(body.assigneeAccountId)) {
          return new Response(null, { status: 202 });
        }

        const at = new Date().toISOString();
        if (!needsImplementation(body.status)) {
          await recordAttention(host.kv, {
            id: `ticket:${body.issueKey}`,
            kind: "ticket",
            title: `${body.issueKey} ${body.summary}`,
            url: "",
            at,
            note: `Status is ${body.status ?? "unknown"}. Do not implement.`,
          });
          waitUntil(
            send(
              `Ticket ${body.issueKey} needs the owner's attention. Status: ${body.status}. Do not launch a cloud agent. Summarize the ticket from ticket.json.`,
              {
                title: body.issueKey,
                state: { issueKey: body.issueKey },
                workspaceFiles: { "ticket.json": JSON.stringify(body, null, 2) },
              },
            ),
          );
          return new Response(null, { status: 202 });
        }

        waitUntil(
          send(
            [
              `Jira ${body.issueKey} was assigned to the owner.`,
              "Read ticket.json.",
              "Load the ticket-workflow skill.",
              "Call start_ticket before any cloud launch.",
              "Launch only when start_ticket returns launch true.",
            ].join(" "),
            {
              title: body.issueKey,
              state: { issueKey: body.issueKey },
              workspaceFiles: { "ticket.json": JSON.stringify(body, null, 2) },
            },
          ),
        );
        return new Response(null, { status: 202 });
      },
    }),
  ],
});
