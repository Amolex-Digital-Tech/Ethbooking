import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma/client";
import { lockRoomTypeInventory } from "@/lib/inventory/lock-room-type-inventory";
import { createRoomInventory } from "@/lib/inventory/create-room-inventory";
import { reserveRoomInventoryInTransaction } from "@/lib/availability/reserve-room-inventory";

type CreateWalkInBookingInput = {
  partnerId: string;
  recordedByProfileId: string;
  roomTypeId: string;
  ratePlanId: string;
  checkInDate: string;
  checkOutDate: string;
  quantity: number;
  guests: number;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  specialRequests?: string;
  amountPaid: number;
  paymentMethod?: "CASH" | "BANK_TRANSFER" | "POS_CARD" | "MOBILE_MONEY" | "OTHER";
  paymentMethodDetails?: string;
  paymentReference?: string;
  paymentNote?: string;
  paidAt?: string;
};

function parseDate(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${field} is invalid.`);
  }

  return date;
}

function calculateNights(checkIn: Date, checkOut: Date) {
  return Math.round(
    (checkOut.getTime() - checkIn.getTime()) /
      (24 * 60 * 60 * 1000)
  );
}

function generateBookingReference() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `EB-WI-${timestamp}-${random}`;
}

export async function createWalkInBooking(
  input: CreateWalkInBookingInput
) {
  const {
    partnerId,
    recordedByProfileId,
    roomTypeId,
    ratePlanId,
    checkInDate,
    checkOutDate,
    quantity,
    guests,
    firstName,
    lastName,
    email,
    phone,
    specialRequests,
    amountPaid,
    paymentMethod,
    paymentMethodDetails,
    paymentReference,
    paymentNote,
    paidAt,
  } = input;

  if (!partnerId || !recordedByProfileId) {
    throw new Error("Partner and staff information are required.");
  }

  if (!roomTypeId || !ratePlanId) {
    throw new Error("Please select a room and rate plan.");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Room quantity must be at least 1.");
  }

  if (!Number.isInteger(guests) || guests < 1) {
    throw new Error("Guest count must be at least 1.");
  }

  if (!firstName?.trim()) {
    throw new Error("Guest first name is required.");
  }

  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    throw new Error("Amount paid must be zero or greater.");
  }

  if (amountPaid > 0 && !paymentMethod) {
    throw new Error("Select the payment method.");
  }

  if (
    paymentMethod === "OTHER" &&
    !paymentMethodDetails?.trim()
  ) {
    throw new Error(
      "Please describe the other payment method."
    );
  }

  if (paidAt) {
    const paymentDate = new Date(paidAt);

    if (Number.isNaN(paymentDate.getTime())) {
      throw new Error("Payment date is invalid.");
    }

    if (paymentDate.getTime() > Date.now()) {
      throw new Error("Payment date cannot be in the future.");
    }
  }

  const checkIn = parseDate(checkInDate, "Check-in date");
  const checkOut = parseDate(checkOutDate, "Check-out date");

  if (checkIn >= checkOut) {
    throw new Error("Check-out must be after check-in.");
  }

  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );

  if (checkIn < todayUtc) {
    throw new Error("Check-in date cannot be in the past.");
  }

  const nights = calculateNights(checkIn, checkOut);

  return prisma.$transaction(
    async (transaction) => {
      // Use the shared inventory lock so walk-in bookings
      // coordinate with customer bookings and Admin inventory changes.
      await lockRoomTypeInventory(transaction, roomTypeId);

      const roomType = await transaction.roomType.findFirst({
        where: {
          id: roomTypeId,
          isActive: true,
          property: {
            partnerId,
            status: "APPROVED",
          },
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!roomType) {
        throw new Error(
          "The selected room is unavailable or does not belong to your organization."
        );
      }

      if (guests > roomType.maxGuests * quantity) {
        throw new Error(
          `This selection allows a maximum of ${roomType.maxGuests * quantity} guests.`
        );
      }

      const ratePlan = await transaction.ratePlan.findFirst({
        where: {
          id: ratePlanId,
          roomTypeId,
          isActive: true,
          currency: "ETB",
        },
      });

      if (!ratePlan) {
        throw new Error("The selected rate plan is unavailable.");
      }

      // Create any missing nightly inventory records using
      // the shared inventory helper.
      await createRoomInventory(
        {
          roomTypeId,
          fromDate: checkIn,
          toDate: checkOut,
        },
        transaction
      );

      // Calculate the booking amount using the existing
      // accommodation subtotal and 10% commission rule.
      const pricePerNight = new Prisma.Decimal(
        ratePlan.basePrice.toString()
      );

      const subtotal = pricePerNight
        .mul(nights)
        .mul(quantity);

      const discountAmount = new Prisma.Decimal(0);
      const taxAmount = new Prisma.Decimal(0);
      const totalAmount = subtotal;

      const platformCommission = subtotal
        .mul(0.1)
        .toDecimalPlaces(2);

      // Offline payments do not incur Chapa processing fees.
      const paymentFee = new Prisma.Decimal(0);

      const partnerAmount = totalAmount
        .minus(platformCommission)
        .minus(paymentFee);

      const paidAmount = new Prisma.Decimal(amountPaid);

      if (paidAmount.greaterThan(totalAmount)) {
        throw new Error(
          "Amount paid cannot exceed the booking total."
        );
      }

      const paymentStatus =
        paidAmount.equals(totalAmount)
          ? "PAID"
          : paidAmount.greaterThan(0)
            ? "PARTIALLY_PAID"
            : "UNPAID";

      // Reserve physical rooms for every night.
      await reserveRoomInventoryInTransaction(
        transaction,
        {
          roomTypeId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          units: quantity,
        }
      );

      const booking = await transaction.booking.create({
        data: {
          bookingReference: generateBookingReference(),

          // Walk-in guests do not need an EthiopianBooking account.
          customerProfileId: null,

          status: "CONFIRMED",
          paymentStatus,

          checkInDate: checkIn,
          checkOutDate: checkOut,
          nights,
          guestCount: guests,
          currency: ratePlan.currency,

          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          platformCommission,
          paymentFee,
          partnerAmount,

          customerFirstName: firstName.trim(),
          customerLastName: lastName?.trim() || null,
          customerEmail: email?.trim() || "",
          customerPhone: phone?.trim() || null,

          specialRequests: specialRequests?.trim() || null,

          // Walk-in bookings do not expire after one hour.
          expiresAt: null,
        },
      });

      await transaction.bookingItem.create({
        data: {
          bookingId: booking.id,
          roomTypeId,
          ratePlanId,
          roomName: roomType.name,
          ratePlanName: ratePlan.name,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          nights,
          quantity,
          guests,
          pricePerNight,
          subtotal,
          currency: ratePlan.currency,
        },
      });

      await transaction.bookingGuest.create({
        data: {
          bookingId: booking.id,
          guestType: "PRIMARY",
          firstName: firstName.trim(),
          lastName: lastName?.trim() || null,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
        },
      });

      // Record offline payment separately from Chapa.
      if (paidAmount.greaterThan(0) && paymentMethod) {
        await transaction.offlinePayment.create({
          data: {
            bookingId: booking.id,
            method: paymentMethod,
            methodDetails:
              paymentMethodDetails?.trim() || null,
            amount: paidAmount,
            currency: ratePlan.currency,
            reference: paymentReference?.trim() || null,
            note: paymentNote?.trim() || null,
            paidAt: paidAt ? new Date(paidAt) : new Date(),
            recordedByProfileId,
          },
        });
      }

      return {
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        propertyName: roomType.property.name,
        roomName: roomType.name,
        ratePlanName: ratePlan.name,
        nights,
        quantity,
        guests,
        currency: booking.currency,
        subtotal: booking.subtotal.toString(),
        totalAmount: booking.totalAmount.toString(),
        amountPaid: paidAmount.toString(),
        balanceDue: totalAmount.minus(paidAmount).toString(),
        platformCommission:
          booking.platformCommission.toString(),
        partnerAmount: booking.partnerAmount.toString(),
      };
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );
}