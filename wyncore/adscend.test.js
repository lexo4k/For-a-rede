'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Adscend=require('./adscend');
test('Adscend country codes are normalized and strictly ISO alpha-2 shaped',()=>{
 assert.equal(Adscend.countryCode('br'),'BR');
 assert.equal(Adscend.countryCode('US'),'US');
 assert.equal(Adscend.countryCode('BRA'),'');
 assert.equal(Adscend.countryCode('1B'),'');
 assert.equal(Adscend.countryCode(''),'');
});
test('only Rewarded Video offers explicitly permitting cash incentives are shown',()=>{
 const base={product_id:[8],allowed_traffic:3,countries:['BR']};
 assert.equal(Adscend.isCashRewardedVideo(base,'BR'),true);
 assert.equal(Adscend.isCashRewardedVideo({...base,allowed_traffic:2},'BR'),false);
 assert.equal(Adscend.isCashRewardedVideo({...base,product_id:[4]},'BR'),false);
 assert.equal(Adscend.isCashRewardedVideo({...base,countries:['US']},'BR'),false);
 assert.equal(Adscend.isCashRewardedVideo({...base,countries:'BR'},'BR'),false);
});
test('Adscend credentials are not considered configured when absent',()=>{
 if(!process.env.ADSCEND_PUBLISHER_ID&&!process.env.ADSCEND_API_KEY)assert.equal(Adscend.configured(),false);
});
