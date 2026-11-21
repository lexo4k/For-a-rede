'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Paypal=require('./paypal');
test('PayPal credentials are never considered configured when absent',()=>{
 if(!process.env.PAYPAL_CLIENT_ID&&!process.env.PAYPAL_CLIENT_SECRET)assert.equal(Paypal.configured(),false);
});
test('PayPal defaults to sandbox unless live mode is explicitly selected',()=>{
 assert.ok(['sandbox','live'].includes(Paypal.mode));
 if(process.env.PAYPAL_MODE!=='live')assert.equal(Paypal.mode,'sandbox');
});
