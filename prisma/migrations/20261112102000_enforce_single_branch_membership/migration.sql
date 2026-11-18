-- An employee may belong to only one branch at a time.
CREATE UNIQUE INDEX IF NOT EXISTS "branch_members_profileId_key" ON "branch_members"("profileId");
