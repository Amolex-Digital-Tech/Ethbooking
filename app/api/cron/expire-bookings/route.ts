import { expireExpiredBookings } from "@/lib/bookings/expire-expired-bookings";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is not configured.");

    return Response.json(
      {
        success: false,
        error: "Cron job is not configured.",
      },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const result = await expireExpiredBookings();

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Expired booking cron job failed:",
      error
    );

    return Response.json(
      {
        success: false,
        error: "Unable to process expired bookings.",
      },
      { status: 500 }
    );
  }
}