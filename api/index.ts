import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';

let cachedApp: Express | null = null;

async function getApp(): Promise<Express> {
  if (cachedApp) return cachedApp;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let mod: { createExpressApp: () => Promise<Express> };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../dist/server');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../dist/src/server');
  }
  cachedApp = await mod.createExpressApp();
  return cachedApp!;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api] bootstrap failed:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'FUNCTION_BOOTSTRAP_FAILED',
        message,
        hint: 'Set DATABASE_URL, DIRECT_URL, JWT_SECRET, ADMIN_PASSWORD, FRONTEND_URL on Vercel.',
      });
    }
  }
}
