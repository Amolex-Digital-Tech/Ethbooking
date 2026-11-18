import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { AuthError } from "@/lib/auth/auth-error";
import SupportWorkspace from "./support-workspace";

export const dynamic = "force-dynamic";

export default async function SupportWorkspacePage() {
  try {
    await requireRole("SUPPORT_AGENT");
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) redirect("/staff/login?role=SUPPORT_AGENT");
    if (error instanceof AuthError && error.status === 403) redirect("/staff/login?role=SUPPORT_AGENT&error=access");
    throw error;
  }
  return <SupportWorkspace />;
}
