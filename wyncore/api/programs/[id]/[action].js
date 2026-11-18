'use strict';
const handler = require('../../../server').handler;
module.exports = function programActionRoute(req, res) {
  const id = String(req.query?.id || '');
  const action = String(req.query?.action || '');
  if (!/^[\w-]{1,100}$/.test(id) || !['funding', 'request'].includes(action)) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ error: 'Rota de programa não encontrada.' }));
  }
  const incoming = new URL(req.url || '/', 'http://localhost');
  req.url = '/api/programs/' + encodeURIComponent(id) + '/' + action + incoming.search;
  return handler(req, res);
};
