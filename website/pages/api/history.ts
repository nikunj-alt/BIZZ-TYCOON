import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { existsSync } from 'node:fs';
import type { NextApiRequest, NextApiResponse } from 'next';

// DB lives one level up from the website package.
const DB_PATH = path.join(process.cwd(), '..', 'database', 'history.db');

interface ReadingRow {
  ppm: number;
  flame: number;
  ldr: number;
  motion: number;
  touch: number;
  battery: number;
  status: string;
  armed: number;
  silenced: number;
  servo: number;
  timestamp: string;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // The SQLite history file lives on the dev machine; on serverless
  // deploys (e.g. Vercel) it is not packaged. Degrade gracefully instead
  // of returning a 500 for every request.
  if (!existsSync(DB_PATH)) {
    return res.status(200).json({ readings: [] });
  }

  // `DatabaseSync` holds a handle on the DB file; make sure it is always
  // released, including when the query itself throws.
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    const rawLimit = Number(req.query.limit ?? 100);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 100, 1), 500);

    const stmt = db.prepare(
      `SELECT ppm, flame, ldr, motion, touch, battery, status, armed, silenced, servo, timestamp
       FROM readings ORDER BY id DESC LIMIT ?`
    );
    const rows = stmt.all(limit) as unknown as ReadingRow[];

    // Newest-first from the query; we want chronological ascending.
    const readings = rows.reverse().map((r) => ({
      ppm: r.ppm,
      flame: r.flame,
      ldr: r.ldr,
      motion: r.motion,
      touch: r.touch,
      battery: r.battery,
      status: r.status,
      armed: Boolean(r.armed),
      silenced: Boolean(r.silenced),
      servo: r.servo,
      timestamp: r.timestamp,
    }));

    return res.status(200).json({ readings });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to read history:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Failed to read history data' });
  } finally {
    db.close();
  }
}
