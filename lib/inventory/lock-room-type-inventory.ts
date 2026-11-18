import { Prisma } from "@/lib/generated/prisma/client";

export async function lockRoomTypeInventory(
  transaction: Prisma.TransactionClient,
  roomTypeId: string
): Promise<void> {
  // Serialize inventory-changing operations for this room type.
  // PostgreSQL automatically releases this transaction-level
  // advisory lock when the transaction commits or rolls back.
  //
  // pg_advisory_xact_lock returns PostgreSQL's "void" type.
  // Cast it to text so Prisma's query engine can deserialize the
  // result without changing the locking behavior.

  await transaction.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${roomTypeId}, 0)
    )::text AS lock_result
  `;
}
