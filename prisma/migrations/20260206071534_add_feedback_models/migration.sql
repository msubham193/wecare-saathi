-- AlterTable
ALTER TABLE "OfficerProfile" ADD COLUMN     "stationId" TEXT;

-- AlterTable
ALTER TABLE "OfficerRegistrationRequest" ADD COLUMN     "stationId" TEXT;

-- CreateTable
CREATE TABLE "PoliceStation" (
    "id" TEXT NOT NULL,
    "mapboxPlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliceStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL,
    "rating" INTEGER,
    "photoUrl" TEXT,
    "photoFileName" TEXT,
    "photoFileSize" INTEGER,
    "videoUrl" TEXT,
    "videoFileName" TEXT,
    "videoFileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackReply" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoliceStation_mapboxPlaceId_key" ON "PoliceStation"("mapboxPlaceId");

-- CreateIndex
CREATE INDEX "PoliceStation_latitude_longitude_idx" ON "PoliceStation"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "PoliceStation_mapboxPlaceId_idx" ON "PoliceStation"("mapboxPlaceId");

-- CreateIndex
CREATE INDEX "PoliceStation_name_idx" ON "PoliceStation"("name");

-- CreateIndex
CREATE INDEX "PoliceStation_isActive_idx" ON "PoliceStation"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_caseId_key" ON "Feedback"("caseId");

-- CreateIndex
CREATE INDEX "Feedback_caseId_idx" ON "Feedback"("caseId");

-- CreateIndex
CREATE INDEX "Feedback_citizenId_idx" ON "Feedback"("citizenId");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "FeedbackReply_feedbackId_idx" ON "FeedbackReply"("feedbackId");

-- CreateIndex
CREATE INDEX "FeedbackReply_adminId_idx" ON "FeedbackReply"("adminId");

-- CreateIndex
CREATE INDEX "OfficerProfile_stationId_idx" ON "OfficerProfile"("stationId");

-- CreateIndex
CREATE INDEX "OfficerRegistrationRequest_stationId_idx" ON "OfficerRegistrationRequest"("stationId");

-- AddForeignKey
ALTER TABLE "OfficerProfile" ADD CONSTRAINT "OfficerProfile_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "PoliceStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerRegistrationRequest" ADD CONSTRAINT "OfficerRegistrationRequest_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "PoliceStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SosCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "CitizenProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackReply" ADD CONSTRAINT "FeedbackReply_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackReply" ADD CONSTRAINT "FeedbackReply_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
