import { requireAuth } from "@/lib/auth/require-auth";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { AuthError } from "@/lib/auth/auth-error";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const currentUser = await requireAuth();

    const bookings = await prisma.booking.findMany({
      where: {
        customerProfileId: currentUser.profile.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        bookingReference: true,
        status: true,
        paymentStatus: true,
        checkInDate: true,
        checkOutDate: true,
        nights: true,
        guestCount: true,
        subtotal: true,
        totalAmount: true,
        currency: true,
        customerFirstName: true,
        customerLastName: true,
        createdAt: true,
        items: {
  orderBy: {
    createdAt: "asc",
  },
  select: {
    id: true,
    roomName: true,
    ratePlanName: true,
    checkInDate: true,
    checkOutDate: true,
    nights: true,
    guests: true,
    roomType: {
      select: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  },
},
      },
    });

    return Response.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }

    console.error(
      "Customer bookings retrieval failed:",
      error
    );

    return Response.json(
      {
        success: false,
        error: "Unable to retrieve bookings.",
      },
      { status: 500 }
    );
  }
}