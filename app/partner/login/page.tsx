
import type { Metadata } from "next";
import PortalLoginForm from "@/components/auth/PortalLoginForm";

export const metadata: Metadata = {
  title: "Partner Sign In | EthiopianBooking",
  description: "Sign in to manage your accommodation listings.",
};

export default function PartnerLoginPage() {
  return <PortalLoginForm portal="partner" />;
}
