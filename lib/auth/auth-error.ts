export class AuthError extends Error {
  status: 401 | 403;

  constructor(
    message:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "PARTNER_MEMBERSHIP_REQUIRED"
  ) {
    super(message);

    this.name = "AuthError";
    this.status = message === "UNAUTHENTICATED" ? 401 : 403;
  }
}