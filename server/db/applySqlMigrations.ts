import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  logger.info('Starting SQL migrations application...');
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = [
    '0000_curly_mockingbird.sql',
    '0001_ordinary_archangel.sql',
    '0002_silky_gargoyle.sql',
    '0003_young_sleepwalker.sql',
    '0004_fintech_checkout_lifecycle.sql',
  ];

  const client = await pool.connect();
  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        logger.warn(`Migration file not found: ${file}`);
        continue;
      }

      logger.info(`Processing migration: ${file}`);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await client.query(stmt);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          // If already exists or duplicate object, safely ignore
          if (
            errMsg.includes('already exists') ||
            errMsg.includes('duplicate key value') ||
            errMsg.includes('multiple primary keys')
          ) {
            // expected when idempotently migrating
          } else {
            logger.warn(`Warning on statement [${file} #${i + 1}]: ${errMsg}`);
          }
        }
      }
      logger.info(`Completed migration: ${file}`);
    }
    logger.info('All SQL migrations processed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  logger.error('Failed to apply SQL migrations', err);
  process.exit(1);
});
