import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import { prisma } from "@/lib/prisma/client";

type Props = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const user = await requireRole("SUPPORT_AGENT");
    const { caseId } = await params;
    const body = await request.json().catch(() => null);
    const note = typeof body?.body === "string" ? body.body.trim() : "";
    if (note.length < 2 || note.length > 3000) return Response.json({ success: false, error: "Notes must be between 2 and 3,000 characters." }, { status: 400 });
    if (!await prisma.supportCase.findUnique({ where: { id: caseId }, select: { id: true } })) return Response.json({ success: false, error: "Case not found." }, { status: 404 });
    const created = await prisma.supportCaseNote.create({ data: { caseId, authorProfileId: user.profile.id, body: note }, include: { author: { select: { firstName: true, lastName: true } } } });
    return Response.json({ success: true, data: created }, { status: 201 });
  } catch (error) { return handleAuthError(error); }
}
