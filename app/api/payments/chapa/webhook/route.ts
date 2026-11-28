import crypto from "node:crypto";

import { completeChapaPayment } from "@/lib/payments/chapa/verify-payment";
import { sendBookingPaymentConfirmationOnce } from "@/lib/email/send-booking-payment-confirmation";
import { sendBookingPaymentFailureOnce } from "@/lib/email/send-booking-payment-failure";

function getWebhookSecret() {
  const secret = process.env.CHAPA_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "CHAPA_WEBHOOK_SECRET is not configured."
    );
  }

  return secret;
}

function createSignature(payload: string) {
  return crypto
    .createHmac("sha256", getWebhookSecret())
    .update(payload)
    .digest("hex");
}

function createSecretSignature() {
  const secret = getWebhookSecret();

  return crypto
    .createHmac("sha256", secret)
    .update(secret)
    .digest("hex");
}

function safeCompare(
  received: string,
  expected: string
) {
  const receivedBuffer =
    Buffer.from(received);
  const expectedBuffer =
    Buffer.from(expected);

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const expectedPayloadSignature =
  createSignature(rawBody);

const expectedSecretSignature =
  createSecretSignature();

const chapaSignature =
  request.headers.get("chapa-signature");

const xChapaSignature =
  request.headers.get("x-chapa-signature");

const signatureIsValid =
  (chapaSignature !== null &&
    safeCompare(
      chapaSignature,
      expectedSecretSignature
    )) ||
  (xChapaSignature !== null &&
    safeCompare(
      xChapaSignature,
      expectedPayloadSignature
    ));

if (!signatureIsValid) {
  return Response.json(
    {
      success: false,
      error: "Invalid webhook signature.",
    },
    { status: 401 }
  );
}
    const body = JSON.parse(rawBody);

    const transactionReference =
      typeof body.tx_ref === "string"
        ? body.tx_ref.trim()
        : "";

    if (!transactionReference) {
      return Response.json(
        {
          success: false,
          error:
            "Transaction reference is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await completeChapaPayment(
        transactionReference
      );

    if (result.success && result.completed && !result.latePayment && result.bookingId) {
      await sendBookingPaymentConfirmationOnce(result.bookingId);
    } else if (!result.success && result.bookingId && ["failed", "cancelled"].includes(String(result.status).toLowerCase())) {
      await sendBookingPaymentFailureOnce(result.bookingId, String(result.status));
    }

    // Chapa only needs to know the webhook was processed.
    return Response.json({ success: true }, {
      status: 200,
    });
  } catch (error) {
    console.error(
      "Chapa webhook processing error:",
      error
    );

    // Details are in the log above; Chapa only needs to know to retry.
    return Response.json(
      {
        success: false,
        error: "Unable to process Chapa webhook.",
      },
      { status: 500 }
    );
  }
}