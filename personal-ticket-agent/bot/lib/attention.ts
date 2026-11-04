import type { HostKvApi } from "@grok/agent-sdk";

export type AttentionItem = {
  id: string;
  kind: "pull-request" | "ticket";
  title: string;
  url: string;
  at: string;
  note: string;
};

const KEY = "attention";
const LIMIT = 40;

function isItem(value: unknown): value is AttentionItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as AttentionItem;
  return typeof item.id === "string" && typeof item.kind === "string";
}

export async function readAttention(kv: HostKvApi): Promise<AttentionItem[]> {
  const raw = await kv.get(KEY);
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isItem);
}

export async function recordAttention(kv: HostKvApi, item: AttentionItem): Promise<void> {
  const current = await readAttention(kv);
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, LIMIT);
  await kv.put(KEY, next);
}
