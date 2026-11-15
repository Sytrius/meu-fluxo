
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('../finance-v13.js'),B=require('../backup-v2.js'),P=require('../chat-parser.js');
const {webcrypto}=require('node:crypto');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace(/\ninit\(\);\s*$/,'\n');
const financeUI=fs.readFileSync(path.join(__dirname,'../finance-ui-v13.js'),'utf8');
const memory=new Map(),root={innerHTML:''},overlay={innerHTML:''};
const dom={
 documentElement:{dataset:{}},
 addEventListener(){},
 querySelector(selector){
  if(selector==='#app')return root;
  if(selector==='#overlay')return overlay;
  return null;
 },
 querySelectorAll(){return []}
};
const ctx={console,Intl,Date,Math,Number,String,Boolean,Array,Object,Map,Set,JSON,Promise,URL,Blob,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,
 document:dom,confirm:()=>true,setTimeout(){},navigator:{onLine:false},
 localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)}
};
ctx.globalThis=ctx;ctx.MeuFluxoFinance=F;ctx.MeuFluxoBackups=B;ctx.MeuFluxoChatParser=P;
vm.createContext(ctx);
vm.runInContext(financeUI,ctx);
vm.runInContext(app+'\nuiToast=()=>{};globalThis.api={state,openDB,saveSettings,readData,saveTransaction,backupPayload,validateImported,groupPendingPurchase,doImport,render,pageHTML};',ctx);
const api=ctx.api;
const account={id:'a1',name:'Nubank',kind:'bank',openingCents:100000};
const card={id:'c1',name:'Cartão Nubank',limitCents:200000,closingDay:25,dueDay:10};
const E=(id,cents,extras={})=>({id,title:'Teste',cents,type:'expense',date:'2026-11-15',category:'Alimentação',method:'Pix',createdAt:'2026-11-15T10:00:00Z',items:[],receipt:null,deletedAt:null,...extras});
test('contas e cartões são páginas renderizáveis e permitem associar despesas',async()=>{
 await api.openDB();
 api.state.settings.finance=F.normalize({accounts:[account],cards:[card]});
 await api.saveSettings();
 const pages=ctx.MeuFluxoFinanceUI;
 const html=pages.accountsPage();
 assert.match(html,/Contas e transferências/);
 assert.match(html,/Nubank/);
 const cards=pages.cardsPage();
 assert.match(cards,/Cartões e faturas/);
 const options=pages.sourceOptions('a1',null,'expense');
 assert.match(options,/selected/);
 assert.match(options,/a:a1/);
 assert.match(pages.sourceOptions(null,'c1','expense'),/c:c1/);
 assert.throws(()=>pages.validLink(E('wrong',1000,{accountId:'missing'})),/não existe/);
 assert.throws(()=>pages.validLink(E('wrong',1000,{type:'income',cardId:'c1'})),/só pode/);
});
test('compra de vários itens se torna uma única despesa após confirmação',async()=>{
 const rows=[E('r1',3000,{title:'Mercado',accountId:'a1'}),E('r2',1500,{title:'Café',accountId:'a1'}),E('r3',1000,{title:'Queijo',accountId:'a1'}),E('r4',500,{title:'Pão',accountId:'a1'})];
 api.state.pending={kind:'batch',entries:rows,notes:['Quilo do queijo custa 23 reais']};
 await api.groupPendingPurchase();
 const data=await api.readData();
 assert.equal(data.entries.length,1);
 assert.equal(data.entries[0].cents,6000);
 assert.equal(data.entries[0].items.length,4);
 assert.equal(data.entries[0].accountId,'a1');
 assert.equal(F.accountBalance(account,data.entries,F.normalize(api.state.settings.finance),'2026-11-15'),94000);
});
test('backup da versão 1.3 preserva vínculos, contas, cartões e importação',async()=>{
 const payload=api.backupPayload();
 const sealed=await B.seal(payload);
 await B.verify(sealed);
 const restored=api.validateImported(sealed);
 assert.equal(restored.settings.finance.accounts.length,1);
 assert.equal(restored.settings.finance.cards.length,1);
 assert.equal(restored.entries[0].accountId,'a1');
});
test('importação mescla nova conta e lançamento sem descartar finanças locais',async()=>{
 const second={id:'a2',name:'99Pay',kind:'wallet',openingCents:5000};
 const prior=await api.readData(),f=F.normalize(api.state.settings.finance);
 const backupFinance=F.normalize({...f,accounts:[...f.accounts,second]});
 const imported={...E('from-backup',2000,{accountId:'a2'}),title:'Compra 99Pay'};
 api.state.importBuffer={entries:[imported],settings:{...api.state.settings,finance:backupFinance}};
 api.state.importReview=B.compare([...prior.entries,...prior.deletedEntries],[imported]);
 api.state.importFinanceReview=F.merge(f,backupFinance,'local');
 await api.doImport('merge');
 const current=await api.readData();
 assert.equal(current.settings.finance.accounts.length,2);
 assert.equal(current.entries.length,2);
 assert.equal(current.entries.find(e=>e.id==='from-backup').accountId,'a2');
});
