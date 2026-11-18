-- Prevent negative inventory capacity.
ALTER TABLE "room_inventory"
ADD CONSTRAINT "room_inventory_total_units_nonnegative"
CHECK ("totalUnits" >= 0);

-- Prevent negative reserved inventory.
ALTER TABLE "room_inventory"
ADD CONSTRAINT "room_inventory_reserved_units_nonnegative"
CHECK ("reservedUnits" >= 0);

-- Prevent negative blocked inventory.
ALTER TABLE "room_inventory"
ADD CONSTRAINT "room_inventory_blocked_units_nonnegative"
CHECK ("blockedUnits" >= 0);

-- Prevent reserved and blocked inventory from exceeding capacity.
ALTER TABLE "room_inventory"
ADD CONSTRAINT "room_inventory_capacity_valid"
CHECK (
  "reservedUnits"::bigint + "blockedUnits"::bigint
  <= "totalUnits"::bigint
);
