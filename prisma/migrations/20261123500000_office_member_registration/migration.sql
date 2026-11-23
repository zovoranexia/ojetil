-- CreateEnum
CREATE TYPE "RegistrationChannel" AS ENUM ('ONLINE', 'OFFICE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MEMBER_REGISTERED_OFFICE';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBER_CARD_PRINTED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBER_DECISION_BLOCKED';

-- AlterTable
ALTER TABLE "member_registrations" ADD COLUMN     "channel" "RegistrationChannel" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "registeredById" TEXT;

-- AddForeignKey
ALTER TABLE "member_registrations" ADD CONSTRAINT "member_registrations_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
