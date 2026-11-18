"use client";

import { usePathname } from "next/navigation";
import PartnerSidebar from "./partner-sidebar";

type PartnerStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";

export default function PartnerShell({
  children,
  partnerStatus,
  isPartnerStaff,
}: {
  children: React.ReactNode;
  partnerStatus: PartnerStatus | null;
  isPartnerStaff: boolean;
}) {
  const pathname = usePathname();
  const isStandalonePage = pathname === "/partner/login" || pathname === "/partner/register";

  if (isStandalonePage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#F4F3EF] md:flex">
      <PartnerSidebar partnerStatus={partnerStatus} isPartnerStaff={isPartnerStaff} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
