'use strict';
const CACHE_MS=10*60*1000;
let cache={at:0,data:null};
const SOURCES=[
 {id:'telus',name:'TELUS Digital AI Community',url:'https://jobs.telusdigital.com/search/jobs/in/country/brazil?cfm5=AI+Community&ns_category=ai-community',mode:'official_search',note:'Vagas oficiais no Brasil. Inscrição, avaliações e verificação são feitas pela própria plataforma.'},
 {id:'welo',name:'Welo Data',url:'https://jobs.lever.co/weloglobal?location=Brazil',mode:'live_feed',note:'Vagas públicas da Welo Global filtradas para Brasil, português e projetos remotos.'},
 {id:'oneforma',name:'OneForma',url:'https://www.oneforma.com/jobs/',mode:'official_search',note:'Projetos e tarefas compatíveis são exibidos após login e preenchimento do perfil.'}
];
function relevant(p){
 const text=[p.text,p.categories?.location,p.categories?.team,p.categories?.commitment,p.categories?.department].filter(Boolean).join(' ').toLowerCase();
 return /brazil|brasil|portuguese|portugu[eê]s|worldwide|remote|south america/.test(text);
}
async function discover(){
 if(cache.data&&Date.now()-cache.at<CACHE_MS)return cache.data;
 let jobs=[],feedStatus='unavailable';
 try{
  const r=await fetch('https://api.lever.co/v0/postings/weloglobal?mode=json',{headers:{accept:'application/json'},signal:AbortSignal.timeout(9000)});
  if(!r.ok)throw Error('feed unavailable');
  const all=await r.json();
  jobs=(Array.isArray(all)?all:[]).filter(relevant).map(x=>({
   id:'welo-'+String(x.id||x.applyUrl||x.hostedUrl),
   title:String(x.text||'Oportunidade Welo Data').slice(0,180),
   company:'Welo Data / Welo Global',
   location:String(x.categories?.location||'Localização não informada').slice(0,140),
   team:String(x.categories?.team||'').slice(0,100),
   commitment:String(x.categories?.commitment||'').slice(0,100),
   url:String(x.hostedUrl||x.applyUrl||''),
   source:'Welo Data',
   status:'open_listing',
   fetchedAt:new Date().toISOString(),
   estimatedPay:null,
   payNote:'Remuneração não publicada no feed; confira as condições na vaga.'
  })).filter(x=>/^https:\/\//.test(x.url));
  feedStatus='live';
 }catch{feedStatus='temporarily_unavailable'}
 const result={updatedAt:new Date().toISOString(),refreshMinutes:10,feedStatus,items:jobs,sources:SOURCES,automation:{applicationSubmission:false,reason:'As plataformas exigem conta, elegibilidade, avaliações e aceite pessoal. O WYNCORE não envia candidaturas nem realiza testes em seu nome.'}};
 cache={at:Date.now(),data:result};
 return result;
}
module.exports={discover,SOURCES};
