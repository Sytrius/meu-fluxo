const test=require('node:test'),assert=require('node:assert/strict');
require('../receipt-hybrid-v15.js');
require('../receipt-ai-v15.js');
const ai=globalThis.MeuFluxoReceiptAI;
const fs=require('node:fs'),vm=require('node:vm');
// Replace only the remote module loader; exercise the real client and analyze path.
function harness(){
 const calls=[],imports=[],writes=[];
 const receipt={merchant:'Loja',date:'2026-11-16',itemCount:0,totalCents:0,items:[]};
 const schema={object:x=>x,string:()=>({}),number:()=>({}),array:x=>x};
 const modules={
  'firebase-app.js':{getApps:()=>[],initializeApp:()=>({})},
  'firebase-app-check.js':{initializeAppCheck:()=>{},ReCaptchaEnterpriseProvider:class{}},
  'firebase-ai.js':{Schema:schema,GoogleAIBackend:class{},getAI:()=>({}),getGenerativeModel:(_ai,config)=>{
   calls.push({config});
   return {generateContent:async parts=>{
    calls.push({parts:JSON.parse(JSON.stringify(parts))});
    return {response:{text:()=>JSON.stringify(receipt)}};
   }};
  }}
 };
 const context=vm.createContext({
  navigator:{onLine:true},MEU_FLUXO_FIREBASE_CONFIG:{apiKey:'public',projectId:'test'},
  MEU_FLUXO_APPCHECK_SITE_KEY:'public-site-key-for-tests',
  localStorage:{getItem:()=>null,setItem:(...x)=>writes.push(x),removeItem:(...x)=>writes.push(x)},
  MeuFluxoReceiptHybrid:{validateReceipt:globalThis.MeuFluxoReceiptHybrid.validateReceipt},
  loadSDK:async url=>{imports.push(url);return modules[url.split('/').pop()]}
 });
 const source=fs.readFileSync(require.resolve('../receipt-ai-v15.js'),'utf8');
 vm.runInContext(source.replace(/\bimport\(/g,'loadSDK('),context);
 return {ai:context.MeuFluxoReceiptAI,calls,imports,writes};
}
for(const count of [2,3,8])test(`Gemini envia ${count} fotos sem campos desconhecidos`,async()=>{
 const h=harness(),formats=['jpeg','png','webp'];
 const photos=Array.from({length:count},(_,i)=>`data:image/${formats[i%3]};base64,${Buffer.from('foto '+i).toString('base64')}`);
 const result=await h.ai.analyze(photos);
 const parts=h.calls[1].parts;
 assert.equal(parts.length,count+1);
 assert.equal(typeof parts[0],'string');
 for(let i=0;i<count;i++)assert.deepEqual(parts[i+1],{inlineData:{mimeType:'image/'+formats[i%3],data:photos[i].split(',')[1]}});
 assert.equal(h.calls[0].config.model,'gemini-3.8-flash');
 assert.equal(h.imports.length,3);
 assert.ok(h.imports.every(url=>url.startsWith('https://www.gstatic.com/firebasejs/11.10.0/')));
 assert.equal(result.merchant,'Loja');
 assert.deepEqual(h.writes,[]);
});
test('lote com foto inválida e lote grande não carregam SDK nem enviam fotos',async()=>{
 const h=harness();
 await assert.rejects(()=>h.ai.analyze(['data:image/jpeg;base64,QUJD','invalid']),/formato inválido/);
 await assert.rejects(()=>h.ai.analyze(Array(8).fill('data:image/png;base64,'+'A'.repeat(2*1024*1024))),/muito grandes/);
 assert.deepEqual(h.imports,[]);
 assert.deepEqual(h.calls,[]);
 assert.deepEqual(h.writes,[]);
});
test('Gemini fica desabilitado sem App Check e não chama a rede',async()=>{
 assert.equal(ai.configured(),false);
 await assert.rejects(()=>ai.analyze(['data:image/jpeg;base64,QUJD']),/não habilitada/);
});
test('foto inválida ou lote excessivo falha antes de qualquer chamada online',async()=>{
 await assert.rejects(()=>ai.analyze([]),/1 a 8/);
 await assert.rejects(()=>ai.analyze(['https://evil.example/image.jpg']),/formato inválido/);
 await assert.rejects(()=>ai.analyze(Array(9).fill('data:image/jpeg;base64,QUJD')),/1 a 8/);
});
