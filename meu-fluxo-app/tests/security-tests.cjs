const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(__dirname+'/../app.js','utf8').replace(/\ninit\(\);\s*$/,'\n');
const data=new Map();
const ctx={console,crypto:webcrypto,atob,btoa,TextEncoder,TextDecoder,Uint8Array,Date,Intl,URL,Blob,File:class File {},setTimeout:()=>0,Math,JSON,Array,Map,Set,Promise,String,Number,Boolean,localStorage:{getItem:x=>data.get(x)||null,setItem:(x,v)=>data.set(x,v)},document:{addEventListener:()=>{},querySelector:()=>null,querySelectorAll:()=>[]}};
ctx.globalThis=ctx;ctx.MeuFluxoFinance=require('../finance-v13.js');vm.createContext(ctx);
vm.runInContext(source+`\nglobalThis.sec={encryptBackup,decryptBackup,switchProfile,openDB,saveTransaction,readData,state,ACTIVE_LOCAL};`,ctx);
(async()=>{
const p={app:'meu-fluxo',schemaVersion:1,transactions:[{cents:12345}],settings:{}};
const encrypted=await ctx.sec.encryptBackup(p,'minha senha segura 123');
assert.equal(encrypted.format,'meu-fluxo-encrypted-v1');
assert.equal(encrypted.cipher,'AES-256-GCM');
assert(!JSON.stringify(encrypted).includes('12345'));
assert.equal((await ctx.sec.decryptBackup(encrypted,'minha senha segura 123')).transactions[0].cents,12345);
await assert.rejects(ctx.sec.decryptBackup(encrypted,'senha errada'));
const corrupted={...encrypted,ciphertext:encrypted.ciphertext.slice(0,-10)+'AAAAA'};
await assert.rejects(ctx.sec.decryptBackup(corrupted,'minha senha segura 123'));
await assert.rejects(ctx.sec.encryptBackup(p,'curta'));
await ctx.sec.openDB();
await ctx.sec.saveTransaction({id:'pessoal',cents:500});
const before=await ctx.sec.readData();assert.equal(before.entries.length,1);
// testar escopo no fallback sem renderizar UI
vm.runInContext(`activeProfile={kind:'google',id:'google-test-uid',name:'Teste'};`,ctx);
assert.equal((await ctx.sec.readData()).entries.length,0);
await ctx.sec.saveTransaction({id:'google',cents:100});
vm.runInContext(`activeProfile=ACTIVE_LOCAL;`,ctx);
assert.equal((await ctx.sec.readData()).entries[0].id,'pessoal');
console.log('PASS: AES-GCM/PBKDF2, senha errada, integridade, separação de perfis no armazenamento alternativo');
})().catch(err=>{console.error(err);process.exitCode=1});
