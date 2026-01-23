import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      firebaseUid?: string | null;
      googleId?: string | null;
      name: string;
      email: string | null;
      avatar?: string | null;
      age?: number | null;
      role: UserRole;
      profileCompleted: boolean;
      isActive: boolean;
      citizenProfile?: any;
      officerProfile?: any;
      adminProfile?: any;
    }
  }
}

export {};
