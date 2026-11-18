import PartnerShell from "./partner-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma/client";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  const membership = currentUser
    ? await prisma.partnerMember.findFirst({
        where: {
          profileId: currentUser.profile.id,
          status: "ACTIVE",
        },
        select: {
          partner: {
            select: {
              status: true,
            },
          },
        },
      })
    : null;

  const partnerStatus = membership?.partner.status ?? null;
  const isPartnerStaff = Boolean(
    currentUser?.roles.includes("PARTNER_STAFF") &&
      !currentUser.roles.some((role) =>
        ["PARTNER_OWNER", "PARTNER_MANAGER"].includes(role)
      )
  );

  return (
    <PartnerShell
      partnerStatus={partnerStatus}
      isPartnerStaff={isPartnerStaff}
    >
      {children}
    </PartnerShell>
  );
}
