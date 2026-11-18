
import type { Metadata } from "next";
import PortalLoginForm from "@/components/auth/PortalLoginForm";

export const metadata: Metadata = {
  title: "Administrator Sign In | EthiopianBooking",
  description: "Restricted administrator sign-in.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return <PortalLoginForm portal="admin" />;
}
