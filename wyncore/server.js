'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const D=require('./domain');
const ROOT=__dirname,DATA_DIR=process.env.DATA_DIR||path.join(ROOT,'data'),DATA_FILE=path.join(DATA_DIR,'wyncore.json');
const PORT=Number(process.env.PORT||3000),PASSWORD=process.env.WYNCORE_OWNER_PASSWORD||'',SECRET=process.env.WYNCORE_SESSION_SECRET||'',PROD=process.env.NODE_ENV==='production';
const COOKIE='wyncore_session',SESSION_MS=8*60*60*1000;
const PUBLIC_FILES=new Set(['/','/index.html','/styles.css','/app.js','/manifest.webmanifest','/icon.svg','/sw.js']);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const rate=new Map();
function assertConfig(){if(PASSWORD.length<12)throw Error('Configure WYNCORE_OWNER_PASSWORD com pelo menos 12 caracteres.');if(SECRET.length<32)throw Error('Configure WYNCORE_SESSION_SECRET com pelo menos 32 caracteres.')}
function safeEqual(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function sign(v){return crypto.createHmac('sha256',SECRET).update(v).digest('base64url')}
function makeSession(user){const p=JSON.stringify({exp:Date.now()+SESSION_MS,...user}),v=Buffer.from(p).toString('base64url');return v+'.'+sign(v)}
function readSession(req){const t=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!t)return null;const [v,s,...rest]=t.split('.');if(!v||!s||rest.length||!safeEqual(s,sign(v)))return null;try{const u=JSON.parse(Buffer.from(v,'base64url').toString());return u.exp>Date.now()?u:null}catch{return null}}
function cookie(v,age){return COOKIE+'='+v+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+age+(PROD?'; Secure':'')}
function send(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data))}
async function body(req){let raw='';for await(const c of req){raw+=c;if(raw.length>65536)throw Object.assign(Error('Corpo muito grande'),{status:413})}try{return raw?JSON.parse(raw):{}}catch{throw Object.assign(Error('JSON inválido'),{status:400})}}
async function load(){
 if(process.env.BLOB_READ_WRITE_TOKEN){
  const {get}=require('@vercel/blob');
  const found=await get('wyncore/data.json',{access:'private',useCache:false});
  if(!found)return D.ensureState({opportunities:[],tasks:[],events:[],users:[]});
  const raw=await new Response(found.stream).text();
  const d=JSON.parse(raw);
  return D.ensureState({...d,opportunities:d.opportunities||[],tasks:d.tasks||[],events:d.events||[],users:d.users||[]});
 }
 try{const d=JSON.parse(await fs.readFile(DATA_FILE,'utf8'));return D.ensureState({...d,opportunities:d.opportunities||[],tasks:d.tasks||[],events:d.events||[],users:d.users||[]})}catch(e){if(e.code!=='ENOENT')throw e;return D.ensureState({opportunities:[],tasks:[],events:[],users:[]})}
}
async function save(d){
 if(process.env.BLOB_READ_WRITE_TOKEN){
  const {put}=require('@vercel/blob');
  await put('wyncore/data.json',JSON.stringify(d),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
  return;
 }
 await fs.mkdir(DATA_DIR,{recursive:true});const tmp=DATA_FILE+'.tmp';await fs.writeFile(tmp,JSON.stringify(d,null,2),{mode:0o600});await fs.rename(tmp,DATA_FILE)
}
function err(message,status=400){throw Object.assign(Error(message),{status})}
const STATUSES=['Em análise','Inscrito','Em execução','Concluída, aguardando aprovação','Confirmada pelo contratante','Recebido','Descartada'];
function validateOpportunity(v){const title=String(v.title||'').trim().slice(0,90),source=String(v.source||'').trim().slice(0,90),value=Number(v.value),url=String(v.url||'').trim();if(!title||!source||!Number.isFinite(value)||value<0||value>10000000)err('Confira nome, fonte e valor.');if(url){let u;try{u=new URL(url)}catch{}if(!u||u.protocol!=='https:')err('O link precisa ser HTTPS válido.')}return{id:crypto.randomUUID(),title,source,value,url,status:'Registrada',createdAt:new Date().toISOString()}}
function originAllowed(req){const o=req.headers.origin;return !o||o===((PROD?'https':'http')+'://'+req.headers.host)}
function limited(req){const ip=req.socket.remoteAddress||'?',now=Date.now(),x=rate.get(ip)||{n:0,t:now};if(now-x.t>900000){x.n=0;x.t=now}x.n++;rate.set(ip,x);return x.n>10}
function hashPassword(p,salt=crypto.randomBytes(16).toString('hex')){return new Promise((resolve,reject)=>crypto.scrypt(String(p),salt,64,(e,k)=>e?reject(e):resolve(salt+':'+k.toString('hex'))))}
async function verifyPassword(p,stored){if(!stored||!stored.includes(':'))return false;const [salt,key]=stored.split(':');const got=await hashPassword(p,salt);return safeEqual(got.split(':')[1],key)}
function actor(session,d){if(!session)return null;if(session.role==='admin'&&session.id==='owner')return{id:'owner',role:'admin',email:'owner'};return d.participants.find(p=>p.id===session.id&&p.status==='active'&&p.role===session.role)||null}
async function handler(req,res){try{
 const url=new URL(req.url,'http://localhost'),p=url.pathname;
 if(req.method==='GET'&&p==='/health')return send(res,200,{ok:true,service:'wyncore',storage:'persistent-json',authConfigured:Boolean(PASSWORD&&SECRET)});
 if(req.method==='POST'&&p==='/api/access-request'){
  if(limited(req))return send(res,429,{error:'Muitas tentativas. Aguarde.'});if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
  const b=await body(req),name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),pass=String(b.password||'');
  if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||pass.length<10)err('Informe nome, e-mail válido e senha com pelo menos 10 caracteres.');
  const d=await load();if(d.users.some(u=>u.email===email)||d.participants.some(u=>u.email===email))err('Este e-mail já está cadastrado.',409);
  const person=D.requestAccess(d,{name,email});d.users.push({id:person.id,email,passwordHash:await hashPassword(pass)});await save(d);return send(res,201,{ok:true,message:'Cadastro recebido. Aguarde a liberação da equipe.'});
 }
 if(req.method==='POST'&&p==='/api/login'){
  if(limited(req))return send(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
  const b=await body(req);let user=null;
  if(PASSWORD&&safeEqual(b.password||'',PASSWORD))user={id:'owner',role:'admin',email:'owner'};
  else {const d=await load(),u=d.users.find(x=>x.email===String(b.email||'').trim().toLowerCase());if(u&&await verifyPassword(b.password||'',u.passwordHash)){const person=d.participants.find(x=>x.id===u.id);if(!person||person.status!=='active')return send(res,403,{error:'Cadastro aguardando aprovação da equipe.'});user={id:person.id,role:person.role,email:person.email}}}
  if(!user)return send(res,401,{error:'E-mail ou senha incorretos.'});return send(res,200,{ok:true},{'Set-Cookie':cookie(makeSession(user),SESSION_MS/1000)});
 }
 if(req.method==='POST'&&p==='/api/logout')return send(res,200,{ok:true},{'Set-Cookie':cookie('',0)});
 if(!p.startsWith('/api/')){const file=p==='/'?'/index.html':p;if(!PUBLIC_FILES.has(file))return send(res,404,{error:'Não encontrado'});const full=path.resolve(ROOT,'.'+file);try{const data=await fs.readFile(full);res.writeHead(200,{'Content-Type':MIME[path.extname(full)]||'application/octet-stream','Cache-Control':path.extname(full)==='.html'?'no-cache':'public, max-age=3600'});return res.end(data)}catch{return send(res,404,{error:'Arquivo não encontrado'})}}
 if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
 const session=readSession(req);if(!session)return send(res,401,{error:'Sessão expirada.'});
 const d=await load(),me=actor(session,d);if(!me)return send(res,403,{error:'Conta inativa ou sem permissão.'});
 if(req.method==='GET'&&p==='/api/me')return send(res,200,{id:me.id,role:me.role,email:me.email,name:me.name||'Administrador'});
 if(req.method==='GET'&&p==='/api/dashboard'){
  if(me.role==='admin')return send(res,200,{...D.snapshot(d,me),opportunities:d.opportunities,tasks:d.tasks,events:d.events.slice(-100).reverse()});
  return send(res,200,D.snapshot(d,me));
 }
 if(req.method==='GET'&&p==='/api/management')return send(res,200,D.snapshot(d,me));
 if(req.method==='POST'&&p==='/api/opportunities'){if(me.role!=='admin')err('Somente administrador.',403);const o=validateOpportunity(await body(req));d.opportunities.unshift(o);d.events.push({id:crypto.randomUUID(),type:'opportunity_created',itemId:o.id,at:new Date().toISOString()});await save(d);return send(res,201,o)}
 if(req.method==='POST'&&p==='/api/tasks'){if(me.role!=='admin')err('Somente administrador.',403);const b=await body(req),o=d.opportunities.find(x=>x.id===b.opportunityId);if(!o)return send(res,404,{error:'Oportunidade não encontrada.'});if(d.tasks.some(t=>t.opportunityId===o.id))return send(res,409,{error:'Tarefa já acompanhada.'});const t={id:crypto.randomUUID(),opportunityId:o.id,title:o.title,source:o.source,value:o.value,status:'Em análise',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};d.tasks.unshift(t);await save(d);return send(res,201,t)}
 let legacy=p.match(/^\/api\/tasks\/([\w-]+)$/);if(req.method==='PATCH'&&legacy){if(me.role!=='admin')err('Somente administrador.',403);const t=d.tasks.find(x=>x.id===legacy[1]);if(!t)return send(res,404,{error:'Tarefa não encontrada.'});const b=await body(req);if(!STATUSES.includes(b.status))err('Status inválido.');t.status=b.status;t.updatedAt=new Date().toISOString();await save(d);return send(res,200,t)}

 if(req.method==='POST'&&p==='/api/participants/approve'){const b=await body(req);if(me.role!=='admin')err('Somente administrador pode liberar participantes e definir cargos.',403);const person=D.approveParticipant(d,me,String(b.participantId||''),b.role||'participant');await save(d);return send(res,200,person)}
 if(req.method==='POST'&&p==='/api/programs'){const x=D.createProgram(d,me,await body(req));await save(d);return send(res,201,x)}
 m=p.match(/^\/api\/programs\\/([\w-]+)\\/request$/);if(req.method==='POST'&&m){const x=D.requestProgram(d,me,m[1]);await save(d);return send(res,201,x)}
 m=p.match(/^\/api\/assignments\\/([\w-]+)\\/accept$/);if(req.method==='POST'&&m){const x=D.approveProgramRequest(d,me,m[1]);await save(d);return send(res,200,x)}
 let m=p.match(/^\/api\/programs\/([\w-]+)\/assign$/);if(req.method==='POST'&&m){const b=await body(req),x=D.assignProgram(d,me,m[1],String(b.participantId||''));await save(d);return send(res,201,x)}
 m=p.match(/^\/api\/assignments\/([\w-]+)\/submit$/);if(req.method==='POST'&&m){const b=await body(req),x=D.submitAssignment(d,me,m[1],b.proof);await save(d);return send(res,200,x)}
 m=p.match(/^\/api\/assignments\/([\w-]+)\/review$/);if(req.method==='POST'&&m){const b=await body(req),x=D.reviewAssignment(d,me,m[1],b.decision,b.note);await save(d);return send(res,200,x)}
 m=p.match(/^\/api\/assignments\/([\w-]+)\/payment$/);if(req.method==='POST'&&m){const b=await body(req),x=D.recordPayment(d,me,m[1],b.reference);await save(d);return send(res,200,x)}
 if(req.method==='POST'&&p==='/api/referrals'){const b=await body(req),x=D.addReferral(d,me,b.email);await save(d);return send(res,201,x)}
 if(req.method==='GET'&&p==='/api/report.csv'){if(me.role==='participant')err('Relatório restrito à equipe.',403);const rows=[['Participante','Atividade','Estado','Valor registrado','Referência','Data'],...d.tasks.map(t=>['',t.title,t.status,t.value,'',t.updatedAt||t.createdAt]),...d.assignments.map(a=>[d.participants.find(x=>x.id===a.participantId)?.email||'',d.programs.find(x=>x.id===a.programId)?.title||'',a.state,a.reward,a.paymentReference||'',a.paidAt||a.createdAt])];res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="wyncore-relatorio.csv"','Cache-Control':'no-store'});return res.end('\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n'))}
 return send(res,404,{error:'Rota não encontrada.'});
 }catch(e){return send(res,e.status||500,{error:e.status?e.message:'Erro interno. Consulte os logs do servidor.'})}}
function createServer(){return http.createServer(handler)}
if(require.main===module){try{assertConfig();createServer().listen(PORT,'0.0.0.0',()=>process.stdout.write('WYNCORE listening on '+PORT+'\n'))}catch(e){process.stderr.write(e.message+'\n');process.exit(1)}}
module.exports={createServer,handler,load,save,hashPassword,verifyPassword,validateOpportunity,STATUSES};
