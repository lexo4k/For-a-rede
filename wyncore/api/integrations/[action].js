'use strict';
// Explicit Vercel route for integration endpoints.
// Keep authentication/signature verification and business rules in the shared handler.
const handler = require('../../server').handler;
module.exports = function integrationsRoute(req, res) {
  const incoming = new URL(req.url || '/', 'http://localhost');
  const action = String(req.query?.action || incoming.pathname.split('/').filter(Boolean).pop() || '');
  if (!['status', 'campaigns'].includes(action)) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Integração não encontrada.' }));
  }
  req.url = '/api/integrations/' + encodeURIComponent(action) + incoming.search;
  return handler(req, res);
};
