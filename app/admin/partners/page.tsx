
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import PartnerDirectory from "../../api/admin/partners/partner-directory";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const partners = await prisma.partner.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      businessName: true,
      legalName: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          properties: true,
        },
      },
    },
  });

  const directoryPartners = partners.map((partner) => ({
    id: partner.id,
    businessName: partner.businessName,
    legalName: partner.legalName,
    email: partner.email,
    phone: partner.phone,
    status: partner.status,
    createdAt: partner.createdAt.toISOString(),
    propertyCount: partner._count.properties,
  }));

  return <PartnerDirectory partners={directoryPartners} />;
}
