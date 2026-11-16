const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const H=require('../receipt-hybrid-v15.js');
const source=fs.readFileSync(path.join(__dirname,'../receipt-hybrid-ui-v15.js'),'utf8');
function mock(allow=false){
 const fields={'hybrid-qr-result':{innerHTML:'',textContent:''},'hybrid-ai-status':{textContent:''}};
 let calls=0;
 const ctx={
  console,navigator:{onLine:true},MeuFluxoReceiptHybrid:H,
  MeuFluxoReceiptCapture:{getPhotos:()=>['data:image/jpeg;base64,QUJD'],acceptExternalDraft:()=>{calls+=100}},
  MeuFluxoReceiptAI:{configured:()=>true,analyze:async()=>{calls++;return {items:[],issues:[]}}},
  confirm:()=>allow,uiToast(){},esc:x=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;'),
  $:q=>fields[q.slice(1)]||null
 };
 ctx.globalThis=ctx;
 vm.runInNewContext(source,ctx);
 return {api:ctx.MeuFluxoReceiptHybridUI,fields,calls:()=>calls};
}
test('Gemini não recebe nenhuma foto sem autorização explícita',async()=>{
 const {api,calls}=mock(false);
 await api.action({dataset:{action:'hybrid-ai-start'}});
 assert.equal(calls(),0);
});
test('QR oficial é exibido como link apenas após validação',()=>{
 const {api,fields}=mock();
 const url='http://nfce.sefaz.pe.gov.br/nfce/consulta?p='+('1'.repeat(44))+'|2|1|7|ABC';
 assert.equal(api.showQr(url),true);
 assert.match(fields['hybrid-qr-result'].innerHTML,/https:\/\/nfce.sefaz.pe.gov.br/);
 assert.equal(api.showQr('https://evil.example'),false);
 assert.doesNotMatch(fields['hybrid-qr-result'].innerHTML,/evil.example/);
});
