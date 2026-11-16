/* Meu Fluxo 1.5 — regras verificáveis de QR fiscal e revisão da IA.
   Este módulo não faz requisições nem salva transações. */
(function(root){
'use strict';
const officialHosts=new Set(['nfce.sefaz.pe.gov.br']);
const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=999999999999;
function officialURL(raw){
 if(typeof raw!=='string'||raw.length>1800)return null;
 try{
  const url=new URL(raw.trim());
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!officialHosts.has(url.hostname.toLowerCase())||url.port)return null;
  if(!/^\/nfce\/consulta\/?$/.test(url.pathname))return null;
  if(!url.searchParams.has('p'))return null;
  const parts=url.searchParams.get('p').split('|');
  if(!/^\d{44}$/.test(parts[0]))return null;
  // O serviço também publica links HTTP em notas antigas; preferir HTTPS no navegador.
  url.protocol='https:';
  return url.href;
 }catch{return null}
}
function fromAccessKey(raw){
 const key=String(raw||'').replace(/\s/g,'');
 // Chave não vira URL de consulta por tentativa: o serviço pode exigir
 // parâmetros do QR-Code; oferecer a busca oficial como alternativa.
 return /^\d{44}$/.test(key)?key:null;
}
function validateReceipt(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('A IA não retornou uma nota estruturada.');
 const items=raw.items;
 if(!Array.isArray(items)||items.length>180)throw Error('Lista de produtos inválida ou excessiva.');
 const warnings=[],out=[],keys=new Map();
 const units=new Set(['un','kg','g','l','ml']);
 const compact=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
 for(let i=0;i<items.length;i++){
  const item=items[i];
  if(!item||typeof item!=='object'){warnings.push('Produto '+(i+1)+' não pôde ser analisado.');continue}
  const name=compact(item.name,100),number=Number(item.number)||null,barcode=compact(item.barcode,20);
  const qty=Number(item.quantity),unit=compact(item.unit,8).toLowerCase();
  const net=Number(item.netCents),gross=Number(item.grossCents),disc=Number(item.discountCents);
  if(!name||name.length<3||!Number.isFinite(qty)||qty<=0||qty>999||!units.has(unit)||!money(net)||net===0){
   warnings.push('Produto '+(i+1)+' sem nome, quantidade, unidade ou valor líquido confiável. Verifique na fotografia.');
   continue;
  }
  const n=Number.isInteger(number)&&number>=1&&number<=500?number:null;
  const e={name,qty,unit,cents:net,number:n,barcode:/^\d{8,14}$/.test(barcode)?barcode:null,
    grossCents:money(gross)&&gross>0?gross:null,discountCents:money(disc)?disc:null,
    quality:2,sourcePhotos:[]};
  if(e.grossCents!==null&&e.discountCents!==null&&Math.abs(e.grossCents-e.discountCents-e.cents)>2){
   warnings.push('Valor bruto, desconto e líquido não coincidem no item '+(n||i+1)+'.');
  }
  if(n!==null){
   const k=String(n); // Mesma numeração em uma única nota não deve contar duas vezes.
   if(keys.has(k)){
    const prev=out[keys.get(k)];
    if(prev.barcode!==e.barcode||prev.cents!==e.cents||prev.qty!==e.qty)
      warnings.push('O item '+k+' aparece mais de uma vez com dados divergentes. Confira.');
    else warnings.push('Item '+k+' repetido na resposta de IA; apenas uma linha foi mantida.');
    continue;
   }
   keys.set(k,out.length);
  }
  out.push(e);
 }
 const count=Number(raw.itemCount);
 const expected=Number.isInteger(count)&&count>0&&count<=500?count:null;
 const tot=Number(raw.totalCents);
 const total=money(tot)&&tot>0?tot:null;
 const sum=out.reduce((n,e)=>n+e.cents,0);
 if(expected!==null&&expected!==out.length)warnings.push('A nota informa '+expected+' itens, mas a IA identificou '+out.length+'.');
 if(total!==null&&sum!==total)warnings.push('Total dos itens '+(sum/100).toFixed(2)+' é diferente do valor pago '+(total/100).toFixed(2)+'.');
 if(total===null)warnings.push('A IA não conseguiu identificar o total da nota.');
 const iso=typeof raw.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.date)?raw.date:null;
 let date=iso;
 if(date){
  const [y,m,d]=date.split('-').map(Number),p=new Date(y,m-1,d);
  if(p.getFullYear()!==y||p.getMonth()+1!==m||p.getDate()!==d)date=null;
 }
 return {items:out,pending:[],issues:[...new Set(warnings)],merchant:compact(raw.merchant,120),
  date,total,sum,expected,raw:'Leitura assistida por IA; confira sempre a fotografia original.',
  pageCount:0,balanced:!!out.length&&total!==null&&sum===total&&(expected===null||expected===out.length)&&warnings.length===0};
}

