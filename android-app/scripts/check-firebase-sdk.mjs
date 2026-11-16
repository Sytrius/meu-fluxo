import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(path.resolve(process.argv[2],'package.json'));
const {initializeApp,deleteApp}=require('firebase/app');
const {initializeAppCheck,CustomProvider,getToken}=require('firebase/app-check');
const app=initializeApp({apiKey:'test-only',projectId:'test-only',appId:'test-only'},'appcheck-contract-test');
let calls=0;
const instance=initializeAppCheck(app,{isTokenAutoRefreshEnabled:false,provider:new CustomProvider({getToken:async()=>{
 calls++;return {token:'test-token-no-network',expireTimeMillis:Date.now()+3600000};
}})});
try {
 const result=await getToken(instance);
 assert.equal(result.token,'test-token-no-network');assert.equal(calls,1);
 console.log('Firebase 11.10.0: initializeAppCheck instance + getToken + CustomProvider verified. No receipt or network attestation sent.');
}finally{await deleteApp(app)}
