import prisma from "../../config/database";
import { verifyFirebaseToken } from "../../config/firebase";
import { generateTokens, JWTPayload } from "../../middlewares/auth.middleware";
import { logger } from "../../config/logger";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { UserRole } from "@prisma/client";
import { PasswordService } from "../../services/password.service";

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

      // Phone number is optional for Google Auth users
      // if (!phone_number) {
      //   throw new Error('Phone number is required');
      // }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { firebaseUid },
        include: {
          citizenProfile: true,
          officerProfile: true,
          adminProfile: true,
        },
      });

      // If user not found by Firebase UID, check if exists by email to prevent duplicates
      if (!user && email) {
        const existingUser = await prisma.user.findFirst({
          where: { email },
          include: {
            citizenProfile: true,
            officerProfile: true,
            adminProfile: true,
          },
        });

        if (existingUser) {
          // Update existing user with new Firebase UID
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              firebaseUid,
              // Update name/avatar if not present?
              // For now, just ensure the link is established.
            },
            include: {
              citizenProfile: true,
              officerProfile: true,
              adminProfile: true,
            },
          });
          logger.info(
            `Linked existing user ${user.id} to new Firebase UID: ${firebaseUid}`,
          );
        }
      }

      // Create user if doesn't exist (default to CITIZEN role)
      if (!user) {
        user = await prisma.user.create({
          data: {
            firebaseUid,
            phone: phone_number,
            name: decodedToken.name || "User",
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
        throw new Error("Account is disabled");
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
      logger.error("Login error:", error);
      throw new Error(error.message || "Authentication failed");
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as {
        userId: string;
      };

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
        throw new Error("User not found or inactive");
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
      logger.error("Token refresh error:", error);
      throw new Error("Invalid refresh token");
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
      throw new Error("User not found");
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
        throw new Error("Account is disabled");
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
      logger.error("Google login error:", error);
      throw new Error(error.message || "Google authentication failed");
    }
  }

  /**
   * Complete user profile after Google OAuth
   */
  async completeProfile(
    userId: string,
    profileData: {
      name?: string;
      age: number;
      address?: string;
      bloodGroup?: string;
      medicalInfo?: string;
      emergencyNote?: string;
    },
  ) {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          citizenProfile: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
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
      logger.error("Profile completion error:", error);
      throw new Error(error.message || "Failed to complete profile");
    }
  }

  /**
   * Officer login with Officer ID and Password
   */
  async loginOfficer(officerId: string, password: string) {
    try {
      // Find officer by officerId
      const officer = await prisma.officerProfile.findUnique({
        where: { officerId },
        include: {
          user: true,
        },
      });

      if (!officer) {
        throw new Error("Invalid officer ID or password");
      }

      const user = officer.user;

      // Check if account is active
      if (user.accountStatus !== "ACTIVE") {
        throw new Error(`Account is ${user.accountStatus.toLowerCase()}`);
      }

      // Verify password
      if (!user.password) {
        throw new Error("Password not set for this account");
      }

      const isPasswordValid = await PasswordService.verifyPassword(
        password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new Error("Invalid officer ID or password");
      }

      // Generate tokens
      const payload: JWTPayload = {
        id: user.id,
        role: user.role,
        firebaseUid: user.firebaseUid || undefined,
      };

      const tokens = generateTokens(payload);

      logger.info("Officer logged in successfully", {
        userId: user.id,
        officerId,
      });

      return {
        ...tokens,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          officerId: officer.officerId,
          mustChangePassword: user.mustChangePassword,
        },
      };
    } catch (error: any) {
      logger.error("Officer login error:", error);
      throw error;
    }
  }

  /**
   * Change officer password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.password) {
        throw new Error("User not found or password not set");
      }

      // Verify current password
      const isValid = await PasswordService.verifyPassword(
        currentPassword,
        user.password,
      );

      if (!isValid) {
        throw new Error("Current password is incorrect");
      }

      // Validate new password
      const validation = PasswordService.validatePassword(newPassword);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Hash new password
      const hashedPassword = await PasswordService.hashPassword(newPassword);

      // Update password and clear mustChangePassword flag
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
        },
      });

      logger.info("Password changed successfully", { userId });

      return { success: true, message: "Password changed successfully" };
    } catch (error: any) {
      logger.error("Password change error:", error);
      throw error;
    }
  }

  /**
   * Request password reset (generates reset token)
   */
  async requestPasswordReset(officerId: string, email: string) {
    try {
      const officer = await prisma.officerProfile.findUnique({
        where: { officerId },
        include: { user: true },
      });

      if (!officer || officer.user.email !== email) {
        // Don't reveal if user exists or not for security
        return {
          success: true,
          message:
            "If the account exists, a reset link will be sent to the email",
        };
      }

      const { token, expiry } = PasswordService.generateResetToken();

      // Store reset token
      await prisma.user.update({
        where: { id: officer.user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpiry: expiry,
        },
      });

      logger.info("Password reset requested", {
        userId: officer.user.id,
        officerId,
      });

      // In production, send email with reset token
      // For now, return token (remove this in production)
      return {
        success: true,
        message: "Password reset link sent to your email",
        // TODO: Remove token from response in production
        resetToken: token,
      };
    } catch (error: any) {
      logger.error("Password reset request error:", error);
      throw error;
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(resetToken: string, newPassword: string) {
    try {
      const hashedToken = await PasswordService.hashToken(resetToken);

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new Error("Invalid or expired reset token");
      }

      // Validate new password
      const validation = PasswordService.validatePassword(newPassword);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const hashedPassword = await PasswordService.hashPassword(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
          mustChangePassword: false, // Reset this flag if it was set
        },
      });

      logger.info("Password reset successfully", { userId: user.id });
    } catch (error: any) {
      logger.error("Password reset error:", error);
      throw error;
    }
  }
}
