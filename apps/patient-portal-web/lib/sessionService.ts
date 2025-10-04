import { db } from './db';
import { patientSessions } from './schema';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from './redis';

export interface DeviceInfo {
  userAgent: string;
  browser?: string;
  os?: string;
  device?: string;
}

export interface SessionData {
  id: number;
  sessionToken: string;
  patientId: string;
  deviceFingerprint?: string | null;
  deviceInfo: DeviceInfo;
  ipAddress: string | null;
  createdAt: Date | null;
  expiresAt: Date;
  lastActivityAt: Date | null;
  isActive: boolean | null;
  sessionType: 'otp' | 'authenticated';
}

export class SessionService {
  private redis = getRedisClient();

  async createOtpSession(
    phone: string,
    ipAddress: string,
    deviceInfo: DeviceInfo,
    deviceFingerprint?: string
  ): Promise<string> {
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    try {
      const sessionData = {
        sessionToken,
        phone,
        sessionType: 'otp',
        ipAddress,
        deviceInfo,
        deviceFingerprint,
        createdAt: new Date(),
        expiresAt,
        lastActivityAt: new Date(),
        isActive: true,
      };

      await this.redis.setex(
        `session:otp:${sessionToken}`,
        30 * 60,
        JSON.stringify(sessionData)
      );

      return sessionToken;
    } catch (error) {
      console.error('Create OTP session error:', error);
      throw new Error('Failed to create OTP session');
    }
  }

  async createAuthenticatedSession(
    patientId: string,
    ipAddress: string,
    deviceInfo: DeviceInfo,
    deviceFingerprint?: string
  ): Promise<SessionData> {
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      const [session] = await db
        .insert(patientSessions)
        .values({
          patientId,
          sessionToken,
          deviceFingerprint,
          deviceInfo: deviceInfo as any,
          ipAddress,
          expiresAt,
          lastActivityAt: new Date(),
          isActive: true,
        })
        .returning();

      const normalizedSession: SessionData = {
        ...session,
        deviceInfo: session.deviceInfo as DeviceInfo,
        sessionType: 'authenticated',
      };

      await this.redis.setex(
        `session:auth:${sessionToken}`,
        7 * 24 * 60 * 60,
        JSON.stringify(normalizedSession)
      );

      return normalizedSession;
    } catch (error) {
      console.error('Create authenticated session error:', error);
      throw new Error('Failed to create authenticated session');
    }
  }

  async getSession(
    sessionToken: string,
    type: 'otp' | 'authenticated'
  ): Promise<SessionData | null> {
    try {
      const cached = await this.redis.get(`session:${type}:${sessionToken}`);
      
      if (cached) {
        const session = JSON.parse(cached);
        
        if (new Date(session.expiresAt) < new Date()) {
          await this.invalidateSession(sessionToken, type);
          return null;
        }
        
        if (type === 'authenticated') {
          const [dbSession] = await db
            .select({ isActive: patientSessions.isActive })
            .from(patientSessions)
            .where(eq(patientSessions.sessionToken, sessionToken))
            .limit(1);
          
          if (!dbSession || !dbSession.isActive) {
            await this.redis.del(`session:auth:${sessionToken}`);
            return null;
          }
        }
        
        return session;
      }

      if (type === 'authenticated') {
        const [session] = await db
          .select()
          .from(patientSessions)
          .where(
            and(
              eq(patientSessions.sessionToken, sessionToken),
              eq(patientSessions.isActive, true),
              gt(patientSessions.expiresAt, new Date())
            )
          )
          .limit(1);

        if (session) {
          const normalizedSession: SessionData = {
            ...session,
            deviceInfo: session.deviceInfo as DeviceInfo,
            sessionType: 'authenticated',
          };

          await this.redis.setex(
            `session:auth:${sessionToken}`,
            7 * 24 * 60 * 60,
            JSON.stringify(normalizedSession)
          );
          
          return normalizedSession;
        }
      }

      return null;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  async updateSessionActivity(
    sessionToken: string,
    type: 'otp' | 'authenticated'
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionToken, type);
      
      if (!session) return;

      const updatedSession = {
        ...session,
        lastActivityAt: new Date(),
      };

      await this.redis.setex(
        `session:${type}:${sessionToken}`,
        type === 'otp' ? 30 * 60 : 7 * 24 * 60 * 60,
        JSON.stringify(updatedSession)
      );

      if (type === 'authenticated') {
        await db
          .update(patientSessions)
          .set({ lastActivityAt: new Date() })
          .where(eq(patientSessions.sessionToken, sessionToken));
      }
    } catch (error) {
      console.error('Update session activity error:', error);
    }
  }

  async invalidateSession(
    sessionToken: string,
    type: 'otp' | 'authenticated'
  ): Promise<void> {
    try {
      await this.redis.del(`session:${type}:${sessionToken}`);

      if (type === 'authenticated') {
        await db
          .update(patientSessions)
          .set({ isActive: false })
          .where(eq(patientSessions.sessionToken, sessionToken));
      }
    } catch (error) {
      console.error('Invalidate session error:', error);
    }
  }

  async invalidateAllPatientSessions(patientId: string): Promise<void> {
    try {
      const invalidatedSessions = await db
        .update(patientSessions)
        .set({ isActive: false })
        .where(
          and(
            eq(patientSessions.patientId, patientId),
            eq(patientSessions.isActive, true)
          )
        )
        .returning({ sessionToken: patientSessions.sessionToken });
      
      for (const session of invalidatedSessions) {
        try {
          await this.redis.del(`session:auth:${session.sessionToken}`);
        } catch (redisError) {
          console.error(`Failed to delete Redis session ${session.sessionToken}:`, redisError);
        }
      }
    } catch (error) {
      console.error('Invalidate all patient sessions error:', error);
      throw error;
    }
  }

  async getActiveSessionsForPatient(patientId: string): Promise<SessionData[]> {
    try {
      const sessions = await db
        .select()
        .from(patientSessions)
        .where(
          and(
            eq(patientSessions.patientId, patientId),
            eq(patientSessions.isActive, true),
            gt(patientSessions.expiresAt, new Date())
          )
        );

      return sessions.map(s => ({
        ...s,
        deviceInfo: s.deviceInfo as DeviceInfo,
        sessionType: 'authenticated' as const,
      }));
    } catch (error) {
      console.error('Get active sessions error:', error);
      return [];
    }
  }
}

export const sessionService = new SessionService();
