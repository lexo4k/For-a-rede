'use strict';
const PUBLISHER_ID=String(process.env.ADSCEND_PUBLISHER_ID||'').trim();
const API_KEY=String(process.env.ADSCEND_API_KEY||'').trim();
const USER_SHARE=Math.min(0.9,Math.max(0.1,Number(process.env.ADSCEND_USER_SHARE||70)))/100;
function configured(){return Boolean(/^\d+$/.test(PUBLISHER_ID)&&API_KEY.length>=12)}
function postbackConfigured(){return String(process.env.ADSCEND_POSTBACK_SECRET||'').length>=32}
function countryCode(value){const code=String(value||'').trim().toUpperCase();return /^[A-Z]{2}$/.test(code)?code:''}
function isCashRewardedVideo(offer,country){
 return Boolean(offer&&Array.isArray(offer.product_id)&&offer.product_id.some(v=>Number(v)===8)&&Number(offer.allowed_traffic)===3&&Array.isArray(offer.countries)&&offer.countries.includes(country));
}
async function getRewardedVideos({country,userId}){
 if(!configured())throw Object.assign(Error('Integração Adscend aguardando credenciais de publisher.'),{status:503});
 const cc=countryCode(country);if(!cc)throw Object.assign(Error('País não identificado.'),{status:422});
 const url=new URL('https://api.adscendmedia.com/v1/publisher/'+encodeURIComponent(PUBLISHER_ID)+'/offers.json');
 url.searchParams.append('product_id[]','8');
 url.searchParams.append('countries[]',cc);
 const auth=Buffer.from(PUBLISHER_ID+':'+API_KEY).toString('base64');
 const response=await fetch(url,{headers:{Authorization:'Basic '+auth,Accept:'application/json'},signal:AbortSignal.timeout(10000)});
 if(response.status===204)return {country:cc,offers:[]};
 if(response.status===403)throw Object.assign(Error('A Adscend recusou as credenciais. Confira Publisher ID e API Key.'),{status:502});
 if(!response.ok)throw Object.assign(Error('A API Adscend respondeu com HTTP '+response.status+'.'),{status:502});
 const payload=await response.json(),rows=Array.isArray(payload.offers)?payload.offers:[];
 const offers=rows.filter(x=>isCashRewardedVideo(x,cc)).map(x=>{
  let clickUrl='',streamUrl='';
  try{const u=new URL(x.click_url);if(u.protocol==='https:'){u.searchParams.set('sub1',String(userId).slice(0,60));u.searchParams.set('sub2',String(x.offer_id||''));clickUrl=u.href}}catch{}
  for(const raw of [x.video_streaming_url,x.video_streaming_ios_url,x.video_url]){try{const u=new URL(raw);if(u.protocol==='https:'){streamUrl=u.href;break}}catch{}}
  const payout=Number(x.payout);
  return {id:String(x.offer_id||''),title:String(x.name||'Vídeo recompensado').slice(0,160),description:String(x.description||'Assista ao vídeo e conclua as condições informadas pela campanha.').slice(0,1200),clickUrl,streamUrl,publisherPayoutUsd:Number.isFinite(payout)&&payout>0?payout:null,participantEstimateUsd:Number.isFinite(payout)&&payout>0?Math.round(payout*USER_SHARE*100)/100:null,country:cc,provider:'Adscend Media',rewardStatus:'pending_partner_confirmation'};
 }).filter(x=>x.id&&x.clickUrl);
 return {country:cc,offers};
}
module.exports={configured,postbackConfigured,getRewardedVideos,countryCode,isCashRewardedVideo};
