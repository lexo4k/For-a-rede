'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const D=require('./domain'),Asaas=require('./asaas'),Adscend=require('./adscend'),Paypal=require('./paypal');
const ROOT=__dirname,DATA_DIR=process.env.DATA_DIR||path.join(ROOT,'data'),DATA_FILE=path.join(DATA_DIR,'wyncore.json');
const PORT=Number(process.env.PORT||3000),PASSWORD=process.env.WYNCORE_OWNER_PASSWORD||'',SECRET=process.env.WYNCORE_SESSION_SECRET||'',PARTNER_SECRET=process.env.WYNCORE_PARTNER_WEBHOOK_SECRET||'',GOOGLE_CLIENT_ID=process.env.WYNCORE_GOOGLE_CLIENT_ID||'',PROD=process.env.NODE_ENV==='production';
const COOKIE='wyncore_session',SESSION_MS=8*60*60*1000;
const PUBLIC_FILES=new Set(['/','/index.html','/anunciantes.html','/styles.css','/app.js','/manifest.webmanifest','/icon.svg','/sw.js','/sobre.html','/privacidade.html','/termos.html','/robots.txt','/sitemap.xml','/guia-aprendizagem.html','/guia-estagio.html','/seguranca-oportunidades.html','/organizar-candidatura.html','/ads.html','/ads.css','/ads.js','/work.html','/work.css','/work.js']);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const rate=new Map();
function normalizePhone(value){let digits=String(value||'').replace(/\D/g,'');if(digits.startsWith('55')&&(digits.length===12||digits.length===13))digits=digits.slice(2);return digits;}
function isPlayableAdMedia(value){try{const u=new URL(String(value||''));if(u.protocol!=='https:'||u.username||u.password)return false;const host=u.hostname.toLowerCase();if(host==='youtu.be'||host==='youtube.com'||host.endsWith('.youtube.com')){const id=host==='youtu.be'?u.pathname.split('/').filter(Boolean)[0]:(u.pathname.startsWith('/embed/')?u.pathname.split('/')[2]:u.searchParams.get('v'));return /^[A-Za-z0-9_-]{11}$/.test(id||'')}if(host==='vimeo.com'||host.endsWith('.vimeo.com'))return /^\d+$/.test(u.pathname.split('/').filter(Boolean).pop()||'');return ['mp4','webm','ogg'].includes(u.pathname.toLowerCase().split('.').pop())}catch{return false}}
function assertConfig(){if(PASSWORD.length<12)throw Error('Configure WYNCORE_OWNER_PASSWORD com pelo menos 12 caracteres.');if(SECRET.length<32)throw Error('Configure WYNCORE_SESSION_SECRET com pelo menos 32 caracteres.')}
function safeEqual(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function secretKey(){return crypto.createHash('sha256').update(SECRET).digest()}
function encryptSecret(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',secretKey(),iv),encrypted=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.')}
function decryptSecret(value){const [iv,tag,data]=String(value||'').split('.');if(!iv||!tag||!data)throw Error('Chave Pix criptografada inválida.');const decipher=crypto.createDecipheriv('aes-256-gcm',secretKey(),Buffer.from(iv,'base64url'));decipher.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8')}
function sign(v){return crypto.createHmac('sha256',SECRET).update(v).digest('base64url')}
function makeSession(user){const p=JSON.stringify({exp:Date.now()+SESSION_MS,...user}),v=Buffer.from(p).toString('base64url');return v+'.'+sign(v)}
function readSession(req){const t=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!t)return null;const [v,s,...rest]=t.split('.');if(!v||!s||rest.length||!safeEqual(s,sign(v)))return null;try{const u=JSON.parse(Buffer.from(v,'base64url').toString());return u.exp>Date.now()?u:null}catch{return null}}
function cookie(v,age){return COOKIE+'='+v+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+age+(PROD?'; Secure':'')}
function send(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data))}
async function rawBody(req){let raw='';for await(const c of req){raw+=c;if(raw.length>65536)throw Object.assign(Error('Corpo muito grande'),{status:413})}return raw}
async function body(req){const raw=await rawBody(req);try{return raw?JSON.parse(raw):{}}catch{throw Object.assign(Error('JSON inválido'),{status:400})}}
async function load(){
 if(process.env.BLOB_READ_WRITE_TOKEN){
  const {get}=require('@vercel/blob');
  const found=await get('wyncore/data.json',{access:'private',useCache:false});
  if(!found)return D.ensureState({opportunities:[],tasks:[],events:[],users:[],workAccounts:[],workTasks:[],workLedger:[],adCampaigns:[],adReviews:[],adEarnings:[],advertiserInquiries:[],asaasWebhookEvents:[]});
  const raw=await new Response(found.stream).text();
  const d=JSON.parse(raw);
  return D.ensureState({...d,opportunities:d.opportunities||[],tasks:d.tasks||[],events:d.events||[],users:d.users||[],workAccounts:d.workAccounts||[],workTasks:d.workTasks||[],workLedger:d.workLedger||[],adCampaigns:d.adCampaigns||[],adReviews:d.adReviews||[],adEarnings:d.adEarnings||[],advertiserInquiries:d.advertiserInquiries||[],asaasWebhookEvents:d.asaasWebhookEvents||[]});
 }
 try{const d=JSON.parse(await fs.readFile(DATA_FILE,'utf8'));return D.ensureState({...d,opportunities:d.opportunities||[],tasks:d.tasks||[],events:d.events||[],users:d.users||[],workAccounts:d.workAccounts||[],workTasks:d.workTasks||[],workLedger:d.workLedger||[],adCampaigns:d.adCampaigns||[],adReviews:d.adReviews||[],advertiserInquiries:d.advertiserInquiries||[]})}catch(e){if(e.code!=='ENOENT')throw e;return D.ensureState({opportunities:[],tasks:[],events:[],users:[],workAccounts:[],workTasks:[],workLedger:[],adCampaigns:[],adReviews:[],adEarnings:[],advertiserInquiries:[],asaasWebhookEvents:[]})}
}
async function notifyAdvertiserLead(lead){
 const apiKey=process.env.RESEND_API_KEY||'',from=process.env.WYNCORE_LEADS_FROM||'',to=process.env.WYNCORE_LEADS_TO||'';
 if(!apiKey||!from||!to)return {status:'not_configured'};
 const textBody=[
  'Nova solicitação comercial WYNCORE',
  'Empresa: '+lead.company,
  'Responsável: '+lead.contact,
  'E-mail: '+lead.email,
  'Telefone: '+lead.phone,
  'CPF/CNPJ: '+(lead.cpfCnpj||'não informado'),
  'Orçamento estimado: R$ '+Number(lead.budget||0).toFixed(2),
  'Formato: '+lead.channel,
  'Material: '+(lead.mediaUrl||'não informado'),
  'Objetivo: '+lead.objective,
  'Lead ID: '+lead.id
 ].join('\n');
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:'Novo lead WYNCORE: '+lead.company,text:textBody}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)return {status:'failed'};
  return {status:'sent'};
 }catch{return {status:'failed'}}
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
function limited(req,scope,identity,limit=10,windowMs=900000){const forwarded=String(req.headers?.['x-forwarded-for']||'').split(',')[0].trim(),socket=req.socket||{},ip=socket.remoteAddress||req.ip||forwarded||'unknown',now=Date.now(),id=String(identity||'').trim().toLowerCase()||'unknown',ipKey='ip:'+scope+':'+ip,idKey='id:'+scope+':'+ip+':'+crypto.createHash('sha256').update(id).digest('hex').slice(0,20);if(rate.size>5000)for(const[k,v]of rate)if(now-v.t>windowMs*2)rate.delete(k);const bump=(key,max)=>{const x=rate.get(key)||{n:0,t:now};if(now-x.t>windowMs){x.n=0;x.t=now}x.n++;rate.set(key,x);return x.n>max};return bump(ipKey,120)||bump(idKey,limit);}
function hashPassword(p,salt=crypto.randomBytes(16).toString('hex')){return new Promise((resolve,reject)=>crypto.scrypt(String(p),salt,64,(e,k)=>e?reject(e):resolve(salt+':'+k.toString('hex'))))}
async function verifyPassword(p,stored){if(!stored||!stored.includes(':'))return false;const [salt,key]=stored.split(':');const got=await hashPassword(p,salt);return safeEqual(got.split(':')[1],key)}
function actor(session,d){if(!session)return null;if(session.role==='admin'&&session.id==='owner')return{id:'owner',role:'admin',email:'owner'};return d.participants.find(p=>p.id===session.id&&p.status==='active'&&p.role===session.role)||null}
async function handler(req,res){try{
 const url=new URL(req.url,'http://localhost');let p=url.pathname;if(p!=='/'&&!p.startsWith('/api/')&&!PUBLIC_FILES.has(p)&&p!=='/health'&&!/\.[a-z0-9]+$/i.test(p))p='/api'+p;
 if(req.method==='GET'&&(p==='/health'||p==='/api/health'))return send(res,200,{ok:true,service:'WYNCORE',storage:process.env.BLOB_READ_WRITE_TOKEN?'vercel-blob-private':'persistent-json',authConfigured:Boolean(PASSWORD&&SECRET.length>=32),ownerLoginConfigured:Boolean(PASSWORD),participantLoginConfigured:SECRET.length>=32,phoneLoginEnabled:SECRET.length>=32,googleEnabled:Boolean(GOOGLE_CLIENT_ID),googleClientId:GOOGLE_CLIENT_ID||null,signupAvailable:true,publicAccess:true});
 if(req.method==='POST'&&p==='/api/access-request'){
  if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
  const b=await body(req),name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),phone=normalizePhone(b.phone),pass=String(b.password||'');if(limited(req,'signup',email||phone,5,3600000))return send(res,429,{error:'Muitas tentativas de cadastro para este contato. Aguarde um pouco.'});
  if(name.length<2||phone.length<10||phone.length>13||(email&&!/^\S+@\S+\.\S+$/.test(email))||pass.length<10)err('Para criar uma conta, informe nome, celular com DDD e senha com pelo menos 10 caracteres. O e-mail é opcional.');
  const d=await load();if(d.users.some(u=>(email&&u.email===email)||(phone&&normalizePhone(u.phone)===phone))||d.participants.some(u=>(email&&u.email===email)||(phone&&normalizePhone(u.phone)===phone)))err('Este e-mail ou telefone já está cadastrado.',409);
  const person=D.requestAccess(d,{name,email,phone});d.users.push({id:person.id,email,phone,passwordHash:await hashPassword(pass)});await save(d);return send(res,201,{ok:true,message:'Cadastro recebido. Aguarde a liberação da equipe.'});
 }

 if(req.method==='POST'&&p==='/api/webhooks/asaas'){
  const token=req.headers['asaas-access-token'];
  if(!Asaas.verifyWebhook(token))return send(res,401,{error:'Webhook Asaas não autenticado.'});
  const event=await body(req),eventId=String(event.id||''),type=String(event.event||''),d=await load();
  d.asaasWebhookEvents||=[];
  if(!eventId)return send(res,400,{error:'Evento sem identificador.'});
  if(d.asaasWebhookEvents.includes(eventId))return send(res,200,{ok:true,duplicate:true});
  const payment=event.payment||{},transfer=event.transfer||{};
  if(type==='PAYMENT_RECEIVED'&&String(payment.externalReference||'').startsWith('wyncore-campaign:')){
   const campaignId=String(payment.externalReference).slice('wyncore-campaign:'.length);
   const campaign=(d.adCampaigns||[]).find(x=>x.id===campaignId);
   if(campaign&&String(payment.id)===String(campaign.asaasPaymentId)&&Number(payment.value)>=Number(campaign.contractValue)){
    campaign.contractStatus='received';campaign.contractReference=payment.id;campaign.receivedAt=new Date().toISOString();campaign.updatedAt=campaign.receivedAt;
   }
  }
  if(['TRANSFER_DONE','TRANSFER_FAILED','TRANSFER_CANCELLED'].includes(type)&&String(transfer.externalReference||'').startsWith('wyncore-earning:')){
   const earningId=String(transfer.externalReference).slice('wyncore-earning:'.length);
   const earning=(d.adEarnings||[]).find(x=>x.id===earningId&&String(x.asaasTransferId)===String(transfer.id));
   if(earning){
    if(type==='TRANSFER_DONE'){earning.status='paid';earning.paidAt=new Date().toISOString();earning.paymentReference=transfer.id;}
    else{earning.status='approved_unpaid';earning.payoutError=String(transfer.failReason||type).slice(0,300);}
    earning.updatedAt=new Date().toISOString();
   }
  }
  d.asaasWebhookEvents.push(eventId);if(d.asaasWebhookEvents.length>5000)d.asaasWebhookEvents=d.asaasWebhookEvents.slice(-4000);
  await save(d);return send(res,200,{ok:true});
 }

 if(!p.startsWith('/api/')){const file=p==='/'?'/index.html':p;if(!PUBLIC_FILES.has(file))return send(res,404,{error:'Não encontrado'});const full=path.resolve(ROOT,'.'+file);try{const data=await fs.readFile(full);const extension=path.extname(full);const cachePolicy=['.html','.js','.css','.webmanifest'].includes(extension)?'no-cache':'public, max-age=3600';res.writeHead(200,{'Content-Type':MIME[extension]||'application/octet-stream','Cache-Control':cachePolicy});return res.end(data)}catch{return send(res,404,{error:'Arquivo não encontrado'})}}
 if(req.method==='POST'&&p==='/api/advertiser-inquiries'){
  if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
  if(limited(req,'advertiser-inquiry',String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown'),5,3600000))return send(res,429,{error:'Limite de solicitações atingido. Tente novamente mais tarde.'});
  const b=await body(req),company=String(b.company||'').trim().slice(0,140),contact=String(b.contact||'').trim().slice(0,100),email=String(b.email||'').trim().toLowerCase().slice(0,160),phone=normalizePhone(b.phone),cpfCnpj=String(b.cpfCnpj||'').replace(/\\D/g,'').slice(0,14),objective=String(b.objective||'').trim().slice(0,1800),budget=Number(b.budget||0),channel=String(b.channel||'video'),mediaUrl=String(b.mediaUrl||'').trim().slice(0,2000);
  if(company.length<2||contact.length<2||!/^\S+@\S+\.\S+$/.test(email)||phone.length<10||objective.length<30||!Number.isFinite(budget)||budget<0||budget>100000000||!['digital','video','social','display','other'].includes(channel))err('Informe empresa, responsável, e-mail válido, telefone, objetivo detalhado, formato e orçamento válido.');
  if(mediaUrl){let u;try{u=new URL(mediaUrl)}catch{}if(!u||u.protocol!=='https:'||u.username||u.password)err('O link do material precisa ser HTTPS válido.');}
  const d=await load();const lead={id:crypto.randomUUID(),company,contact,email,phone,cpfCnpj,objective,budget,channel,mediaUrl,status:'new',createdAt:new Date().toISOString()};d.advertiserInquiries.unshift(lead);await save(d);lead.notificationStatus=await notifyAdvertiserLead(lead);await save(d);return send(res,201,{ok:true,message:'Solicitação recebida. A equipe comercial fará a análise e entrará em contato.'});
 }
 if(SECRET.length<32)return send(res,503,{error:'A autenticação de sessão ainda não está configurada no servidor. O pedido de cadastro pode ser recebido, mas a entrada ficará indisponível até a configuração.'});
 if(p==='/api/work'){
  if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
  const d=await load();d.workAccounts||=[];d.workTasks||=[];d.workLedger||=[];
  let b={},action=String(url.searchParams.get('action')||'');
  if(['POST','PATCH','DELETE'].includes(req.method)){b=await body(req);action=String(b.action||action)}
  if(req.method==='GET'&&action==='health')return send(res,200,{ok:true,service:'WYNCORE Work',accountRegistration:true,privatePerAccountStorage:true,externalPlatformsPayWorkersDirectly:true});
  if(req.method==='POST'&&action==='register'){
   const name=String(b.name||'').trim().slice(0,90),email=String(b.email||'').trim().toLowerCase(),pass=String(b.password||'');
   if(limited(req,'work-register',email,5,3600000))return send(res,429,{error:'Muitas tentativas de cadastro. Aguarde uma hora.'});
   if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||pass.length<10)err('Informe nome, e-mail válido e senha com pelo menos 10 caracteres.');
   if(d.workAccounts.some(x=>x.email===email))err('Este e-mail já possui uma conta WYNCORE Work.',409);
   const account={id:crypto.randomUUID(),name,email,passwordHash:await hashPassword(pass),createdAt:new Date().toISOString()};
   d.workAccounts.push(account);await save(d);
   const user={id:account.id,role:'work',email:account.email,name:account.name};
   return send(res,201,{ok:true,user},{'Set-Cookie':cookie(makeSession(user),SESSION_MS/1000)});
  }
  if(req.method==='POST'&&action==='login'){
   const email=String(b.email||'').trim().toLowerCase(),pass=String(b.password||'');
   if(limited(req,'work-login',email,10,900000))return send(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
   const account=d.workAccounts.find(x=>x.email===email);
   if(!account||!await verifyPassword(pass,account.passwordHash))return send(res,401,{error:'E-mail ou senha incorretos.'});
   const user={id:account.id,role:'work',email:account.email,name:account.name};
   return send(res,200,{ok:true,user},{'Set-Cookie':cookie(makeSession(user),SESSION_MS/1000)});
  }
  if(req.method==='POST'&&action==='logout')return send(res,200,{ok:true},{'Set-Cookie':cookie('',0)});
  const session=readSession(req);
  if(!session||session.role!=='work')return send(res,401,{error:'Entre na sua conta WYNCORE Work.'});
  const account=d.workAccounts.find(x=>x.id===session.id);
  if(!account)return send(res,401,{error:'Conta não encontrada. Entre novamente.'});
  if(req.method==='GET'&&action==='me')return send(res,200,{id:account.id,name:account.name,email:account.email});
  if(req.method==='GET'&&action==='tasks')return send(res,200,{tasks:d.workTasks.filter(x=>x.accountId===account.id)});
  if(req.method==='POST'&&action==='create-task'){
   const title=String(b.title||'').trim().slice(0,120),platform=String(b.platform||'').trim().slice(0,50),note=String(b.note||'').trim().slice(0,500),urlValue=String(b.url||'').trim(),status=String(b.status||'saved');
   if(title.length<2||!platform||!['saved','started','submitted','done'].includes(status))err('Confira título, plataforma e status.');
   let taskUrl='';if(urlValue){let u;try{u=new URL(urlValue)}catch{}if(!u||u.protocol!=='https:')err('O link precisa ser HTTPS válido.');taskUrl=u.href}
   const task={id:crypto.randomUUID(),accountId:account.id,title,platform,note,url:taskUrl,status,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   d.workTasks.unshift(task);await save(d);return send(res,201,{task});
  }
  if(['PATCH','DELETE'].includes(req.method)&&['update-task','delete-task'].includes(action)){
   const task=d.workTasks.find(x=>x.id===String(b.taskId||'')&&x.accountId===account.id);
   if(!task)return send(res,404,{error:'Tarefa não encontrada.'});
   if(req.method==='PATCH'&&action==='update-task'){
    if(b.status!==undefined){if(!['saved','started','submitted','done'].includes(b.status))err('Status inválido.');task.status=b.status}
    if(b.note!==undefined)task.note=String(b.note||'').trim().slice(0,500);
    task.updatedAt=new Date().toISOString();await save(d);return send(res,200,{task});
   }
   if(req.method==='DELETE'&&action==='delete-task'){d.workTasks=d.workTasks.filter(x=>x.id!==task.id);await save(d);return send(res,200,{ok:true})}
  }
  if(req.method==='GET'&&action==='earnings'){
   const items=d.workLedger.filter(x=>x.accountId===account.id);
   return send(res,200,{items,summary:{reported:items.reduce((n,x)=>n+Number(x.amount||0),0),received:items.filter(x=>x.status==='received').reduce((n,x)=>n+Number(x.amount||0),0)}});
  }
  if(req.method==='POST'&&action==='create-earning'){
   const platform=String(b.platform||'').trim().slice(0,50),description=String(b.description||'').trim().slice(0,120),amount=Number(b.amount),status=String(b.status||'reported'),reference=String(b.reference||'').trim().slice(0,120);
   if(!platform||description.length<2||!Number.isFinite(amount)||amount<=0||amount>1000000||!['reported','received'].includes(status))err('Informe plataforma, descrição e valor válido.');
   if(status==='received'&&reference.length<4)err('Para marcar como recebido, informe uma referência pessoal do comprovante.');
   const item={id:crypto.randomUUID(),accountId:account.id,platform,description,amount:Math.round(amount*100)/100,status,reference,createdAt:new Date().toISOString(),manual:true};
   d.workLedger.unshift(item);await save(d);return send(res,201,{item});
  }
  return send(res,404,{error:'Ação Work não encontrada.'});
 } if(req.method==='POST'&&p==='/api/google-login'){
  if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
  if(!GOOGLE_CLIENT_ID)return send(res,503,{error:'O acesso Google ainda aguarda a configuração do Client ID OAuth no servidor.'});
  const b=await body(req),credential=String(b.credential||'');if(!credential||credential.length>12000)return send(res,400,{error:'Credencial Google inválida.'});
  if(limited(req,'google-login',credential.slice(0,80),10,900000))return send(res,429,{error:'Muitas tentativas de acesso. Aguarde 15 minutos.'});
  let profile;try{const verify=await fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(credential),{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!verify.ok)return send(res,401,{error:'Não foi possível validar sua conta Google.'});profile=await verify.json()}catch{return send(res,503,{error:'O serviço de autenticação Google está temporariamente indisponível.'})}
  if(profile.aud!==GOOGLE_CLIENT_ID||!profile.sub||!profile.email||profile.email_verified!=='true'||!['accounts.google.com','https://accounts.google.com'].includes(profile.iss)||Number(profile.exp)*1000<=Date.now())return send(res,401,{error:'A identidade Google não passou na validação.'});
  const d=await load(),email=String(profile.email).toLowerCase(),sub=String(profile.sub);
  let record=d.users.find(x=>x.googleSub===sub||x.email===email),person=record&&d.participants.find(x=>x.id===record.id);
  if(!person){person=d.participants.find(x=>x.email===email);if(person){record=d.users.find(x=>x.id===person.id)||{id:person.id,email,phone:person.phone||''};if(!d.users.some(x=>x.id===record.id))d.users.push(record)}else{person=D.requestAccess(d,{name:String(profile.name||email.split('@')[0]).slice(0,100),email,phone:''});record={id:person.id,email,phone:'',googleSub:sub};d.users.push(record)}}
  record.googleSub=sub;record.email=email;
  if(person.status!=='active'){await save(d);return send(res,202,{ok:true,pending:true,message:'Conta Google reconhecida. Seu pedido de acesso foi enviado e aguarda aprovação da equipe.'})}
  person.lastLoginAt=new Date().toISOString();person.lastLoginMethod='google';await save(d);
  const user={id:person.id,role:person.role,email:person.email,phone:person.phone};
  return send(res,200,{ok:true},{'Set-Cookie':cookie(makeSession(user),SESSION_MS/1000)});
 }
 if(req.method==='POST'&&p==='/api/integrations/campaigns'){
  if(!PARTNER_SECRET)return send(res,503,{error:'Integração de parceiros ainda não configurada no servidor.'});
  const raw=await rawBody(req),provided=String(req.headers['x-wyncore-signature']||'').replace(/^sha256=/,'').toLowerCase(),expected=crypto.createHmac('sha256',PARTNER_SECRET).update(raw).digest('hex');
  if(!provided||!safeEqual(provided,expected))return send(res,401,{error:'Assinatura do parceiro inválida.'});
  let payload;try{payload=raw?JSON.parse(raw):{}}catch{return send(res,400,{error:'JSON inválido.'})}
  const d=await load(),partner={id:'partner-webhook',role:'manager'};
  const campaign=D.createProgram(d,partner,{title:payload.title,source:payload.sponsor,sponsor:payload.sponsor,reward:payload.reward,budget:payload.budget,url:payload.url,videoUrl:payload.videoUrl});
  await save(d);return send(res,201,{ok:true,campaignId:campaign.id,status:campaign.status,message:'Campanha importada e aguardando conferência de financiamento.'});
 }
 if(req.method==='POST'&&p==='/api/integrations/conversions'){
  const conversionSecret=process.env.WYNCORE_CONVERSION_SECRET||'';
  if(!conversionSecret)return send(res,503,{error:'Webhook de conversões ainda não configurado.'});
  const raw=await rawBody(req),provided=String(req.headers['x-wyncore-signature']||'').replace(/^sha256=/,'').toLowerCase(),expected=crypto.createHmac('sha256',conversionSecret).update(raw).digest('hex');
  if(!provided||!safeEqual(provided,expected))return send(res,401,{error:'Assinatura da conversão inválida.'});
  let event;try{event=raw?JSON.parse(raw):{}}catch{return send(res,400,{error:'JSON inválido.'})}
  const d=await load(),result=D.recordPartnerConversion(d,event);await save(d);
  return send(res,result.duplicate?200:201,{ok:true,duplicate:result.duplicate,conversion:result.conversion});
 }
 if(req.method==='POST'&&p==='/api/login'){
  if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
  const b=await body(req),identifier=String(b.identifier||b.email||'').trim();if(limited(req,'login',identifier,10,900000))return send(res,429,{error:'Muitas tentativas para esta conta. Aguarde 15 minutos.'});let user=null,d=null,person=null;
  if(identifier.trim().toLowerCase()==='admin'&&PASSWORD&&safeEqual(b.password||'',PASSWORD))user={id:'owner',role:'admin',email:'owner'};
  else {d=await load();const normalized=identifier.toLowerCase(),digits=normalizePhone(identifier),u=d.users.find(x=>(normalized.includes('@')&&x.email===normalized)||(digits.length>=10&&normalizePhone(x.phone)===digits));if(u&&await verifyPassword(b.password||'',u.passwordHash)){person=d.participants.find(x=>x.id===u.id);if(!person||person.status!=='active')return send(res,403,{error:'Cadastro aguardando aprovação da equipe.'});person.lastLoginAt=new Date().toISOString();person.lastLoginMethod=digits.length>=10?'phone':'email';user={id:person.id,role:person.role,email:person.email,phone:person.phone};await save(d)}}
  if(!user)return send(res,401,{error:'E-mail ou senha incorretos.'});return send(res,200,{ok:true},{'Set-Cookie':cookie(makeSession(user),SESSION_MS/1000)});
 }
 if(req.method==='POST'&&p==='/api/logout')return send(res,200,{ok:true},{'Set-Cookie':cookie('',0)});
 if(!originAllowed(req))return send(res,403,{error:'Origem não permitida.'});
 const session=readSession(req);if(!session)return send(res,401,{error:'Sessão expirada.'});
 const d=await load(),me=actor(session,d);if(!me)return send(res,403,{error:'Conta inativa ou sem permissão.'});
 if(req.method==='GET'&&p==='/api/me')return send(res,200,{id:me.id,role:me.role,email:me.email,name:me.name||'Administrador'});
 if(req.method==='GET'&&p==='/api/integrations/status'){if(me.role!=='admin')err('Somente administrador.',403);return send(res,200,{adscend:{configured:Adscend.configured(),provider:'Adscend Media',product:'Rewarded Video',countryAware:true,postbackConfigured:Adscend.postbackConfigured(),reason:Adscend.configured()?'API conectável; inventário e liberação de Rewarded Video dependem da aprovação e ativação pela Adscend.':'Configure ADSCEND_PUBLISHER_ID e ADSCEND_API_KEY após aprovação do publisher.'},advertisingNetwork:{configured:Adscend.configured(),conversionValidation:Boolean(process.env.ADSCEND_POSTBACK_SECRET),reason:'Inventário regional depende do país, da conta aprovada e das categorias liberadas.'},partnerCampaignWebhook:{configured:Boolean(PARTNER_SECRET),conversionValidation:Boolean(process.env.WYNCORE_CONVERSION_SECRET),reason:'A importação de campanhas depende de contrato e credenciais emitidas pelo parceiro.'},pix:{provider:'Asaas',providerConfigured:Asaas.configured(),webhookConfigured:Asaas.webhookConfigured(),payoutsEnabled:Asaas.configured(),bankVerification:Asaas.configured()&&Asaas.webhookConfigured(),reason:Asaas.configured()?'Asaas conectado; confirme webhook e saldo disponível para liberar pagamentos reais.':'Configure ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN no ambiente do servidor.'},paypal:{provider:'PayPal Payouts',configured:Paypal.configured(),mode:Paypal.mode,reason:Paypal.configured()?'Credenciais presentes; teste sandbox e elegibilidade do país ainda são necessários.':'Configure PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET e PAYPAL_MODE no servidor.'},automaticPaymentTransfers:Asaas.configured()&&Asaas.webhookConfigured()});}
 if(req.method==='POST'&&p==='/api/campaign-feedback'){if(me.role!=='participant')err('Somente participantes podem avaliar campanhas.',403);if(limited(req,'campaign-feedback',me.id,30,3600000))return send(res,429,{error:'Limite de avaliações atingido. Tente novamente mais tarde.'});const b=await body(req),programId=String(b.programId||''),rating=Number(b.rating),comment=String(b.comment||'').trim().slice(0,300),program=d.programs.find(x=>x.id===programId&&x.status==='active'&&x.videoUrl);if(!program)err('Campanha de vídeo indisponível.',404);if(!Number.isInteger(rating)||rating<1||rating>5)err('Escolha uma avaliação entre 1 e 5.');let feedback=d.campaignFeedback.find(x=>x.programId===programId&&x.participantId===me.id);const now=new Date().toISOString();if(feedback){feedback.rating=rating;feedback.comment=comment;feedback.updatedAt=now;await save(d);return send(res,200,{ok:true,feedback,updated:true})}feedback={id:crypto.randomUUID(),programId,participantId:me.id,rating,comment,createdAt:now,updatedAt:now};d.campaignFeedback.unshift(feedback);await save(d);return send(res,201,{ok:true,feedback,updated:false});}
 if(req.method==='POST'&&p==='/api/participants'){if(me.role!=='admin')err('Somente administrador.',403);const b=await body(req),name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),phone=normalizePhone(b.phone),pass=String(b.password||'');if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||!phone||phone.length<10||phone.length>13||pass.length<10)err('Para cadastrar um participante, informe nome, e-mail válido, celular com DDD e senha com pelo menos 10 caracteres.');if(d.users.some(u=>(email&&u.email===email)||(phone&&normalizePhone(u.phone)===phone))||d.participants.some(u=>(email&&u.email===email)||(phone&&normalizePhone(u.phone)===phone)))err('Este e-mail ou telefone já está cadastrado.',409);const person=D.createParticipant(d,me,{name,email,phone});d.users.push({id:person.id,email,phone,passwordHash:await hashPassword(pass)});await save(d);return send(res,201,{ok:true,participant:{id:person.id,name:person.name,email:person.email,phone:person.phone,status:person.status},message:'Participante cadastrado. Aprove o acesso para liberar o login.'});}





  if(req.method==='POST'&&p==='/api/payout-profile'){
  if(me.role!=='participant')err('Somente participantes podem configurar recebimento.',403);
  const b=await body(req),country=String(b.country||'').trim().toUpperCase(),email=String(b.paypalEmail||'').trim().toLowerCase();
  if(!/^[A-Z]{2}$/.test(country))err('Informe o país usando o código ISO de duas letras.');
  if(email&&!/^\\S+@\\S+\\.\\S+$/.test(email))err('E-mail PayPal inválido.');
  if(country!=='BR'&&!email)err('Para recebimento internacional, informe seu e-mail PayPal.');
  const person=d.participants.find(x=>x.id===me.id);person.payoutCountry=country;person.paypalEmailEncrypted=email?encryptSecret(email):null;person.payoutProfileUpdatedAt=new Date().toISOString();await save(d);
  return send(res,200,{ok:true,message:'Preferência de recebimento salva com segurança.'});
 }
if(req.method==='POST'&&p==='/api/pix-key'){
  if(me.role!=='participant')err('Somente participantes podem cadastrar a chave Pix.',403);
  const b=await body(req),key=String(b.key||'').trim(),type=String(b.type||'').toUpperCase();
  if(!['CPF','CNPJ','EMAIL','PHONE','EVP'].includes(type)||key.length<5||key.length>180)err('Informe uma chave Pix válida e seu tipo.');
  if(type==='EMAIL'&&!/^\S+@\S+\.\S+$/.test(key))err('E-mail Pix inválido.');
  if(type==='CPF'&&key.replace(/\\D/g,'').length!==11)err('CPF Pix precisa ter 11 dígitos.');
  if(type==='CNPJ'&&key.replace(/\\D/g,'').length!==14)err('CNPJ Pix precisa ter 14 dígitos.');
  if(type==='PHONE'&&key.replace(/\\D/g,'').length!==11)err('Celular Pix precisa conter DDD e 11 dígitos.');
  const person=d.participants.find(x=>x.id===me.id);person.pixKeyEncrypted=encryptSecret(key);person.pixKeyType=type;person.pixKeyUpdatedAt=new Date().toISOString();await save(d);return send(res,200,{ok:true,message:'Chave Pix cadastrada para os repasses WYNCORE.'});
 }

 if(req.method==='GET'&&p==='/api/ad-workspace'){
  const campaigns=d.adCampaigns||[],reviews=d.adReviews||[];
  if(me.role==='admin')return send(res,200,{campaigns,reviews,earnings:d.adEarnings||[],adscendConversions:d.adscendConversions||[],adscendIntegration:{configured:Adscend.configured(),postbackConfigured:Adscend.postbackConfigured(),postbackUrl:Adscend.postbackConfigured()&&process.env.WYNCORE_PUBLIC_URL?String(process.env.WYNCORE_PUBLIC_URL).replace(/\/$/,'')+'/api/webhooks/adscend?token='+encodeURIComponent(process.env.ADSCEND_POSTBACK_SECRET)+'&user=[SB1]&time=[UTS]&ip=[IP]&offer=[SB2]':null},paypalIntegration:{configured:Paypal.configured(),mode:Paypal.mode},advertiserInquiries:d.advertiserInquiries||[],participants:d.participants.map(x=>({id:x.id,name:x.name,email:x.email,phone:x.phone,role:x.role,status:x.status,createdAt:x.createdAt,pixKeyType:x.pixKeyType,pixKeyConfigured:Boolean(x.pixKeyEncrypted),payoutCountry:x.payoutCountry||'BR',paypalEmailConfigured:Boolean(x.paypalEmailEncrypted)})),summary:{campaigns:campaigns.length,open:campaigns.filter(x=>x.status==='open').length,reviews:reviews.length,pending:reviews.filter(x=>x.status==='pending').length,accepted:reviews.filter(x=>x.status==='accepted').length,contracted:campaigns.reduce((n,x)=>n+(Number(x.contractValue)||0),0),received:campaigns.filter(x=>x.contractStatus==='received').reduce((n,x)=>n+(Number(x.contractValue)||0),0)}});
  if(me.role!=='participant')err('Acesso não permitido.',403);
  const mine=reviews.filter(x=>x.participantId===me.id);const earnings=(d.adEarnings||[]).filter(x=>x.participantId===me.id);return send(res,200,{campaigns:campaigns.filter(x=>x.status==='open'),reviews:mine,earnings,earningSummary:{approvedUnpaid:earnings.filter(x=>x.status==='approved_unpaid').reduce((n,x)=>n+x.amount,0),paid:earnings.filter(x=>x.status==='paid').reduce((n,x)=>n+x.amount,0)},adscendConversions:(d.adscendConversions||[]).filter(x=>x.participantId===me.id),payoutProfile:{country:me.payoutCountry||'BR',paypalEmailConfigured:Boolean(me.paypalEmailEncrypted)},campaignHistory:Object.fromEntries(mine.map(r=>{const c=campaigns.find(x=>x.id===r.campaignId);return [r.campaignId,c?c.title:'Campanha encerrada']}))});
 }
 if(req.method==='GET'&&p==='/api/adscend/offers'){
  if(me.role!=='participant')err('Somente participantes podem consultar campanhas.',403);
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  const country=Adscend.countryCode(req.headers['x-vercel-ip-country']||req.headers['cf-ipcountry']||req.headers['cloudfront-viewer-country']);
  if(!country)return send(res,422,{error:'País não identificado pela conexão. A consulta foi bloqueada para evitar ofertas de outra região.'});
  try{
   const result=await Adscend.getRewardedVideos({country,userId:me.id});
   d.adscendOfferSnapshots||=[];for(const offer of result.offers){d.adscendOfferSnapshots=d.adscendOfferSnapshots.filter(x=>!(x.participantId===me.id&&x.offerId===offer.id));d.adscendOfferSnapshots.unshift({participantId:me.id,offerId:offer.id,country,publisherPayoutUsd:offer.publisherPayoutUsd,participantEstimateUsd:offer.participantEstimateUsd,fetchedAt:new Date().toISOString()})}if(d.adscendOfferSnapshots.length>5000)d.adscendOfferSnapshots=d.adscendOfferSnapshots.slice(0,5000);await save(d);
   return send(res,200,{ok:true,...result,source:'Adscend Media',currency:'USD',rewardIsEstimate:true});
  }catch(e){return send(res,e.status||502,{error:e.status?e.message:'Não foi possível consultar a Adscend agora.'})}
 }
 if((req.method==='GET'||req.method==='POST')&&p==='/api/webhooks/adscend'){
  const expected=String(process.env.ADSCEND_POSTBACK_SECRET||''),provided=String(url.searchParams.get('token')||req.headers['x-adscend-token']||'');
  if(expected.length<32||!safeEqual(provided,expected))return send(res,401,{error:'Postback Adscend não autenticado.'});
  const params=req.method==='POST'?await body(req):Object.fromEntries(url.searchParams.entries());
  const participantId=String(params.user||params.sub1||'').trim(),offerId=String(params.offer||params.sub2||'').trim(),watchTime=String(params.time||params.uts||'').trim(),ip=String(params.ip||'').trim();
  if(!participantId||!offerId||!watchTime||watchTime.length>80)return send(res,400,{error:'Postback sem participante, oferta ou horário de conclusão.'});
  const d=await load();d.adscendConversions||=[];d.adscendOfferSnapshots||=[];
  const transactionId=crypto.createHash('sha256').update([participantId,offerId,watchTime].join(':')).digest('hex');
  if(d.adscendConversions.some(x=>x.transactionId===transactionId))return send(res,200,{ok:true,duplicate:true});
  const participant=(d.participants||[]).find(x=>x.id===participantId&&x.status==='active'&&x.role==='participant');
  if(!participant)return send(res,404,{error:'Participante associado ao postback não encontrado.'});
  const snapshot=d.adscendOfferSnapshots.find(x=>x.participantId===participantId&&x.offerId===offerId);
  const conversion={id:crypto.randomUUID(),provider:'adscend',participantId,offerId,transactionId,watchTime,ipHash:ip?crypto.createHash('sha256').update(ip).digest('hex'):null,publisherPayoutUsd:snapshot?.publisherPayoutUsd??null,participantEstimateUsd:snapshot?.participantEstimateUsd??null,currency:'USD',status:'video_completed_pending_partner_reconciliation',receivedAt:new Date().toISOString()};
  d.adscendConversions.unshift(conversion);if(d.adscendConversions.length>10000)d.adscendConversions=d.adscendConversions.slice(0,10000);
  await save(d);return send(res,200,{ok:true,received:true,status:conversion.status});
 }
 if(req.method==='POST'&&p==='/api/integrations/asaas/webhook'){
  if(me.role!=='admin')err('Somente administração.',403);
  const publicUrl=String(process.env.WYNCORE_PUBLIC_URL||'').replace(/\/$/,'');
  const notifyEmail=String(process.env.WYNCORE_LEADS_TO||'').trim();
  if(!publicUrl||!/^https:\/\//i.test(publicUrl))err('Configure WYNCORE_PUBLIC_URL com o endereço HTTPS público da aplicação.',503);
  if(!/^\S+@\S+\.\S+$/.test(notifyEmail))err('Configure WYNCORE_LEADS_TO com o e-mail que receberá alertas.',503);
  if(!Asaas.webhookConfigured())err('Configure ASAAS_WEBHOOK_TOKEN com 32 a 255 caracteres, sem espaços.',503);
  const d=await load();
  if(d.asaasWebhookId)return send(res,200,{ok:true,alreadyConfigured:true,id:d.asaasWebhookId,url:d.asaasWebhookUrl});
  const created=await Asaas.createWebhook({url:publicUrl+'/api/webhooks/asaas',email:notifyEmail});
  d.asaasWebhookId=created.id;d.asaasWebhookUrl=publicUrl+'/api/webhooks/asaas';d.asaasWebhookCreatedAt=new Date().toISOString();await save(d);
  return send(res,201,{ok:true,id:created.id,url:d.asaasWebhookUrl,message:'Webhook Asaas criado. Faça uma cobrança de teste no Sandbox e confirme o evento recebido.'});
 }
 if(req.method==='POST'&&p==='/api/ad-campaigns'){
  if(me.role!=='admin')err('Somente administração pode criar campanhas.',403);
  const b=await body(req),title=String(b.title||'').trim().slice(0,120),client=String(b.client||'').trim().slice(0,120),brief=String(b.brief||'').trim().slice(0,3000),channel=String(b.channel||'digital'),objective=String(b.objective||'').trim().slice(0,500),mediaUrl=String(b.mediaUrl||'').trim().slice(0,2000),value=Number(b.contractValue||0),reward=Number(b.rewardPerReview||0),maxParticipants=Number(b.maxParticipants||0),requiredWatchSeconds=Number(b.requiredWatchSeconds||8),advertiserDocument=String(b.advertiserDocument||'').replace(/\\D/g,'').slice(0,14),advertiserEmail=String(b.advertiserEmail||'').trim().toLowerCase(),advertiserPhone=normalizePhone(b.advertiserPhone);
  if(title.length<3||client.length<2||brief.length<30||!['digital','video','social','display','other'].includes(channel)||!Number.isFinite(value)||value<0||value>100000000||!Number.isFinite(reward)||reward<0||reward>100000||!Number.isInteger(maxParticipants)||maxParticipants<0||maxParticipants>100000||!Number.isInteger(requiredWatchSeconds)||requiredWatchSeconds<8||requiredWatchSeconds>3600)err('Confira título, empresa, briefing, contrato, recompensa, vagas e tempo mínimo de vídeo (8 a 3600 segundos).');
  if(reward>0&&maxParticipants>0&&reward*maxParticipants>value)err('O orçamento do contrato não cobre a soma das recompensas previstas.');
  if(mediaUrl){let u;try{u=new URL(mediaUrl)}catch{}if(!u||u.protocol!=='https:'||u.username||u.password)err('O link do anúncio precisa ser HTTPS válido.');}
  if(channel==='video'&&!mediaUrl)err('Campanhas de vídeo precisam ter um link HTTPS do anúncio ou trailer.');
  if(channel==='video'&&mediaUrl&&!isPlayableAdMedia(mediaUrl))err('Este link não é um vídeo compatível. Use um vídeo MP4/WebM/OGG, YouTube ou Vimeo válido.');
  const c={id:crypto.randomUUID(),title,client,brief,channel,objective,mediaUrl,advertiserDocument,advertiserEmail,advertiserPhone,contractValue:value,rewardPerReview:reward,maxParticipants,requiredWatchSeconds,contractStatus:'not_recorded',status:'draft',createdBy:me.id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  d.adCampaigns.unshift(c);d.audit.unshift({id:crypto.randomUUID(),actorId:me.id,type:'ad_campaign_created',entityId:c.id,details:{client},at:new Date().toISOString()});await save(d);return send(res,201,c);
 }

 let adMatch=p.match(/^\/api\/ad-campaigns\/([\w-]+)\/pix$/);
 if(req.method==='GET'&&adMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const c=(d.adCampaigns||[]).find(x=>x.id===adMatch[1]);if(!c?.asaasPaymentId)err('Ainda não existe cobrança Pix para esta campanha.',404);
  const qr=await Asaas.getPixQrCode(c.asaasPaymentId);return send(res,200,{ok:true,paymentId:c.asaasPaymentId,payload:qr.payload,encodedImage:qr.encodedImage,expirationDate:qr.expirationDate});
 }
 if(req.method==='POST'&&adMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const c=(d.adCampaigns||[]).find(x=>x.id===adMatch[1]);if(!c)return send(res,404,{error:'Campanha não encontrada.'});
  if(c.contractStatus==='received')err('Esta campanha já está paga.',409);
  if(!Number(c.contractValue)||!c.advertiserDocument||!c.advertiserEmail)err('Cadastre CPF/CNPJ e e-mail do contratante antes de gerar o Pix.');
  if(c.asaasPaymentId)err('Esta campanha já possui uma cobrança Pix. Consulte a cobrança existente antes de gerar outra.',409);
  const customer=c.asaasCustomerId?{id:c.asaasCustomerId}:await Asaas.createCustomer({name:c.client,cpfCnpj:c.advertiserDocument,email:c.advertiserEmail,mobilePhone:c.advertiserPhone,externalReference:'wyncore-client:'+c.id});
  c.asaasCustomerId=customer.id;await save(d);
  const payment=await Asaas.createPixCharge({customer:customer.id,value:c.contractValue,description:'WYNCORE - '+c.title,externalReference:'wyncore-campaign:'+c.id});
  c.asaasPaymentId=payment.id;c.contractStatus='awaiting_pix';c.pixCreatedAt=new Date().toISOString();await save(d);
  const qr=await Asaas.getPixQrCode(payment.id);
  return send(res,201,{ok:true,paymentId:payment.id,invoiceUrl:payment.invoiceUrl||null,payload:qr.payload,encodedImage:qr.encodedImage,expirationDate:qr.expirationDate});
 }

 let leadMatch=p.match(/^\/api\/advertiser-inquiries\/([\w-]+)\/(contacted|decline|create-campaign)$/);
 if(req.method==='POST'&&leadMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const lead=(d.advertiserInquiries||[]).find(x=>x.id===leadMatch[1]);if(!lead)return send(res,404,{error:'Solicitação não encontrada.'});
  if(leadMatch[2]==='contacted'){lead.status='contacted';lead.updatedAt=new Date().toISOString()}
  if(leadMatch[2]==='decline'){lead.status='declined';lead.updatedAt=new Date().toISOString()}
  if(leadMatch[2]==='create-campaign'){
   if(lead.status==='converted')err('Solicitação já convertida.',409);
   const b=await body(req),title=String(b.title||('Pesquisa para '+lead.company)).trim().slice(0,120),brief=String(b.brief||lead.objective).trim().slice(0,3000);
   if(title.length<3||brief.length<30)err('Título ou briefing inválido.');
   const c={id:crypto.randomUUID(),title,client:lead.company,brief,channel:lead.channel||'video',objective:lead.objective,mediaUrl:lead.mediaUrl||'',contractValue:0,advertiserDocument:lead.cpfCnpj||'',advertiserEmail:lead.email||'',advertiserPhone:lead.phone||'',contractStatus:'not_recorded',status:'draft',createdBy:me.id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),leadId:lead.id};
   d.adCampaigns.unshift(c);lead.status='converted';lead.campaignId=c.id;lead.updatedAt=new Date().toISOString();
  }
  await save(d);return send(res,200,{ok:true,lead});
 }
 adMatch=p.match(/^\/api\/ad-campaigns\/([\w-]+)\/(open|pause|complete)$/);
 if(req.method==='POST'&&adMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const c=(d.adCampaigns||[]).find(x=>x.id===adMatch[1]);if(!c)return send(res,404,{error:'Campanha não encontrada.'});
  if(adMatch[2]==='open'&&(Number(c.contractValue)<=0||c.contractStatus!=='received'))err('Campanha não pode ser publicada: confirme primeiro o recebimento real do orçamento do contratante.',409);if(adMatch[2]==='open'&&(!Number(c.rewardPerReview)||!Number(c.maxParticipants)||!isPlayableAdMedia(c.mediaUrl)))err('Para publicar, informe recompensa por avaliação, limite de participantes e um vídeo compatível e acessível.',409);if(adMatch[2]==='open'&&Number(c.rewardPerReview)*Number(c.maxParticipants)>Number(c.contractValue))err('O orçamento não cobre as recompensas previstas.',409);
  c.status=({open:'open',pause:'paused',complete:'completed'})[adMatch[2]];c.updatedAt=new Date().toISOString();await save(d);return send(res,200,c);
 }
 adMatch=p.match(/^\/api\/ad-campaigns\/([\w-]+)\/contract-payment$/);
 if(req.method==='POST'&&adMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const c=(d.adCampaigns||[]).find(x=>x.id===adMatch[1]);if(!c)return send(res,404,{error:'Campanha não encontrada.'});
  const b=await body(req),reference=String(b.reference||'').trim().slice(0,120);if(!reference||Number(c.contractValue)<=0)err('Informe o valor do contrato e a referência real de recebimento.');
  c.contractStatus='received';c.contractReference=reference;c.receivedAt=new Date().toISOString();c.updatedAt=c.receivedAt;await save(d);return send(res,200,c);
 }
 if(req.method==='POST'&&p==='/api/ad-reviews'){
  if(me.role!=='participant')err('Somente avaliadores podem enviar avaliações.',403);
  if(limited(req,'ad-review',me.id,20,3600000))return send(res,429,{error:'Limite de avaliações por hora atingido.'});
  const b=await body(req),campaignId=String(b.campaignId||''),clarity=Number(b.clarity),trust=Number(b.trust),relevance=Number(b.relevance),comment=String(b.comment||'').trim().slice(0,1200);
  const c=(d.adCampaigns||[]).find(x=>x.id===campaignId&&x.status==='open');if(!c)err('Campanha não está aberta para avaliações.',404);
  if(!isPlayableAdMedia(c.mediaUrl))err('Este vídeo está indisponível para avaliação. Nenhuma avaliação foi registrada.',409);
  if(![clarity,trust,relevance].every(x=>Number.isInteger(x)&&x>=1&&x<=5)||comment.length<20)err('Avalie os três critérios de 1 a 5 e escreva um comentário de pelo menos 20 caracteres.');
  if((d.adReviews||[]).some(x=>x.campaignId===campaignId&&x.participantId===me.id))err('Você já enviou uma avaliação para esta campanha.',409);
  const review={id:crypto.randomUUID(),campaignId,participantId:me.id,clarity,trust,relevance,comment,status:'pending',createdAt:new Date().toISOString()};
  d.adReviews.unshift(review);d.audit.unshift({id:crypto.randomUUID(),actorId:me.id,type:'ad_review_submitted',entityId:review.id,details:{campaignId},at:new Date().toISOString()});await save(d);return send(res,201,review);
 }

 async function tryAutomaticPix(earning,d){
  const participant=(d.participants||[]).find(x=>x.id===earning.participantId),campaign=(d.adCampaigns||[]).find(x=>x.id===earning.campaignId);
  if(!Asaas.configured()||!Asaas.webhookConfigured()||!participant?.pixKeyEncrypted||!participant?.pixKeyType||campaign?.contractStatus!=='received')return false;
  try{
   const transfer=await Asaas.transferPix({value:earning.amount,pixAddressKey:decryptSecret(participant.pixKeyEncrypted),pixAddressKeyType:participant.pixKeyType,description:'WYNCORE recompensa',externalReference:'wyncore-earning:'+earning.id});
   earning.asaasTransferId=transfer.id;earning.status='payout_pending';earning.payoutRequestedAt=new Date().toISOString();earning.payoutError=null;return true;
  }catch(e){earning.payoutError=String(e.message||'Falha ao iniciar Pix').slice(0,300);return false;}
 }

 adMatch=p.match(/^\/api\/ad-reviews\/([\w-]+)\/(accept|reject)$/);
 if(req.method==='POST'&&adMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const review=(d.adReviews||[]).find(x=>x.id===adMatch[1]);if(!review)return send(res,404,{error:'Avaliação não encontrada.'});
  const b=await body(req),note=String(b.note||'').trim().slice(0,500);if(review.status!=='pending')err('Esta avaliação já foi revisada.',409);
  review.status=adMatch[2]==='accept'?'accepted':'rejected';review.reviewNote=note;review.reviewedBy=me.id;review.reviewedAt=new Date().toISOString();if(review.status==='accepted'){const campaign=(d.adCampaigns||[]).find(x=>x.id===review.campaignId);if(campaign&&Number(campaign.rewardPerReview)>0){const already=(d.adEarnings||[]).some(x=>x.reviewId===review.id);if(!already){d.adEarnings||=[];const count=d.adEarnings.filter(x=>x.campaignId===campaign.id).length;if(count>=Number(campaign.maxParticipants))err('Limite remunerado desta campanha já foi atingido.',409);d.adEarnings.unshift({id:crypto.randomUUID(),reviewId:review.id,campaignId:campaign.id,participantId:review.participantId,amount:Number(campaign.rewardPerReview),status:'approved_unpaid',createdAt:new Date().toISOString()});}}}await save(d);if(review.status==='accepted'){const earning=(d.adEarnings||[]).find(x=>x.reviewId===review.id);if(earning&&earning.status==='approved_unpaid'&&await tryAutomaticPix(earning,d))await save(d);}return send(res,200,review);
 }



 adMatch=p.match(/^\/api\/ad-earnings\/([\w-]+)\/pay-pix$/);
 if(req.method==='POST'&&adMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const earning=(d.adEarnings||[]).find(x=>x.id===adMatch[1]);if(!earning)return send(res,404,{error:'Recompensa não encontrada.'});
  if(earning.status!=='approved_unpaid')err('A recompensa não está aguardando Pix.',409);
  const campaign=(d.adCampaigns||[]).find(x=>x.id===earning.campaignId);if(campaign?.contractStatus!=='received')err('O orçamento da campanha ainda não foi recebido.',409);
  if(!Asaas.configured()||!Asaas.webhookConfigured())err('Configure Asaas e o webhook antes de realizar Pix automático.',503);
  const ok=await tryAutomaticPix(earning,d);await save(d);if(!ok)err(earning.payoutError||'Cadastre uma chave Pix válida para o participante.',400);
  return send(res,202,{ok:true,status:earning.status,transferId:earning.asaasTransferId,message:'Pix solicitado. A confirmação final chegará pelo webhook Asaas.'});
 }

 adMatch=p.match(/^\/api\/ad-earnings\/([\w-]+)\/mark-paid$/);
 if(req.method==='POST'&&adMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const earning=(d.adEarnings||[]).find(x=>x.id===adMatch[1]);if(!earning)return send(res,404,{error:'Lançamento não encontrado.'});
  if(earning.status!=='approved_unpaid')err('Este lançamento não está aguardando pagamento.',409);
  const b=await body(req),reference=String(b.reference||'').trim().slice(0,160);if(reference.length<4)err('Informe a referência de um pagamento realmente realizado.');
  earning.status='paid';earning.paymentReference=reference;earning.paidAt=new Date().toISOString();earning.paidBy=me.id;await save(d);return send(res,200,earning);
 }
 adMatch=p.match(/^\/api\/ad-earnings\/([\w-]+)\/pay-paypal$/);
 if(req.method==='POST'&&adMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const earning=(d.adEarnings||[]).find(x=>x.id===adMatch[1]);if(!earning)return send(res,404,{error:'Recompensa não encontrada.'});
  if(earning.status!=='approved_unpaid')err('A recompensa não está aguardando pagamento.',409);
  if(!Paypal.configured())err('Configure PAYPAL_CLIENT_ID e PAYPAL_CLIENT_SECRET no servidor.',503);
  const participant=(d.participants||[]).find(x=>x.id===earning.participantId);
  if(!participant?.paypalEmailEncrypted||!participant.payoutCountry||participant.payoutCountry==='BR')err('Este participante não possui perfil internacional PayPal válido.',400);
  if(earning.paypalBatchId)err('Já existe um lote PayPal para esta recompensa. Consulte o estado antes de tentar novamente.',409);
  const payout=await Paypal.createPayout({email:decryptSecret(participant.paypalEmailEncrypted),amount:earning.amount,currency:earning.currency||'BRL',earningId:earning.id});
  const header=payout.batch_header||{};earning.paypalBatchId=header.payout_batch_id||null;earning.paypalBatchStatus=header.batch_status||'PENDING';earning.paypalMode=Paypal.mode;earning.status='payout_pending';earning.payoutProvider='paypal';earning.payoutRequestedAt=new Date().toISOString();await save(d);
  return send(res,202,{ok:true,status:earning.status,batchId:earning.paypalBatchId,batchStatus:earning.paypalBatchStatus,message:'Lote enviado ao PayPal. Confirme o estado final antes de considerar o pagamento concluído.'});
 }
 adMatch=p.match(/^\/api\/ad-earnings\/([\w-]+)\/paypal-status$/);
 if(req.method==='POST'&&adMatch){
  if(me.role!=='admin')err('Somente administração.',403);
  const earning=(d.adEarnings||[]).find(x=>x.id===adMatch[1]);if(!earning||earning.payoutProvider!=='paypal'||!earning.paypalBatchId)err('Lote PayPal não encontrado.',404);
  const result=await Paypal.getBatch(earning.paypalBatchId),header=result.batch_header||{};earning.paypalBatchStatus=header.batch_status||earning.paypalBatchStatus;earning.paypalCheckedAt=new Date().toISOString();
  const item=(result.items||[])[0],itemStatus=String(item?.transaction_status||'').toUpperCase();
  if(['SUCCESS','SUCCESS_WITH_WARNING'].includes(earning.paypalBatchStatus)&&itemStatus==='SUCCESS'){earning.status='paid';earning.paidAt=earning.paypalCheckedAt;earning.paymentReference=item.payout_item_id||earning.paypalBatchId}
  else if(['DENIED','CANCELED','RETURNED'].includes(earning.paypalBatchStatus)||['FAILED','BLOCKED','RETURNED','REFUNDED','ONHOLD','UNCLAIMED'].includes(itemStatus)){earning.status='approved_unpaid';earning.payoutError='PayPal: '+(itemStatus||earning.paypalBatchStatus);earning.payoutProvider=null;earning.paypalBatchId=null}
  await save(d);return send(res,200,{ok:true,status:earning.status,batchStatus:earning.paypalBatchStatus});
 }
 if(req.method==='GET'&&p==='/api/ad-report.csv'){
  if(me.role!=='admin')err('Relatório restrito à administração.',403);
  const campaigns=d.adCampaigns||[],reviews=d.adReviews||[];
  const rows=[['Campanha','Empresa','Formato','Status','Valor contratado (BRL)','Recebimento','Avaliações','Aprovadas','Rejeitadas','Média clareza','Média credibilidade','Média relevância','Criada em']];
  for(const c of campaigns){const rs=reviews.filter(r=>r.campaignId===c.id),avg=k=>rs.length?(rs.reduce((n,r)=>n+Number(r[k]||0),0)/rs.length).toFixed(2):'';
   rows.push([c.title,c.client,c.channel,c.status,c.contractValue,c.contractStatus,rs.length,rs.filter(r=>r.status==='accepted').length,rs.filter(r=>r.status==='rejected').length,avg('clarity'),avg('trust'),avg('relevance'),c.createdAt]);
  }
  const cell=v=>{let x=String(v??'');if(/^[=+@\\-\\t\\r]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"';};
  res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="wyncore-ads-relatorio.csv"','Cache-Control':'no-store'});
  return res.end('\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n'));
 }

 if(req.method==='GET'&&p==='/api/dashboard'){
  if(me.role==='admin')return send(res,200,{...D.snapshot(d,me),opportunities:d.opportunities,tasks:d.tasks,events:d.events.slice(-100).reverse(),companyLeads:d.companyLeads||[],companyCosts:d.companyCosts||[],campaignFeedback:d.campaignFeedback||[]});
  return send(res,200,D.snapshot(d,me));
 }
 
 if(req.method==='GET'&&p==='/api/company'){if(me.role!=='admin')err('Somente administrador.',403);return send(res,200,{leads:d.companyLeads||[],costs:d.companyCosts||[]})}
 if(req.method==='POST'&&p==='/api/company/leads'){if(me.role!=='admin')err('Somente administrador.',403);const b=await body(req),company=String(b.company||'').trim().slice(0,100),contact=String(b.contact||'').trim().slice(0,120),channel=String(b.channel||'email'),notes=String(b.notes||'').trim().slice(0,500);if(company.length<2||!['email','site','phone'].includes(channel))err('Informe a empresa e um canal de contato válido.');const lead={id:crypto.randomUUID(),company,contact,channel,notes,status:'prospect',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};d.companyLeads.unshift(lead);await save(d);return send(res,201,lead)}
 if(req.method==='PATCH'&&p.startsWith('/api/company/leads/')&&p.split('/').length===5){if(me.role!=='admin')err('Somente administrador.',403);const lead=(d.companyLeads||[]).find(x=>x.id===p.split('/').pop());if(!lead)return send(res,404,{error:'Empresa não encontrada.'});const b=await body(req);if(!['prospect','contacted','proposal','contracted','inactive'].includes(b.status))err('Etapa inválida.');lead.status=b.status;lead.updatedAt=new Date().toISOString();await save(d);return send(res,200,lead)}
 if(req.method==='POST'&&p==='/api/company/costs'){if(me.role!=='admin')err('Somente administrador.',403);const b=await body(req),description=String(b.description||'').trim().slice(0,120),amount=Number(b.amount),category=String(b.category||'operacional');if(description.length<2||!Number.isFinite(amount)||amount<=0||amount>10000000||!['operacional','marketing','tecnologia','servicos','outro'].includes(category))err('Confira descrição, categoria e valor.');const item={id:crypto.randomUUID(),description,amount,category,recordedAt:new Date().toISOString(),recordedBy:me.id,kind:'record_only'};d.companyCosts.unshift(item);await save(d);return send(res,201,item)}

 if(req.method==='GET'&&p==='/api/management')return send(res,200,D.snapshot(d,me));
 if(req.method==='POST'&&p==='/api/opportunities'){if(me.role!=='admin')err('Somente administrador.',403);const o=validateOpportunity(await body(req));d.opportunities.unshift(o);d.events.push({id:crypto.randomUUID(),type:'opportunity_created',itemId:o.id,at:new Date().toISOString()});await save(d);return send(res,201,o)}
 if(req.method==='POST'&&p==='/api/tasks'){if(me.role!=='admin')err('Somente administrador.',403);const b=await body(req),o=d.opportunities.find(x=>x.id===b.opportunityId);if(!o)return send(res,404,{error:'Oportunidade não encontrada.'});if(d.tasks.some(t=>t.opportunityId===o.id))return send(res,409,{error:'Tarefa já acompanhada.'});const t={id:crypto.randomUUID(),opportunityId:o.id,title:o.title,source:o.source,value:o.value,status:'Em análise',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};d.tasks.unshift(t);await save(d);return send(res,201,t)}
 let legacy=p.match(/^\/api\/tasks\/([\w-]+)$/);if(req.method==='PATCH'&&legacy){if(me.role!=='admin')err('Somente administrador.',403);const t=d.tasks.find(x=>x.id===legacy[1]);if(!t)return send(res,404,{error:'Tarefa não encontrada.'});const b=await body(req);if(!STATUSES.includes(b.status))err('Status inválido.');t.status=b.status;t.updatedAt=new Date().toISOString();await save(d);return send(res,200,t)}

 const levelMatch=p.match(/^\/api\/participants\/([\w-]+)\/level$/);if(req.method==='POST'&&levelMatch){if(me.role!=='admin')err('Somente administrador pode alterar níveis.',403);const b=await body(req),person=D.advanceParticipantLevel(d,me,levelMatch[1],b.direction||'next');await save(d);return send(res,200,person)}
 if(req.method==='POST'&&p==='/api/participants/approve'){const b=await body(req);if(me.role!=='admin')err('Somente administrador pode liberar participantes e definir cargos.',403);const person=D.approveParticipant(d,me,String(b.participantId||''),b.role||'participant');await save(d);return send(res,200,person)}
 if(req.method==='POST'&&p==='/api/programs'){const x=D.createProgram(d,me,await body(req));await save(d);return send(res,201,x)}
 const fundingMatch=p.match(/^\/api\/programs\/([^/]+)\/funding$/);if(req.method==='POST'&&fundingMatch){const b=await body(req),x=D.confirmProgramFunding(d,me,fundingMatch[1],b.reference,b.evidenceUrl);await save(d);return send(res,200,x)}
 const requestMatch=p.match(/^\/api\/programs\/([^/]+)\/request$/);if(req.method==='POST'&&requestMatch){const x=D.requestProgram(d,me,requestMatch[1]);await save(d);return send(res,201,x)}
 const acceptMatch=p.match(/^\/api\/assignments\/([^/]+)\/accept$/);if(req.method==='POST'&&acceptMatch){const x=D.approveProgramRequest(d,me,acceptMatch[1]);await save(d);return send(res,200,x)}
 let m=p.match(/^\/api\/programs\/([\w-]+)\/assign$/);if(req.method==='POST'&&m){const b=await body(req),x=D.assignProgram(d,me,m[1],String(b.participantId||''));await save(d);return send(res,201,x)}
 m=p.match(/^\/api\/assignments\/([\w-]+)\/submit$/);if(req.method==='POST'&&m){const b=await body(req),x=D.submitAssignment(d,me,m[1],b.proof);await save(d);return send(res,200,x)}
 m=p.match(/^\/api\/assignments\/([\w-]+)\/review$/);if(req.method==='POST'&&m){const b=await body(req),x=D.reviewAssignment(d,me,m[1],b.decision,b.note);await save(d);return send(res,200,x)}
 m=p.match(/^\/api\/assignments\/([\w-]+)\/payment$/);if(req.method==='POST'&&m){return send(res,503,{error:'Pagamento Pix indisponível: nenhum provedor de pagamentos está conectado. O WYNCORE não registrará um pagamento sem confirmação real do provedor.'})}
 if(req.method==='POST'&&p==='/api/referrals'){const b=await body(req),x=D.addReferral(d,me,b.email);await save(d);return send(res,201,x)}
 if(req.method==='GET'&&p==='/api/report.csv'){if(me.role==='participant')err('Relatório restrito à equipe.',403);const rows=[['Participante','Atividade','Estado','Valor registrado','Referência','Data'],...(d.tasks||[]).map(t=>['',t.title,t.status,t.value,'',t.updatedAt||t.createdAt]),...(d.assignments||[]).map(a=>[(d.participants||[]).find(x=>x.id===a.participantId)?.email||'',(d.programs||[]).find(x=>x.id===a.programId)?.title||'',a.state,a.reward,a.paymentReference||'',a.paidAt||a.createdAt])];res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="wyncore-relatorio.csv"','Cache-Control':'no-store'});return res.end('\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n'))}
 return send(res,404,{error:'Rota não encontrada.'});
 }catch(e){if(!e.status||e.status>=500)console.error('WYNCORE request error:',e);return send(res,e.status||500,{error:e.status?e.message:'Erro interno. Consulte os logs do servidor.'})}}
function createServer(){return http.createServer(handler)}
if(require.main===module){try{assertConfig();createServer().listen(PORT,'0.0.0.0',()=>process.stdout.write('WYNCORE listening on '+PORT+'\n'))}catch(e){process.stderr.write(e.message+'\n');process.exit(1)}}
module.exports={createServer,handler,load,save,hashPassword,verifyPassword,validateOpportunity,limited,STATUSES};
