import { prisma } from "@/lib/prisma/client";
import { checkRoomAvailability } from "@/lib/availability/check-room-availability";
import { requireAuth } from "@/lib/auth/require-auth";
import { AuthError } from "@/lib/auth/auth-error";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { errorResponse } from "@/lib/http/user-facing-error";

type RouteContext = { params: Promise<{ propertyId: string }> };
type Selection = { roomTypeId: string; ratePlanId?: string; units: number };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    if (!user.roles.includes("CUSTOMER")) {
      return Response.json({ success: false, error: "Only customer accounts can check booking availability." }, { status: 403 });
    }
    const { propertyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn")?.trim() || "";
    const checkOut = searchParams.get("checkOut")?.trim() || "";
    let selections: Selection[] = [];

    const rawSelections = searchParams.get("roomItems");
    if (rawSelections) {
      try {
        const parsed = JSON.parse(rawSelections);
        if (!Array.isArray(parsed)) throw new Error("Room selections must be a list.");
        selections = parsed.map((item) => ({
          roomTypeId: typeof item.roomTypeId === "string" ? item.roomTypeId.trim() : "",
          ratePlanId: typeof item.ratePlanId === "string" ? item.ratePlanId.trim() : undefined,
          units: Number(item.quantity ?? item.units),
        }));
      } catch {
        return Response.json({ success: false, error: "Invalid room selections." }, { status: 400 });
      }
    } else {
      selections = [{
        roomTypeId: searchParams.get("roomTypeId")?.trim() || "",
        units: Number(searchParams.get("units") || "1"),
      }];
    }

    if (!propertyId.trim() || !checkIn || !checkOut || selections.length < 1 || selections.length > 20) {
      return Response.json({ success: false, error: "Property, dates, and room selections are required." }, { status: 400 });
    }
    if (selections.some((item) => !item.roomTypeId || !Number.isInteger(item.units) || item.units < 1) ||
        selections.reduce((sum, item) => sum + item.units, 0) > 30) {
      return Response.json({ success: false, error: "Select between 1 and 30 valid rooms." }, { status: 400 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId.trim(), status: "APPROVED" },
      select: { id: true },
    });
    if (!property) return Response.json({ success: false, error: "Property not found." }, { status: 404 });

    const roomTypes = await prisma.roomType.findMany({
      where: { id: { in: [...new Set(selections.map((item) => item.roomTypeId))] }, propertyId: property.id, isActive: true },
      select: { id: true, name: true, maxGuests: true, maxAdults: true, maxChildren: true },
    });
    if (roomTypes.length !== new Set(selections.map((item) => item.roomTypeId)).size) {
      return Response.json({ success: false, error: "One or more selected room types are no longer available." }, { status: 404 });
    }

    const details = [];
    for (const selection of selections) {
      const room = roomTypes.find((item) => item.id === selection.roomTypeId)!;
      const availability = await checkRoomAvailability({
        roomTypeId: room.id, checkIn, checkOut, units: selection.units,
      });
      details.push({
        roomTypeId: room.id, roomTypeName: room.name, requestedUnits: selection.units,
        available: availability.available,
        availableUnits: availability.nights.length ? Math.min(...availability.nights.map((night) => night.availableUnits)) : 0,
      });
    }

    return Response.json({
      success: true,
      data: {
        checkIn, checkOut,
        available: details.every((item) => item.available),
        roomItems: details,
        partial: details.some((item) => item.available) && details.some((item) => !item.available),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return errorResponse("Failed to check customer room availability", error);
  }
}
