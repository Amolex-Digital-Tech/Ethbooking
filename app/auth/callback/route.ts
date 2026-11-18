import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function safeRedirectPath(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  return "/";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  const supabase = await createClient();

  let error: Error | null = null;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && otpType && ["signup", "invite", "magiclink", "recovery", "email_change", "email"].includes(otpType)) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType as EmailOtpType });
    error = result.error;
  } else {
    error = new Error("Missing authentication code.");
  }

  if (error) {
    console.error("AUTH_CALLBACK_CONFIRMATION_ERROR", {
      message: error.message,
      status: "status" in error ? error.status : undefined,
      hasCode: Boolean(code),
      hasTokenHash: Boolean(tokenHash),
      otpType,
      next,
      providerError: requestUrl.searchParams.get("error"),
      providerErrorCode: requestUrl.searchParams.get("error_code"),
      providerErrorDescription: requestUrl.searchParams.get("error_description"),
    });
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  }
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
