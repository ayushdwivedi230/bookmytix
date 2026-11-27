import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and, sql, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, bookings } from '../db/schema.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const BCRYPT_SALT_ROUNDS = 12;

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
    preferredCity: string;
    isEmailVerified: boolean;
  };
}

export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  preferredCity: string;
  preferredGenres: string[];
  preferredLanguages: string[];
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    promotional: boolean;
  };
  isEmailVerified: boolean;
  createdAt: string;
  stats: {
    totalBookings: number;
    activeBookings: number;
  };
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  preferredCity?: string;
  preferredGenres?: string[];
  preferredLanguages?: string[];
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    promotional: boolean;
  };
}

export const authService = {
  /**
   * Register a new user account with hashed password and verification token.
   */
  async register(name: string, email: string, password: string, preferredCity = 'Delhi'): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existing) {
      throw new AppError('Email already registered', 400);
    }

    const passwordHash = bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    let user;
    try {
      const [inserted] = await db
        .insert(users)
        .values({
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: 'customer',
          preferredCity: preferredCity.trim() || 'Delhi',
          emailVerificationToken: verificationToken,
          isEmailVerified: false,
          isActive: true,
        })
        .returning();
      user = inserted;
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('users_email_unique')) {
        throw new AppError('An account with this email address already exists. Please sign in instead.', 409);
      }
      if (err.code === 'ECONNREFUSED' || err.message?.includes('connect ECONNREFUSED')) {
        throw new AppError('Database connection failed. Please ensure DATABASE_URL is configured in your environment variables.', 503);
      }
      throw err;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '12h' },
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        preferredCity: user.preferredCity,
        isEmailVerified: user.isEmailVerified,
      },
    };
  },

  /**
   * Authenticate user with email and password.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.isActive === false) {
      throw new AppError('Account is deactivated. Please contact support.', 403);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, cinemaId: user.cinemaId },
      env.JWT_SECRET,
      { expiresIn: '12h' },
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        preferredCity: user.preferredCity,
        isEmailVerified: user.isEmailVerified,
      },
    };
  },

  /**
   * Generates a time-limited password reset token.
   * Uniform messaging protects against account enumeration.
   */
  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user) {
      return {
        message: 'If an account matches that email address, password reset instructions have been generated.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    await db
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return {
      message: 'If an account matches that email address, password reset instructions have been generated.',
      resetToken, // Returned for dev testing & verification
    };
  },

  /**
   * Resets password using a validated time-limited token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    const now = new Date();
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.passwordResetToken, token),
        gt(users.passwordResetExpiresAt, now),
      ),
    });

    if (!user) {
      throw new AppError('Password reset link is invalid or has expired', 400);
    }

    const newHash = bcrypt.hashSync(newPassword, BCRYPT_SALT_ROUNDS);

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { message: 'Password has been successfully updated. You may now sign in.' };
  },

  /**
   * Verifies user email using the verification token.
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.emailVerificationToken, token),
    });

    if (!user) {
      throw new AppError('Invalid or expired email verification link', 400);
    }

    await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { message: 'Email verified successfully!' };
  },

  /**
   * Retrieves full profile and booking activity for a customer.
   */
  async getProfile(userId: number): Promise<UserProfileResponse> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError('User profile not found', 404);
    }

    // Get booking stats
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(case when status in ('confirmed', 'payment_pending') then 1 end)::int`,
      })
      .from(bookings)
      .where(eq(bookings.userId, userId));

    let preferredGenres = ['Action', 'Thriller'];
    try {
      preferredGenres = JSON.parse(user.preferredGenres || '[]');
    } catch { /* use default */ }

    let preferredLanguages = ['Hindi', 'English'];
    try {
      preferredLanguages = JSON.parse(user.preferredLanguages || '[]');
    } catch { /* use default */ }

    let notificationPreferences = { email: true, sms: true, promotional: false };
    try {
      notificationPreferences = JSON.parse(user.notificationPreferences || '{}');
    } catch { /* use default */ }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      preferredCity: user.preferredCity,
      preferredGenres,
      preferredLanguages,
      notificationPreferences,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
      stats: {
        totalBookings: stats?.total || 0,
        activeBookings: stats?.active || 0,
      },
    };
  },

  /**
   * Updates customer profile details and preferences.
   */
  async updateProfile(userId: number, input: UpdateProfileInput): Promise<UserProfileResponse> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name && input.name.trim()) {
      updateData.name = input.name.trim();
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone?.trim() || null;
    }
    if (input.preferredCity) {
      updateData.preferredCity = input.preferredCity.trim();
    }
    if (input.preferredGenres) {
      updateData.preferredGenres = JSON.stringify(input.preferredGenres);
    }
    if (input.preferredLanguages) {
      updateData.preferredLanguages = JSON.stringify(input.preferredLanguages);
    }
    if (input.notificationPreferences) {
      updateData.notificationPreferences = JSON.stringify(input.notificationPreferences);
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    return this.getProfile(userId);
  },

  /**
   * Changes account password after verifying current credentials.
   */
  async changePassword(userId: number, currentPass: string, newPass: string): Promise<{ message: string }> {
    if (!newPass || newPass.length < 6) {
      throw new AppError('New password must be at least 6 characters long', 400);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!bcrypt.compareSync(currentPass, user.passwordHash)) {
      throw new AppError('Current password is incorrect', 400);
    }

    const newHash = bcrypt.hashSync(newPass, BCRYPT_SALT_ROUNDS);

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { message: 'Password updated successfully' };
  },
};
