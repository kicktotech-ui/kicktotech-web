import { getStore } from "./data";

/** Append an audit event. Never records passwords, tokens, or secrets. */
export async function writeAudit(input: {
  actor: string;
  action: string;
  target?: string;
  result?: "SUCCESS" | "FAILED";
  requestId?: string;
  ip?: string;
}): Promise<void> {
  const store = getStore();
  await store.appendAudit({
    id: store.newId(),
    ts: new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    target: input.target,
    result: input.result ?? "SUCCESS",
    requestId: input.requestId,
    ip: input.ip,
  });
}
