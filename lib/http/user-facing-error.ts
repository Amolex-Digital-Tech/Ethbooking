import { ChapaApiError } from "@/lib/payments/chapa/client";

// An error whose message is written for customers and is safe to show them,
// such as "Check-in date cannot be in the past." Every other error is
// treated as internal: its details are logged, never returned.
export class UserFacingError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const GENERIC_ERROR_MESSAGE = "Something went wrong, please try again.";

const SYSTEM_BUSY_MESSAGE =
  "We're experiencing high demand right now. Please try again in a moment.";
const SYSTEM_UNAVAILABLE_MESSAGE =
  "Our booking system is temporarily unavailable. Please try again in a few minutes.";
const PAYMENT_PROVIDER_MESSAGE =
  "We couldn't start the payment with Chapa. Please try again in a moment.";

// Prisma error codes for conflicts that succeed when retried.
const RETRYABLE_PRISMA_CODES = new Set(["P2024", "P2028", "P2034"]);
// Prisma error codes for an unreachable or failing database connection.
const DATABASE_UNAVAILABLE_PRISMA_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

function prismaErrorCode(error: unknown) {
  if (!(error instanceof Error) || !error.name.startsWith("PrismaClient")) return null;
  const code = (error as { code?: unknown; errorCode?: unknown }).code ??
    (error as { errorCode?: unknown }).errorCode;
  return typeof code === "string" ? code : "";
}

export type PublicError = { message: string; status: number };

// Turns any thrown value into a message and HTTP status that are safe to
// return to a customer.
export function toPublicError(error: unknown): PublicError {
  if (error instanceof UserFacingError) {
    return { message: error.message, status: error.status };
  }

  if (error instanceof ChapaApiError) {
    return { message: PAYMENT_PROVIDER_MESSAGE, status: 502 };
  }

  const prismaCode = prismaErrorCode(error);
  if (prismaCode !== null) {
    if (RETRYABLE_PRISMA_CODES.has(prismaCode)) {
      return { message: SYSTEM_BUSY_MESSAGE, status: 503 };
    }
    if (
      DATABASE_UNAVAILABLE_PRISMA_CODES.has(prismaCode) ||
      (error as Error).name === "PrismaClientInitializationError"
    ) {
      return { message: SYSTEM_UNAVAILABLE_MESSAGE, status: 503 };
    }
  }

  return { message: GENERIC_ERROR_MESSAGE, status: 500 };
}

// Logs the full error under `context` and returns a JSON response that
// contains only the public message.
export function errorResponse(context: string, error: unknown) {
  console.error(`${context}:`, error);
  const { message, status } = toPublicError(error);
  return Response.json({ success: false, error: message }, { status });
}
