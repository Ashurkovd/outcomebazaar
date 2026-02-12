/**
 * Run database migrations.
 * Usage: npm run migrate
 */
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrate(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('railway') || connectionString.includes('render')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running database migrations...');
    await pool.query(sql);
    console.log('✅ Migrations complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
