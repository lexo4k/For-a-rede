'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { databaseConfigured, payoutStorageSafe } = require('./storage');

const defaultDir = path.join(__dirname, 'data');

test('Postgres is accepted as transaction-safe wallet storage', () => {
  assert.equal(databaseConfigured({ DATABASE_URL: 'postgres://user:pass@db.example/db' }), true);
  assert.equal(payoutStorageSafe({ DATABASE_URL: 'postgres://user:pass@db.example/db' }, defaultDir), true);
});

test('single-writer JSON requires an explicit non-default absolute persistent data directory', () => {
  assert.equal(payoutStorageSafe({ WYNCORE_PAYOUT_STORAGE_MODE: 'single_writer', DATA_DIR: '/var/data/wyncore' }, defaultDir), true);
  assert.equal(payoutStorageSafe({ WYNCORE_PAYOUT_STORAGE_MODE: 'single_writer' , DATA_DIR: defaultDir }, defaultDir), false);
  assert.equal(payoutStorageSafe({ WYNCORE_PAYOUT_STORAGE_MODE: 'single_writer', DATA_DIR: 'data' }, defaultDir), false);
});

test('serverless and Blob storage never qualify for direct Pix payouts', () => {
  assert.equal(payoutStorageSafe({ WYNCORE_PAYOUT_STORAGE_MODE: 'single_writer', DATA_DIR: '/var/data/wyncore', VERCEL: '1' }, defaultDir), false);
  assert.equal(payoutStorageSafe({ WYNCORE_PAYOUT_STORAGE_MODE: 'single_writer', DATA_DIR: '/var/data/wyncore', BLOB_READ_WRITE_TOKEN: 'configured' }, defaultDir), false);
});
