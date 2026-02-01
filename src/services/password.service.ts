import bcrypt from "bcrypt";
import crypto from "crypto";
import { logger } from "../config/logger";

const SALT_ROUNDS = 10;
const PASSWORD_MIN_LENGTH = 8;

export class PasswordService {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      return hash;
    } catch (error) {
      logger.error("Error hashing password:", error);
      throw new Error("Failed to hash password");
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(password, hash);
      return isMatch;
    } catch (error) {
      logger.error("Error verifying password:", error);
      return false;
    }
  }

  /**
   * Generate a strong random password
   * Format: 8 characters with mix of uppercase, lowercase, numbers, and symbol
   */
  static generatePassword(): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "@#$!%";

    let password = "";

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill remaining characters randomly
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = password.length; i < PASSWORD_MIN_LENGTH; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    valid: boolean;
    message?: string;
  } {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      return {
        valid: false,
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      };
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[@#$!%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase) {
      return {
        valid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }
    if (!hasLowercase) {
      return {
        valid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }
    if (!hasNumber) {
      return {
        valid: false,
        message: "Password must contain at least one number",
      };
    }
    if (!hasSpecial) {
      return {
        valid: false,
        message: "Password must contain at least one special character",
      };
    }

    return { valid: true };
  }

  /**
   * Generate password reset token
   */
  static generateResetToken(): { token: string; expiry: Date } {
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // Token valid for 24 hours

    return { token, expiry };
  }

  /**
   * Hash token for storage
   */
  static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
