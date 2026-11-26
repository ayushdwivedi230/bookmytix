import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';
import { logger } from '../utils/logger.js';

async function run() {
  logger.info('Applying database migrations...');
  try {
    await migrate(db, { migrationsFolder: './server/db/migrations' });
    logger.info('Migrations applied successfully!');
  } catch (err) {
    logger.error('Failed to apply migrations', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
