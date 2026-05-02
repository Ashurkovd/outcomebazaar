/**
 * Run database migrations.
 *
 * Applies schema.sql (legacy base schema), then every *.sql file in migrations/
 * in lexicographic order. Tracks applied migrations in schema_migrations so reruns
 * are idempotent.
 *
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
    console.log('Running database migrations...');

    // 1. Base schema (idempotent thanks to IF NOT EXISTS everywhere)
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('  ✓ schema.sql applied');

    // 2. Tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 3. Versioned migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      const applied = new Set(
        (await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(r => r.name)
      );

      for (const file of files) {
        if (applied.has(file)) {
          console.log(`  · ${file} (already applied)`);
          continue;
        }

        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`  ✓ ${file} applied`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    }

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
