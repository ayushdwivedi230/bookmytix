import { EventEmitter } from 'events';
import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export interface BookingEventPayload {
  bookingId: number;
  userId: number;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded';
  bookingRef: string;
  totalPrice: number;
  updatedAt: string;
  message?: string;
}

class RealtimeNotificationService {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(1000);
  }

  notifyBookingUpdate(payload: BookingEventPayload): void {
    logger.info(`[Realtime] Emitting booking update: #${payload.bookingId} (${payload.status})`);
    this.emitter.emit(`booking:${payload.bookingId}`, payload);
    this.emitter.emit(`user:${payload.userId}`, payload);
  }

  subscribeBooking(bookingId: number, callback: (event: BookingEventPayload) => void): () => void {
    const channel = `booking:${bookingId}`;
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }

  subscribeUser(userId: number, callback: (event: BookingEventPayload) => void): () => void {
    const channel = `user:${userId}`;
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }

  /**
   * Express Server-Sent Events (SSE) handler with automated 15-second heartbeats.
   */
  handleSseStream(req: Request, res: Response, userId: number): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected', userId, timestamp: new Date().toISOString() })}\n\n`);

    const unsubscribe = this.subscribeUser(userId, (event) => {
      res.write(`data: ${JSON.stringify({ type: 'booking_update', payload: event })}\n\n`);
    });

    const heartbeat = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }
}

export const realtimeNotificationService = new RealtimeNotificationService();
