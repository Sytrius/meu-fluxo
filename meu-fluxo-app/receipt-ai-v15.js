/* Meu Fluxo 1.5 — Gemini opcional via Firebase AI Logic.
   Fotos só são enviadas após consentimento explícito. */
(function(root){
'use strict';
let clientPromise=null;
const sdk='https://www.gstatic.com/firebasejs/11.10.0/';
function configured(){
 const cfg=root.MEU_FLUXO_FIREBASE_CONFIG,key=root.MEU_FLUXO_APPCHECK_SITE_KEY;
 return !!(cfg?.apiKey&&cfg?.projectId&&typeof key==='string'&&key.trim().length>10);
}
async function client(){
 if(!configured())throw Error('IA não habilitada: o proprietário deve ativar Firebase AI Logic, configurar App Check e publicar a chave pública reCAPTCHA Enterprise.');
 if(!root.navigator?.onLine)throw Error('A análise por IA exige internet. Use a leitura local.');
 if(!clientPromise)clientPromise=(async()=>{
  const [appmod,check,aimod]=await Promise.all([
   import(sdk+'firebase-app.js'),import(sdk+'firebase-app-check.js'),import(sdk+'firebase-ai.js')
  ]);
  let app=appmod.getApps().find(x=>x.name==='meu-fluxo-receipt-ai');
  if(!app)app=appmod.initializeApp(root.MEU_FLUXO_FIREBASE_CONFIG,'meu-fluxo-receipt-ai');
  check.initializeAppCheck(app,{
   provider:new check.ReCaptchaEnterpriseProvider(root.MEU_FLUXO_APPCHECK_SITE_KEY.trim()),
   isTokenAutoRefreshEnabled:true
  });
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
async function analyze(photos){
 if(!Array.isArray(photos)||photos.length<1||photos.length>8)throw Error('Escolha de 1 a 8 fotos.');
 const parts=photos.map(uri=>{
  const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(uri||'');
  if(!m)throw Error('Uma foto possui formato inválido.');
  return {type:'inlineData',inlineData:{mimeType:'image/'+m[1],data:m[2]}};
 });
 const bytes=parts.reduce((n,x)=>n+x.inlineData.data.length,0);
 if(bytes>12*1024*1024)throw Error('Imagens muito grandes para análise online. Tente menos fotos ou reduza os arquivos.');
 const {model}=await client();
 const result=await model.generateContent([instruction,...parts]);
 const reply=result?.response?.text?.();
 if(typeof reply!=='string'||reply.length>120000)throw Error('A IA não retornou uma resposta válida.');
 let parsed;
 try{parsed=JSON.parse(reply)}catch{throw Error('A resposta da IA não é JSON válido. Tente novamente.')}
 return root.MeuFluxoReceiptHybrid.validateReceipt(parsed);
}
root.MeuFluxoReceiptAI={configured,analyze};
})(typeof globalThis!=='undefined'?globalThis:this);
