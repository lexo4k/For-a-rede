'use strict';
// Pin this serverless function to the canonical API path. Vercel's filesystem routing
// can pass a rewritten URL to nested function handlers; normalize it before dispatch.
const handler = require('../../server').handler;
module.exports = function approveParticipantRoute(req, res) {
  const incoming = new URL(req.url || '/', 'http://localhost');
  req.url = '/api/participants/approve' + incoming.search;
  return handler(req, res);
};
