---
cron: "0 8 * * 1-5"
---

Call attention_queue. When Atlassian tools are available, also search Jira for unresolved issues assigned to currentUser() that were updated in the last 2 days, and for issues in a code-review status.
Report only those results. Say which settings are missing when a configured flag is false.
Do not launch a cloud agent from this schedule.
Do not invent links.
