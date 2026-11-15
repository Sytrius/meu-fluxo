const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const backup=require('../backup-v2.js');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8').replace(/\ninit\(\);\s*$/,'\n');
const local=new Map();
const ctx={
 console,Date,Intl,Math,Number,String,Boolean,Array,Object,Set,Map,JSON,Promise,URL,Blob,crypto:webcrypto,
 localStorage:{getItem:key=>local.get(key)||null,setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)},
 document:{addEventListener(){},querySelector(){return null},querySelectorAll(){return []}},
 setTimeout(){},TextEncoder,TextDecoder,Uint8Array
};
ctx.globalThis=ctx;
ctx.MeuFluxoBackups=backup;ctx.MeuFluxoFinance=require('../finance-v13.js');
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.api={openDB,readData,saveTransaction,saveTransactionsBatch,removeTransaction,importBatch,validateImported,backupPayload,state};',ctx);
const api=ctx.api;
const E=(id,amount)=>({id,type:'expense',cents:amount,title:'Teste',date:'2026-11-15',category:'Alimentação',method:'Pix',note:'',nature:'variable',recurring:false,receipt:null,items:[],createdAt:'2026-11-15T10:00:00.000Z',updatedAt:'2026-11-15T10:00:00.000Z',deletedAt:null});
test('exclusão reaparece corretamente como tombstone e resiste a backup/restauração',async()=>{
 await api.openDB();
 const record=E('deleted-1',4500);
 await api.saveTransaction(record);
 await api.removeTransaction(record.id);
 let data=await api.readData();
 assert.equal(data.entries.length,0);
 assert.equal(data.deletedEntries.length,1);
 assert.match(data.deletedEntries[0].deletedAt,/^2026-/);
 api.state.entries=data.entries;api.state.deletedEntries=data.deletedEntries;
 const payload=api.backupPayload();
 assert.equal(payload.schemaVersion,2);
 assert.equal(payload.transactions.length,1);
 const sealed=await backup.seal(payload);
 await backup.verify(sealed);
 const restored=api.validateImported(sealed);
 assert.equal(restored.entries[0].deletedAt,data.deletedEntries[0].deletedAt);
 await api.importBatch([],restored.settings,'replace');
 data=await api.readData();
 assert.equal(data.entries.length,0);
 await api.saveTransaction(record);
 data=await api.readData();
 assert.equal(data.entries.length,1);
 const review=backup.compare(data.entries,restored.entries);
 assert.equal(review.conflicts.length,1);
 await api.importBatch([review.conflicts[0].backup],restored.settings,'merge-reviewed');
 data=await api.readData();
 assert.equal(data.entries.length,0);
 assert.equal(data.deletedEntries.length,1);
 await api.saveTransaction({...record,updatedAt:new Date().toISOString()});
 data=await api.readData();
 assert.equal(data.entries.length,1);
 assert.equal(data.deletedEntries.length,0);
});
test('mesclagem comum preserva alteração local; revisada usa escolha explícita',async()=>{
 const original=E('conflict-2',1000),incoming={...original,cents:2300};
 await api.importBatch([original],{},'replace');
 await api.importBatch([incoming],{},'merge');
 assert.equal((await api.readData()).entries[0].cents,1000);
 await api.importBatch([incoming],{},'merge-reviewed');
 assert.equal((await api.readData()).entries[0].cents,2300);
});
test('backup v1 anterior continua válido e novos campos não são obrigatórios',()=>{
 const legacy={app:'meu-fluxo',schemaVersion:1,transactions:[E('old-3',6000)],settings:{}};
 delete legacy.transactions[0].deletedAt;
 delete legacy.transactions[0].updatedAt;
 const parsed=api.validateImported(legacy);
 assert.equal(parsed.entries.length,1);
 assert.equal(parsed.entries[0].deletedAt,null);
});
