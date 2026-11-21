'use strict';

function cents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Valor monetário inválido.');
  return Math.round(n * 100);
}

function reserveWithdrawal(state, { participantId, amountCents, withdrawalId, now }) {
  if (!Number.isInteger(amountCents) || amountCents < 100) throw new Error('Saque mínimo de R$ 1,00.');
  state.adEarnings ||= [];
  const campaigns = new Map((state.adCampaigns || []).map(c => [c.id, c]));
  const eligible = state.adEarnings.filter(e =>
    e.participantId === participantId &&
    e.status === 'approved_unpaid' &&
    campaigns.get(e.campaignId)?.contractStatus === 'received'
  );
  const available = eligible.reduce((sum, e) => sum + cents(e.amount || 0), 0);
  if (amountCents > available) {
    const error = new Error('O valor solicitado ultrapassa seu saldo disponível para saque.');
    error.status = 409;
    throw error;
  }

  let remaining = amountCents;
  const allocations = [];
  for (const source of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(cents(source.amount || 0), remaining);
    if (take > 0) {
      allocations.push({ source, take });
      remaining -= take;
    }
  }
  if (remaining !== 0) {
    const error = new Error('Não foi possível reservar o saldo solicitado. Atualize a carteira e tente novamente.');
    error.status = 409;
    throw error;
  }

  for (const allocation of allocations) {
    const left = cents(allocation.source.amount || 0) - allocation.take;
    allocation.source.amount = left / 100;
    if (left === 0) allocation.source.status = 'allocated';
    allocation.source.updatedAt = now;
  }

  const earning = {
    id: withdrawalId,
    participantId,
    campaignId: allocations[0]?.source.campaignId || null,
    amount: amountCents / 100,
    status: 'payout_requested',
    payoutProvider: 'asaas',
    asaasTransferId: null,
    payoutRequestedAt: now,
    createdAt: now,
    updatedAt: now,
    selfServiceWithdrawal: true,
    allocations: allocations.map(a => ({ earningId: a.source.id, amount: a.take / 100 }))
  };
  state.adEarnings.unshift(earning);
  return earning;
}

function attachTransfer(earning, transfer, now) {
  if (!earning || !earning.selfServiceWithdrawal) throw new Error('Solicitação de saque não encontrada.');
  if (!transfer || !transfer.id) throw new Error('Asaas não retornou o identificador da transferência.');
  earning.asaasTransferId = String(transfer.id);
  earning.status = 'payout_pending';
  earning.updatedAt = now;
  return earning;
}

function applyTransferEvent(state, transfer, eventType, now) {
  const reference = String(transfer?.externalReference || '');
  const prefix = 'wyncore-earning:';
  if (!reference.startsWith(prefix)) return null;
  const id = reference.slice(prefix.length);
  const earning = (state.adEarnings || []).find(e =>
    e.id === id &&
    e.selfServiceWithdrawal === true &&
    (!e.asaasTransferId || String(e.asaasTransferId) === String(transfer.id))
  );
  if (!earning) return null;
  if (earning.asaasTransferId && String(earning.asaasTransferId) !== String(transfer.id)) return null;
  earning.asaasTransferId = String(transfer.id || earning.asaasTransferId || '');
  if (eventType === 'TRANSFER_DONE') {
    earning.status = 'paid';
    earning.paidAt = now;
    earning.paymentReference = String(transfer.id || '');
    delete earning.payoutError;
  } else if (eventType === 'TRANSFER_FAILED' || eventType === 'TRANSFER_CANCELLED') {
    earning.status = 'approved_unpaid';
    earning.payoutError = String(transfer.failReason || eventType).slice(0, 300);
  } else {
    return null;
  }
  earning.updatedAt = now;
  return earning;
}

module.exports = { cents, reserveWithdrawal, attachTransfer, applyTransferEvent };
