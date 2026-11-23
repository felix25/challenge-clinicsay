-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "claimToken" TEXT,
ADD COLUMN     "leaseUntil" TIMESTAMPTZ(3),
ADD COLUMN     "nextAttemptAt" TIMESTAMPTZ(3);
