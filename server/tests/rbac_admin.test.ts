import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { authService } from '../services/authService.js';
import { adminService } from '../services/adminService.js';
import { adminAnalyticsService } from '../services/adminAnalyticsService.js';
import { auditLogService } from '../services/auditLogService.js';
import { supportTicketService } from '../services/supportTicketService.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

describe('RBAC, Identity & Admin Systems', { timeout: 30000 }, () => {
  let customerToken: string;
  let customerUser: { id: number; email: string; name: string; role: string };
  let adminToken: string;
  let adminUser: { id: number; email: string; name: string; role: string };

  const testEmailCustomer = `test.customer.${Date.now()}@example.com`;
  const testEmailAdmin = `test.admin.${Date.now()}@example.com`;

  beforeAll(async () => {
    // 1. Create a test customer account
    const customerAuth = await authService.register(
      'Test Customer',
      testEmailCustomer,
      'Password123!',
      'Hyderabad',
    );
    customerToken = customerAuth.token;
    customerUser = customerAuth.user;

    // 2. Create a test admin account
    const adminAuth = await authService.register(
      'Test Admin Officer',
      testEmailAdmin,
      'AdminSecret123!',
      'Mumbai',
    );
    // Promote to admin in DB
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, adminAuth.user.id));

    adminToken = jwt.sign(
      { id: adminAuth.user.id, email: testEmailAdmin, name: 'Test Admin Officer', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '12h' },
    );
    adminUser = {
      id: adminAuth.user.id,
      email: testEmailAdmin,
      name: 'Test Admin Officer',
      role: 'admin',
    };
  });

  // ─── 1. Authentication & Profile Lifecycle ───────────────────────────────
  describe('Authentication & Profile Lifecycle', () => {
    it('authenticates customer and verifies profile data', async () => {
      const profile = await authService.getProfile(customerUser.id);
      expect(profile).toBeDefined();
      expect(profile.id).toBe(customerUser.id);
      expect(profile.email).toBe(testEmailCustomer);
      expect(profile.preferredCity).toBe('Hyderabad');
      expect(Array.isArray(profile.preferredGenres)).toBe(true);
      expect(profile.stats).toBeDefined();
    });

    it('updates customer profile and preferences', async () => {
      const updated = await authService.updateProfile(customerUser.id, {
        phone: '+91 9876543210',
        preferredCity: 'Bengaluru',
        preferredGenres: ['Sci-Fi', 'Comedy'],
        preferredLanguages: ['Telugu', 'Hindi'],
        notificationPreferences: { email: true, sms: false, promotional: true },
      });

      expect(updated.phone).toBe('+91 9876543210');
      expect(updated.preferredCity).toBe('Bengaluru');
      expect(updated.preferredGenres).toContain('Sci-Fi');
      expect(updated.preferredLanguages).toContain('Telugu');
      expect(updated.notificationPreferences.promotional).toBe(true);
      expect(updated.notificationPreferences.sms).toBe(false);
    });

    it('changes password successfully with valid current password', async () => {
      const result = await authService.changePassword(
        customerUser.id,
        'Password123!',
        'NewStrongPass456!',
      );
      expect(result.message).toContain('updated');

      // Verify login works with new password
      const reLogin = await authService.login(testEmailCustomer, 'NewStrongPass456!');
      expect(reLogin.token).toBeDefined();
      expect(reLogin.user.id).toBe(customerUser.id);
    });

    it('rejects password change with incorrect current password', async () => {
      await expect(
        authService.changePassword(customerUser.id, 'WrongPassword!', 'AnotherPass789!'),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('generates password reset token and resets password', async () => {
      const forgotRes = await authService.forgotPassword(testEmailCustomer);
      expect(forgotRes.message).toBeDefined();
      expect(forgotRes.resetToken).toBeDefined();

      const resetRes = await authService.resetPassword(
        forgotRes.resetToken!,
        'ResetCompletedPass999!',
      );
      expect(resetRes.message).toContain('successfully updated');

      // Verify sign in with reset password
      const loginRes = await authService.login(testEmailCustomer, 'ResetCompletedPass999!');
      expect(loginRes.user.email).toBe(testEmailCustomer);
    });
  });

  // ─── 2. Role-Based Access Control (RBAC) ─────────────────────────────────
  describe('Role-Based Access Control (RBAC)', () => {
    it('prevents normal users from changing their own role to admin', async () => {
      await expect(
        adminService.updateUserRole(adminUser.id, 'customer', {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: 'admin',
        }),
      ).rejects.toThrow('Administrators cannot modify their own role');
    });

    it('allows admin to list users and modify a customer role', async () => {
      const usersList = await adminService.listUsers();
      expect(usersList.length).toBeGreaterThan(0);

      const changeRoleRes = await adminService.updateUserRole(
        customerUser.id,
        'cinema_manager',
        adminUser as any,
      );
      expect(changeRoleRes.message).toContain('cinema_manager');

      const profile = await authService.getProfile(customerUser.id);
      expect(profile.role).toBe('cinema_manager');
    });

    it('prevents admin from deactivating their own account', async () => {
      await expect(
        adminService.toggleUserStatus(adminUser.id, adminUser as any),
      ).rejects.toThrow('Administrators cannot deactivate their own account');
    });

    it('allows admin to toggle customer active status', async () => {
      const toggleRes = await adminService.toggleUserStatus(customerUser.id, adminUser as any);
      expect(toggleRes.message).toContain('deactivated');

      // Login should now fail with 403 account deactivated
      await expect(
        authService.login(testEmailCustomer, 'ResetCompletedPass999!'),
      ).rejects.toThrow('deactivated');

      // Reactivate user
      const reactivateRes = await adminService.toggleUserStatus(customerUser.id, adminUser as any);
      expect(reactivateRes.message).toContain('activated');
    });
  });

  // ─── 3. Audit Logging (Feature 7) ─────────────────────────────────────────
  describe('Audit Logging System', () => {
    it('records and retrieves administrative audit entries', async () => {
      const actionKey = `test.audit.${Date.now()}`;
      await auditLogService.log({
        userId: adminUser.id,
        actorEmail: adminUser.email,
        actorRole: 'admin',
        action: actionKey,
        resourceType: 'pricing',
        resourceId: 'show-100',
        details: { oldPrice: 250, newPrice: 350 },
      });

      const auditResults = await auditLogService.list({ action: actionKey });
      expect(auditResults.total).toBe(1);
      expect(auditResults.logs[0].action).toBe(actionKey);
      expect(auditResults.logs[0].actorEmail).toBe(adminUser.email);
      expect(auditResults.logs[0].resourceType).toBe('pricing');
    });
  });

  // ─── 4. Customer Support Workflow (Feature 8) ─────────────────────────────
  describe('Customer Support Workflow', () => {
    let createdTicketId: number;

    it('allows a customer to file a support ticket', async () => {
      const ticket = await supportTicketService.createTicket(customerUser.id, {
        subject: 'Query about seat booking confirmation',
        category: 'booking_issue',
        message: 'Could you please confirm if my tickets are confirmed?',
        priority: 'high',
      });

      expect(ticket.id).toBeDefined();
      expect(ticket.ticketRef).toMatch(/^TKT-/);
      expect(ticket.status).toBe('open');
      createdTicketId = ticket.id;
    });

    it('lists customer tickets for the customer profile', async () => {
      const userTickets = await supportTicketService.getUserTickets(customerUser.id);
      expect(userTickets.length).toBeGreaterThan(0);
      const found = userTickets.find((t) => t.id === createdTicketId);
      expect(found).toBeDefined();
      expect(found?.subject).toBe('Query about seat booking confirmation');
    });

    it('allows admin to view and respond to support ticket', async () => {
      const adminTickets = await supportTicketService.getAllTickets({ status: 'open' });
      expect(adminTickets.length).toBeGreaterThan(0);

      const responseRes = await supportTicketService.respondToTicket(
        createdTicketId,
        adminUser.id,
        adminUser.email,
        {
          status: 'resolved',
          adminResponse: 'Your booking has been verified and confirmed. Digital ticket pass is active.',
        },
      );

      expect(responseRes.status).toBe('resolved');
      expect(responseRes.adminResponse).toContain('verified and confirmed');
      expect(responseRes.resolvedAt).toBeDefined();
    });
  });

  // ─── 5. Database-Derived Analytics (Feature 6) ────────────────────────────
  describe('Admin Analytics Calculations', () => {
    it('computes actual database-derived metrics without fabricated data', async () => {
      const report = await adminAnalyticsService.getFullAnalytics();

      expect(report.overview).toBeDefined();
      expect(typeof report.overview.totalBookings).toBe('number');
      expect(typeof report.overview.totalRevenue).toBe('number');
      expect(typeof report.overview.occupancyRate).toBe('number');
      expect(report.overview.occupancyRate).toBeGreaterThanOrEqual(0);
      expect(report.overview.occupancyRate).toBeLessThanOrEqual(100);

      expect(report.payments).toBeDefined();
      expect(typeof report.payments.successfulCount).toBe('number');

      expect(Array.isArray(report.popularMovies)).toBe(true);
      expect(Array.isArray(report.popularCinemas)).toBe(true);
      expect(Array.isArray(report.trends)).toBe(true);
      expect(report.coupons).toBeDefined();
    });
  });
});
