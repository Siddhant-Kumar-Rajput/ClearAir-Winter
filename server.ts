import 'dotenv/config';
import dns from 'dns';
import net from 'net';
import express, { type NextFunction, type Request, type Response } from 'express';

dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily(false);
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchLiveAirQuality,
  searchCities,
} from './server/airQualityService.ts';
import {
  askSmogAdvisor,
  generateTailoredSmogPlan,
} from './server/geminiService.ts';
import {
  advisorChatRequestSchema,
  citySearchQuerySchema,
  generatePlanRequestSchema,
  liveAirQualityQuerySchema,
} from './server/validation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Lightweight sliding-window rate limiter for AI endpoints
const aiRateBuckets = new Map<string, number[]>();
const AI_WINDOW_MS = 60_000;
const AI_MAX_REQUESTS_PER_MIN = 30;

function checkAiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const timestamps = (aiRateBuckets.get(clientIp) ?? []).filter(
    (t) => now - t < AI_WINDOW_MS,
  );
  if (timestamps.length >= AI_MAX_REQUESTS_PER_MIN) {
    res.status(429).json({
      error: 'Too many assistant requests. Please wait a moment and try again.',
    });
    return;
  }
  timestamps.push(now);
  aiRateBuckets.set(clientIp, timestamps);
  if (aiRateBuckets.size > 500) {
    const oldestKey = aiRateBuckets.keys().next().value;
    if (oldestKey) aiRateBuckets.delete(oldestKey);
  }
  next();
}

async function startServer(): Promise<void> {
  const app = express();

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'clearair-winter' });
  });

  app.get('/api/air-quality/search', async (req, res) => {
    const parsed = citySearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid search query.',
      });
      return;
    }
    try {
      const cities = await searchCities(parsed.data.q);
      res.json({ results: cities });
    } catch (error) {
      res.status(502).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to search cities right now.',
      });
    }
  });

  app.get('/api/air-quality/live', async (req, res) => {
    const parsed = liveAirQualityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid coordinates.',
      });
      return;
    }
    try {
      const snapshot = await fetchLiveAirQuality(
        parsed.data.lat,
        parsed.data.lon,
        parsed.data.city,
        parsed.data.country,
      );
      res.json({ snapshot });
    } catch (error) {
      res.status(502).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to fetch live air quality data.',
      });
    }
  });

  app.post('/api/assistant/plan', checkAiRateLimit, async (req, res) => {
    const parsed = generatePlanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid plan request payload.',
      });
      return;
    }
    try {
      const plan = await generateTailoredSmogPlan(
        parsed.data.snapshot,
        parsed.data.profile,
      );
      res.json({ plan });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate smog plan.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 502;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/assistant/chat', checkAiRateLimit, async (req, res) => {
    const parsed = advisorChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid advisor question.',
      });
      return;
    }
    try {
      const reply = await askSmogAdvisor(
        parsed.data.snapshot,
        parsed.data.profile,
        parsed.data.history,
        parsed.data.question,
      );
      res.json({ reply });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Advisor request failed.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 502;
      res.status(status).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClearAir Winter server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
