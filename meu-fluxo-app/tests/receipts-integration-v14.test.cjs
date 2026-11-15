
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const R=require('../receipts-v14.js'),F=require('../finance-v13.js'),P=require('../chat-parser.js'),B=require('../backup-v2.js');
const {webcrypto}=require('node:crypto');
const app=fs.readFileSync(path.resolve(__dirname,'../app.js'),'utf8').replace(/\ninit\(\);\s*$/,'\n');
const receiptUI=fs.readFileSync(path.resolve(__dirname,'../receipts-ui-v14.js'),'utf8');
const domMap=new Map();
const element=(id,value='')=>({id,value,innerHTML:'',textContent:'',disabled:false,focus(){}});
for(const id of ['entry-form','receipt-ocr-status','receipt-ocr-review','entry-items','entry-title','entry-merchant','entry-date','entry-amount','entry-type','entry-category','receipt-scan'])domMap.set(id,element(id));
domMap.get('entry-title').value='';
domMap.get('entry-merchant').value='';
domMap.get('entry-date').value='2026-11-15';
domMap.get('entry-type').value='expense';
domMap.get('entry-category').value='Alimentação';
const document={
 addEventListener(){},
 querySelector(q){if(q==='[data-action="receipt-scan"]')return domMap.get('receipt-scan');return domMap.get(q.replace(/^#/,'').replace(/^\[.*$/,'__none'))||null},
 querySelectorAll(){return []},
 documentElement:{dataset:{}}
};
const ctx={console,Date,Intl,Math,Number,String,Boolean,Array,JSON,Promise,Map,Set,URL,Blob,crypto:webcrypto,document,
 navigator:{onLine:true},location:{href:'https://sytrius.github.io/meu-fluxo/'},setTimeout(){},confirm:()=>true};
ctx.globalThis=ctx;ctx.MeuFluxoReceipts=R;ctx.MeuFluxoFinance=F;ctx.MeuFluxoChatParser=P;ctx.MeuFluxoBackups=B;
ctx.localStorage={getItem(){return null},setItem(){}};
vm.createContext(ctx);
vm.runInContext(app+'\nuiToast=()=>{};globalThis.v14test={state,collectEntry,validateEntry,itemRowsHTML,validateImported};',ctx);
vm.runInContext(receiptUI,ctx);
test('OCR de nota reconhece dados e apenas prepara campos, sem gravar automaticamente',async()=>{
 ctx.v14test.state.editingReceipt='data:image/jpeg;base64,ZmFrZQ==';
 let invoked=false,terminated=false;
 ctx.Tesseract={createWorker:async(lang,oem,options)=>{
  assert.equal(lang,'por');assert.equal(oem,1);
  assert.match(options.langPath,/vendor\/ocr\/lang$/);
  return {recognize:async(photo)=>{assert.match(photo,/^data:image/);invoked=true;return {data:{text:'MERCADO LAGOA\n15/11/2026\nARROZ 12,00\nLEITE 2 UN 5,00 10,00\nTOTAL 22,00'}}},terminate:async()=>{terminated=true}};
 }};
 await ctx.MeuFluxoReceiptsUI.scan();
 assert.equal(invoked,true);
 assert.equal(terminated,true);
 assert.match(domMap.get('receipt-ocr-review').innerHTML,/Prévia da nota/);
 assert.equal(ctx.v14test.state.entries.length,0);
 ctx.MeuFluxoReceiptsUI.apply();
 assert.equal(ctx.v14test.state.items.length,2);
 assert.equal(domMap.get('entry-merchant').value,'MERCADO LAGOA');
 assert.equal(domMap.get('entry-amount').value,'22,00');
 assert.equal(ctx.v14test.state.items[1].unit,'un');
 assert.equal(ctx.v14test.state.entries.length,0);
});
test('histórico por kg e unidade é calculado só a partir de compras confirmadas',()=>{
 ctx.v14test.state.entries=[{id:'a',date:'2026-10-01',type:'expense',items:[{name:'Arroz',qty:1,unit:'kg',cents:500}]},
 {id:'b',date:'2026-11-01',type:'expense',items:[{name:'Arroz',qty:1,unit:'kg',cents:600}]}];
 const page=ctx.MeuFluxoReceiptsUI.page();
 assert.match(page,/Produtos e preços/);
 assert.match(page,/Arroz/);
 assert.match(page,/20%/);
});
test('backup continua preservando a unidade dos itens e aceita backup antigo',()=>{
 const valid={app:'meu-fluxo',schemaVersion:2,transactions:[{id:'unit-test',type:'expense',title:'Compra',cents:1000,date:'2026-11-15',category:'Alimentação',items:[{name:'Arroz',qty:500,unit:'g',cents:1000}]}],settings:{}};
 assert.equal(ctx.v14test.validateImported(valid).entries[0].items[0].unit,'g');
 delete valid.transactions[0].items[0].unit;
 assert.equal(ctx.v14test.validateImported(valid).entries[0].items[0].unit,'un');
});
