'use strict';
// Explicitly route program assignment requests to the shared API handler.
// Dynamic Vercel routes may rewrite req.url, so rebuild the canonical path
// from the route parameters before dispatching.
const handler = require('../../../server').handler;
module.exports = function assignProgramRoute(req, res) {
  const id = String(req.query?.id || '');
  if (!/^[\w-]{1,100}$/.test(id)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ error: 'Identificador de programa inválido.' }));
  }
  const incoming = new URL(req.url || '/', 'http://localhost');
  req.url = '/api/programs/' + encodeURIComponent(id) + '/assign' + incoming.search;
  return handler(req, res);
};
