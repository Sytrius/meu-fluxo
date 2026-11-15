const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8').replace(/\ninit\(\);\s*$/,'\n');
const mem=new Map();
const ctx={console,Intl,Date,Math,Number,String,Boolean,Array,Object,Set,Map,JSON,Promise,URL,Blob,encodeURIComponent,decodeURIComponent,
 localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},
 document:{addEventListener:()=>{},querySelector:()=>null,querySelectorAll:()=>[]},
 setTimeout:()=>0,
};ctx.globalThis=ctx;ctx.MeuFluxoChatParser=require("../chat-parser.js");ctx.MeuFluxoFinance=require("../finance-v13.js");
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.t={parseCents,monthAddDate,validDate,classify,chatResponse,stats,validateImported,backupPayload,saveTransaction,saveTransactionsBatch,readData,removeTransaction,importBatch,saveSettings,openDB,state,localFallback};',ctx);
const t=ctx.t;
vm.runInContext('globalThis.pages=()=>["dashboard","transactions","assistant","budgets","settings"].map(p=>{state.page=p;return pageHTML()});',ctx);
for(const h of ctx.pages()) assert.match(h, /<div|<section/, 'HTML gerado por página');
for(let i=1;i<=1500;i++){const cents=Math.floor(Math.random()*999999)+1;const formatted=(cents/100).toFixed(2).replace('.',',');assert.equal(t.parseCents(formatted),cents,'conversão monetária de ida e volta')}
for(let amount=2;amount<=50;amount++){for(let count=2;count<=12;count++){if(amount<count)continue;const base=Math.floor(amount/count),rest=amount%count;const parts=Array.from({length:count},(_,i)=>base+(i<rest?1:0));assert.equal(parts.reduce((a,b)=>a+b,0),amount);assert(Math.max(...parts)-Math.min(...parts)<=1)}}
for (const [raw,n] of [['0,01',1],['1',100],['123,45',12345],['1.234,56',123456],['1000,00',100000],['99.999.999,99',9999999999]])assert.equal(t.parseCents(raw),n,raw);
for (const raw of ['abc','-1','1,234','12,3456','0','R$ 0,00','12..12','100.5.4'])assert.equal(t.parseCents(raw),null,raw);
assert.equal(t.monthAddDate('2026-01-31',1),'2026-02-28');
assert.equal(t.monthAddDate('2024-01-31',1),'2024-02-29');
assert(t.validDate('2024-02-29'));
assert(!t.validDate('2026-02-29'));
assert.equal(t.classify('compras no supermercado'),'Alimentação');
assert.equal(t.classify('gasolina para carro'),'Transporte');
const r=t.chatResponse('Gastei R$ 45,90 no supermercado ontem');
assert.equal(r.pending.cents,4590);assert.equal(r.pending.type,'expense');assert.equal(r.pending.category,'Alimentação');
assert.match(t.chatResponse('Gastei R$ 20 e R$ 30').text,/mais de um valor/);
assert.match(t.chatResponse('Gastei R$ 1,234').text,/ambíguo/);
assert.equal(t.chatResponse('Recebi R$ 1.500 de salário hoje').pending.cents,150000);
const E=(id,cents,type='expense')=>({id,title:'Teste',cents,type,date:'2026-11-15',category:'Alimentação',method:'Pix',createdAt:new Date().toISOString(),items:[],receipt:null});
(async()=>{
 // fallback store (environment without IndexedDB)
 await t.openDB();
 await t.saveTransactionsBatch([E('a',4590),E('b',150000,'income')]);
 let d=await t.readData();assert.equal(d.entries.length,2);
 const backup={app:'meu-fluxo',schemaVersion:1,transactions:d.entries,settings:{budgets:{Alimentação:50000},chat:[]}};
 const parsed=t.validateImported(backup);assert.equal(parsed.entries.length,2);
 await t.importBatch(parsed.entries,parsed.settings,'merge');d=await t.readData();assert.equal(d.entries.length,2);
 await t.importBatch([],parsed.settings,'replace');d=await t.readData();assert.equal(d.entries.length,0);
 await t.importBatch(parsed.entries,parsed.settings,'replace');d=await t.readData();assert.equal(d.entries.length,2);
 await t.removeTransaction('a');d=await t.readData();assert.equal(d.entries.length,1);
 assert.throws(()=>t.validateImported({...backup,transactions:[{...E('bad',-100)}]}));
 assert.throws(()=>t.validateImported({...backup,transactions:[E('a',1),E('a',1)]}));
 console.log('PASS: moeda, datas, classificação, parser, armazenamento local, backup, importação, deduplicação, exclusão, validação');
})().catch(e=>{console.error(e);process.exitCode=1});
