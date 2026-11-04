---
description: Use when a Jira issue was assigned to the owner or a cloud agent should implement one ticket.
---

# Ticket workflow

1. Read `ticket.json` in the workspace.
2. Call `start_ticket` with the issue key, summary, status, description, and `repoUrl` when more than one repository is configured.
3. When `launch` is false, tell the owner the `reason`. Stop.
4. When `launch` is true, call `cloud__launch` once:
   - `repo` is `repoUrl` from the tool
   - `starting_ref` is `startingRef` from the tool
   - `prompt` is the tool's `prompt`
5. Do not call `cloud__launch` again for the same issue unless the owner asks for a retry. A retry passes `force: true` to `start_ticket`.
6. After launch, report the cloud agent id and that a pull request will be opened on the configured base branch.
