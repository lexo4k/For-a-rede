'use strict';
const crypto = require('node:crypto');

const API_KEY = process.env.ASAAS_API_KEY || '';
const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';
const BASE_URL = process.env.ASAAS_BASE_URL || (process.env.ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3');

function configured() { return API_KEY.length > 20; }
function webhookConfigured() { return WEBHOOK_TOKEN.length >= 32 && WEBHOOK_TOKEN.length <= 255 && !/\\s/.test(WEBHOOK_TOKEN); }
function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
function verifyWebhook(token) { return webhookConfigured() && safeEqual(token, WEBHOOK_TOKEN); }

async function request(path, method = 'GET', data) {
  if (!configured()) throw Object.assign(new Error('Integração Asaas não configurada. Defina ASAAS_API_KEY no ambiente do servidor.'), { status: 503 });
  const response = await fetch(BASE_URL + path, {
    method,
    headers: { access_token: API_KEY, accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'WYNCORE/1.0' },
    ...(data ? { body: JSON.stringify(data) } : {})
  });
  let result = {};
  try { result = await response.json(); } catch {}
  if (!response.ok) {
    const message = Array.isArray(result.errors) ? result.errors.map(x => x.description || x.code).join('; ') : 'Falha na API Asaas (' + response.status + ').';
    throw Object.assign(new Error(message), { status: response.status >= 500 ? 502 : 400 });
  }
  return result;
}

async function createWebhook({ url, email }) {
  if (!webhookConfigured()) throw Object.assign(new Error('Configure ASAAS_WEBHOOK_TOKEN com 32 a 255 caracteres, sem espaços.'), { status: 503 });
  return request('/webhooks', 'POST', {
    name: 'WYNCORE - cobranças e repasses',
    url,
    email,
    enabled: true,
    interrupted: false,
    apiVersion: 3,
    authToken: WEBHOOK_TOKEN,
    sendType: 'SEQUENTIALLY',
    events: ['PAYMENT_RECEIVED', 'TRANSFER_DONE', 'TRANSFER_FAILED', 'TRANSFER_CANCELLED']
  });
}
async function createCustomer({ name, cpfCnpj, email, mobilePhone, externalReference }) {
  return request('/customers', 'POST', {
    name: String(name || '').slice(0, 100),
    cpfCnpj: String(cpfCnpj || '').replace(/\\D/g, ''),
    ...(email ? { email } : {}),
    ...(mobilePhone ? { mobilePhone: String(mobilePhone).replace(/\\D/g, '') } : {}),
    externalReference,
    notificationDisabled: false
  });
}
async function createPixCharge({ customer, value, description, externalReference }) {
  const dueDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return request('/payments', 'POST', { customer, billingType: 'PIX', value: Number(value), dueDate, description: String(description || 'Campanha WYNCORE').slice(0, 200), externalReference });
}
async function getPixQrCode(paymentId) {
  return request('/payments/' + encodeURIComponent(paymentId) + '/pixQrCode');
}
async function transferPix({ value, pixAddressKey, pixAddressKeyType, description, externalReference }) {
  return request('/transfers', 'POST', {
    value: Number(value),
    operationType: 'PIX',
    pixAddressKey: String(pixAddressKey),
    pixAddressKeyType: String(pixAddressKeyType),
    description: String(description || 'Recompensa WYNCORE').slice(0, 100),
    externalReference
  });
}
module.exports = { configured, webhookConfigured, verifyWebhook, createCustomer, createPixCharge, getPixQrCode, transferPix, createWebhook };
