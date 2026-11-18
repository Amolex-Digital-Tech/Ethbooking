import { AuthError } from "@/lib/auth/auth-error";
import { NextResponse } from "next/server";

export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        error:
  error.status === 401
    ? "Authentication required."
    : error.message === "PARTNER_MEMBERSHIP_REQUIRED"
      ? "You do not have access to this partner organization."
      : "You do not have permission to perform this action.",
      },
      {
        status: error.status,
      }
    );
  }

  console.error("Unexpected authentication error:", error);

  return NextResponse.json(
    {
      success: false,
      error: "Authentication error.",
    },
    {
      status: 500,
    }
  );
}