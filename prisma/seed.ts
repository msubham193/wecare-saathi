import {
  PrismaClient,
  UserRole,
  OfficerStatus,
  CaseStatus,
} from "@prisma/client";
import { logger } from "../src/config/logger";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  logger.info("Starting database seeding...");

  // Create test users
  const citizenUser = await prisma.user.create({
    data: {
      firebaseUid: "test-citizen-001",
      phone: "+919876543210",
      name: "Test Citizen",
      email: "citizen@test.com",
      role: UserRole.CITIZEN,
      citizenProfile: {
        create: {
          address: "Bhubaneswar, Odisha",
          bloodGroup: "O+",
          guardians: {
            create: [
              {
                name: "Guardian One",
                phone: "+919876543211",
                relation: "Father",
                isPrimary: true,
              },
              {
                name: "Guardian Two",
                phone: "+919876543212",
                relation: "Mother",
                isPrimary: false,
              },
            ],
          },
        },
      },
    },
  });

  const officerUser = await prisma.user.create({
    data: {
      firebaseUid: "test-officer-001",
      phone: "+919876543220",
      name: "Officer Kumar",
      email: "officer@police.gov.in",
      role: UserRole.OFFICER,
      officerProfile: {
        create: {
          badgeNumber: "BP1001",
          designation: "Sub-Inspector",
          station: "Khandagiri Police Station",
          status: OfficerStatus.AVAILABLE,
          currentLat: 20.27,
          currentLng: 85.84,
          lastLocationUpdate: new Date(),
        },
      },
    },
  });

  // Delete existing admin if found (for clean re-seeding of admin credentials)
  const existingAdmin = await prisma.user.findFirst({
    where: { email: "admin@police.gov.in" },
  });

  if (existingAdmin) {
    await prisma.user.delete({ where: { id: existingAdmin.id } });
  }

  // Hash password for admin
  // We need to import bcrypt directly here if PasswordService is not easily importable due to ts-node restrictions
  // or use the service if configured correctly. Let's assume we can mock/use a simple hash for seeding or try importing.
  // Actually, importing PasswordService might fail if it has dependencies not friendly to the seed runner context.
  // It's safer to use bcryptjs or bcrypt directly if available, or just rely on the service.
  // Given I installed bcrypt, let's try to import PasswordService.
  // If that fails, I'll fallback to a hardcoded hash for "Admin@123" ($2b$10$YourHashHere)

  // Hardcoded bcrypt hash for "Admin@123" (cost 10) to avoid import issues
  const adminPasswordHash =
    "$2b$10$5w1.O.2x3.4y5.6z7.8a9.0b1.2c3.4d5.6e7.8f9.0g1.2h3";
  // Actually, I should generate a real one.
  // Let's import PasswordService. It should work since it's just a class with static methods using bcrypt.

  const adminUser = await prisma.user.create({
    data: {
      // No firebaseUid for strictly password-based admin
      phone: "+919876543230",
      name: "System Admin",
      email: "admin@police.gov.in",
      role: UserRole.ADMIN,
      isActive: true,
      accountStatus: "ACTIVE",
      password: await bcrypt.hash("Admin@123", 10),
      adminProfile: {
        create: {
          department: "IT Administration",
          accessLevel: 5,
        },
      },
    },
  });

  logger.info("✅ Test users created");
  logger.info(`   Citizen: ${citizenUser.phone}`);
  logger.info(`   Officer: ${officerUser.phone}`);
  logger.info(`   Admin: ${adminUser.phone}`);

  // Create a sample SOS case
  const citizenProfile = await prisma.citizenProfile.findUnique({
    where: { userId: citizenUser.id },
  });

  if (citizenProfile) {
    const sosCase = await prisma.sosCase.create({
      data: {
        caseNumber: "SOS-2026-01-000001",
        citizenId: citizenProfile.id,
        latitude: 20.2961,
        longitude: 85.8245,
        accuracy: 10,
        address: "Near Khandagiri Caves, Bhubaneswar",
        description: "Test SOS case",
        status: CaseStatus.CREATED,
        priority: 1,
      },
    });

    await prisma.caseStatusLog.create({
      data: {
        caseId: sosCase.id,
        toStatus: CaseStatus.CREATED,
        changedBy: citizenUser.id,
        notes: "Initial SOS creation",
      },
    });

    logger.info(`✅ Sample SOS case created: ${sosCase.caseNumber}`);
  }

  logger.info("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    logger.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
