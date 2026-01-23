import { PrismaClient, UserRole, OfficerStatus, CaseStatus } from '@prisma/client';
import { logger } from '../src/config/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seeding...');
  
  // Create test users
  const citizenUser = await prisma.user.create({
    data: {
      firebaseUid: 'test-citizen-001',
      phone: '+919876543210',
      name: 'Test Citizen',
      email: 'citizen@test.com',
      role: UserRole.CITIZEN,
      citizenProfile: {
        create: {
          address: 'Bhubaneswar, Odisha',
          bloodGroup: 'O+',
          guardians: {
            create: [
              {
                name: 'Guardian One',
                phone: '+919876543211',
                relation: 'Father',
                isPrimary: true,
              },
              {
                name: 'Guardian Two',
                phone: '+919876543212',
                relation: 'Mother',
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
      firebaseUid: 'test-officer-001',
      phone: '+919876543220',
      name: 'Officer Kumar',
      email: 'officer@police.gov.in',
      role: UserRole.OFFICER,
      officerProfile: {
        create: {
          badgeNumber: 'BP1001',
          designation: 'Sub-Inspector',
          station: 'Khandagiri Police Station',
          status: OfficerStatus.AVAILABLE,
          currentLat: 20.2700,
          currentLng: 85.8400,
          lastLocationUpdate: new Date(),
        },
      },
    },
  });
  
  const adminUser = await prisma.user.create({
    data: {
      firebaseUid: 'test-admin-001',
      phone: '+919876543230',
      name: 'Admin User',
      email: 'admin@police.gov.in',
      role: UserRole.ADMIN,
      adminProfile: {
        create: {
          department: 'Control Room',
          accessLevel: 3,
        },
      },
    },
  });
  
  logger.info('✅ Test users created');
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
        caseNumber: 'SOS-2026-01-000001',
        citizenId: citizenProfile.id,
        latitude: 20.2961,
        longitude: 85.8245,
        accuracy: 10,
        address: 'Near Khandagiri Caves, Bhubaneswar',
        description: 'Test SOS case',
        status: CaseStatus.CREATED,
        priority: 1,
      },
    });
    
    await prisma.caseStatusLog.create({
      data: {
        caseId: sosCase.id,
        toStatus: CaseStatus.CREATED,
        changedBy: citizenUser.id,
        notes: 'Initial SOS creation',
      },
    });
    
    logger.info(`✅ Sample SOS case created: ${sosCase.caseNumber}`);
  }
  
  logger.info('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    logger.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
