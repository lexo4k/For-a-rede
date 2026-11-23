'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');

process.env.DATA_DIR=path.join(os.tmpdir(),'wyncore-integrated-'+process.pid);
process.env.WYNCORE_OWNER_PASSWORD='test-password-with-more-than-12';
process.env.WYNCORE_SESSION_SECRET='test-session-secret-with-more-than-32-characters';
process.env.WYNCORE_GOOGLE_CLIENT_ID='wyncore-test-google-client';

const {createServer,limited}=require('./server');

test('rate limiter tolerates serverless requests without a socket object',()=>{
 assert.equal(limited({headers:{},socket:null},'test','identity',10,900000),false);
});

test('WYNCORE integrated app: public shell, accounts, campaigns and safe payment states',async t=>{
 const server=createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(process.env.DATA_DIR,{recursive:true,force:true})});

 const health=await fetch(base+'/api/health');
 assert.equal(health.status,200);
 const h=await health.json();
 assert.equal(h.ok,true);
 assert.equal(h.service,'WYNCORE');
 assert.equal(h.ownerLoginConfigured,true);
 assert.equal(h.participantLoginConfigured,true);
 assert.equal(typeof h.integrations.stripe.configured,'boolean');
 assert.equal(typeof h.integrations.stripe.webhookConfigured,'boolean');
 assert.equal(typeof h.integrations.stripe.connectEnabled,'boolean');

 for(const file of ['/','/index.html','/app.js','/styles.css','/sw.js','/manifest.webmanifest','/ads.html','/ads.css','/ads.js','/anunciantes.html','/sobre.html','/privacidade.html','/termos.html','/robots.txt','/sitemap.xml']){
  const response=await fetch(base+file);
  assert.equal(response.status,200,file+' must be served');
  if(/\.(html|js|css|webmanifest)$/.test(file)||file==='/')assert.equal(response.headers.get('cache-control'),'no-cache');
 }
 for(const file of ['/work.html','/work.js','/work.css','/guia-estagio.html','/guia-aprendizagem.html'])assert.equal((await fetch(base+file)).status,404,file+' belongs to the removed work module');
 assert.equal((await fetch(base+'/api/work')).status,410,'the retired external job API must stay disabled');
 assert.equal((await fetch(base+'/api/dashboard')).status,401,'private APIs require a session');

 const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:'ADMIN',password:process.env.WYNCORE_OWNER_PASSWORD})});
 assert.equal(login.status,200);
 const admin=login.headers.get('set-cookie').split(';')[0];
 const dash=await fetch(base+'/api/dashboard',{headers:{cookie:admin}});
 assert.equal(dash.status,200);
 const workRadar=await fetch(base+'/api/work-engine',{headers:{cookie:admin}});
 assert.equal(workRadar.status,200);
 const radar=await workRadar.json();
 assert.ok(Array.isArray(radar.jobs));
 assert.ok(Array.isArray(radar.portals));
 assert.ok(radar.portals.length>=8);
 const unauthCron=await fetch(base+'/api/cron/work-scan');
 assert.equal(unauthCron.status,401,'scheduled scanner must reject unauthenticated requests');

 const signup=await fetch(base+'/api/access-request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Participante Integrado',email:'integrado@example.org',phone:'11987654321',password:'senha-segura-123'})});
 assert.equal(signup.status,201);
 const pending=(await (await fetch(base+'/api/dashboard',{headers:{cookie:admin}})).json()).participants.find(x=>x.email==='integrado@example.org');
 assert.ok(pending);
 const approval=await fetch(base+'/api/participants/approve',{method:'POST',headers:{cookie:admin,'content-type':'application/json'},body:JSON.stringify({participantId:pending.id,role:'participant'})});
 assert.equal(approval.status,200);
 const participantLogin=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:'integrado@example.org',password:'senha-segura-123'})});
 assert.equal(participantLogin.status,200);
 const participant=participantLogin.headers.get('set-cookie').split(';')[0];
 const me=await (await fetch(base+'/api/me',{headers:{cookie:participant}})).json();
 assert.equal(me.role,'participant');
 const participantDashboard=await fetch(base+'/api/dashboard',{headers:{cookie:participant}});
 assert.equal(participantDashboard.status,200);

 const programResponse=await fetch(base+'/api/programs',{method:'POST',headers:{cookie:admin,'content-type':'application/json'},body:JSON.stringify({title:'Atividade financiada por Stripe',source:'Campanha interna',reward:25,budget:100,url:'https://example.org/activity'})});
 assert.equal(programResponse.status,201);
 const program=await programResponse.json();
 assert.equal(program.status,'pending_funding');
 const checkout=await fetch(base+'/api/programs/'+program.id+'/checkout',{method:'POST',headers:{cookie:admin,'content-type':'application/json'},body:'{}'});
 assert.equal(checkout.status,503,'checkout must fail closed until Stripe credentials are configured');
 const manualFunding=await fetch(base+'/api/programs/'+program.id+'/funding',{method:'POST',headers:{cookie:admin,'content-type':'application/json'},body:JSON.stringify({reference:'MANUAL-FAKE'})});
 assert.equal(manualFunding.status,410,'manual funding confirmations are disabled');
 const manualPayment=await fetch(base+'/api/assignments/fake-assignment/payment',{method:'POST',headers:{cookie:admin,'content-type':'application/json'},body:JSON.stringify({reference:'MANUAL-FAKE'})});
 assert.equal(manualPayment.status,410,'manual payment confirmations are disabled');
 const pixProfile=await fetch(base+'/api/pix-key',{headers:{cookie:participant}});
 assert.equal(pixProfile.status,200);
 assert.equal((await pixProfile.json()).hasPixKey,false);
 const savePix=await fetch(base+'/api/pix-key',{method:'POST',headers:{cookie:participant,'content-type':'application/json'},body:JSON.stringify({type:'email',key:'recebimento@example.org'})});
 assert.equal(savePix.status,200);
 const savedPix=await savePix.json();
 assert.equal(savedPix.hasPixKey,true);
 assert.equal(savedPix.keyType,'email');
 assert.ok(savedPix.masked.includes('@'));
 assert.equal(JSON.stringify(savedPix).includes('recebimento@example.org'),false,'raw Pix key must not be returned');
 const pixAgain=await (await fetch(base+'/api/pix-key',{headers:{cookie:participant}})).json();
 assert.equal(pixAgain.hasPixKey,true);
 assert.equal(pixAgain.masked,savedPix.masked);
 const pix=await fetch(base+'/api/my-pix-withdrawal',{method:'POST',headers:{cookie:participant,'content-type':'application/json'},body:JSON.stringify({amount:10})});
 assert.notEqual(pix.status,410,'Pix withdrawal route must no longer be retired');
 const pixAdmin=await fetch(base+'/api/admin/pix-withdrawals',{headers:{cookie:admin}});
 assert.equal(pixAdmin.status,200);
 assert.ok(Array.isArray((await pixAdmin.json()).requests));

 const advertiser=await fetch(base+'/api/advertiser-inquiries',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({company:'Empresa de Teste',contact:'Responsável',email:'contato@empresa.com',phone:'11912345678',budget:500,channel:'digital',objective:'Avaliar percepção e clareza de campanha com participantes reais.'})});
 assert.equal(advertiser.status,201);
 const workspace=await fetch(base+'/api/ad-workspace',{headers:{cookie:admin}});
 assert.equal(workspace.status,200);
 const ws=await workspace.json();
 assert.ok(ws.advertiserInquiries.some(x=>x.company==='Empresa de Teste'));
 assert.equal(typeof ws.stripeIntegration.configured,'boolean');
});

test('public signup remains available when owner/session secrets are absent',()=>{
 const script=`const {createServer}=require('./server');const s=createServer();s.listen(0,'127.0.0.1',async()=>{try{const r=await fetch('http://127.0.0.1:'+s.address().port+'/api/access-request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Cadastro só com celular',phone:'11987654321',password:'senha-segura-123'})});await r.text();process.stdout.write(String(r.status));s.close()}catch(e){process.stderr.write(String(e));s.close();process.exitCode=1}});`;
 const run=require('node:child_process').spawnSync(process.execPath,['-e',script],{cwd:__dirname,encoding:'utf8',env:{...process.env,WYNCORE_OWNER_PASSWORD:'',WYNCORE_SESSION_SECRET:'',DATA_DIR:path.join(os.tmpdir(),'wyncore-no-auth-'+process.pid)}});
 assert.equal(run.status,0,run.stderr);
 assert.equal(run.stdout,'201');
});
