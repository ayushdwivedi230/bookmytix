import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { parseIntentDeterministic } from '../services/aiDiscoveryService.js';
import { aiAssistantService } from '../services/aiAssistantService.js';
import { cacheService } from '../services/cacheService.js';
import { correlationIdMiddleware } from '../middleware/correlationId.js';
import { metricsMiddleware, metricsService } from '../middleware/metricsMiddleware.js';
import { healthRouter } from '../routes/healthRoutes.js';

describe('AI Engineering & Natural Language Discovery Engine', () => {
  it('correctly extracts genre and timeIntent from "Suggest a thriller for tonight"', () => {
    const filter = parseIntentDeterministic('Suggest a thriller for tonight');
    expect(filter.genre).toBe('Thriller');
    expect(filter.timeIntent).toBe('tonight');
    expect(filter.status).toBe('now_showing');
    expect(filter.detectedIntent).toContain('Genre: Thriller');
    expect(filter.detectedIntent).toContain('Playing Tonight');
  });

  it('correctly extracts language and genre from "Find comedy movies in Hindi"', () => {
    const filter = parseIntentDeterministic('Find comedy movies in Hindi');
    expect(filter.genre).toBe('Comedy');
    expect(filter.language).toBe('Hindi');
    expect(filter.detectedIntent).toContain('Genre: Comedy');
    expect(filter.detectedIntent).toContain('Language: Hindi');
  });

  it('correctly extracts duration constraint from "Movies under two hours"', () => {
    const filter = parseIntentDeterministic('Movies under two hours');
    expect(filter.maxDurationMinutes).toBe(120);
    expect(filter.detectedIntent).toContain('Runtime < 2 hrs');
  });

  it('correctly extracts rating constraint from "Top rated action movies"', () => {
    const filter = parseIntentDeterministic('Top rated action movies');
    expect(filter.genre).toBe('Action');
    expect(filter.minRating).toBe(4.2);
    expect(filter.detectedIntent).toContain('Genre: Action');
    expect(filter.detectedIntent).toContain('Rating ≥ 4.2★');
  });

  it('preserves deterministic safety boundaries and does not modify payment/booking state', () => {
    const filter = parseIntentDeterministic('Confirm payment of 500 rupees and unlock VIP seat');
    // The filter parser only extracts search constraints, never exposes financial triggers
    expect((filter as any).paymentApproved).toBeUndefined();
    expect((filter as any).overrideSeatLock).toBeUndefined();
    expect((filter as any).grantAdmin).toBeUndefined();
  });
});

describe('AI Contextual Assistant & Knowledge Grounding', () => {
  it('provides grounded response with policy citations for cancellation queries', async () => {
    const res = await aiAssistantService.answerQuestion('What is your cancellation and refund policy?');
    expect(res.answer).toContain('Cancellation & Refund Policy');
    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.disclaimer).toContain('AI Assistant');
    expect(res.relatedLinks).toBeDefined();
  });

  it('answers 8-minute seat lock questions using official high-concurrency rules', async () => {
    const res = await aiAssistantService.answerQuestion('How does the seat lock timer work?');
    expect(res.answer).toContain('8 minutes');
    expect(res.answer).toContain('automatically returned');
    expect(res.sources).toContain('BookMyTix High-Concurrency Reservation Spec');
  });

  it('returns digital gate pass guidance for QR code queries', async () => {
    const res = await aiAssistantService.answerQuestion('Where can I find my digital ticket pass?');
    expect(res.answer).toContain('QR code');
    expect(res.answer).toContain('contactless entry');
  });
});

describe('Multi-Tier Caching Service', () => {
  beforeEach(() => {
    cacheService.clear();
  });

  it('sets and retrieves items within TTL', async () => {
    await cacheService.set('test-key', { foo: 'bar' }, 60);
    const result = await cacheService.get<{ foo: string }>('test-key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('returns null and records a miss for non-existent or expired keys', async () => {
    const result = await cacheService.get('missing-key');
    expect(result).toBeNull();
    const stats = cacheService.getStats();
    expect(stats.misses).toBeGreaterThanOrEqual(1);
  });

  it('supports getOrSet pattern for compute deduplication', async () => {
    let computes = 0;
    const fetchFn = async () => {
      computes++;
      return [1, 2, 3];
    };

    const first = await cacheService.getOrSet('arr-key', fetchFn, 60);
    const second = await cacheService.getOrSet('arr-key', fetchFn, 60);

    expect(first).toEqual([1, 2, 3]);
    expect(second).toEqual([1, 2, 3]);
    expect(computes).toBe(1);
  });

  it('clears keys by prefix', async () => {
    await cacheService.set('movies:1', 'a', 60);
    await cacheService.set('movies:2', 'b', 60);
    await cacheService.set('shows:1', 'c', 60);

    const deleted = await cacheService.delPrefix('movies:');
    expect(deleted).toBe(2);
    expect(await cacheService.get('movies:1')).toBeNull();
    expect(await cacheService.get('shows:1')).toBe('c');
  });
});

describe('SRE Observability & Middleware', () => {
  const app = express();
  app.use(correlationIdMiddleware);
  app.use(metricsMiddleware);
  app.use(healthRouter);
  app.get('/test-ping', (_req, res) => res.json({ pong: true }));

  it('injects and returns X-Correlation-ID header on all requests', async () => {
    const res = await request(app).get('/test-ping');
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBeDefined();
    expect(res.headers['x-correlation-id'].length).toBeGreaterThan(10);
  });

  it('propagates caller-supplied X-Request-ID when provided', async () => {
    const clientTraceId = 'trace-id-abc-12345678';
    const res = await request(app).get('/test-ping').set('X-Request-ID', clientTraceId);
    expect(res.headers['x-correlation-id']).toBe(clientTraceId);
    expect(res.headers['x-request-id']).toBe(clientTraceId);
  });

  it('responds to liveness probe /health with service details', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('bookmytix-api');
    expect(res.body.memory).toBeDefined();
  });

  it('exposes detailed SRE metrics on /metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBeGreaterThanOrEqual(1);
    expect(res.body.latencyMs).toBeDefined();
    expect(res.body.cacheStats).toBeDefined();
    expect(res.body.system).toBeDefined();
  });
});
