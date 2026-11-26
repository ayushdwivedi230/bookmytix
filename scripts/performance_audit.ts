/**
 * BookMyTix Performance Measurement Benchmark
 * Measures real latency (p50, p95, p99, min, max, avg) against live HTTP endpoints.
 */

interface LatencyRecord {
  endpoint: string;
  samples: number;
  minMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  statusCode: number;
}

const BASE_URL = 'http://localhost:3000';

async function measureEndpoint(path: string, options: RequestInit = {}, iterations: number = 5): Promise<LatencyRecord> {
  const times: number[] = [];
  let lastStatus = 200;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}${path}`, options);
      const _data = await res.text();
      const elapsed = performance.now() - start;
      times.push(elapsed);
      lastStatus = res.status;
    } catch {
      times.push(performance.now() - start);
      lastStatus = 500;
    }
  }

  times.sort((a, b) => a - b);
  const min = Math.round(times[0]);
  const max = Math.round(times[times.length - 1]);
  const avg = Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
  const p50 = Math.round(times[Math.floor(times.length * 0.5)]);
  const p95 = Math.round(times[Math.floor(times.length * 0.95)]);
  const p99 = Math.round(times[Math.floor(times.length * 0.99)]);

  return {
    endpoint: path,
    samples: iterations,
    minMs: min,
    avgMs: avg,
    p50Ms: p50,
    p95Ms: p95,
    p99Ms: p99,
    maxMs: max,
    statusCode: lastStatus,
  };
}

async function runBenchmark() {
  console.log('=== BookMyTix Real-Time Performance Audit ===\n');

  const endpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/ready', method: 'GET' },
    { path: '/api/movies', method: 'GET' },
    { path: '/api/movies/1', method: 'GET' },
    { path: '/api/shows?movieId=1', method: 'GET' },
    { path: '/api/shows/204/seats', method: 'GET' },
    { path: '/api/ai/discover?q=comedy', method: 'GET' },
    {
      path: '/api/ai/assistant',
      method: 'POST',
      body: JSON.stringify({ message: 'What movies are showing?' }),
      headers: { 'Content-Type': 'application/json' },
    },
    { path: '/api/metrics', method: 'GET' },
  ];

  const results: LatencyRecord[] = [];

  for (const ep of endpoints) {
    process.stdout.write(`Benchmarking ${ep.path}... `);
    const rec = await measureEndpoint(
      ep.path,
      {
        method: ep.method,
        body: ep.body,
        headers: ep.headers,
      },
      5,
    );
    results.push(rec);
    console.log(`HTTP ${rec.statusCode} | p50: ${rec.p50Ms}ms | p95: ${rec.p95Ms}ms | avg: ${rec.avgMs}ms`);
  }

  console.log('\n=== Summary Table ===');
  console.table(
    results.map((r) => ({
      Endpoint: r.endpoint,
      HTTP: r.statusCode,
      'Min (ms)': r.minMs,
      'Avg (ms)': r.avgMs,
      'p50 (ms)': r.p50Ms,
      'p95 (ms)': r.p95Ms,
      'Max (ms)': r.maxMs,
    })),
  );
}

runBenchmark().catch(console.error);
