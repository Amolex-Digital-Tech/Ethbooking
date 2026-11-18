export type BookingItem = {
  id: string;
  roomName: string;
  ratePlanName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: number;
  roomType: {
    property: {
      id: string;
      name: string;
    };
  };
};

export type Booking = {
  id: string;
  bookingReference: string;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestCount: number;
  subtotal: string;
  totalAmount: string;
  currency: string;
  customerFirstName: string;
  customerLastName: string;
  createdAt: string;
  items: BookingItem[];
};