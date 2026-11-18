
export type BookingDetailItem = {
  id: string;
  roomTypeId: string;
  ratePlanId: string;
  roomName: string;
  ratePlanName: string;
  roomType: {
    property: {
      id: string;
      name: string;
    };
  };
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  quantity: number;
  guests: number;
  pricePerNight: string;
  subtotal: string;
  currency: string;
};

export type BookingGuest = {
  id: string;
  guestType: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  dateOfBirth: string | null;
};

export type BookingDetail = {
  id: string;
  bookingReference: string;
  status: string;
  paymentStatus: string;
  expiresAt: string | null;

  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestCount: number;

  subtotal: string;
  totalAmount: string;
  refundAmount: string;
  cancellationFeeAmount: string;

  currency: string;

  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;

  specialRequests: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;

  createdAt: string;

  items: BookingDetailItem[];
  guests: BookingGuest[];
};
