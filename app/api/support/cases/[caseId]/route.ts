import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

type Props = { params: Promise<{ caseId: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    await requireRole("SUPPORT_AGENT");
    const { caseId } = await params;
    const item = await prisma.supportCase.findUnique({
      where: { id: caseId },
      include: {
        booking: {
          include: {
            items: {
              include: {
                roomType: {
                  include: {
                    property: { select: { name: true } },
                  },
                },
              },
            },
            paymentTransactions: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
        notes: {
          include: {
            author: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!item) {
      return Response.json({ success: false, error: "Case not found." }, { status: 404 });
    }
    return Response.json({ success: true, data: item });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    await requireRole("SUPPORT_AGENT");
    const { caseId } = await params;
    const body = await request.json().catch(() => null);
    const statuses = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];
    const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
    const data: Record<string, unknown> = {};

    if (statuses.includes(body?.status)) {
      data.status = body.status;
      data.resolvedAt = ["RESOLVED", "CLOSED"].includes(body.status) ? new Date() : null;
    }
    if (priorities.includes(body?.priority)) data.priority = body.priority;
    if (!Object.keys(data).length) {
      return Response.json({ success: false, error: "No valid case changes provided." }, { status: 400 });
    }

    const updated = await prisma.supportCase.update({
      where: { id: caseId },
      data: data as never,
    });
    return Response.json({ success: true, data: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}
