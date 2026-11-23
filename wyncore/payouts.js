'use strict';

function cents(value){
 const n=Number(value);if(!Number.isFinite(n)||n<0)throw new Error('Valor monetário inválido.');return Math.round(n*100);
}
function reserveWithdrawal(state,{participantId,amountCents,withdrawalId,now,payoutProvider='stripe_connect',payoutDestinationEncrypted=null,pixKeyType=null}){
 if(!Number.isInteger(amountCents)||amountCents<100)throw new Error('Saque mínimo de R$ 1,00.');
 state.adEarnings||=[];
 const active=state.adEarnings.some(e=>e.participantId===participantId&&e.selfServiceWithdrawal&&['payout_requested','payout_pending','payout_review_required'].includes(e.status));
 if(active){const error=new Error('Você já tem um repasse em processamento. Aguarde a confirmação antes de solicitar outro.');error.status=409;throw error}
 const campaigns=new Map((state.adCampaigns||[]).map(c=>[c.id,c]));
 const eligible=state.adEarnings.filter(e=>e.participantId===participantId&&e.status==='approved_unpaid'&&(e.provider==='adscend'&&e.providerConfirmed===true||campaigns.get(e.campaignId)?.contractStatus==='received'));
 const available=eligible.reduce((sum,e)=>sum+cents(e.amount||0),0);
 if(amountCents>available){const error=new Error('O valor solicitado ultrapassa seu saldo disponível para saque.');error.status=409;throw error}
 let remaining=amountCents;const allocations=[];
 for(const source of eligible){if(remaining<=0)break;const take=Math.min(cents(source.amount||0),remaining);if(take>0){allocations.push({source,take});remaining-=take}}
 if(remaining!==0){const error=new Error('Não foi possível reservar o saldo solicitado. Atualize a carteira e tente novamente.');error.status=409;throw error}
 for(const allocation of allocations){const left=cents(allocation.source.amount||0)-allocation.take;allocation.source.amount=left/100;if(left===0)allocation.source.status='allocated';allocation.source.updatedAt=now}
 const earning={id:withdrawalId,participantId,campaignId:allocations[0]?.source.campaignId||null,amount:amountCents/100,status:'payout_requested',payoutProvider,stripeTransferId:null,payoutRequestedAt:now,createdAt:now,updatedAt:now,selfServiceWithdrawal:true,payoutDestinationEncrypted,pixKeyType,allocations:allocations.map(a=>({earningId:a.source.id,amount:a.take/100}))};
 state.adEarnings.unshift(earning);return earning;
}
function attachTransfer(earning,transfer,now){
 if(!earning||!earning.selfServiceWithdrawal)throw new Error('Solicitação de repasse não encontrada.');
 if(!transfer||!transfer.id)throw new Error('Stripe não retornou o identificador da transferência.');
 const id=String(transfer.id);
 if(earning.stripeTransferId&&earning.stripeTransferId!==id)throw new Error('A solicitação já está vinculada a outra transferência Stripe.');
 earning.stripeTransferId=id;earning.payoutProvider='stripe_connect';
 if(!['paid','approved_unpaid'].includes(earning.status))earning.status='payout_pending';
 earning.updatedAt=now;return earning;
}
function applyTransferEvent(state,eventType,object,connectedAccountId,now){
 state.adEarnings||=[];
 if(eventType==='transfer.created'||eventType==='transfer.updated'){
  const withdrawalId=String(object?.metadata?.wyncoreWithdrawalId||'');
  if(!withdrawalId)return null;
  const earning=state.adEarnings.find(e=>e.id===withdrawalId&&e.payoutProvider==='stripe_connect');
  if(!earning||earning.stripeTransferId&&earning.stripeTransferId!==String(object.id))return null;
  earning.stripeTransferId=String(object.id||earning.stripeTransferId||'');earning.payoutProvider='stripe_connect';
  if(earning.status!=='paid')earning.status='payout_pending';
  earning.updatedAt=now;return earning;
 }
 if(eventType==='transfer.reversed'){
  const withdrawalId=String(object?.metadata?.wyncoreWithdrawalId||'');
  const earning=state.adEarnings.find(e=>e.id===withdrawalId&&e.payoutProvider==='stripe_connect'&&e.stripeTransferId===String(object.id));
  if(!earning)return null;
  for(const allocation of earning.allocations||[]){const source=state.adEarnings.find(x=>x.id===allocation.earningId&&x.participantId===earning.participantId);if(source){source.amount=Math.round((Number(source.amount||0)+Number(allocation.amount||0))*100)/100;if(source.status==='allocated')source.status='approved_unpaid';source.updatedAt=now}}
  earning.status='approved_unpaid';earning.payoutError='A transferência Stripe foi revertida. O valor voltou ao saldo disponível.';earning.updatedAt=now;return earning;
 }
 if(eventType==='payout.paid'||eventType==='payout.failed'){
  const participant=state.participants.find(p=>p.stripeAccountId===connectedAccountId);
  if(!participant)return null;
  const amountCents=Number(object?.amount);
  const matches=state.adEarnings.filter(e=>e.participantId===participant.id&&e.payoutProvider==='stripe_connect'&&e.status==='payout_pending'&&cents(e.amount)===amountCents);
  if(matches.length!==1)return null;
  const earning=matches[0];
  if(eventType==='payout.paid'){earning.status='paid';earning.paidAt=now;earning.paymentReference=String(object.id||'');delete earning.payoutError}
  else{earning.status='payout_pending';earning.payoutError=String(object.failure_message||'O Stripe não concluiu o repasse bancário.').slice(0,300)}
  earning.stripePayoutId=String(object.id||'');earning.updatedAt=now;return earning;
 }
 return null;
}
module.exports={cents,reserveWithdrawal,attachTransfer,applyTransferEvent};
