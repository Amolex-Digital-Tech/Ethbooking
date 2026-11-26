import { prisma } from "@/lib/prisma/client";

// Where the app is trying to connect, without the password, for the logs.
function describeDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return { set: false };
  try {
    const url = new URL(raw);
    return {
      set: true,
      host: url.hostname,
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      params: [...url.searchParams.keys()],
    };
  } catch {
    return { set: true, parseable: false };
  }
}

// Prisma driver-adapter errors often have an empty message; the real reason
// (authentication, TLS, unreachable host, ...) is in `cause`.
function describeError(error: unknown, depth = 0): unknown {
  if (!(error instanceof Error) || depth > 3) return String(error);
  const details = error as Error & { code?: unknown; kind?: unknown; cause?: unknown };
  return {
    name: error.name,
    message: error.message,
    code: details.code,
    kind: details.kind,
    cause:
      details.cause instanceof Error
        ? describeError(details.cause, depth + 1)
        : details.cause,
  };
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      success: true,
      database: "connected",
      service: "ethiopianbooking-api",
    });
  } catch (error) {
    console.error(
      "Database health check failed:",
      JSON.stringify({ database: describeDatabaseUrl(), error: describeError(error) })
    );

    return Response.json(
      {
        success: false,
        database: "disconnected",
        service: "ethiopianbooking-api",
      },
      { status: 500 }
    );
  }
}
