import type { Prisma } from "@/lib/generated/prisma/client";
import type { CancellationPolicyType } from "@/lib/generated/prisma/enums";

// The cancellation terms and check-in time to store on a booking item when it
// is created, so later edits to the rate plan or room don't change them.
export function bookedCancellationTerms(
  ratePlan: {
    cancellationPolicy: CancellationPolicyType;
    cancellationDeadlineHours: number | null;
    cancellationFeePercent: Prisma.Decimal | null;
  },
  checkInTime: string | null
) {
  return {
    cancellationPolicy: ratePlan.cancellationPolicy,
    cancellationDeadlineHours: ratePlan.cancellationDeadlineHours,
    cancellationFeePercent: ratePlan.cancellationFeePercent,
    checkInTime: checkInTime?.trim() || null,
  };
}
