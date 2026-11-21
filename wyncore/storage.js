'use strict';
const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();
let pool;
let schemaReady;

function databaseConfigured(env = process.env) {
  return Boolean(String(env.DATABASE_URL || '').trim());
}

function getPool() {
  if (!pool) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Math.max(1, Math.min(10, Number(process.env.DATABASE_POOL_MAX) || 5)),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...(process.env.DATABASE_SSL === 'require' ? { ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } } : {})
    });
    pool.on('error', error => process.stderr.write('WYNCORE Postgres pool error: ' + String(error.message || error) + '\n'));
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS wyncore_state (
        id SMALLINT PRIMARY KEY CHECK (id = 1),
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch(error => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

async function withTransaction(work) {
  if (!databaseConfigured()) return work();
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [781204219]);
    const result = await client.query('SELECT state FROM wyncore_state WHERE id = 1 FOR UPDATE');
    const initialState = result.rows[0]?.state ?? null;
    const value = await context.run({ client, state: initialState }, work);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

function readState() {
  const current = context.getStore();
  if (!current) return { active: false, state: null };
  return { active: true, state: current.state == null ? null : structuredClone(current.state) };
}

async function writeState(state) {
  const current = context.getStore();
  if (!current) return false;
  current.state = structuredClone(state);
  await current.client.query(
    'INSERT INTO wyncore_state (id, state, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()',
    [JSON.stringify(state)]
  );
  return true;
}

function payoutStorageSafe(env = process.env, defaultDataDir = null) {
  if (databaseConfigured(env)) return true;
  const configuredDir = String(env.DATA_DIR || '').trim();
  const defaultDir = defaultDataDir || '';
  return env.WYNCORE_PAYOUT_STORAGE_MODE === 'single_writer' &&
    !env.VERCEL &&
    !env.BLOB_READ_WRITE_TOKEN &&
    Boolean(configuredDir) &&
    require('node:path').isAbsolute(configuredDir) &&
    (!defaultDir || require('node:path').resolve(configuredDir) !== require('node:path').resolve(defaultDir));
}

module.exports = { databaseConfigured, withTransaction, readState, writeState, payoutStorageSafe };
