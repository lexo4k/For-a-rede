'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createSupabaseStore}=require('./supabase-store');

function response(status,payload){return new Response(payload===undefined?'':JSON.stringify(payload),{status,headers:{'content-type':'application/json'}})}
const config={url:'https://project.supabase.co/',anonKey:'public-anon-key',rpcSecret:'server-only-secret'};

test('Supabase adapter loads the existing JSON state through the protected RPC',async()=>{
 let call;
 const state={participants:[],workTasks:[{id:'existing-task'}]};
 const store=createSupabaseStore({...config,fetchImpl:async(url,options)=>{call={url,options};return response(200,{state,updated_at:'2026-11-21T15:34:46.580042+00:00'})}});
 const loaded=await store.load();
 assert.equal(loaded,state);
 assert.equal(call.url,'https://project.supabase.co/rest/v1/rpc/wyncore_state_read');
 assert.equal(call.options.method,'POST');
 assert.equal(call.options.headers.apikey,'public-anon-key');
 assert.equal(call.options.headers.authorization,'Bearer public-anon-key');
 assert.deepEqual(JSON.parse(call.options.body),{p_secret:'server-only-secret'});
 assert.equal(loaded.workTasks.length,1);
});

test('Supabase adapter writes with optimistic concurrency and refreshes its version',async()=>{
 const calls=[];
 const store=createSupabaseStore({...config,fetchImpl:async(url,options)=>{const payload=JSON.parse(options.body);calls.push({url,payload});if(url.endsWith('wyncore_state_read'))return response(200,{state:{counter:1},updated_at:'2026-11-21T00:00:00Z'});return response(200,'2026-11-21T00:01:00Z')}});
 const state=await store.load();
 state.counter=2;
 await store.save(state);
 state.counter=3;
 await store.save(state);
 assert.equal(calls[1].payload.p_expected_updated_at,'2026-11-21T00:00:00Z');
 assert.equal(calls[1].payload.p_state.counter,2);
 assert.equal(calls[2].payload.p_expected_updated_at,'2026-11-21T00:01:00Z');
 assert.equal(calls[2].payload.p_state.counter,3);
});

test('concurrent stale state is rejected instead of overwriting newer data',async()=>{
 const store=createSupabaseStore({...config,fetchImpl:async(url)=>url.endsWith('wyncore_state_read')?response(200,{state:{counter:1},updated_at:'2026-11-21T00:00:00Z'}):response(409,{code:'40001',message:'WYNCORE state changed; retry request'})});
 const state=await store.load();
 await assert.rejects(()=>store.save(state),error=>error.status===409&&/atualizado por outra operação/.test(error.message));
});

test('partial configuration and unauthenticated RPC fail closed',async()=>{
 assert.throws(()=>createSupabaseStore({url:config.url,anonKey:config.anonKey}),/incompleta/);
 const store=createSupabaseStore({...config,fetchImpl:async()=>response(401,{code:'28000',message:'Unauthorized'})});
 await assert.rejects(()=>store.load(),error=>error.status===503);
});

test('only a state returned by load can be persisted',async()=>{
 const store=createSupabaseStore({...config,fetchImpl:async()=>response(200,'2026-11-21T00:00:00Z')});
 await assert.rejects(()=>store.save({counter:1}),error=>error.status===500);
});
