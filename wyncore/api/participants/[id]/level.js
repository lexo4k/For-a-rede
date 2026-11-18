'use strict';
// Normalize this nested serverless route before dispatching to the shared handler.
const handler = require('../../../server').handler;
module.exports = function participantLevelRoute(req, res) {
  const incoming = new URL(req.url || '/', 'http://localhost');
  const id = String(req.query?.id || incoming.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || '');
  req.url = '/api/participants/' + encodeURIComponent(id) + '/level' + incoming.search;
  return handler(req, res);
};
