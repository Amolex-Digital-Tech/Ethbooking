INSERT INTO "roles" ("id", "name", "description")
VALUES
    (gen_random_uuid(), 'CUSTOMER', 'Regular EthiopianBooking customer'),
    (gen_random_uuid(), 'PARTNER_OWNER', 'Owner of an accommodation partner account'),
    (gen_random_uuid(), 'PARTNER_MANAGER', 'Manager of an accommodation partner account'),
    (gen_random_uuid(), 'PARTNER_STAFF', 'Staff member of an accommodation partner account'),
    (gen_random_uuid(), 'ADMIN', 'Platform administrator'),
    (gen_random_uuid(), 'SUPER_ADMIN', 'Platform super administrator'),
    (gen_random_uuid(), 'SUPPORT_AGENT', 'Customer support agent'),
    (gen_random_uuid(), 'FINANCE', 'Finance and payments staff'),
    (gen_random_uuid(), 'CONTENT_MANAGER', 'Content management staff')
ON CONFLICT ("name") DO NOTHING;