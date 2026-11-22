'use strict';
const crypto=require('node:crypto');

const SECRET_KEY=process.env.STRIPE_SECRET_KEY||'';
const WEBHOOK_SECRET=process.env.STRIPE_WEBHOOK_SECRET||'';
const CONNECT_ENABLED=String(process.env.STRIPE_CONNECT_ENABLED||'').toLowerCase()==='true';

function configured(){return /^sk_(?:live|test)_[A-Za-z0-9]+$/.test(SECRET_KEY)}
function webhookConfigured(){return /^whsec_[A-Za-z0-9]+$/.test(WEBHOOK_SECRET)}
function connectEnabled(){return CONNECT_ENABLED}
function httpError(message,status=503){return Object.assign(new Error(message),{status})}
function safeEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y)}

function verifyWebhook(rawBody,signatureHeader,nowMs=Date.now()){
 if(!webhookConfigured())return false;
 const parts=String(signatureHeader||'').split(',').map(x=>x.trim().split('='));
 const timestamp=Number(parts.find(x=>x[0]==='t')?.[1]);
 const signatures=parts.filter(x=>x[0]==='v1').map(x=>x[1]);
 if(!Number.isInteger(timestamp)||!signatures.length||Math.abs(Math.floor(nowMs/1000)-timestamp)>300)return false;
 const expected=crypto.createHmac('sha256',WEBHOOK_SECRET).update(String(timestamp)+'.'+String(rawBody||''),'utf8').digest('hex');
 return signatures.some(x=>safeEqual(x,expected));
}
async function request(path,method='GET',params={},connectedAccount,idempotencyKey){
 if(!configured())throw httpError('Chave privada Stripe ausente no servidor.');
 const headers={Authorization:'Bearer '+SECRET_KEY,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'};
 if(connectedAccount){if(!/^acct_[A-Za-z0-9]+$/.test(String(connectedAccount)))throw httpError('Conta Stripe conectada inválida.',400);headers['Stripe-Account']=String(connectedAccount)}
 if(idempotencyKey)headers['Idempotency-Key']=String(idempotencyKey).slice(0,255);
 const response=await fetch('https://api.stripe.com/v1'+path,{method,headers,...(method==='GET'?{}:{body:new URLSearchParams(params)}),signal:AbortSignal.timeout(15000)});
 let data={};try{data=await response.json()}catch{}
 if(!response.ok)throw httpError(String(data.error?.message||'A API Stripe recusou a operação ('+response.status+').'),response.status>=500?502:400);
 return data;
}
async function getPlatformAccount(){return request('/account')}
async function assertChargesReady(){
 const account=await getPlatformAccount();
 if(account.charges_enabled!==true)throw httpError('A conta Stripe ainda não está habilitada para receber pagamentos. Conclua a verificação da conta no Stripe.');
 return account;
}
async function createCheckoutSession({amountCents,name,description,successUrl,cancelUrl,metadata={},clientReferenceId,idempotencyKey}){
 if(!Number.isInteger(amountCents)||amountCents<100||amountCents>1000000000)throw httpError('Valor da cobrança Stripe inválido.',400);
 for(const value of [successUrl,cancelUrl]){let u;try{u=new URL(value)}catch{}if(!u||u.protocol!=='https:')throw httpError('As URLs de retorno precisam usar HTTPS.',400)}
 await assertChargesReady();
 const params={
  mode:'payment','line_items[0][price_data][currency]':'brl',
  'line_items[0][price_data][unit_amount]':String(amountCents),
  'line_items[0][price_data][product_data][name]':String(name||'Campanha WYNCORE').slice(0,120),
  'line_items[0][price_data][product_data][description]':String(description||'Financiamento de campanha WYNCORE').slice(0,500),
  'line_items[0][quantity]':'1',success_url:successUrl,cancel_url:cancelUrl,
  'payment_intent_data[description]':String(name||'Campanha WYNCORE').slice(0,120),
  ...(clientReferenceId?{client_reference_id:String(clientReferenceId)}:{})
 };
 for(const [key,value] of Object.entries(metadata||{})){if(/^[a-zA-Z0-9_]{1,40}$/.test(key))params['metadata['+key+']']=String(value).slice(0,500)}
 const session=await request('/checkout/sessions','POST',params,null,idempotencyKey);
 if(!session.id||!session.url)throw httpError('Stripe não retornou um link de checkout válido.',502);
 return session;
}
async function createConnectedAccount({email,country='BR',idempotencyKey}){
 if(!connectEnabled())throw httpError('Stripe Connect ainda não foi habilitado para a conta WYNCORE.');
 const platform=await getPlatformAccount();
 if(platform.type!=='platform')throw httpError('A conta Stripe atual é do tipo padrão. É necessário habilitar uma conta de plataforma Stripe Connect antes de cadastrar participantes.');
 if(!/^\S+@\S+\.\S+$/.test(String(email||'')))throw httpError('E-mail do participante inválido.',400);
 if(country!=='BR')throw httpError('A integração inicial de repasses está limitada a contas brasileiras.',400);
 return request('/accounts','POST',{type:'express',country,email:String(email).toLowerCase(),'capabilities[transfers][requested]':'true',business_type:'individual'},null,idempotencyKey);
}
async function createAccountLink({accountId,refreshUrl,returnUrl}){
 if(!connectEnabled())throw httpError('Stripe Connect ainda não foi habilitado.');
 for(const value of [refreshUrl,returnUrl]){let u;try{u=new URL(value)}catch{}if(!u||u.protocol!=='https:')throw httpError('URLs de onboarding precisam usar HTTPS.',400)}
 return request('/account_links','POST',{account:accountId,refresh_url:refreshUrl,return_url:returnUrl,type:'account_onboarding'});
}
async function getConnectedAccount(accountId){if(!connectEnabled())throw httpError('Stripe Connect ainda não foi habilitado.');return request('/accounts/'+encodeURIComponent(accountId))}
async function createTransfer({amountCents,destination,withdrawalId,participantId,idempotencyKey}){
 if(!connectEnabled())throw httpError('Stripe Connect ainda não foi habilitado.');
 if(!Number.isInteger(amountCents)||amountCents<100)throw httpError('Valor mínimo de repasse: R$ 1,00.',400);
 if(!/^acct_[A-Za-z0-9]+$/.test(String(destination||'')))throw httpError('O participante ainda não conectou uma conta Stripe válida.',409);
 const params={amount:String(amountCents),currency:'brl',destination:String(destination),transfer_group:'wyncore-'+String(withdrawalId),'metadata[wyncoreWithdrawalId]':String(withdrawalId),'metadata[participantId]':String(participantId)};
 return request('/transfers','POST',params,null,idempotencyKey);
}
module.exports={configured,webhookConfigured,connectEnabled,verifyWebhook,getPlatformAccount,createCheckoutSession,createConnectedAccount,createAccountLink,getConnectedAccount,createTransfer};
