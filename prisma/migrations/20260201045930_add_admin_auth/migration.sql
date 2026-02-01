/*
  Warnings:

  - A unique constraint covering the columns `[officerId]` on the table `OfficerProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "OfficerProfile" ADD COLUMN     "officerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "passwordResetExpiry" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- CreateTable
CREATE TABLE "OfficerRegistrationRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "badgeNumber" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3),
    "idProofUrl" TEXT,
    "photoUrl" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "generatedOfficerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficerRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfficerRegistrationRequest_generatedOfficerId_key" ON "OfficerRegistrationRequest"("generatedOfficerId");

-- CreateIndex
CREATE INDEX "OfficerRegistrationRequest_status_idx" ON "OfficerRegistrationRequest"("status");

-- CreateIndex
CREATE INDEX "OfficerRegistrationRequest_email_idx" ON "OfficerRegistrationRequest"("email");

-- CreateIndex
CREATE INDEX "OfficerRegistrationRequest_phone_idx" ON "OfficerRegistrationRequest"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "OfficerRegistrationRequest_email_key" ON "OfficerRegistrationRequest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OfficerRegistrationRequest_phone_key" ON "OfficerRegistrationRequest"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "OfficerRegistrationRequest_badgeNumber_key" ON "OfficerRegistrationRequest"("badgeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OfficerProfile_officerId_key" ON "OfficerProfile"("officerId");
