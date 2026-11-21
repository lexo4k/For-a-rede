'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { reserveWithdrawal, attachTransfer, applyTransferEvent } = require('./payouts');

function state() {
  return {
    adCampaigns: [
      { id: 'c1', contractStatus: 'received' },
      { id: 'c2', contractStatus: 'pending' }
    ],
    adEarnings: [
      { id: 'e1', participantId: 'p1', campaignId: 'c1', amount: 8, status: 'approved_unpaid' },
      { id: 'e2', participantId: 'p1', campaignId: 'c2', amount: 20, status: 'approved_unpaid' },
      { id: 'e3', participantId: 'p2', campaignId: 'c1', amount: 30, status: 'approved_unpaid' }
    ]
  };
}

test('reserva apenas saldo de campanhas efetivamente recebidas', () => {
  const s = state();
  const payout = reserveWithdrawal(s, { participantId: 'p1', amountCents: 500, withdrawalId: 'w1', now: '2026-11-21T12:00:00.000Z' });
  assert.equal(payout.status, 'payout_requested');
  assert.equal(payout.amount, 5);
  assert.equal(s.adEarnings.find(x => x.id === 'e1').amount, 3);
  assert.equal(s.adEarnings.find(x => x.id === 'e2').amount, 20);
  assert.equal(s.adEarnings.find(x => x.id === 'e3').amount, 30);
});

test('recusa saque acima do saldo elegível sem alterar a carteira', () => {
  const s = state();
  assert.throws(() => reserveWithdrawal(s, { participantId: 'p1', amountCents: 900, withdrawalId: 'w2', now: 'now' }), { status: 409 });
  assert.equal(s.adEarnings.find(x => x.id === 'e1').amount, 8);
  assert.equal(s.adEarnings.length, 3);
});

test('reserva primeiro, associa transferência depois e concilia webhook', () => {
  const s = state();
  const payout = reserveWithdrawal(s, { participantId: 'p1', amountCents: 300, withdrawalId: 'w3', now: 'now' });
  assert.equal(payout.status, 'payout_requested');
  attachTransfer(payout, { id: 'tr_123' }, 'later');
  assert.equal(payout.status, 'payout_pending');
  assert.equal(applyTransferEvent(s, { id: 'tr_123', externalReference: 'wyncore-earning:w3' }, 'TRANSFER_DONE', 'done').status, 'paid');
});

test('webhook pode chegar antes de salvar o ID retornado pela API', () => {
  const s = state();
  const payout = reserveWithdrawal(s, { participantId: 'p1', amountCents: 300, withdrawalId: 'w4', now: 'now' });
  assert.equal(applyTransferEvent(s, { id: 'tr_456', externalReference: 'wyncore-earning:w4' }, 'TRANSFER_DONE', 'done').status, 'paid');
  assert.equal(payout.asaasTransferId, 'tr_456');
});

test('falha do Asaas devolve a quantia à carteira como aprovada e não paga', () => {
  const s = state();
  const payout = reserveWithdrawal(s, { participantId: 'p1', amountCents: 300, withdrawalId: 'w5', now: 'now' });
  const failed = applyTransferEvent(s, { id: 'tr_789', externalReference: 'wyncore-earning:w5', failReason: 'Conta inválida' }, 'TRANSFER_FAILED', 'failed');
  assert.equal(failed.status, 'approved_unpaid');
  assert.equal(failed.amount, 3);
  assert.equal(failed.payoutError, 'Conta inválida');
});

test('resposta tardia da API não rebaixa webhook de sucesso recebido primeiro', () => {
  const s = state();
  const payout = reserveWithdrawal(s, { participantId: 'p1', amountCents: 300, withdrawalId: 'w6', now: 'now' });
  applyTransferEvent(s, { id: 'tr_600', externalReference: 'wyncore-earning:w6' }, 'TRANSFER_DONE', 'done-first');
  attachTransfer(payout, { id: 'tr_600' }, 'api-later');
  assert.equal(payout.status, 'paid');
  assert.equal(payout.paidAt, 'done-first');
});

test('resposta tardia da API preserva falha já confirmada pelo webhook', () => {
  const s = state();
  const payout = reserveWithdrawal(s, { participantId: 'p1', amountCents: 300, withdrawalId: 'w7', now: 'now' });
  applyTransferEvent(s, { id: 'tr_700', externalReference: 'wyncore-earning:w7', failReason: 'Chave inválida' }, 'TRANSFER_FAILED', 'failed-first');
  attachTransfer(payout, { id: 'tr_700' }, 'api-later');
  assert.equal(payout.status, 'approved_unpaid');
  assert.equal(payout.payoutError, 'Chave inválida');
});

test('não permite vincular uma segunda transferência à mesma reserva', () => {
  const s = state();
  const payout = reserveWithdrawal(s, { participantId: 'p1', amountCents: 300, withdrawalId: 'w8', now: 'now' });
  attachTransfer(payout, { id: 'tr_800' }, 'first');
  assert.throws(() => attachTransfer(payout, { id: 'tr_801' }, 'second'), /outra transferência/);
});

test('permite sacar recompensa Adscend somente após postback confirmado em BRL', () => {
  const s = { adCampaigns: [], adEarnings: [
    { id: 'a1', participantId: 'p1', provider: 'adscend', providerConfirmed: true, amount: 4.25, status: 'approved_unpaid' },
    { id: 'a2', participantId: 'p1', provider: 'adscend', providerConfirmed: false, amount: 9, status: 'approved_unpaid' }
  ] };
  const payout = reserveWithdrawal(s, { participantId: 'p1', amountCents: 425, withdrawalId: 'wa1', now: 'now' });
  assert.equal(payout.amount, 4.25);
  assert.equal(s.adEarnings.find(x => x.id === 'a1').status, 'allocated');
  assert.equal(s.adEarnings.find(x => x.id === 'a2').status, 'approved_unpaid');
});
