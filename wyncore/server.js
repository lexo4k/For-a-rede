'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const D=require('./domain');
const ROOT=__dirname,DATA_DIR=process.env.DATA_DIR||path.join(ROOT,'data'),DATA_FILE=path.join(DATA_DIR,'wyncore.json');
const PORT=Number(process.env.PORT||3000),PASSWORD=process.env.WYNCORE_OWNER_PASSWORD||'',SECRET=process.env.WYNCORE_SESSION_SECRET||'',PARTNER_SECRET=process.env.WYNCORE_PARTNER_WEBHOOK_SECRET||'',GOOGLE_CLIENT_ID=process.env.WYNCORE_GOOGLE_CLIENT_ID||'',PROD=process.env.NODE_ENV==='production';
const COOKIE='wyncore_session',SESSION_MS=8*60*60*1000;
const OFFERWALLME_API_KEY=process.env.OFFERWALLME_API_KEY||'',OFFERWALLME_BEARER_TOKEN=process.env.OFFERWALLME_BEARER_TOKEN||'',OFFERWALLME_SECRET=process.env.OFFERWALLME_SECRET||'',OFFERWALLME_CURRENCY='BRL';
const PUBLIC_FILES=new Set(['/','/index.html','/styles.css','/app.js','/manifest.webmanifest','/icon.svg','/sw.js','/sobre.html','/privacidade.html','/termos.html','/robots.txt','/sitemap.xml','/guia-aprendizagem.html','/guia-estagio.html','/seguranca-oportunidades.html','/organizar-candidatura.html']);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const rate=new Map();
function normalizePhone(value){let digits=String(value||'').replace(/\D/g,'');if(digits.startsWith('55')&&(digits.length===12||digits.length===13))digits=digits.slice(2);return digits;}
function assertConfig(){if(PASSWORD.length<12)throw Error('Configure WYNCORE_OWNER_PASSWORD com pelo menos 12 caracteres.');if(SECRET.length<32)throw Error('Configure WYNCORE_SESSION_SECRET com pelo menos 32 caracteres.')}
function safeEqual(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
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
 if(!p.startsWith('/api/')){const file=p==='/'?'/index.html':p;if(!PUBLIC_FILES.has(file))return send(res,404,{error:'Não encontrado'});const full=path.resolve(ROOT,'.'+file);try{const data=await fs.readFile(full);const extension=path.extname(full);const cachePolicy=['.html','.js','.css','.webmanifest'].includes(extension)?'no-cache':'public, max-age=3600';res.writeHead(200,{'Content-Type':MIME[extension]||'application/octet-stream','Cache-Control':cachePolicy});return res.end(data)}catch{return send(res,404,{error:'Arquivo não encontrado'})}}
 if(SECRET.length<32)return send(res,503,{error:'A autenticação de sessão ainda não está configurada no servidor. O pedido de cadastro pode ser recebido, mas a entrada ficará indisponível até a configuração.'});
 if(req.method==='POST'&&p==='/api/google-login'){
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
 if(req.method==='POST'&&p==='/api/ads/offerwallme/postback'){
   if(!OFFERWALLME_SECRET)return send(res,503,{error:'Postback Offerwall.me não configurado.'});
   const raw=await rawBody(req);let event={};
   try{if(String(req.headers['content-type']||'').includes('application/json'))event=raw?JSON.parse(raw):{};else event=Object.fromEntries(new URLSearchParams(raw))}catch{return send(res,400,{error:'Postback inválido.'})}
   const subId=String(event.subId||''),transId=String(event.transId||''),rewardText=String(event.reward||''),signature=String(event.signature||''),status=String(event.status||'');
   if(!subId||subId.length>64||!transId||transId.length>160||!/^\d+(?:\.\d{1,8})?$/.test(rewardText))return send(res,400,{error:'Campos de conversão inválidos.'});
   const expected=crypto.createHash('md5').update(subId+transId+rewardText+OFFERWALLME_SECRET).digest('hex');
   if(!signature||!safeEqual(signature.toLowerCase(),expected))return send(res,401,{error:'Assinatura do postback inválida.'});
   if(String(event.debug||'0')==='1'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end('ok')}
   const reward=Number(rewardText),currency=String(event.reward_name||OFFERWALLME_CURRENCY).toUpperCase();
   if(!Number.isFinite(reward)||reward<=0||reward>1000000||currency!==OFFERWALLME_CURRENCY||!['1','2'].includes(status))return send(res,400,{error:'Valor, moeda ou estado do postback inválido.'});
   const d=await load();D.ensureState(d);d.offerwallTransactions||=[];
   const participant=d.participants.find(x=>x.id===subId&&x.status==='active');
   if(!participant)return send(res,404,{error:'Participante não encontrado.'});
   let tx=d.offerwallTransactions.find(x=>x.transactionId===transId);
   if(tx&&tx.participantId!==subId)return send(res,409,{error:'Transação vinculada a outro participante.'});
   if(status==='1'){
    if(!tx){tx={id:crypto.randomUUID(),transactionId:transId,participantId:subId,provider:'offerwallme',amount:reward,currency,status:'credited',offerName:String(event.offer_name||'Vídeo patrocinado').slice(0,160),offerType:String(event.offer_type||'ptc').slice(0,40),createdAt:new Date().toISOString()};d.offerwallTransactions.unshift(tx);d.ledger.unshift({id:crypto.randomUUID(),participantId:subId,kind:'earning_confirmed',amount:reward,currency,reference:transId,source:'offerwallme',description:tx.offerName,at:tx.createdAt})}
   }else{
    if(!tx){tx={id:crypto.randomUUID(),transactionId:transId,participantId:subId,provider:'offerwallme',amount:reward,currency,status:'reversed',createdAt:new Date().toISOString(),reversedAt:new Date().toISOString()};d.offerwallTransactions.unshift(tx)}
    else if(tx.status==='credited'){tx.status='reversed';tx.reversedAt=new Date().toISOString();d.ledger.unshift({id:crypto.randomUUID(),participantId:subId,kind:'earning_reversed',amount:-Math.abs(Number(tx.amount)||reward),currency,reference:transId,source:'offerwallme',description:'Estorno de conversão do anunciante',at:tx.reversedAt})}
   }
   await save(d);res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end('ok');
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
 if(req.method==='GET'&&p==='/api/ads/videos'){
   if(me.role!=='participant')err('Somente participantes podem acessar os anúncios.',403);
   if(!OFFERWALLME_API_KEY||!OFFERWALLME_BEARER_TOKEN||!OFFERWALLME_SECRET)return send(res,503,{configured:false,ads:[],currency:OFFERWALLME_CURRENCY,error:'A rede de anúncios ainda não está conectada ao WYNCORE.'});
   const ip=String(req.headers['x-real-ip']||String(req.headers['x-forwarded-for']||'').split(',')[0]||req.socket?.remoteAddress||'0.0.0.0').trim();
   const expires=String(Math.floor(Date.now()/1000)+3600);
   const message='offerwall-user-v1\\n'+OFFERWALLME_API_KEY+'\\n'+me.id+'\\n'+expires;
   const identitySignature=crypto.createHmac('sha256',OFFERWALLME_SECRET).update(message).digest('hex');
   const query=new URLSearchParams({api:OFFERWALLME_API_KEY,token:OFFERWALLME_BEARER_TOKEN,id:me.id,ip,country:'BR',identityExpires:expires,identitySignature});
   let response,payload;try{response=await fetch('https://offerwall.me/api.php?'+query.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});payload=await response.json()}catch{return send(res,502,{configured:true,ads:[],error:'Não foi possível consultar os anúncios agora.'})}
   if(!response.ok||Number(payload.status)!==200)return send(res,502,{configured:true,ads:[],error:String(payload.message||'A rede não retornou anúncios disponíveis.')});
   const ads=(Array.isArray(payload.data)?payload.data:[]).filter(x=>{try{const u=new URL(x.url);return u.protocol==='https:'&&(u.hostname==='offerwall.me'||u.hostname.endsWith('.offerwall.me'))}catch{return false}}).map(x=>({id:String(x.id||''),title:String(x.title||'Vídeo patrocinado').slice(0,160),description:String(x.description||'').slice(0,500),duration:Number(x.duration)||0,reward:Number(x.reward)||0,currency:OFFERWALLME_CURRENCY,url:x.url,adType:Number(x.type)===1?'Window':'Iframe'}));
   return send(res,200,{configured:true,currency:OFFERWALLME_CURRENCY,ads});
  }
  if(req.method==='GET'&&p==='/api/me')return send(res,200,{id:me.id,role:me.role,email:me.email,name:me.name||'Administrador'});
 if(req.method==='GET'&&p==='/api/integrations/status'){if(me.role!=='admin')err('Somente administrador.',403);return send(res,200,{advertisingNetwork:{provider:'Offerwall.me',configured:Boolean(OFFERWALLME_API_KEY&&OFFERWALLME_BEARER_TOKEN&&OFFERWALLME_SECRET),conversionValidation:Boolean(OFFERWALLME_SECRET),reason:OFFERWALLME_API_KEY&&OFFERWALLME_BEARER_TOKEN&&OFFERWALLME_SECRET?'Feed PTC/vídeo e postback configurados; falta homologar a placement publisher.':'Credenciais de publisher Offerwall.me ainda não configuradas.'},partnerCampaignWebhook:{configured:Boolean(PARTNER_SECRET),conversionValidation:Boolean(process.env.WYNCORE_CONVERSION_SECRET),reason:process.env.WYNCORE_CONVERSION_SECRET?'Webhook assinado de conversões configurado; falta homologação com parceiro e conciliação de liquidação.':'Webhook de campanhas pode importar campanhas; webhook de conversões ainda não configurado.'},pix:{providerConfigured:false,payoutsEnabled:false,bankVerification:false,reason:'Provedor Pix e credenciais de integração não configurados.'},automaticPaymentTransfers:false});}
 if(req.method==='POST'&&p==='/api/campaign-feedback'){if(me.role!=='participant')err('Somente participantes podem avaliar campanhas.',403);if(limited(req,'campaign-feedback',me.id,30,3600000))return send(res,429,{error:'Limite de avaliações atingido. Tente novamente mais tarde.'});const b=await body(req),programId=String(b.programId||''),rating=Number(b.rating),comment=String(b.comment||'').trim().slice(0,300),program=d.programs.find(x=>x.id===programId&&x.status==='active'&&x.videoUrl);if(!program)err('Campanha de vídeo indisponível.',404);if(!Number.isInteger(rating)||rating<1||rating>5)err('Escolha uma avaliação entre 1 e 5.');let feedback=d.campaignFeedback.find(x=>x.programId===programId&&x.participantId===me.id);const now=new Date().toISOString();if(feedback){feedback.rating=rating;feedback.comment=comment;feedback.updatedAt=now;await save(d);return send(res,200,{ok:true,feedback,updated:true})}feedback={id:crypto.randomUUID(),programId,participantId:me.id,rating,comment,createdAt:now,updatedAt:now};d.campaignFeedback.unshift(feedback);await save(d);return send(res,201,{ok:true,feedback,updated:false});}
 if(req.method==='POST'&&p==='/api/participants'){if(me.role!=='admin')err('Somente administrador.',403);const b=await body(req),name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),phone=normalizePhone(b.phone),pass=String(b.password||'');if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||!phone||phone.length<10||phone.length>13||pass.length<10)err('Para cadastrar um participante, informe nome, e-mail válido, celular com DDD e senha com pelo menos 10 caracteres.');if(d.users.some(u=>(email&&u.email===email)||(phone&&normalizePhone(u.phone)===phone))||d.participants.some(u=>(email&&u.email===email)||(phone&&normalizePhone(u.phone)===phone)))err('Este e-mail ou telefone já está cadastrado.',409);const person=D.createParticipant(d,me,{name,email,phone});d.users.push({id:person.id,email,phone,passwordHash:await hashPassword(pass)});await save(d);return send(res,201,{ok:true,participant:{id:person.id,name:person.name,email:person.email,phone:person.phone,status:person.status},message:'Participante cadastrado. Aprove o acesso para liberar o login.'});}
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
