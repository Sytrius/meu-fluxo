/* Meu Fluxo 1.5 — Gemini opcional via Firebase AI Logic.
   Fotos só são enviadas após consentimento explícito. */
(function(root){
'use strict';
let clientPromise=null;
const sdk='https://www.gstatic.com/firebasejs/11.10.0/';
function siteKey(){
 let local='';
 try{local=root.localStorage?.getItem?.('meu-fluxo-appcheck-site-key')||''}catch{}
 const configuredKey=root.MEU_FLUXO_APPCHECK_SITE_KEY||local;
 return typeof configuredKey==='string'?configuredKey.trim():'';
}
function configured(){
 const cfg=root.MEU_FLUXO_FIREBASE_CONFIG,key=siteKey();
 return root.MeuFluxoNative?.available?!!root.MeuFluxoNative.appCheck:!!(cfg?.apiKey&&cfg?.projectId&&key.length>10);
}
function configurePublicSiteKey(value){
 const key=String(value||'').trim();
 if(key&&!/^[A-Za-z0-9_-]{15,160}$/.test(key))throw Error('Informe somente a chave pública do site reCAPTCHA Enterprise. Não cole segredos ou chaves de servidor.');
 if(!root.localStorage)throw Error('Este navegador não permite guardar a configuração local.');
 if(key)root.localStorage.setItem('meu-fluxo-appcheck-site-key',key);
 else root.localStorage.removeItem('meu-fluxo-appcheck-site-key');
 clientPromise=null;
}
async function client(){
 if(!configured())throw Error('IA não habilitada: o proprietário deve ativar Firebase AI Logic, configurar App Check e publicar a chave pública reCAPTCHA Enterprise.');
 if(!root.navigator?.onLine)throw Error('A análise por IA exige internet. Use a leitura local.');
 if(!clientPromise)clientPromise=(async()=>{
  const [appmod,check,aimod]=await Promise.all([
   import(sdk+'firebase-app.js'),import(sdk+'firebase-app-check.js'),import(sdk+'firebase-ai.js')
  ]);
  let app=appmod.getApps().find(x=>x.name==='meu-fluxo-receipt-ai');
  if(!app)app=appmod.initializeApp(root.MeuFluxoNative?.available?await root.MeuFluxoNative.appCheck.getOptions():root.MEU_FLUXO_FIREBASE_CONFIG,'meu-fluxo-receipt-ai');
  check.initializeAppCheck(app,{
   provider:root.MeuFluxoNative?.available?new check.CustomProvider({getToken:()=>root.MeuFluxoNative.appCheck.getToken()}):new check.ReCaptchaEnterpriseProvider(siteKey()),
   isTokenAutoRefreshEnabled:true
  });
  // Validate attestation before any receipt photos are sent; never continue with a placeholder token.
  await check.getToken(check.getAppCheck(app));
  const ai=aimod.getAI(app,{backend:new aimod.GoogleAIBackend()});
  const S=aimod.Schema;
  const schema=S.object({properties:{
   merchant:S.string(),date:S.string(),itemCount:S.number(),totalCents:S.number(),
   items:S.array({items:S.object({properties:{
    number:S.number(),barcode:S.string(),name:S.string(),quantity:S.number(),
    unit:S.string(),grossCents:S.number(),discountCents:S.number(),netCents:S.number()
   }})})
  }});
  return {model:aimod.getGenerativeModel(ai,{
   model:'gemini-3.8-flash',
   generationConfig:{responseMimeType:'application/json',responseSchema:schema,temperature:0.1,maxOutputTokens:8192}
  })};
 })().catch(e=>{clientPromise=null;throw e});
 return clientPromise;
}
const instruction=[
 'Você é um leitor de notas fiscais brasileiras. Todas as fotografias pertencem a UMA mesma compra.',
 'Sejam rigorosos: NÃO invente produtos, quantidades, códigos, preços, descontos ou datas.',
 'Fotos podem se sobrepor: cada número de item deve aparecer uma única vez. O mesmo produto com números diferentes representa linhas diferentes.',
 'Leia o produto inteiro, inclusive descrição quebrada, número da linha, código, quantidade, unidade, valor bruto total, desconto e valor líquido total.',
 'Valores em CENTAVOS INTEIROS: R$ 4,51 -> 451. "UN X 14,70" geralmente significa UMA unidade a R$ 14,70, e NÃO 14,7 unidades.',
 'Use o Valor Líquido impresso para o valor pago. Não confunda preço unitário com quantidade.',
 'Campo ilegível: nome string vazia, valor numérico 0, unidade un. Nunca invente o valor faltante por diferença do total.',
 'Extraia QTD TOTAL DE ITENS como itemCount; VALOR A PAGAR como totalCents.',
 'Não trate subtotal, pagamento, desconto geral, CPF, CNPJ, chave fiscal ou QR como produtos.',
 'Data YYYY-MM-DD, ou string vazia se ilegível. Unidades admitidas: un, kg, g, l, ml.',
 'Retorne somente JSON conforme o esquema, com TODOS os itens legíveis das fotos. O usuário revisará tudo.'
].join('\n');
const photoInstruction=instruction+'\nATENÇÃO: ESTA REQUISIÇÃO CONTÉM APENAS UMA FOTO de uma nota que pode ter várias páginas. Extraia SOMENTE os itens visíveis nesta imagem. Não reconstrua itens de outras fotos. Se cabeçalho, contagem ou total não aparecerem, use string vazia ou 0 para esses campos. Linhas parciais devem ser sinalizadas como desconhecidas, nunca estimadas.';
function transientError(error){
 const message=String(error?.message||error||'');
 return /\b503\b|\b504\b|deadline expired|service unavailable|unavailable|deadline_exceeded/i.test(message);
}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function generateOne(model,part,index,progress){
 for(let attempt=0;attempt<2;attempt++){
  if(progress)progress({index,retrying:attempt>0});
  try{
   const result=await model.generateContent([photoInstruction,part]);
   const reply=result?.response?.text?.();
   if(typeof reply!=='string'||reply.length>120000)throw Error('Resposta inválida ou muito extensa do Gemini.');
   try{return JSON.parse(reply)}
   catch{throw Error('O Gemini não retornou um JSON válido. Tente novamente mais tarde.')}
  }catch(error){
   if(attempt===0&&transientError(error)){await sleep(1800);continue}
   if(transientError(error))throw Error('O Gemini excedeu o prazo ao analisar a foto '+(index+1)+'. O serviço pode estar sobrecarregado. Tente novamente mais tarde ou use OCR local.');
   throw error;
  }
 }
}
async function analyze(photos,progress){
 if(!Array.isArray(photos)||photos.length<1||photos.length>8)throw Error('Escolha de 1 a 8 fotos.');
 const parts=photos.map(uri=>{
  const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(uri||'');
  if(!m)throw Error('Uma foto possui formato inválido.');
  return {inlineData:{mimeType:'image/'+m[1],data:m[2]}};
 });
 const bytes=parts.reduce((n,x)=>n+x.inlineData.data.length,0);
 if(bytes>12*1024*1024)throw Error('Imagens muito grandes para análise online. Tente menos fotos ou reduza os arquivos.');
 const {model}=await client();
 const pages=[];
 // Uma foto por requisição: evita que notas longas excedam o tempo limite
 // do backend. Processamento sequencial respeita melhor cotas gratuitas.
 for(let i=0;i<parts.length;i++){
  pages.push(await generateOne(model,parts[i],i,progress));
 }
 const merged=root.MeuFluxoReceiptHybrid.mergeAIPhotoResults(pages);
 return merged;
}

root.MeuFluxoReceiptAI={configured,analyze,siteKey,configurePublicSiteKey};
})(typeof globalThis!=='undefined'?globalThis:this);
