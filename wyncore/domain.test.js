'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const d=require('./domain');
const admin={id:'admin-1',role:'admin',email:'admin@example.com'};
const manager={id:'manager-1',role:'manager'};
test('access approval, task lifecycle and payment ledger enforce roles',()=>{
 const s={};d.ensureState(s);
 const p=d.requestAccess(s,{name:'Pessoa Teste',email:'pessoa@example.com'});
 assert.equal(p.status,'pending');
 assert.throws(()=>d.assignProgram(s,manager,'missing',p.id),/ativo/);
 d.approveParticipant(s,admin,p.id);
 const program=d.createProgram(s,manager,{title:'Tarefa de teste',source:'Contratante',reward:12.5,url:'https://example.org/task'});
 const a=d.assignProgram(s,manager,program.id,p.id);
 const participant={id:p.id,role:'participant',email:p.email};
 d.submitAssignment(s,participant,a.id,'comprovante-ref-123');
 d.reviewAssignment(s,manager,a.id,'approved','Entrega validada');
 assert.equal(s.ledger.length,0,'approval alone must not fabricate a payment');
 assert.throws(()=>d.recordPayment(s,manager,a.id,'payment-ref-123'),/Permissão/);
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
