# Personal ticket agent

This agent runs as the Cursor account that deploys it.

- A Jira automation posts here when a ticket is assigned to you. The agent starts a cloud agent and opens a pull request when the ticket is ready to implement.
- A Bitbucket pull request that lists you as a reviewer gets one review comment.
- A weekday run at 08:00 UTC lists the queue saved from those events.

Repository URLs and your account ids stay in deployment secrets. This folder does not store them.

## Secrets

Copy `.env.example` to `.env` for a local run.

| Name | Purpose |
| --- | --- |
| `AGENT_WEBHOOK_SECRET` | Shared secret for the Jira route. Header `X-Agent-Secret`. |
| `BITBUCKET_WEBHOOK_SECRET` | Signature secret if you also add a repository webhook. |
| `OWNER_JIRA_ACCOUNT_ID` | Your Jira account id. Events for other assignees are ignored. |
| `OWNER_BITBUCKET_USER` | Your Bitbucket nickname, display name, or uuid. Reviews run only when this matches a reviewer. |
| `CLOUD_REPO_URLS` | Comma-separated repository URLs the cloud agent may change. |
| `CLOUD_BASE_BRANCH` | Base branch for those pull requests. Default `develop`. |

Connect Bitbucket Cloud to the same Cursor account. On deploy, include each `workspace/repo` the agent may see. Connect the Atlassian connector on the deployed agent so later turns can read Jira. The queue tool itself does not call Jira.

## Jira automation

Send a web request when an issue is assigned to you.

- Method: `POST`
- URL: `https://<deployment>/<slug>/v1/channels/jira/assigned`
- Header: `X-Agent-Secret: <AGENT_WEBHOOK_SECRET>`
- Body:

```json
{
  "issueKey": "{{issue.key}}",
  "summary": "{{issue.summary}}",
  "description": "{{issue.description}}",
  "status": "{{issue.status.name}}",
  "projectKey": "{{issue.project.key}}",
  "assigneeAccountId": "{{issue.assignee.accountId}}"
}
```

Use your Jira automation's field syntax for those values.

## Local check

```bash
cd personal-ticket-agent
npx @grok/agent-sdk validate --dir .
npx tsc --noEmit -p .
npx @grok/agent-sdk tool call start_ticket --dir . --input '{"issueKey":"DEMO-1","summary":"Add a ping route","status":"To Do"}'
```

A model turn needs `npx @grok/agent-sdk login` first:

```bash
npx @grok/agent-sdk dev --dir .
npx @grok/agent-sdk run --dir . --message "Call start_ticket for DEMO-1"
```

The playground is `http://127.0.0.1:3000/playground`. Schedules do not fire under `--dev`. Dispatch the weekday queue with:

```bash
curl -X POST http://127.0.0.1:3000/personal-ticket-agent/v1/dev/schedules/weekday-queue
```

## Deploy

Run the first deploy in your own terminal so the alias token is not stored in a transcript.

```bash
npx @grok/agent-sdk validate --dir personal-ticket-agent
npx @grok/agent-sdk deploy --dir personal-ticket-agent --dry-run
npx @grok/agent-sdk deploy --dir personal-ticket-agent
```

Save the alias token. Manage the agent at https://cursor.com/dashboard/deployed-agents. Set the secrets there, connect Atlassian, and connect Bitbucket repositories before you enable the Jira automation.
