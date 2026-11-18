type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
};

export async function sendResendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn("Resend email skipped: RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.");
    return { sent: false, reason: "not_configured" as const };
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Resend request failed:", error);
    return { sent: false, reason: "network_error" as const };
  }

  if (!response.ok) {
    const details = await response.text();
    console.error("Resend email delivery failed:", response.status, details);
    return { sent: false, reason: "provider_error" as const };
  }

  const result = await response.json().catch(() => null);
  return { sent: true, id: typeof result?.id === "string" ? result.id : null };
}
