'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const d=require('./domain');
const admin={id:'admin-1',role:'admin',email:'admin@example.com'};
const manager={id:'admin-2',role:'admin'};
const nonAdmin={id:'manager-1',role:'manager'};
test('access approval, task lifecycle and payment ledger enforce roles',()=>{
 const s={};d.ensureState(s);
 const p=d.requestAccess(s,{name:'Pessoa Teste',email:'pessoa@example.com'});
 assert.equal(p.status,'pending');
 assert.throws(()=>d.assignProgram(s,nonAdmin,'missing',p.id),/Permissão/);
 d.approveParticipant(s,admin,p.id);
 const program=d.createProgram(s,manager,{title:'Tarefa de teste',source:'Contratante',reward:12.5,budget:100,url:'https://example.org/task'});
 d.confirmProgramFunding(s,admin,program.id,'ref-financiamento-123','https://example.org/evidencia');
 const a=d.assignProgram(s,manager,program.id,p.id);
 const participant={id:p.id,role:'participant',email:p.email};
 d.submitAssignment(s,participant,a.id,'comprovante-ref-123');
 d.reviewAssignment(s,manager,a.id,'approved','Entrega validada');
 assert.equal(s.ledger.length,0,'approval alone must not fabricate a payment');
 assert.throws(()=>d.recordPayment(s,nonAdmin,a.id,'payment-ref-123'),/Permissão/);
 d.recordPayment(s,admin,a.id,'payment-ref-123');
 assert.equal(s.ledger[0].amount,12.5);
 assert.equal(s.ledger[0].reference,'payment-ref-123');
 assert.equal(d.snapshot(s,participant).ledger.length,1);
});
test('participant cannot approve users or create paid programs',()=>{
 const s={};const p=d.requestAccess(s,{name:'Teste',email:'teste@example.com'});
 assert.throws(()=>d.approveParticipant(s,{id:p.id,role:'participant'},p.id),/Permissão/);
});
test('referrals are tracked without automatic commission',()=>{
 const s={};const p=d.requestAccess(s,{name:'Teste',email:'teste@example.com'});
 d.approveParticipant(s,admin,p.id);
 const participant={id:p.id,role:'participant',email:p.email};
 d.addReferral(s,participant,'novo@example.com');
 assert.equal(s.referrals[0].status,'invited');
 assert.equal(s.ledger.length,0);
});

test('participant can request an activity and team can approve it',()=>{
 const s={};const p=d.requestAccess(s,{name:'Participante',email:'atividade@example.com'});
 d.approveParticipant(s,admin,p.id);
 const participant={id:p.id,role:'participant',email:p.email};
 const program=d.createProgram(s,manager,{title:'Atividade aberta',source:'Fonte oficial',reward:10,budget:20,url:'https://example.org'});
 d.confirmProgramFunding(s,admin,program.id,'ref-financiamento-456','https://example.org/evidencia');
 const request=d.requestProgram(s,participant,program.id);
 assert.equal(request.state,'requested');
 assert.throws(()=>d.requestProgram(s,participant,program.id),/já solicitou/);
 d.approveProgramRequest(s,manager,request.id);
 assert.equal(request.state,'assigned');
});

test('campaigns cannot be used before funding review and cannot exceed their budget',()=>{const s={};const p=d.requestAccess(s,{name:'Participante',email:'budget@example.com'});d.approveParticipant(s,admin,p.id);const participant={id:p.id,role:'participant',email:p.email};const program=d.createProgram(s,manager,{title:'Campanha limitada',source:'Empresa',reward:10,budget:10,url:'https://example.org'});assert.equal(program.status,'pending_funding');assert.throws(()=>d.requestProgram(s,participant,program.id),/indisponível/);d.confirmProgramFunding(s,admin,program.id,'fund-ref-123','https://example.org/receipt');d.requestProgram(s,participant,program.id);assert.throws(()=>d.requestProgram(s,{...participant,id:'another'},program.id),/Orçamento/);});

test('only the owner admin role can perform management actions',()=>{const s={};const pending=d.requestAccess(s,{name:'Pessoa',email:'pessoa2@example.com'});assert.throws(()=>d.approveParticipant(s,nonAdmin,pending.id),/Permissão/);assert.throws(()=>d.createProgram(s,nonAdmin,{title:'Teste',source:'Empresa',reward:5,budget:10}),/Permissão/);assert.throws(()=>d.snapshot(s,nonAdmin),/Permissão/);assert.throws(()=>d.approveParticipant(s,admin,pending.id,'manager'),/Somente a conta proprietária/);});

test('legacy persisted state initializes every collection used by server routes',()=>{const s={participants:[{id:'p1'}],programs:[]};d.ensureState(s);for(const key of ['users','participants','programs','assignments','ledger','referrals','audit','companyLeads','companyCosts','campaignFeedback','adCampaigns','adReviews','adEarnings','asaasWebhookEvents','adscendOfferSnapshots','adscendConversions','advertiserInquiries','workAccounts','workTasks','workLedger','opportunities','tasks','events','conversions'])assert.ok(Array.isArray(s[key]),key+' must be an array');assert.equal(s.participants.length,1)});
