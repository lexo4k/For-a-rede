'use strict';
const handler = require('../../../server').handler;
module.exports = function assignmentActionRoute(req, res) {
  const id = String(req.query?.id || '');
  const action = String(req.query?.action || '');
  if (!/^[\w-]{1,100}$/.test(id) || !['accept', 'submit', 'review', 'payment'].includes(action)) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ error: 'Rota de atividade não encontrada.' }));
  }
  const incoming = new URL(req.url || '/', 'http://localhost');
  req.url = '/api/assignments/' + encodeURIComponent(id) + '/' + action + incoming.search;
  return handler(req, res);
};
