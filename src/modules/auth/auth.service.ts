import prisma from '../../config/database';
import { verifyFirebaseToken } from '../../config/firebase';
import { generateTokens, JWTPayload } from '../../middlewares/auth.middleware';
import { logger } from '../../config/logger';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { UserRole } from '@prisma/client';

export class AuthService {
  /**
   * Login with Firebase token
   * Creates user if doesn't exist, generates JWT tokens
   */
  async login(firebaseToken: string) {
    try {
      // Verify Firebase token
      const decodedToken = await verifyFirebaseToken(firebaseToken);
      
      const { uid: firebaseUid, email, phone_number } = decodedToken;
      
      if (!phone_number) {
        throw new Error('Phone number is required');
      }
      
      // Find or create user
      let user = await prisma.user.findUnique({
        where: { firebaseUid },
        include: {
          citizenProfile: true,
          officerProfile: true,
          adminProfile: true,
        },
      });
      
      // Create user if doesn't exist (default to CITIZEN role)
      if (!user) {
        user = await prisma.user.create({
          data: {
            firebaseUid,
            phone: phone_number,
            name: decodedToken.name || 'User',
            email: email || null,
            role: UserRole.CITIZEN,
          },
          include: {
            citizenProfile: true,
            officerProfile: true,
            adminProfile: true,
          },
        });
        
        // Create citizen profile by default
        await prisma.citizenProfile.create({
          data: {
            userId: user.id,
          },
        });
        
        logger.info(`New user registered: ${user.id}`);
      }
      
      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is disabled');
      }
      
      // Generate JWT tokens
      const payload: JWTPayload = {
        userId: user.id,
        firebaseUid: user.firebaseUid || undefined,
        role: user.role,
        email: user.email || undefined,
      };
      
      const tokens = generateTokens(payload);
      
      logger.info(`User logged in: ${user.id}`);
      
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          hasProfile: !!(
            user.citizenProfile ||
            user.officerProfile ||
            user.adminProfile
          ),
        },
        tokens,
      };
    } catch (error: any) {
      logger.error('Login error:', error);
      throw new Error(error.message || 'Authentication failed');
    }
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          firebaseUid: true,
          role: true,
          email: true,
          isActive: true,
        },
      });
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }
      
      const payload: JWTPayload = {
        userId: user.id,
        firebaseUid: user.firebaseUid || undefined,
        role: user.role,
        email: user.email || undefined,
      };
      
      const tokens = generateTokens(payload);
      
      return tokens;
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      throw new Error('Invalid refresh token');
    }
  }
  
  /**
   * Get current user profile
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        citizenProfile: {
          include: {
            guardians: true,
          },
        },
        officerProfile: true,
        adminProfile: true,
      },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  /**
   * Login with Google OAuth
   * Generates JWT tokens after successful Google authentication
   */
  async loginWithGoogle(user: any) {
    try {
      if (!user.isActive) {
        throw new Error('Account is disabled');
      }

      // Generate JWT tokens
      const payload: JWTPayload = {
        userId: user.id,
        firebaseUid: user.firebaseUid || undefined,
        role: user.role,
        email: user.email || undefined,
      };

      const tokens = generateTokens(payload);

      logger.info(`User logged in via Google: ${user.id}`);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          profileCompleted: user.profileCompleted,
          hasProfile: !!(
            user.citizenProfile ||
            user.officerProfile ||
            user.adminProfile
          ),
        },
        tokens,
        requiresProfileCompletion: !user.profileCompleted,
      };
    } catch (error: any) {
      logger.error('Google login error:', error);
      throw new Error(error.message || 'Google authentication failed');
    }
  }
  
  /**
   * Complete user profile after Google OAuth
   */
  async completeProfile(userId: string, profileData: {
    name?: string;
    age: number;
    address?: string;
    bloodGroup?: string;
    medicalInfo?: string;
    emergencyNote?: string;
  }) {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          citizenProfile: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update user with profile data
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: profileData.name || user.name,
          age: profileData.age,
          profileCompleted: true,
        },
        include: {
          citizenProfile: true,
          officerProfile: true,
          adminProfile: true,
        },
      });

      // Create or update citizen profile
      if (user.role === UserRole.CITIZEN) {
        if (user.citizenProfile) {
          await prisma.citizenProfile.update({
            where: { id: user.citizenProfile.id },
            data: {
              address: profileData.address,
              bloodGroup: profileData.bloodGroup,
              medicalInfo: profileData.medicalInfo,
              emergencyNote: profileData.emergencyNote,
            },
          });
        } else {
          await prisma.citizenProfile.create({
            data: {
              userId: user.id,
              address: profileData.address,
              bloodGroup: profileData.bloodGroup,
              medicalInfo: profileData.medicalInfo,
              emergencyNote: profileData.emergencyNote,
            },
          });
        }
      }

      logger.info(`Profile completed for user: ${userId}`);

      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        age: updatedUser.age,
        role: updatedUser.role,
        profileCompleted: updatedUser.profileCompleted,
        hasProfile: !!(
          updatedUser.citizenProfile ||
          updatedUser.officerProfile ||
          updatedUser.adminProfile
        ),
      };
    } catch (error: any) {
      logger.error('Profile completion error:', error);
      throw new Error(error.message || 'Failed to complete profile');
    }
  }
}
