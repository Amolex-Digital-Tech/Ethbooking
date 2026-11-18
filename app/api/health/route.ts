import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      success: true,
      database: "connected",
      service: "ethiopianbooking-api",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

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