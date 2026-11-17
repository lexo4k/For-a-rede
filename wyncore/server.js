'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=__dirname;
const DATA_DIR=process.env.DATA_DIR||path.join(ROOT,'data');
const DATA_FILE=path.join(DATA_DIR,'wyncore.json');
const PORT=Number(process.env.PORT||3000);
const PASSWORD=process.env.WYNCORE_OWNER_PASSWORD||'';
const SECRET=process.env.WYNCORE_SESSION_SECRET||'';
const PROD=process.env.NODE_ENV==='production';
const COOKIE='wyncore_session';
const SESSION_MS=8*60*60*1000;
const STATUSES=['Em análise','Inscrito','Em execução','Concluída, aguardando aprovação','Confirmada pelo contratante','Recebido','Descartada'];
const PUBLIC_FILES=new Set(['/','/index.html','/styles.css','/app.js','/manifest.webmanifest','/icon.svg','/sw.js']);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const rate=new Map();
function assertConfig(){if(!PASSWORD||PASSWORD.length<12)throw new Error('Configure WYNCORE_OWNER_PASSWORD com pelo menos 12 caracteres.');if(!SECRET||SECRET.length<32)throw new Error('Configure WYNCORE_SESSION_SECRET com pelo menos 32 caracteres.')}
function safeEqual(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function sign(value){return crypto.createHmac('sha256',SECRET).update(value).digest('base64url')}
function makeSession(){const payload=Date.now()+SESSION_MS+'.'+crypto.randomBytes(24).toString('base64url');return payload+'.'+sign(payload)}
function validSession(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!token)return false;const parts=token.split('.');if(parts.length!==3)return false;const payload=parts[0]+'.'+parts[1];return safeEqual(parts[2],sign(payload))&&Number(parts[0])>Date.now()}
function cookie(value,maxAge){return COOKIE+'='+value+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(PROD?'; Secure':'')}
function send(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data))}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>65536)throw Object.assign(new Error('Corpo muito grande'),{status:413})}try{return raw?JSON.parse(raw):{}}catch{throw Object.assign(new Error('JSON inválido'),{status:400})}}
async function load(){try{const d=JSON.parse(await fs.readFile(DATA_FILE,'utf8'));return d&&Array.isArray(d.opportunities)&&Array.isArray(d.tasks)&&Array.isArray(d.events)?d:{opportunities:[],tasks:[],events:[]}}catch(e){if(e.code!=='ENOENT')throw e;return{opportunities:[],tasks:[],events:[]}}}
async function save(d){await fs.mkdir(DATA_DIR,{recursive:true});const tmp=DATA_FILE+'.tmp';await fs.writeFile(tmp,JSON.stringify(d,null,2),{mode:0o600});await fs.rename(tmp,DATA_FILE)}
function cleanText(v,max=120){return String(v??'').trim().slice(0,max)}
function validateOpportunity(v){const title=cleanText(v.title,90),source=cleanText(v.source,90),value=Number(v.value),url=cleanText(v.url,500);if(!title||!source||!Number.isFinite(value)||value<0||value>10000000)throw Object.assign(new Error('Confira nome, fonte e valor.'),{status:400});if(url){let u;try{u=new URL(url)}catch{}if(!u||u.protocol!=='https:')throw Object.assign(new Error('O link precisa ser HTTPS válido.'),{status:400})}return{id:crypto.randomUUID(),title,source,value,url,status:'Registrada',createdAt:new Date().toISOString()}}
function originAllowed(req){const origin=req.headers.origin;if(!origin)return true;const host=req.headers.host;return origin===((PROD?'https':'http')+'://'+host)}
function rateLimited(req){const ip=req.socket.remoteAddress||'unknown',now=Date.now(),entry=rate.get(ip)||{count:0,start:now};if(now-entry.start>15*60*1000){entry.count=0;entry.start=now}entry.count++;rate.set(ip,entry);return entry.count>10}
function csv(d){const rows=[['Tipo','Título','Fonte','Valor anunciado','Status','Data']];for(const t of d.tasks)rows.push(['Tarefa',t.title,t.source,t.value,t.status,t.updatedAt||t.createdAt||'']);return'\ufeff'+rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(';')).join('\r\n')}
async function handler(req,res){try{
const url=new URL(req.url,'http://localhost');
if(req.method==='GET'&&url.pathname==='/health'){return send(res,200,{ok:true,service:'wyncore',storage:'persistent-json',authConfigured:Boolean(PASSWORD&&SECRET)})}
if(req.method==='POST'&&url.pathname==='/api/login'){if(rateLimited(req))return send(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});const b=await body(req);if(!safeEqual(b.password||'',PASSWORD))return send(res,401,{error:'Senha incorreta.'});return send(res,200,{ok:true},{'Set-Cookie':cookie(makeSession(),SESSION_MS/1000)})}
if(req.method==='POST'&&url.pathname==='/api/logout'){return send(res,200,{ok:true},{'Set-Cookie':cookie('',0)})}
if(!url.pathname.startsWith('/api/')){const p=url.pathname==='/'?'/index.html':url.pathname;if(!PUBLIC_FILES.has(p))return send(res,404,{error:'Não encontrado'});const full=path.resolve(ROOT,'.'+p);try{const content=await fs.readFile(full);res.writeHead(200,{'Content-Type':MIME[path.extname(full)]||'application/octet-stream','Cache-Control':path.extname(full)==='.html'?'no-cache':'public, max-age=3600'});return res.end(content)}catch{return send(res,404,{error:'Arquivo não encontrado'})}}
if(!validSession(req))return send(res,401,{error:'Sessão expirada.'});
if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
const d=await load();
if(req.method==='GET'&&url.pathname==='/api/me')return send(res,200,{owner:true});
if(req.method==='GET'&&url.pathname==='/api/dashboard')return send(res,200,{opportunities:d.opportunities,tasks:d.tasks,events:d.events.slice(-100).reverse()});
if(req.method==='POST'&&url.pathname==='/api/opportunities'){const o=validateOpportunity(await body(req));d.opportunities.unshift(o);d.events.push({id:crypto.randomUUID(),type:'opportunity_created',itemId:o.id,at:new Date().toISOString()});await save(d);return send(res,201,o)}
const taskMatch=url.pathname.match(/^\/api\/tasks\/([\w-]+)$/);
if(req.method==='POST'&&url.pathname==='/api/tasks'){const b=await body(req),o=d.opportunities.find(x=>x.id===b.opportunityId);if(!o)return send(res,404,{error:'Oportunidade não encontrada.'});if(d.tasks.some(t=>t.opportunityId===o.id))return send(res,409,{error:'Tarefa já acompanhada.'});const t={id:crypto.randomUUID(),opportunityId:o.id,title:o.title,source:o.source,value:o.value,status:'Em análise',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};d.tasks.unshift(t);d.events.push({id:crypto.randomUUID(),type:'task_created',itemId:t.id,at:t.createdAt});await save(d);return send(res,201,t)}
if(req.method==='PATCH'&&taskMatch){const t=d.tasks.find(x=>x.id===taskMatch[1]);if(!t)return send(res,404,{error:'Tarefa não encontrada.'});const b=await body(req);if(!STATUSES.includes(b.status))return send(res,400,{error:'Status inválido.'});const previous=t.status;t.status=b.status;t.updatedAt=new Date().toISOString();d.events.push({id:crypto.randomUUID(),type:'status_changed',itemId:t.id,from:previous,to:t.status,at:t.updatedAt});await save(d);return send(res,200,t)}
if(req.method==='GET'&&url.pathname==='/api/report.csv'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="wyncore-relatorio.csv"','Cache-Control':'no-store'});return res.end(csv(d))}
return send(res,404,{error:'Rota não encontrada.'});
}catch(e){return send(res,e.status||500,{error:e.status?e.message:'Erro interno. Consulte os logs do servidor.'})}}
function createServer(){return http.createServer(handler)}
if(require.main===module){try{assertConfig();createServer().listen(PORT,'0.0.0.0',()=>process.stdout.write('WYNCORE listening on '+PORT+'\n'))}catch(e){process.stderr.write(e.message+'\n');process.exit(1)}}
module.exports={createServer,validateOpportunity,STATUSES,load,save};
