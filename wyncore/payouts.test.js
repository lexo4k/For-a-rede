'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {reserveWithdrawal,attachTransfer,applyTransferEvent}=require('./payouts');

function state(){
 return {
  participants:[{id:'p1',stripeAccountId:'acct_p1'},{id:'p2',stripeAccountId:'acct_p2'}],
  adCampaigns:[{id:'c1',contractStatus:'received'},{id:'c2',contractStatus:'pending'}],
  adEarnings:[
   {id:'e1',participantId:'p1',campaignId:'c1',amount:8,status:'approved_unpaid'},
   {id:'e2',participantId:'p1',campaignId:'c2',amount:20,status:'approved_unpaid'},
   {id:'e3',participantId:'p2',campaignId:'c1',amount:30,status:'approved_unpaid'}
  ]
 };
}

test('reserva apenas recompensas de campanhas efetivamente financiadas',()=>{
 const s=state(),p=reserveWithdrawal(s,{participantId:'p1',amountCents:500,withdrawalId:'w1',now:'2026-11-22T00:00:00.000Z'});
 assert.equal(p.status,'payout_requested');assert.equal(p.amount,5);
 assert.equal(p.payoutProvider,'stripe_connect');
 assert.equal(s.adEarnings.find(x=>x.id==='e1').amount,3);
 assert.equal(s.adEarnings.find(x=>x.id==='e2').amount,20);
 assert.equal(s.adEarnings.find(x=>x.id==='e3').amount,30);
});

test('recusa repasse acima do saldo elegível sem alterar a carteira',()=>{
 const s=state();
 assert.throws(()=>reserveWithdrawal(s,{participantId:'p1',amountCents:900,withdrawalId:'w2',now:'now'}),{status:409});
 assert.equal(s.adEarnings.find(x=>x.id==='e1').amount,8);
 assert.equal(s.adEarnings.length,3);
});

test('associa transferência Stripe e confirma payout por webhook',()=>{
 const s=state(),p=reserveWithdrawal(s,{participantId:'p1',amountCents:300,withdrawalId:'w3',now:'now'});
 attachTransfer(p,{id:'tr_3'},'api');
 assert.equal(p.status,'payout_pending');
 applyTransferEvent(s,'transfer.created',{id:'tr_3',metadata:{wyncoreWithdrawalId:'w3'}},'','event');
 assert.equal(p.status,'payout_pending');
 const result=applyTransferEvent(s,'payout.paid',{id:'po_3',amount:300},'acct_p1','paid');
 assert.equal(result,p);assert.equal(p.status,'paid');assert.equal(p.paymentReference,'po_3');
});

test('webhook de transferência pode chegar antes da resposta da API',()=>{
 const s=state(),p=reserveWithdrawal(s,{participantId:'p1',amountCents:300,withdrawalId:'w4',now:'now'});
 applyTransferEvent(s,'transfer.created',{id:'tr_4',metadata:{wyncoreWithdrawalId:'w4'}},'','webhook-first');
 attachTransfer(p,{id:'tr_4'},'api-later');
 assert.equal(p.stripeTransferId,'tr_4');assert.equal(p.status,'payout_pending');
});

test('transferência revertida devolve a reserva ao saldo aprovado',()=>{
 const s=state(),p=reserveWithdrawal(s,{participantId:'p1',amountCents:800,withdrawalId:'w5',now:'now'});
 attachTransfer(p,{id:'tr_5'},'api');
 const result=applyTransferEvent(s,'transfer.reversed',{id:'tr_5',metadata:{wyncoreWithdrawalId:'w5'}},'','reversed');
 assert.equal(result,p);assert.equal(p.status,'approved_unpaid');
 assert.equal(s.adEarnings.find(x=>x.id==='e1').amount,8);
 assert.equal(s.adEarnings.find(x=>x.id==='e1').status,'approved_unpaid');
});

test('falha do payout bancário fica pendente para conciliação, sem marcar como pago',()=>{
 const s=state(),p=reserveWithdrawal(s,{participantId:'p1',amountCents:300,withdrawalId:'w6',now:'now'});
 attachTransfer(p,{id:'tr_6'},'api');
 applyTransferEvent(s,'payout.failed',{id:'po_6',amount:300,failure_message:'Conta bancária pendente'},'acct_p1','failed');
 assert.equal(p.status,'payout_pending');assert.match(p.payoutError,/pendente/);
});

test('não permite vincular uma segunda transferência à mesma reserva',()=>{
 const s=state(),p=reserveWithdrawal(s,{participantId:'p1',amountCents:300,withdrawalId:'w7',now:'now'});
 attachTransfer(p,{id:'tr_7'},'first');
 assert.throws(()=>attachTransfer(p,{id:'tr_8'},'second'),/outra transferência Stripe/);
});

test('recompensa Adscend só entra no repasse após postback confirmado em BRL',()=>{
 const s={participants:[{id:'p1',stripeAccountId:'acct_p1'}],adCampaigns:[],adEarnings:[
  {id:'a1',participantId:'p1',provider:'adscend',providerConfirmed:true,amount:4.25,status:'approved_unpaid'},
  {id:'a2',participantId:'p1',provider:'adscend',providerConfirmed:false,amount:9,status:'approved_unpaid'}
 ]};
 const p=reserveWithdrawal(s,{participantId:'p1',amountCents:425,withdrawalId:'wa1',now:'now'});
 assert.equal(p.amount,4.25);assert.equal(s.adEarnings.find(x=>x.id==='a1').status,'allocated');assert.equal(s.adEarnings.find(x=>x.id==='a2').status,'approved_unpaid');
});
