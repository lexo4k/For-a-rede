'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const W=require('./work-engine');

test('opportunity scanner accepts only safe HTTPS destinations',()=>{
 const good=W.normalizeJob({title:'Portuguese AI Data Annotator',company_name:'Example',url:'https://example.com/apply',description:'Evaluate Portuguese language model responses and label data',tags:['AI','annotation']},'Test');
 assert.ok(good);
 assert.match(good.id,/^job_[a-f0-9]{24}$/);
 assert.equal(good.remote,true);
 assert.equal(W.normalizeJob({title:'AI data annotator',url:'http://example.com/apply',description:'annotation'},'Test'),null);
 assert.equal(W.normalizeJob({title:'AI data annotator',url:'javascript:alert(1)',description:'annotation'},'Test'),null);
});

test('scanner ranks relevant AI/data/research work and filters unrelated jobs',()=>{
 assert.ok(W.scoreJob({title:'Portuguese AI Trainer',description:'Evaluate LLM responses and label data',location:'Remote worldwide'})>=5);
 assert.equal(W.scoreJob({title:'Senior Software Engineer',description:'Build backend infrastructure'}),0);
 assert.equal(W.scoreJob({title:'Sales Manager',description:'Commission only'}),0);
});

test('deduplication keeps one result per destination and merge preserves personal tracking',()=>{
 const a={id:'job_a',url:'https://example.com/a',title:'Portuguese Data Annotator',score:8,firstSeenAt:'2026-11-01T00:00:00Z',status:'applied'};
 const duplicate={...a,score:9,source:'Second feed',firstSeenAt:'2026-11-23T00:00:00Z'};
 assert.equal(W.dedupe([a,duplicate]).length,1);
 const merged=W.mergeJobs([a],[{...duplicate,lastSeenAt:'2026-11-23T00:00:00Z'}]);
 assert.equal(merged.added,0);
 assert.equal(merged.updated,1);
 assert.equal(merged.jobs[0].status,'applied');
 assert.equal(merged.jobs[0].firstSeenAt,'2026-11-01T00:00:00Z');
});

test('official work portals are direct links and explicitly marked as portals',()=>{
 assert.ok(W.PORTALS.length>=8);
 for(const p of W.PORTALS){assert.equal(p.kind,'portal');assert.match(p.url,/^https:\/\//);assert.ok(p.name&&p.focus)}
});

test('parallel public feeds are scanned independently and merged without duplicates',async()=>{
 const fakeFetch=async url=>{
  let payload;
  if(url.includes('remotive.com'))payload={jobs:[{title:'Portuguese AI Data Annotator',company_name:'Remotive Co',url:'https://remotive.com/remote-jobs/1',description:'Annotate Portuguese AI training data'}]};
  else if(url.includes('arbeitnow.com'))payload={data:[{title:'Portuguese Data Annotator',company_name:'Arbeit Co',url:'https://arbeitnow.com/jobs/1',description:'Data annotation project',remote:true}]};
  else payload=[{position:'AI Data Annotator',company_name:'Remote OK Co',apply_url:'https://remoteok.com/remote-jobs/1',description:'Label data for AI models'}];
  return {ok:true,json:async()=>payload};
 };
 const result=await W.scanSources(fakeFetch);
 assert.equal(result.sources.length,3);
 assert.ok(result.sources.every(x=>x.ok));
 assert.ok(result.jobs.length>=3);
 assert.ok(result.jobs.every(x=>x.url.startsWith('https://')&&x.score>=3));
});