/* Mescla trechos de uma mesma nota, preservando números de item distintos e
   exigindo revisão quando duas fotos discordam do mesmo registro. */
function mergeAIPhotoResults(pages){
 if(!Array.isArray(pages)||!pages.length||pages.length>8)throw Error('Selecione de uma a oito respostas de fotos.');
 const records=[],byNumber=new Map(),issues=[],merchants=new Set(),dates=new Set(),counts=new Set(),totals=new Set();
 for(let p=0;p<pages.length;p++){
  const page=pages[p];
  if(!page||typeof page!=='object'||!Array.isArray(page.items)||page.items.length>180)
   throw Error('A resposta da foto '+(p+1)+' não contém uma lista válida de produtos.');
  if(typeof page.merchant==='string'&&page.merchant.trim())merchants.add(page.merchant.trim());
  if(typeof page.date==='string'&&page.date.trim())dates.add(page.date.trim());
  if(Number.isInteger(Number(page.itemCount))&&Number(page.itemCount)>0)counts.add(Number(page.itemCount));
  if(Number.isSafeInteger(Number(page.totalCents))&&Number(page.totalCents)>0)totals.add(Number(page.totalCents));
  for(const item of page.items){
   if(!item||typeof item!=='object')continue;
   const n=Number(item.number);
   if(!Number.isInteger(n)||n<=0||n>500){records.push(item);continue}
   if(!byNumber.has(n)){byNumber.set(n,records.length);records.push(item);continue}
   const previous=records[byNumber.get(n)];
   const fields=['barcode','name','quantity','unit','netCents','grossCents','discountCents'];
   const different=fields.some(k=>String(previous[k]??'').trim().toUpperCase()!==String(item[k]??'').trim().toUpperCase());
   if(different)issues.push('O item '+n+' foi reconhecido de forma diferente em duas fotografias. Revise-o manualmente.');
   // Não somar novamente itens repetidos na área de sobreposição.
  }
 }
 if(totals.size>1)issues.push('As fotos mostram totais diferentes. Confirme que pertencem à mesma nota.');
 if(counts.size>1)issues.push('As fotos mostram contagens diferentes de itens.');
 if(merchants.size>1)issues.push('As fotografias podem ter estabelecimentos diferentes. Confirme a compra.');
 if(dates.size>1)issues.push('As fotografias apresentam datas diferentes.');
 const merged=validateReceipt({merchant:[...merchants][0]||'',date:[...dates][0]||'',
  totalCents:[...totals][0]||0,itemCount:[...counts][0]||0,items:records});
 merged.pageCount=pages.length;
 merged.issues=[...new Set([...merged.issues,...issues])];
 merged.balanced=merged.balanced&&merged.issues.length===0;
 return merged;
}

const api={officialURL,fromAccessKey,validateReceipt,mergeAIPhotoResults};
root.MeuFluxoReceiptHybrid=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
