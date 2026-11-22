'use strict';

function createSupabaseStore({url,anonKey,rpcSecret,fetchImpl=globalThis.fetch,timeoutMs=9000}){
 const base=String(url||'').replace(/\/+$/,'');
 if(!/^https:\/\//i.test(base)||!anonKey||!rpcSecret||typeof fetchImpl!=='function')throw new Error('Configuração do armazenamento Supabase incompleta.');
 const versions=new WeakMap();
 async function rpc(name,payload){
  let response;
  try{
   response=await fetchImpl(base+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:{apikey:anonKey,authorization:'Bearer '+anonKey,'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(timeoutMs)
   });
  }catch(e){throw Object.assign(new Error('Supabase indisponível: '+String(e?.message||e).slice(0,180)),{status:503})}
  const raw=await response.text();
  let data=null;
  if(raw){try{data=JSON.parse(raw)}catch{data=raw}}
  if(!response.ok){
   const code=String(data?.code||'');
   const message=String(data?.message||data?.hint||'Falha na operação de armazenamento Supabase.').slice(0,240);
   const status=code==='40001'?409:code==='28000'||response.status===401||response.status===403?503:response.status>=500?503:500;
   throw Object.assign(new Error(code==='40001'?'O estado do WYNCORE foi atualizado por outra operação. Recarregue e tente novamente.':message),{status,code});
  }
  return data;
 }
 async function load(){
  const result=await rpc('wyncore_state_read',{p_secret:rpcSecret});
  if(!result||typeof result!=='object'||Array.isArray(result)||!Object.prototype.hasOwnProperty.call(result,'state'))throw Object.assign(new Error('Resposta inválida do armazenamento Supabase.'),{status:503});
  const state=result.state&&typeof result.state==='object'&&!Array.isArray(result.state)?result.state:{};
  versions.set(state,result.updated_at||null);
  return state;
 }
 async function save(state){
  if(!state||typeof state!=='object'||Array.isArray(state)||!versions.has(state))throw Object.assign(new Error('Estado não foi carregado pelo armazenamento Supabase.'),{status:500});
  const updatedAt=await rpc('wyncore_state_write',{p_secret:rpcSecret,p_expected_updated_at:versions.get(state),p_state:state});
  if(typeof updatedAt!=='string'||!updatedAt)throw Object.assign(new Error('Supabase não confirmou a gravação do estado.'),{status:503});
  versions.set(state,updatedAt);
  return updatedAt;
 }
 return {load,save};
}

module.exports={createSupabaseStore};
