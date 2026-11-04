import {
  bitbucketChannel,
  defaultBitbucketAuth,
  defaultBitbucketTitle,
} from "@grok/agent-sdk/channels/bitbucket";
import { recordAttention } from "../lib/attention.js";
import { ownerIsAuthor, ownerIsReviewer } from "../lib/bitbucket-people.js";
import { ownerBitbucketUser } from "../lib/owner.js";

const MARKER = "personal-ticket-agent";
const DIFF_LIMIT = 100_000;

export default bitbucketChannel({
  cursorAccount: true,
  onPullRequest: async (ctx, pullRequest) => {
    const owner = ownerBitbucketUser();
    if (!owner || pullRequest.draft) {
      return null;
    }
    const created = pullRequest.action === "created";
    const pushed =
      pullRequest.action === "updated" &&
      pullRequest.previousHeadSha !== undefined &&
      pullRequest.previousHeadSha !== pullRequest.headSha;
    if (!created && !pushed) {
      return null;
    }
    if (pullRequest.state === "MERGED" || pullRequest.state === "DECLINED") {
      return null;
    }

    const reviewer = ownerIsReviewer(ctx.payload, owner);
    const author = ownerIsAuthor(ctx.payload, owner);
    const id = `${ctx.repository.fullName}#${pullRequest.id}`;
    const url = pullRequest.htmlUrl ?? "";
    const title = pullRequest.title ?? id;

    if (!reviewer || author) {
      if (author && created) {
        await recordAttention(ctx.host.kv, {
          id: `pr:${id}`,
          kind: "pull-request",
          title,
          url,
          at: new Date().toISOString(),
          note: "Your pull request is open.",
        });
      }
      return null;
    }

    const seenKey = `review:${id}:${pullRequest.headSha ?? "unknown"}`;
    if (await ctx.host.kv.get(seenKey)) {
      return null;
    }
    await ctx.host.kv.put(seenKey, { at: new Date().toISOString() });
    await recordAttention(ctx.host.kv, {
      id: `pr:${id}`,
      kind: "pull-request",
      title,
      url,
      at: new Date().toISOString(),
      note: "You are a reviewer. A review is running.",
    });

    let diff = "";
    try {
      diff = await ctx.bitbucket.api.getPullRequestDiff(pullRequest.id);
    } catch {
      diff = "";
    }
    if (diff.length > DIFF_LIMIT) {
      diff = `${diff.slice(0, DIFF_LIMIT)}\n…diff truncated`;
    }

    return {
      task: async ({ send }) => {
        const session = await send(
          `Review ${id}. Read diff.txt. Comment on defects and missing tests. Do not approve the pull request.`,
          {
            auth: defaultBitbucketAuth(ctx),
            title: defaultBitbucketTitle(ctx),
            state: {
              dialect: ctx.repository.dialect,
              repoFullName: ctx.repository.fullName,
              repoUuid: ctx.repository.uuid ?? null,
              pullRequestId: pullRequest.id,
              headSha: pullRequest.headSha ?? null,
              triggeringCommentId: null,
              deliveryId: ctx.deliveryId ?? null,
              eventType: ctx.eventType,
            },
            workspaceFiles: {
              "diff.txt": diff || "Diff was not available.",
              "pull-request.json": JSON.stringify(
                {
                  id: pullRequest.id,
                  title: pullRequest.title,
                  description: pullRequest.description,
                  sourceBranch: pullRequest.sourceBranch,
                  targetBranch: pullRequest.targetBranch,
                  url,
                },
                null,
                2,
              ),
            },
          },
        );
        const outcome = await session.waitForCompletion();
        const text = outcome.result?.trim() ?? "";
        if (outcome.status !== "finished" || text.length === 0) {
          await recordAttention(ctx.host.kv, {
            id: `pr:${id}`,
            kind: "pull-request",
            title,
            url,
            at: new Date().toISOString(),
            note: "Review did not finish. Look at the session.",
          });
          return;
        }
        try {
          await ctx.bitbucket.api.postPullRequestComment(pullRequest.id, {
            body: `${MARKER}\n\n${text}`,
          });
          await recordAttention(ctx.host.kv, {
            id: `pr:${id}`,
            kind: "pull-request",
            title,
            url,
            at: new Date().toISOString(),
            note: "Review posted on the pull request.",
          });
        } catch {
          await recordAttention(ctx.host.kv, {
            id: `pr:${id}`,
            kind: "pull-request",
            title,
            url,
            at: new Date().toISOString(),
            note: `Review could not be posted. ${text.slice(0, 500)}`,
          });
        }
      },
    };
  },
  onPullRequestComment: async (ctx, comment, pullRequest) => {
    const owner = ownerBitbucketUser();
    if (!owner || comment.body.includes(MARKER)) {
      return null;
    }
    const authorName = (comment.author?.username ?? comment.author?.displayName ?? "").toLowerCase();
    if (authorName === owner || authorName.replace(/[{}]/g, "") === owner.replace(/[{}]/g, "")) {
      return null;
    }
    const reviewer = ownerIsReviewer(ctx.payload, owner);
    const author = ownerIsAuthor(ctx.payload, owner);
    if (!reviewer && !author) {
      return null;
    }
    await recordAttention(ctx.host.kv, {
      id: `pr:${ctx.repository.fullName}#${pullRequest.id}`,
      kind: "pull-request",
      title: pullRequest.title ?? `${ctx.repository.fullName}#${pullRequest.id}`,
      url: comment.htmlUrl ?? pullRequest.htmlUrl ?? "",
      at: new Date().toISOString(),
      note: `New comment: ${comment.body.slice(0, 240)}`,
    });
    return null;
  },
});
