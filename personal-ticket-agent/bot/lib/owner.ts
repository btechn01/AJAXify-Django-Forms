/** Identity and repository settings. Values come from the environment, never from the repo. */

export type CloudRepo = {
  url: string;
  startingRef: string;
};

export function ownerJiraAccountId(): string {
  return (process.env.OWNER_JIRA_ACCOUNT_ID ?? "").trim();
}

export function ownerBitbucketUser(): string {
  return (process.env.OWNER_BITBUCKET_USER ?? "").trim().toLowerCase();
}

export function cloudRepos(): CloudRepo[] {
  const startingRef = process.env.CLOUD_BASE_BRANCH?.trim() || "develop";
  return (process.env.CLOUD_REPO_URLS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((url) => ({ url, startingRef }));
}

export function assigneeMatchesOwner(assigneeAccountId: string | undefined): boolean {
  const owner = ownerJiraAccountId();
  if (!owner) {
    return true;
  }
  if (!assigneeAccountId) {
    return true;
  }
  return assigneeAccountId === owner;
}
