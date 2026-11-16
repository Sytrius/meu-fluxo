
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const R=require('../receipts-v14.js'),P=require('../receipt-multipage-v15.js'),F=require('../finance-v13.js'),B=require('../backup-v2.js'),C=require('../chat-parser.js');
const {webcrypto}=require('node:crypto');
const read=n=>fs.readFileSync(path.join(__dirname,'../'+n),'utf8');
const ui=new Map();
const el=(value='')=>({value,innerHTML:'',textContent:'',hidden:false,checked:false,disabled:false,focus(){},classList:{toggle(){}},setAttribute(){}});
for(const id of ['entry-form','receipt-ocr-status','receipt-ocr-review','receipt-status','receipt-review-label','receipt-reviewed','entry-items','entry-title','entry-merchant','entry-date','entry-amount','entry-type','entry-category','entry-method','entry-nature','entry-note','entry-recurring','entry-source','receipt-multi-scan'])ui.set(id,el());
ui.get('entry-date').value='2026-11-15';ui.get('entry-category').value='Alimentação';ui.get('entry-method').value='Pix';ui.get('entry-nature').value='variable';ui.get('entry-type').value='expense';
const doc={documentElement:{dataset:{}},addEventListener(){},querySelector(q){
 if(q==='[data-action="receipt-multi-scan"]')return ui.get('receipt-multi-scan');
 return ui.get(q.charAt(0)==='#'?q.slice(1):'not-found')||null;
},querySelectorAll(){return []}};
const ctx={console,Math,Date,Intl,Number,String,Boolean,Array,Object,JSON,Map,Set,Promise,URL,Blob,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,document:doc,location:{href:'https://sytrius.github.io/meu-fluxo/'},navigator:{onLine:true},setTimeout(){},confirm:()=>true};
ctx.globalThis=ctx;ctx.MeuFluxoFinance=F;ctx.MeuFluxoBackups=B;ctx.MeuFluxoChatParser=C;ctx.MeuFluxoReceipts=R;ctx.MeuFluxoReceiptMulti=P;ctx.localStorage={getItem(){return null},setItem(){}};
vm.createContext(ctx);
vm.runInContext(read('finance-ui-v13.js'),ctx);
vm.runInContext(read('app.js').replace(/\ninit\(\);\s*$/,'\n')+'\nuiToast=()=>{};globalThis.appTest={state,collectEntry,validateImported};',ctx);
vm.runInContext(read('receipt-capture-v15.js'),ctx);
const image1='data:image/jpeg;base64,QUJD',image2='data:image/jpeg;base64,REVG';
const part1='SUPERMERCADO CHAGAS\n15/11/2026\nN01 7891222333444 AMACIANTE\nUN X 14,70\nDesconto -0,29\nValor Liquido 14,41\nN02 7891222333555 LAVA ROUPAS\nUN X 28,20\nDesconto -0,56\nValor Liquido 27,64\nN03 7891222333666 DES AEROSOL\nUN X 14,99\nDesconto -0,30\nValor Liquido 14,69';
const part2='N03 7891222333666 DES AEROSOL\nUN X 14,99\nDesconto -0,30\nValor Liquido 14,69\nN04 7891222333777 FRANGO\nUN X 21,75\nDesconto -0,44\nValor Liquido 21,31\nQTD. TOTAL DE ITENS 004\nSUB.TOTAL DE ITENS 79,64\nDescontos R$ -1,59\nVALOR A PAGAR R$ 78,05';
test('duas fotos da mesma compra criam uma prévia sem salvar nem duplicar',async()=>{
 const cap=ctx.MeuFluxoReceiptCapture;
 cap.setUp({receiptPhotos:[image1,image2]});cap.renderPhotos();
 assert.match(ui.get('receipt-status').innerHTML,/Foto 2/);
 let calls=0,terminated=false;
 ctx.Tesseract={createWorker:async(lang,oem,opts)=>{
  assert.equal(lang,'por');assert.match(opts.langPath,/vendor\/ocr\/lang$/);
  return {recognize:async()=>({data:{text:++calls===1?part1:part2}}),terminate:async()=>{terminated=true}};
 }};
 await cap.scan();
 const d=cap.getDraft();assert.equal(d.items.length,4);assert.equal(d.total,7805);assert.equal(d.sum,7805);
 assert.equal(d.items.find(i=>i.number===3).sourcePhotos.length,2);
 assert.equal(terminated,true);assert.equal(ctx.appTest.state.entries.length,0);
 cap.apply();assert.equal(ctx.appTest.state.items.length,4);assert.equal(ui.get('entry-amount').value,'78,05');
 assert.throws(()=>cap.canSave(),/marque que conferiu/);
 ui.get('receipt-reviewed').checked=true;assert.equal(cap.canSave(),true);
 const entry=ctx.appTest.collectEntry();
 assert.equal(entry.cents,7805);assert.equal(entry.items.reduce((n,x)=>n+x.cents,0),7805);
 assert.equal(entry.receiptPhotos.length,2);assert.equal(entry.receipt,image1);
 assert.equal(ctx.appTest.state.entries.length,0);
});
test('backup aceita fotos múltiplas e fotografia legada',()=>{
 const row={id:'photo-test',title:'Compra',type:'expense',cents:7805,date:'2026-11-15',category:'Alimentação',items:[{name:'Arroz',qty:1,cents:7805,unit:'un'}],receipt:image1,receiptPhotos:[image1,image2]};
 let imported=ctx.appTest.validateImported({app:'meu-fluxo',schemaVersion:2,transactions:[row],settings:{}});
 assert.equal(imported.entries[0].receiptPhotos.length,2);
 delete row.receiptPhotos;
 imported=ctx.appTest.validateImported({app:'meu-fluxo',schemaVersion:1,transactions:[row],settings:{}});
 assert.equal(imported.entries[0].receiptPhotos.length,1);
});
