'use strict';
const handler = require('../../../server').handler;
module.exports = function companyLeadRoute(req, res) {
  const id = String(req.query?.id || '');
  if (!/^[\w-]{1,100}$/.test(id)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ error: 'Identificador de empresa inválido.' }));
  }
  const incoming = new URL(req.url || '/', 'http://localhost');
  req.url = '/api/company/leads/' + encodeURIComponent(id) + incoming.search;
  return handler(req, res);
};
