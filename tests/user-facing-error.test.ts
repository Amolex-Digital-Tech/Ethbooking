import { describe, expect, it, vi } from "vitest";

import {
  errorResponse,
  GENERIC_ERROR_MESSAGE,
  toPublicError,
  UserFacingError,
} from "@/lib/http/user-facing-error";
import { ChapaApiError, describeChapaError } from "@/lib/payments/chapa/client";

function prismaError(name: string, code: string, message = "Invalid `prisma.booking.create()` invocation: secret details") {
  const error = new Error(message) as Error & { code: string };
  error.name = name;
  error.code = code;
  return error;
}

describe("toPublicError", () => {
  it("passes through messages written for customers, with their status", () => {
    expect(toPublicError(new UserFacingError("Check-in date cannot be in the past."))).toEqual({
      message: "Check-in date cannot be in the past.",
      status: 400,
    });
    expect(toPublicError(new UserFacingError("Booking not found.", 404)).status).toBe(404);
  });

  it("hides internal error messages behind a generic message", () => {
    const result = toPublicError(new Error('The column `cancellationPolicy` does not exist in the current database.'));
    expect(result).toEqual({ message: GENERIC_ERROR_MESSAGE, status: 500 });
  });

  it("hides non-Error values", () => {
    expect(toPublicError("boom")).toEqual({ message: GENERIC_ERROR_MESSAGE, status: 500 });
  });

  it("maps Prisma conflicts to a retry message without Prisma details", () => {
    const result = toPublicError(prismaError("PrismaClientKnownRequestError", "P2034"));
    expect(result.status).toBe(503);
    expect(result.message).not.toContain("prisma");
  });

  it("maps database connection failures to a temporary-outage message", () => {
    expect(toPublicError(prismaError("PrismaClientKnownRequestError", "P1001")).status).toBe(503);
    expect(toPublicError(prismaError("PrismaClientInitializationError", "")).status).toBe(503);
  });

  it("does not show other Prisma errors", () => {
    expect(toPublicError(prismaError("PrismaClientKnownRequestError", "P2022"))).toEqual({
      message: GENERIC_ERROR_MESSAGE,
      status: 500,
    });
  });

  it("maps Chapa API failures to a payment message without Chapa details", () => {
    const result = toPublicError(new ChapaApiError("Chapa API request failed.", 400, { message: "internal detail" }));
    expect(result.status).toBe(502);
    expect(result.message).not.toContain("internal detail");
  });
});

describe("errorResponse", () => {
  it("logs the full error and returns only the public message", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("connection string postgres://user:password@host/db");

    const response = errorResponse("Booking creation failed", error);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: GENERIC_ERROR_MESSAGE });
    expect(consoleError).toHaveBeenCalledWith("Booking creation failed:", error);
    consoleError.mockRestore();
  });
});

describe("describeChapaError", () => {
  it("returns Chapa's text message", () => {
    expect(describeChapaError({ message: "Invalid currency", status: "failed" })).toBe("Invalid currency");
  });

  it("flattens field validation errors", () => {
    expect(describeChapaError({ message: { email: ["validation.email"], phone_number: ["invalid"] } })).toBe(
      "email: validation.email; phone_number: invalid"
    );
  });

  it("falls back to the raw response and caps the length", () => {
    expect(describeChapaError({ status: "failed" })).toBe('{"status":"failed"}');
    expect(describeChapaError({ message: "x".repeat(900) })).toHaveLength(500);
    expect(describeChapaError(undefined)).toBe("Chapa returned no error message.");
  });
});
