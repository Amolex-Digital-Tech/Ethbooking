
import type { ReactNode } from "react";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";

export default function PropertyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
