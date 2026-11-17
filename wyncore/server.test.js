'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateOpportunity,STATUSES}=require('./server');
test('accepts a valid opportunity with HTTPS source',()=>{const o=validateOpportunity({title:'Projeto de teste',source:'Fonte oficial',value:150,url:'https://example.org/job'});assert.equal(o.title,'Projeto de teste');assert.equal(o.value,150);assert.equal(o.status,'Registrada')});
test('rejects insecure links',()=>assert.throws(()=>validateOpportunity({title:'x',source:'y',value:1,url:'http://example.org'}),/HTTPS/));
test('rejects negative or nonnumeric values',()=>{assert.throws(()=>validateOpportunity({title:'x',source:'y',value:-1}),/valor/i);assert.throws(()=>validateOpportunity({title:'x',source:'y',value:'abc'}),/valor/i)});
test('status vocabulary is explicit and bounded',()=>{assert.ok(STATUSES.includes('Recebido'));assert.ok(!STATUSES.includes('Pago garantido'))});
