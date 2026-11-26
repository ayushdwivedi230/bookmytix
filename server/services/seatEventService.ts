import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export interface SeatEventPayload {
  showId: number;
  type: 'seat_locked' | 'seat_released' | 'seat_booked';
  seatIds: number[];
  seatNumbers: string[];
  userId?: number;
  expiresAt?: string;
}

class SeatEventService {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(500);
  }

  emit(payload: SeatEventPayload) {
    logger.debug(`[SeatEventService] Broadcasting ${payload.type} for show ${payload.showId}`, {
      seatNumbers: payload.seatNumbers,
    });
    this.emitter.emit(`show:${payload.showId}`, payload);
  }

  subscribe(showId: number, callback: (payload: SeatEventPayload) => void): () => void {
    const channel = `show:${showId}`;
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }
}

export const seatEventService = new SeatEventService();
