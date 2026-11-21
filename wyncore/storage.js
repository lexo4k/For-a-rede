'use strict';
const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();
let pool;
let schemaReady;

function rpcConfigured(env = process.env) {
  return Boolean(String(env.WYNCORE_SUPABASE_URL || '').trim() &&
    String(env.WYNCORE_SUPABASE_ANON_KEY || '').trim() &&
    String(env.WYNCORE_SUPABASE_RPC_SECRET || '').trim());
}

function databaseConfigured(env = process.env) {
  return Boolean(String(env.DATABASE_URL || '').trim()) || rpcConfigured(env);
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

async function supabaseRpc(name, payload) {
  const base = String(process.env.WYNCORE_SUPABASE_URL).replace(/\\/$/, '');
  const endpoint = base + '/rest/v1/rpc/' + name;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: process.env.WYNCORE_SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + process.env.WYNCORE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    const detail = data?.message || data?.hint || ('HTTP ' + response.status);
    const error = new Error('Supabase RPC ' + name + ' falhou: ' + String(detail).slice(0, 240));
    error.status = response.status;
    throw error;
  }
  return data;
}

async function withTransaction(work) {
  if (context.getStore()) return work();

  if (rpcConfigured()) {
    const result = await supabaseRpc('wyncore_state_read', {
      p_secret: process.env.WYNCORE_SUPABASE_RPC_SECRET
    });
    const initialState = result?.state ?? null;
    return context.run({
      mode: 'supabase-rpc',
      state: initialState,
      updatedAt: result?.updated_at ?? null,
      dirty: false
    }, async () => {
      const value = await work();
      const current = context.getStore();
      if (current?.dirty) {
        await supabaseRpc('wyncore_state_write', {
          p_secret: process.env.WYNCORE_SUPABASE_RPC_SECRET,
          p_expected_updated_at: current.updatedAt,
          p_state: current.state
        });
      }
      return value;
    });
  }

  if (!String(process.env.DATABASE_URL || '').trim()) return work();
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [781204219]);
    const result = await client.query('SELECT state FROM wyncore_state WHERE id = 1 FOR UPDATE');
    const initialState = result.rows[0]?.state ?? null;
    const value = await context.run({ mode: 'postgres', client, state: initialState }, work);
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
  if (current.mode === 'supabase-rpc') {
    current.dirty = true;
    return true;
  }
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

module.exports = { databaseConfigured, rpcConfigured, withTransaction, readState, writeState, payoutStorageSafe };
