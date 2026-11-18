import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma/client";
import PropertyDirectory from "./property-directory";


export default async function AdminPropertiesPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const properties = await prisma.property.findMany({
    include: {
      partner: {
        select: {
          businessName: true,
          email: true,
        },
      },
      location: {
        select: {
          city: true,
          region: true,
        },
      },
      documents: {
        select: { id: true },
      },
      photos: {
        select: { id: true },
      },
      roomTypes: {
        select: { id: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const directoryProperties = properties.map((property) => ({
    id: property.id,
    name: property.name,
    slug: property.slug,
    status: property.status,
    verificationStatus: property.verificationStatus,
    propertyType: property.propertyType,
    city: property.location.city,
    region: property.location.region,
    partnerName: property.partner.businessName,
    partnerEmail: property.partner.email,
    photoCount: property.photos.length,
    documentCount: property.documents.length,
    roomTypeCount: property.roomTypes.length,
    createdAt: property.createdAt.toISOString(),
  }));

  return <PropertyDirectory properties={directoryProperties} />;
}
