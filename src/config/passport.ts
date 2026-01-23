import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { config } from './index';
import prisma from './database';
import { UserRole } from '@prisma/client';
import { logger } from './logger';

/**
 * Configure Passport Google OAuth 2.0 Strategy
 */
export function configureGoogleStrategy() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || 'User';
          const avatar = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('Email not provided by Google'), undefined);
          }

          // Check if user exists by Google ID or email
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { googleId },
                { email },
              ],
            },
            include: {
              citizenProfile: true,
              officerProfile: true,
              adminProfile: true,
            },
          });

          if (user) {
            // Update user with Google info if not already set
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  googleId,
                  avatar: avatar || user.avatar,
                },
                include: {
                  citizenProfile: true,
                  officerProfile: true,
                  adminProfile: true,
                },
              });
            }
            
            logger.info(`Existing user logged in via Google: ${user.id}`);
          } else {
            // Create new user with Google OAuth
            user = await prisma.user.create({
              data: {
                googleId,
                email,
                name,
                avatar,
                role: UserRole.CITIZEN,
                profileCompleted: false,
              },
              include: {
                citizenProfile: true,
                officerProfile: true,
                adminProfile: true,
              },
            });

            logger.info(`New user created via Google OAuth: ${user.id}`);
          }

          return done(null, user);
        } catch (error: any) {
          logger.error('Google OAuth error:', error);
          return done(error, undefined);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          citizenProfile: true,
          officerProfile: true,
          adminProfile: true,
        },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

export default passport;
