type SlackMessage = {
  text: string;
  blocks?: unknown[];
};

export async function sendSlackMessage(input: { webhookUrl: string; message: SlackMessage }) {
  if (!input.webhookUrl) throw new Error("SLACK_WEBHOOK_NOT_CONFIGURED");
  await fetch(input.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.message.text, blocks: input.message.blocks }),
  });
}

export function buildSlackMessageFromNotification(input: { title: string; body: string; link?: string | null }) {
  const text = `${input.title}\n${input.body}${input.link ? `\n${input.link}` : ""}`;
  return { text };
}
