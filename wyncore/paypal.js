'use strict';
const crypto=require('node:crypto');
const CLIENT_ID=process.env.PAYPAL_CLIENT_ID||'';
const CLIENT_SECRET=process.env.PAYPAL_CLIENT_SECRET||'';
const MODE=process.env.PAYPAL_MODE==='live'?'live':'sandbox';
const BASE=MODE==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';
function configured(){return CLIENT_ID.length>0&&CLIENT_SECRET.length>0}
async function token(){
 if(!configured())throw Object.assign(new Error('PayPal Payouts ainda não configurado no servidor.'),{status:503});
 const auth=Buffer.from(CLIENT_ID+':'+CLIENT_SECRET).toString('base64');
 const r=await fetch(BASE+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(12000)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.access_token)throw Object.assign(new Error('Não foi possível autenticar no PayPal ('+r.status+').'),{status:502});
 return d.access_token;
}
async function request(path,method,data){
 const access=await token();
 const r=await fetch(BASE+path,{method,headers:{Authorization:'Bearer '+access,'Content-Type':'application/json','Accept':'application/json'},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(20000)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(new Error(d.message||d.name||'Falha na API PayPal ('+r.status+').'),{status:r.status>=500?502:400,details:d});
 return d;
}
async function createPayout({email,amount,currency='USD',earningId}){
 const value=Number(amount);
 if(!/^\S+@\S+\.\S+$/.test(String(email||''))||!Number.isFinite(value)||value<=0)throw Object.assign(new Error('E-mail PayPal ou valor inválido.'),{status:400});
 const batchId='WYNC-'+crypto.createHash('sha256').update(String(earningId)).digest('hex').slice(0,20).toUpperCase();
 return request('/v1/payments/payouts','POST',{sender_batch_header:{sender_batch_id:batchId,email_subject:'Sua recompensa WYNCORE',email_message:'Sua recompensa aprovada está sendo enviada.'},items:[{recipient_type:'EMAIL',amount:{value:value.toFixed(2),currency:String(currency).toUpperCase()},receiver:String(email).trim(),note:'Recompensa WYNCORE',sender_item_id:String(earningId).slice(0,30)}]});
}
async function getBatch(batchId){return request('/v1/payments/payouts/'+encodeURIComponent(batchId),'GET')}
module.exports={configured,mode:MODE,createPayout,getBatch};
