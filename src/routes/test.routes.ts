import { Router } from 'express';
import { generateTokens } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { ResponseUtil } from '../utils/response.util';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * DEV ONLY - Generate test tokens without Firebase
 * DELETE THIS FILE IN PRODUCTION!
 */
router.post('/test-login', async (req, res) => {
  try {
    const { phone, role = UserRole.CITIZEN } = req.body;
    
    if (!phone) {
      return ResponseUtil.badRequest(res, 'Phone number required');
    }
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
    });
    
    if (!user) {
      // Create test user
      user = await prisma.user.create({
        data: {
          firebaseUid: `test-${Date.now()}`,
          phone,
          name: `Test User (${role})`,
          email: `${phone}@test.com`,
          role,
        },
      });
      
      // Create profile based on role
      if (role === UserRole.CITIZEN) {
        await prisma.citizenProfile.create({
          data: { userId: user.id },
        });
      } else if (role === UserRole.OFFICER) {
        await prisma.officerProfile.create({
          data: {
            userId: user.id,
            badgeNumber: `TEST-${Date.now()}`,
            designation: 'Test Officer',
            station: 'Test Station',
          },
        });
      } else if (role === UserRole.ADMIN) {
        await prisma.adminProfile.create({
          data: {
            userId: user.id,
            department: 'Test Department',
          },
        });
      }
    }
    
    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      firebaseUid: user.firebaseUid,
      role: user.role,
      email: user.email || undefined,
    });
    
    return ResponseUtil.success(res, {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
      tokens,
    }, 'Test login successful');
    
  } catch (error: any) {
    return ResponseUtil.error(res, error.message);
  }
});

export default router;
