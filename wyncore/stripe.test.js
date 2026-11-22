'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
function loadStripe(env){
 const keys=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_CONNECT_ENABLED'];
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 for(const k of keys){if(Object.prototype.hasOwnProperty.call(env,k))process.env[k]=env[k];else delete process.env[k]}
 delete require.cache[require.resolve('./stripe')];
 const stripe=require('./stripe');
 return {stripe,restore(){for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k]}delete require.cache[require.resolve('./stripe')]}};
}
test('Stripe webhook signature validates HMAC and rejects stale or altered payloads',()=>{
 const secret='whsec_testsecret123456789',raw='{"id":"evt_123","type":"checkout.session.completed"}',timestamp=Math.floor(Date.now()/1000);
 const signature=crypto.createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');
 const ctx=loadStripe({STRIPE_WEBHOOK_SECRET:secret});
 try{assert.equal(ctx.stripe.verifyWebhook(raw,'t='+timestamp+',v1='+signature),true);assert.equal(ctx.stripe.verifyWebhook(raw+' ','t='+timestamp+',v1='+signature),false);assert.equal(ctx.stripe.verifyWebhook(raw,'t='+(timestamp-600)+',v1='+signature),false);assert.equal(ctx.stripe.verifyWebhook(raw,'t='+timestamp+',v1=invalid'),false)}finally{ctx.restore()}
});
test('Checkout fails closed when no private Stripe key is configured',async()=>{
 const ctx=loadStripe({});
 try{await assert.rejects(ctx.stripe.createCheckoutSession({amountCents:500,name:'Teste',successUrl:'https://wyncore.example/success',cancelUrl:'https://wyncore.example/cancel'}),/Chave privada Stripe ausente/)}finally{ctx.restore()}
});
test('Connect account creation stays blocked until platform Connect is enabled',async()=>{
 const ctx=loadStripe({STRIPE_SECRET_KEY:'sk_test_fake123'});
 try{await assert.rejects(ctx.stripe.createConnectedAccount({email:'participante@example.com'}),/Stripe Connect ainda não foi habilitado/)}finally{ctx.restore()}
});
test('Connected account transfer validates destination and minimum amount',async()=>{
 const ctx=loadStripe({STRIPE_SECRET_KEY:'sk_test_fake123',STRIPE_CONNECT_ENABLED:'true'});
 try{await assert.rejects(ctx.stripe.createTransfer({amountCents:500,destination:'',withdrawalId:'wd_1',participantId:'p_1'}),/O participante ainda não conectou/);await assert.rejects(ctx.stripe.createTransfer({amountCents:50,destination:'acct_123',withdrawalId:'wd_1',participantId:'p_1'}),/Valor mínimo/)}finally{ctx.restore()}
});
