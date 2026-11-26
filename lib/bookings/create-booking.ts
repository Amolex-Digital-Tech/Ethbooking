import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";
import { createRoomInventory } from "@/lib/inventory/create-room-inventory";
import { Prisma } from "@/lib/generated/prisma/client";
import { BookingStatus, PaymentStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma/client";
import { reserveRoomInventoryInTransaction } from "@/lib/availability/reserve-room-inventory";
import { bookedCancellationTerms } from "@/lib/bookings/booked-cancellation-terms";

type BookingRoomSelection = {
  roomTypeId: string;
  ratePlanId: string;
  quantity: number;
};

type CreateBookingInput = {
  customerProfileId: string | null;
  roomTypeId?: string;
  ratePlanId?: string;
  quantity?: number;
  roomItems?: BookingRoomSelection[];
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  adults: number;
  children: number;
  guestDetails: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    countryCode?: string;
    ageAtBooking?: number | null;
  }[];
  customerFirstName: string;
  customerLastName?: string;
  customerEmail: string;
  customerPhone?: string;
  customerCountry?: string;
  specialRequests?: string;
  // How long the room hold lasts before the booking expires unpaid.
  // Defaults to DEFAULT_HOLD_MINUTES.
  holdMinutes?: number;
};

type CreateBookingResult = {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  property: { id: string; name: string };
  roomType: { id: string; name: string };
  ratePlan: { id: string; name: string };
  roomTypes: { id: string; name: string; quantity: number; ratePlanId: string; ratePlanName: string }[];
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  quantity: number;
  guests: number;
  currency: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  platformCommission: string;
  paymentFee: string;
  partnerAmount: string;
};

export const DEFAULT_HOLD_MINUTES = 15;
export const MAX_HOLD_MINUTES = 24 * 60;

const PLATFORM_COMMISSION_RATE = new Prisma.Decimal("0.10");

