"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PartnerStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";

const navigation = [
  {
    label: "Dashboard",
    href: "/partner",
    icon: "⌂",
    exact: true,
  },
  {
    label: "My Properties",
    href: "/partner/properties",
    icon: "▦",
    propertySection: true,
  },
  {
    label: "Add Property",
    href: "/partner/properties/new",
    icon: "+",
    exact: true,
  },
  {
    label: "Manage Bookings",
    href: "/partner/bookings",
    icon: "▤",
    bookingSection: true,
    activeOnly: true,
  },
  {
    label: "Booking Calendar",
    href: "/partner/bookings/calendar",
    icon: "▦",
    calendarSection: true,
    activeOnly: true,
  },
  {
    label: "Walk-in Booking",
    href: "/partner/bookings/walk-in",
    icon: "＋",
    exact: true,
    activeOnly: true,
  },
  {
    label: "Financial Reports",
    href: "/partner/reports",
    icon: "▥",
    activeOnly: true,
  },
];

export default function PartnerSidebar({
  partnerStatus = "PENDING",
  isPartnerStaff = false,
}: {
  partnerStatus?: PartnerStatus | null;
  isPartnerStaff?: boolean;
}) {
  const pathname = usePathname();
  const isActivePartner = partnerStatus === "ACTIVE";
  const canManageProperties =
    partnerStatus === "ACTIVE" || partnerStatus === "PENDING";

  const staffNavigation = [
    { label: "Front Desk", href: "/partner/staff", icon: "⌂", exact: true },
    { label: "Walk-in Booking", href: "/partner/bookings/walk-in", icon: "＋", exact: true, activeOnly: true },
  ];
  const visibleNavigation = (isPartnerStaff ? staffNavigation : navigation).filter((item) => {
    if ("activeOnly" in item && item.activeOnly) {
      return isActivePartner;
    }

    if (
      ("propertySection" in item && item.propertySection) ||
      item.href === "/partner/properties/new"
    ) {
      return canManageProperties;
    }

    return true;
  });

  return (
    <aside className="z-40 w-full shrink-0 border-b border-[#E7E5DF] bg-white md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col">
        <div className="border-b border-[#EEECE6] px-6 py-6">
          <Link href={isPartnerStaff ? "/partner/staff" : "/partner"} className="block">
            <h2 className="text-xl font-bold tracking-tight text-[#263B2D]">
              Ethiopian<span className="text-[#83A64B]">Booking</span>
            </h2>
            <p className="mt-1 text-xs font-medium tracking-[0.15em] text-[#89877F]">
              PARTNER PORTAL
            </p>
          </Link>

          <p className="mt-3 text-xs text-[#89877F]">
            Account status:{" "}
            <span className="font-semibold text-[#405744]">
              {partnerStatus?.replaceAll("_", " ") ?? "NOT SET"}
            </span>
          </p>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-y-auto md:p-4">
          <p className="hidden px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#A09E96] md:block">
            Workspace
          </p>

          {visibleNavigation.map((item) => {
            let active = false;

            if ("propertySection" in item && item.propertySection) {
              active =
                pathname === "/partner/properties" ||
                (pathname.startsWith("/partner/properties/") &&
                  pathname !== "/partner/properties/new");
            } else if ("calendarSection" in item && item.calendarSection) {
              active =
                pathname === "/partner/bookings/calendar" ||
                pathname.startsWith("/partner/bookings/calendar/");
            } else if ("bookingSection" in item && item.bookingSection) {
              active =
                pathname === "/partner/bookings" ||
                (pathname.startsWith("/partner/bookings/") &&
                  !pathname.startsWith("/partner/bookings/calendar") &&
                  !pathname.startsWith("/partner/bookings/walk-in"));
            } else if ("exact" in item && item.exact) {
              active = pathname === item.href;
            } else {
              active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  active
                    ? "bg-[#EAF0E5] font-bold text-[#263B2D]"
                    : "font-medium text-[#686D63] hover:bg-[#F5F6F2] hover:text-[#263B2D]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-base ${
                    active
                      ? "bg-white text-[#405744]"
                      : "bg-[#F3F4EF] text-[#686D63]"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-[#EEECE6] p-4 md:block">
          <p className="text-xs text-[#89877F]">EthiopianBooking</p>
          <p className="mt-1 text-[11px] text-[#AAA79E]">
            Partner Management Portal
          </p>
        </div>
      </div>
    </aside>
  );
}