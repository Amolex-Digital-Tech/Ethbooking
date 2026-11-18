import { requireRole } from "@/lib/auth/require-role";
import { handleAuthError } from "@/lib/auth/handle-auth-error";
import {
  createFinancialReportCsv,
  getFinancialReport,
} from "@/lib/admin/financial-reports";

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN", "SUPER_ADMIN", "FINANCE");
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const { searchParams } = new URL(request.url);

    const report = await getFinancialReport({
      period: searchParams.get("period") || "month",
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    });

    const csv = createFinancialReportCsv(report);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="ethiopianbooking-financial-report.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to generate the financial report.",
      },
      { status: 400 }
    );
  }
}