'use strict';

const PORTALS = [
  {id:'oneforma',name:'OneForma',kind:'portal',url:'https://www.oneforma.com/projects/',focus:'Dados, idiomas, coleta e avaliação de IA'},
  {id:'welodata',name:'Welo Data',kind:'portal',url:'https://jobs.lever.co/weloglobal?department=Welo+Data',focus:'Dados linguísticos e avaliação de IA'},
  {id:'rws',name:'RWS TrainAI',kind:'portal',url:'https://app.tai.rws.com/opportunities',focus:'Treinamento e anotação de dados'},
  {id:'prolific',name:'Prolific',kind:'portal',url:'https://www.prolific.com/participants',focus:'Pesquisas acadêmicas remuneradas'},
  {id:'crowdgen',name:'CrowdGen',kind:'portal',url:'https://crowdgen.com/experts/',focus:'Projetos de dados e IA'},
  {id:'telus',name:'TELUS Digital AI Community',kind:'portal',url:'https://www.telusdigital.com/careers/ai-community',focus:'Avaliação de busca, anúncios e dados'},
  {id:'outlier',name:'Outlier',kind:'portal',url:'https://outlier.ai/',focus:'Treinamento e avaliação de modelos de IA'},
  {id:'dataforce',name:'DataForce',kind:'portal',url:'https://dataforcecommunity.transperfect.com/',focus:'Coleta de dados, voz e anotação'},
  {id:'clickworker',name:'Clickworker',kind:'portal',url:'https://www.clickworker.com/clickworker/',focus:'Microtarefas e dados'}
];

const TERMS = [
  ['data annotation',5],['annotator',4],['annotation',4],['ai trainer',5],['ai training',4],
  ['search evaluator',5],['ads evaluator',5],['ad evaluator',5],['internet assessor',5],
  ['quality rater',4],['llm',3],['language evaluator',4],['portuguese',3],['transcription',3],
  ['speech data',4],['labeling',3],['labelling',3],['content evaluator',3],
  ['model evaluation',4],['research study',3],['survey',2],['user testing',3],
  ['data collection',3],['map evaluator',4],['social media evaluator',3]
];
const EXCLUDE = ['senior software engineer','principal engineer','sales manager','account executive','commission only'];

function clean(value,max=1200){
  return String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'")
    .replace(/&quot;/g,'"').replace(/\s+/g,' ').trim().slice(0,max);
}
function safeUrl(value){
  try{const u=new URL(String(value||''));if(u.protocol!=='https:'||u.username||u.password)return '';return u.href}catch{return ''}
}
function scoreJob(job){
  const title=clean(job.title,180).toLowerCase(),text=(title+' '+clean(job.description,1800)+' '+(job.tags||[]).join(' ')).toLowerCase();
  if(EXCLUDE.some(x=>title.includes(x)))return 0;
  let score=0;for(const [term,weight] of TERMS)if(text.includes(term))score+=weight;
  if(/remote|worldwide|anywhere|brasil|brazil|portuguese/i.test(String(job.location||'')))score+=1;
  return Math.min(10,score);
}
function normalizeJob(raw,source){
  const title=clean(raw.title||raw.position,180),company=clean(raw.company||raw.company_name||raw.companyName||source,120);
  const url=safeUrl(raw.url||raw.apply_url||raw.job_url);
  if(!title||!url)return null;
  const description=clean(raw.description||raw.summary,1400),tags=Array.isArray(raw.tags)?raw.tags.map(x=>clean(x,50)).slice(0,20):[];
  const location=clean(raw.location||raw.candidate_required_location||raw.candidateRequiredLocation||'Remoto; verificar elegibilidade',180);
  const item={id:'job_'+require('node:crypto').createHash('sha256').update(url).digest('hex').slice(0,24),title,company,source,url,description,location,tags,remote:true,score:0,salary:clean(raw.salary||'',120),publishedAt:raw.publication_date||raw.created_at||raw.date||null,firstSeenAt:new Date().toISOString(),lastSeenAt:new Date().toISOString(),status:'discovered'};
  item.score=scoreJob(item);return item.score>=3?item:null;
}
function dedupe(items){
  const map=new Map();
  for(const item of items){const key=item.url.toLowerCase();const old=map.get(key);if(!old||item.score>old.score)map.set(key,item)}
  return [...map.values()].sort((a,b)=>b.score-a.score||String(b.publishedAt||'').localeCompare(String(a.publishedAt||'')));
}
async function getJson(url,fetchImpl){
  const response=await fetchImpl(url,{headers:{accept:'application/json','user-agent':'WYNCORE-Opportunity-Scanner/1.0'},signal:AbortSignal.timeout(7500)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
}
async function scanSources(fetchImpl=fetch){
  const sources=[
    {id:'remotive',name:'Remotive',run:async()=>{
      const queries=['data annotation','AI trainer'];
      const responses=await Promise.all(queries.map(q=>getJson('https://remotive.com/api/remote-jobs?search='+encodeURIComponent(q)+'&limit=50',fetchImpl)));
      return responses.flatMap(x=>(x.jobs||[]).map(j=>normalizeJob(j,'Remotive'))).filter(Boolean);
    }},
    {id:'arbeitnow',name:'Arbeitnow',run:async()=>{
      const x=await getJson('https://www.arbeitnow.com/api/job-board-api',fetchImpl);
      return (x.data||[]).map(j=>normalizeJob(j,'Arbeitnow')).filter(Boolean);
    }},
    {id:'remoteok',name:'Remote OK',run:async()=>{
      const x=await getJson('https://remoteok.com/api',fetchImpl);
      return (Array.isArray(x)?x.filter(j=>j&&j.position):[]).map(j=>normalizeJob({...j,title:j.position,url:j.apply_url||j.url,company:j.company_name,location:j.location,tags:j.tags},'Remote OK')).filter(Boolean);
    }}
  ];
  const results=await Promise.all(sources.map(async source=>{
    try{const jobs=await source.run();return {id:source.id,name:source.name,ok:true,count:jobs.length,jobs,checkedAt:new Date().toISOString()}}
    catch(error){return {id:source.id,name:source.name,ok:false,count:0,jobs:[],error:clean(error.message,180),checkedAt:new Date().toISOString()}}
  }));
  return {jobs:dedupe(results.flatMap(x=>x.jobs)),sources:results.map(({jobs,...x})=>x),checkedAt:new Date().toISOString()};
}
function mergeJobs(existing,incoming){
  const byId=new Map((existing||[]).map(x=>[x.id,x]));let added=0,updated=0;
  for(const item of incoming||[]){
    const old=byId.get(item.id);
    if(old){byId.set(item.id,{...old,...item,firstSeenAt:old.firstSeenAt||item.firstSeenAt,status:old.status||'discovered'});updated++}
    else{byId.set(item.id,item);added++}
  }
  const jobs=[...byId.values()].sort((a,b)=>String(b.lastSeenAt||'').localeCompare(String(a.lastSeenAt||''))).slice(0,1500);
  return {jobs,added,updated};
}
module.exports={PORTALS,TERMS,clean,safeUrl,scoreJob,normalizeJob,dedupe,scanSources,mergeJobs};
