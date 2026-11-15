const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const parser=require('../chat-parser.js');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace(/\ninit\(\);\s*$/,'\n');
const memory=new Map(),appNode={innerHTML:''},chatInput={value:'',focus(){}};
const voiceButton={classList:{toggle(){}},setAttribute(){},title:''},voiceStatus={hidden:true,textContent:''};
const dom={documentElement:{dataset:{}},querySelector(selector){
 if(selector==='#app')return appNode;
 if(selector==='#chat-input')return chatInput;
 if(selector==='[data-action="voice"]')return voiceButton;
 if(selector==='#voice-status')return voiceStatus;
 return null;
},querySelectorAll(){return []},addEventListener(){}};
const ctx={console,Intl,Date,Math,Number,String,Boolean,Array,Object,Set,Map,JSON,Promise,URL,Blob,crypto:webcrypto,document:dom,navigator:{onLine:true},
localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},setTimeout:()=>0};
ctx.globalThis=ctx;ctx.isSecureContext=true;ctx.MeuFluxoChatParser=parser;ctx.MeuFluxoFinance=require('../finance-v13.js');ctx.confirm=()=>true;
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.api={chatResponse,pendingHTML,pendingConfirm,openDB,readData,state,voiceErrorMessage,startSpeech};',ctx);
test('chat monta lote sem salvar antes de confirmar; confirmacao duplica zero registros',async()=>{
 const api=ctx.api;
 await api.openDB();
 const result=api.chatResponse('gastei 30 reais no mercado hoje, 15 reais no café, 10 com queijo coalio e 5 com pão, o quilo do queijo qualio é 23 reais');
 assert.equal(result.pending.kind,'batch');
 assert.equal(result.pending.entries.length,4);
 assert.equal((await api.readData()).entries.length,0);
 const preview=api.pendingHTML(result.pending);
 assert.match(preview,/Confirmar 4 lançamentos/);
 assert.match(preview,/23 reais/);
 api.state.pending=result.pending;
 await api.pendingConfirm();
 const data=await api.readData();
 assert.equal(data.entries.length,4);
 assert.equal(data.entries.reduce((n,e)=>n+e.cents,0),6000);
 assert.equal(data.entries.find(e=>e.title==='Queijo coalio').category,'Alimentação');
 await api.pendingConfirm();
 assert.equal((await api.readData()).entries.length,4);
});
test('mensagem isolada de 15 reais agora cria prévia',()=>{
 const result=ctx.api.chatResponse('15 reais no café');
 assert.equal(result.pending.cents,1500);
 assert.equal(result.pending.category,'Alimentação');
});
test('microfone dá feedback específico e preenche texto para revisão',()=>{
 const api=ctx.api;
 assert.match(api.voiceErrorMessage('not-allowed'),/Permita o microfone/);
 assert.match(api.voiceErrorMessage('network'),/conexão/);
 let rec;
 class MockRecognizer{
  constructor(){rec=this}
  start(){this.onstart()}
  stop(){this.onend()}
 }
 ctx.SpeechRecognition=MockRecognizer;
 api.state.settings.voiceConsent=true;
 api.startSpeech();
 assert.equal(voiceStatus.hidden,false);
 rec.onresult({resultIndex:0,results:[[{transcript:'gastei 15 reais no café'}]]});
 assert.equal(chatInput.value,'gastei 15 reais no café');
 rec.onend();
 assert.equal(voiceStatus.hidden,true);
});