function parseDate(date: string, fieldName: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${fieldName} must use YYYY-MM-DD format.`);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error(`${fieldName} is invalid.`);
  return parsed;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calculateNights(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000));
}

function generateBookingReference(): string {
  return `EB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const {
    customerProfileId, checkInDate, checkOutDate, guests, adults, children,
    guestDetails, customerFirstName, customerLastName, customerEmail,
    customerPhone, customerCountry, specialRequests,
  } = input;

  const selections = (input.roomItems?.length ? input.roomItems : (
    input.roomTypeId && input.ratePlanId
      ? [{ roomTypeId: input.roomTypeId, ratePlanId: input.ratePlanId, quantity: input.quantity ?? 1 }]
      : []
  )).map((item) => ({ ...item, roomTypeId: item.roomTypeId?.trim(), ratePlanId: item.ratePlanId?.trim() }));

  if (!selections.length || selections.length > 20) throw new Error("Select between 1 and 20 room and rate-plan combinations.");
  if (new Set(selections.map((item) => item.roomTypeId)).size !== selections.length) {
    throw new Error("Choose only one rate plan for each room type. Combine quantities under that selection.");
  }
  if (selections.some((item) => !item.roomTypeId || !item.ratePlanId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 30)) {
    throw new Error("Every selected room must have a valid rate plan and quantity between 1 and 30.");
  }
  if (selections.reduce((sum, item) => sum + item.quantity, 0) > 30) throw new Error("A booking can include up to 30 rooms.");
  if (!Number.isInteger(guests) || guests < 1 || guests > 30) throw new Error("Guest count must be between 1 and 30.");
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 || adults + children !== guests) {
    throw new Error("Adult and child counts must match the total guest count.");
  }
  if (!customerFirstName.trim() || !customerEmail.trim()) throw new Error("Customer name and email are required.");
  if (guestDetails.length !== guests || guestDetails.some((guest) => !guest.firstName.trim())) throw new Error("Enter a first name for every guest.");

  const checkIn = parseDate(checkInDate, "Check-in date");
  const checkOut = parseDate(checkOutDate, "Check-out date");
  if (checkIn >= checkOut) throw new Error("Check-out date must be later than check-in date.");
  const todayInEthiopia = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
  if (formatDate(checkIn) < todayInEthiopia) throw new Error("Check-in date cannot be in the past.");
  const holdMinutes = input.holdMinutes ?? DEFAULT_HOLD_MINUTES;
  if (!Number.isInteger(holdMinutes) || holdMinutes < 1 || holdMinutes > MAX_HOLD_MINUTES) {
    throw new Error(`Hold duration must be between 1 and ${MAX_HOLD_MINUTES} minutes.`);
  }
  const nights = calculateNights(checkIn, checkOut);

  return prisma.$transaction(async (transaction) => {
    // Acquire locks in a stable order to avoid deadlocks when a booking
    // contains more than one room type.
    const roomTypeIds = [...new Set(selections.map((item) => item.roomTypeId))].sort();
    for (const id of roomTypeIds) await lockRoomTypeInventory(transaction, id);

    const pricedItems: {
      roomType: { id: string; name: string; maxGuests: number; maxAdults: number | null; maxChildren: number | null; property: { id: string; name: string; status: string } };
      ratePlan: { id: string; name: string; currency: string; basePrice: Prisma.Decimal; ratePeriods: { startDate: Date; endDate: Date; pricePerNight: Prisma.Decimal }[] };
      terms: ReturnType<typeof bookedCancellationTerms>;
      quantity: number;
      subtotal: Prisma.Decimal;
      pricePerNight: Prisma.Decimal;
    }[] = [];

    let propertyId = "";
    let propertyName = "";
    let totalCapacity = 0;
    let adultCapacity = 0;
    let childCapacity = 0;
    let totalRooms = 0;
    let bookingCurrency = "";

    for (const selection of selections) {
      const roomType = await transaction.roomType.findUnique({
        where: { id: selection.roomTypeId },
        include: { property: { select: { id: true, name: true, status: true, checkInTime: true } } },
      });
      if (!roomType || !roomType.isActive) throw new Error("One of the selected room types is no longer available.");
      if (roomType.property.status !== "APPROVED") throw new Error("This property is not currently available for booking.");
      if (propertyId && propertyId !== roomType.property.id) throw new Error("All rooms in one booking must belong to the same property.");
      propertyId = roomType.property.id;
      propertyName = roomType.property.name;

      const ratePlan = await transaction.ratePlan.findUnique({
        where: { id: selection.ratePlanId },
        include: { ratePeriods: { where: { startDate: { lt: checkOut }, endDate: { gte: checkIn } }, orderBy: { startDate: "desc" } } },
      });
      if (!ratePlan || !ratePlan.isActive || ratePlan.roomTypeId !== roomType.id) throw new Error("A selected rate plan is no longer available for its room.");
      if (ratePlan.currency !== "ETB") throw new Error("Only ETB bookings are currently supported.");
      if (bookingCurrency && bookingCurrency !== ratePlan.currency) throw new Error("All selected rates must use the same currency.");
      bookingCurrency = ratePlan.currency;

      totalCapacity += roomType.maxGuests * selection.quantity;
      adultCapacity += (roomType.maxAdults ?? roomType.maxGuests) * selection.quantity;
      childCapacity += (roomType.maxChildren ?? roomType.maxGuests) * selection.quantity;
      totalRooms += selection.quantity;

      const nightlyPrices: Prisma.Decimal[] = [];
      for (let nightIndex = 0; nightIndex < nights; nightIndex++) {
        const night = new Date(checkIn);
        night.setUTCDate(night.getUTCDate() + nightIndex);
        const period = ratePlan.ratePeriods.find((candidate) => candidate.startDate <= night && candidate.endDate >= night);
        nightlyPrices.push(period?.pricePerNight ?? ratePlan.basePrice);
      }
      const roomSubtotal = nightlyPrices.reduce((sum, price) => sum.plus(price), new Prisma.Decimal(0));
      pricedItems.push({
        roomType: { id: roomType.id, name: roomType.name, maxGuests: roomType.maxGuests, maxAdults: roomType.maxAdults, maxChildren: roomType.maxChildren, property: roomType.property },
        ratePlan: { id: ratePlan.id, name: ratePlan.name, currency: ratePlan.currency, basePrice: ratePlan.basePrice, ratePeriods: ratePlan.ratePeriods },
        terms: bookedCancellationTerms(ratePlan, roomType.checkInTime ?? roomType.property.checkInTime),
        quantity: selection.quantity,
        subtotal: roomSubtotal.mul(selection.quantity),
        pricePerNight: roomSubtotal.div(nights).toDecimalPlaces(2),
      });
    }

    if (guests > totalCapacity) throw new Error(`The selected rooms accommodate up to ${totalCapacity} guests in total.`);
    if (adults > adultCapacity) throw new Error(`The selected rooms accommodate up to ${adultCapacity} adults in total.`);
    if (children > childCapacity) throw new Error(`The selected rooms accommodate up to ${childCapacity} children in total.`);

    const subtotal = pricedItems.reduce((sum, item) => sum.plus(item.subtotal), new Prisma.Decimal(0));
    const discountAmount = new Prisma.Decimal(0);
    const taxAmount = new Prisma.Decimal(0);
    const totalAmount = subtotal;
    const platformCommission = subtotal.minus(discountAmount).mul(PLATFORM_COMMISSION_RATE).toDecimalPlaces(2);
    const paymentFee = new Prisma.Decimal(0);
    const partnerAmount = totalAmount.minus(platformCommission);

    for (const item of pricedItems) {
      await createRoomInventory({ roomTypeId: item.roomType.id, fromDate: checkIn, toDate: checkOut }, transaction);
      const reserved = await reserveRoomInventoryInTransaction(transaction, {
        roomTypeId: item.roomType.id, checkIn: checkInDate, checkOut: checkOutDate, units: item.quantity,
      });
      if (!reserved.success) throw new Error(`Unable to reserve ${item.roomType.name} inventory.`);
    }

    let bookingReference = generateBookingReference();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await transaction.booking.findUnique({ where: { bookingReference }, select: { id: true } });
      if (!existing) break;
      bookingReference = generateBookingReference();
      if (attempt === 4) throw new Error("Unable to generate a unique booking reference.");
    }

    const booking = await transaction.booking.create({
      data: {
        bookingReference, customerProfileId, status: "PAYMENT_PENDING", paymentStatus: "PENDING",
        expiresAt: new Date(Date.now() + holdMinutes * 60 * 1000),
        checkInDate: checkIn, checkOutDate: checkOut, nights, guestCount: guests,
        currency: bookingCurrency, subtotal, discountAmount, taxAmount, totalAmount,
        platformCommission, paymentFee, partnerAmount,
        customerFirstName: customerFirstName.trim(), customerLastName: customerLastName?.trim() || null,
        customerEmail: customerEmail.trim(), customerPhone: customerPhone?.trim() || null,
        customerCountry: customerCountry?.trim() || null,
        specialRequests: specialRequests?.trim() || null,
      },
    });

    await transaction.bookingItem.createMany({
      data: pricedItems.map((item) => ({
        bookingId: booking.id, roomTypeId: item.roomType.id, ratePlanId: item.ratePlan.id,
        roomName: item.roomType.name, ratePlanName: item.ratePlan.name,
        checkInDate: checkIn, checkOutDate: checkOut, nights, quantity: item.quantity,
        guests, pricePerNight: item.pricePerNight, subtotal: item.subtotal, currency: bookingCurrency,
        ...item.terms,
      })),
    });

    await transaction.bookingGuest.createMany({
      data: guestDetails.map((guest, index) => ({
        bookingId: booking.id, guestType: index === 0 ? "PRIMARY" : "ADDITIONAL",
        firstName: guest.firstName.trim(), lastName: guest.lastName?.trim() || null,
        email: guest.email?.trim() || null, phone: guest.phone?.trim() || null,
        countryCode: guest.countryCode?.trim() || null,
        ageAtBooking: guest.ageAtBooking ?? null,
      })),
    });

    const first = pricedItems[0];
    return {
      bookingId: booking.id, bookingReference: booking.bookingReference,
      status: booking.status, paymentStatus: booking.paymentStatus,
      property: { id: propertyId, name: propertyName },
      roomType: { id: first.roomType.id, name: first.roomType.name },
      ratePlan: { id: first.ratePlan.id, name: first.ratePlan.name },
      roomTypes: pricedItems.map((item) => ({
        id: item.roomType.id, name: item.roomType.name, quantity: item.quantity,
        ratePlanId: item.ratePlan.id, ratePlanName: item.ratePlan.name,
      })),
      checkInDate: formatDate(booking.checkInDate), checkOutDate: formatDate(booking.checkOutDate),
      nights: booking.nights, quantity: totalRooms, guests: booking.guestCount,
      currency: booking.currency, subtotal: booking.subtotal.toString(),
      discountAmount: booking.discountAmount.toString(), taxAmount: booking.taxAmount.toString(),
      totalAmount: booking.totalAmount.toString(), platformCommission: booking.platformCommission.toString(),
      paymentFee: booking.paymentFee.toString(), partnerAmount: booking.partnerAmount.toString(),
    };
  });
}
