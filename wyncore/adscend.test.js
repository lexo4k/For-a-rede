'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Adscend=require('./adscend');
test('Adscend country codes are normalized and strictly ISO alpha-2 shaped',()=>{
 assert.equal(Adscend.countryCode('br'),'BR');
 assert.equal(Adscend.countryCode('US'),'US');
 assert.equal(Adscend.countryCode('BRA'),'');
 assert.equal(Adscend.countryCode('1B'),'');
 assert.equal(Adscend.countryCode(''),'');
});
test('Adscend credentials are never considered configured when absent',()=>{
 assert.equal(Adscend.configured(),false);
});
