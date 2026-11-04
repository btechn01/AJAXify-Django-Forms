type Person = Record<string, unknown>;

const NAME_FIELDS = [
  "username",
  "nickname",
  "display_name",
  "displayName",
  "name",
  "uuid",
  "account_id",
] as const;

function asRecord(value: unknown): Person | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Person;
}

function identityStrings(person: unknown): string[] {
  const record = asRecord(person);
  if (!record) {
    return [];
  }
  const nested = asRecord(record.user);
  return [record, nested ?? {}].flatMap((entry) =>
    NAME_FIELDS.flatMap((field) => {
      const value = entry[field];
      return typeof value === "string" ? [value.toLowerCase()] : [];
    }),
  );
}

function people(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(identityStrings);
  }
  return identityStrings(value);
}

function pullRequestRecord(payload: Record<string, unknown>): Person | undefined {
  return asRecord(payload.pullrequest) ?? asRecord(payload.pullRequest);
}

export function bitbucketUserMatches(owner: string, peopleValues: unknown): boolean {
  const needle = owner.trim().toLowerCase();
  if (!needle) {
    return false;
  }
  return people(peopleValues).some(
    (value) => value === needle || value.replace(/[{}]/g, "") === needle.replace(/[{}]/g, ""),
  );
}

export function ownerIsReviewer(payload: Record<string, unknown>, owner: string): boolean {
  const pullRequest = pullRequestRecord(payload);
  if (!pullRequest) {
    return false;
  }
  return bitbucketUserMatches(owner, pullRequest.reviewers);
}

export function ownerIsAuthor(payload: Record<string, unknown>, owner: string): boolean {
  const pullRequest = pullRequestRecord(payload);
  if (!pullRequest) {
    return false;
  }
  return bitbucketUserMatches(owner, pullRequest.author);
}
