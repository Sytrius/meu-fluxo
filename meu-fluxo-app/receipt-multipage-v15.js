
(function(root){
'use strict';
const old=()=>root.MeuFluxoReceipts;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const toCents=value=>{
 const m=String(value||'').match(/-?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*$/);
 if(!m)return null;
 const integer=m[1].split(',')[0].replace(/\./g,'');
 const v=Number(integer)*100+Number(m[1].split(',')[1]);
 return Number.isSafeInteger(v)&&v>=0&&v<1000000000000?v:null;
};
const endMoney=line=>{
 const m=String(line||'').match(/(-?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|-?\s*(?:R\$\s*)?\d+,\d{2})\s*$/i);
 return m?toCents(m[1]):null;
};
const isSummary=t=>/^(?:SUB\s*\.?\s*TOTAL|QTD\.?\s*TOTAL|QUANTIDADE\s+TOTAL|TOTAL\s+DE\s+ITENS|VALOR\s+TOTAL|VALOR\s+A\s+PAGAR|TOTAL\s+A\s+PAGAR|TOTAL\s+GERAL|TOTAL\s+R\$|TOTAL\b|DESCONTOS?\s+R\$|FORMA\s+DE\s+PAGAMENTO|VALOR\s+PAGO|VALOR\s+RECEBIDO|TROCO|PAGAMENTOS?|CARTAO|PIX|DINHEIRO|IMPOSTO|TRIBUTOS)/.test(t);
const isJunk=t=>/^(?:CNPJ|CPF|DANFE|NFC.?E|EMITIDA\s+EM|PENDENTE|CHAVE\s+DE|CONSULTE|HTTP|WWW|DOC\.?\s+FISCAL|CONSUMIDOR|DOCUMENTO|ITEM\s+CODIGO|CODIGO\s+DESCRICAO|DESCRICAO\s+QTD)/.test(t);
function parseQuantity(line){
 const t=norm(line);
 // Impresso normalmente como UN X 2,65, UN X 2 4,99 ou 0,500 KG X 34,00.
 let m=t.match(/^(\d+(?:[,.]\d{1,3})?)\s*(KG|G|UN|UND|UNID|L|LT|ML)\s*[X*]\s*(\d+(?:\.\d{3})*,\d{2}|\d+,\d{2})/);
 if(m){
  const q=Number(m[1].replace(',','.'));
  if(!q||!Number.isFinite(q))return null;
  return {qty:q,unit:unit(m[2]),unitCents:toCents(m[3]),reliability:2};
 }
 m=t.match(/^(UN|UND|UNID|KG|G|LT|L|ML)\s*[X*]\s*(\d+(?:[,.]\d{1,3})?)\s+(?:[X*]\s*)?(\d+(?:\.\d{3})*,\d{2}|\d+,\d{2})\b/);
 if(m){
  const q=Number(m[2].replace(',','.'));if(!q||!Number.isFinite(q))return null;
  return {qty:q,unit:unit(m[1]),unitCents:toCents(m[3]),reliability:2};
 }
 m=t.match(/^(UN|UND|UNID|KG|G|LT|L|ML)\s*[X*]\s*(\d+(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*$/);
 if(m)return {qty:1,unit:unit(m[1]),unitCents:toCents(m[2]),reliability:1};
 // Também pode ocorrer "UN X 2 5,00" sem separador claro.
 return null;
}
function unit(v){return ({UN:'un',UND:'un',UNID:'un',KG:'kg',G:'g',LT:'l',L:'l',ML:'ml'})[v]||'un'}
function itemHeader(line){
 const t=norm(line);
 const m=t.match(/^(?:N[Oº°]?\s*)?0?(\d{1,3})\s+(\d{8,14})\s+(.{3,})$/);
 if(!m||isSummary(t))return null;
 const name=m[3].replace(/\s+(?:UN|KG|LT)\s*$/,'').trim();
 if(!/[A-Z]{3}/.test(name))return null;
 return {number:Number(m[1]),barcode:m[2],name:name.slice(0,100)};
}
function amountAndRank(t){
 const money=endMoney(t);
 if(money===null)return null;
 if(/^(?:VALOR\s+A\s+PAGAR|TOTAL\s+A\s+PAGAR)/.test(t))return {money,rank:5};
 if(/^VALOR\s+TOTAL\s+R?\$?/.test(t))return {money,rank:4};
 if(/^TOTAL\s+GERAL/.test(t))return {money,rank:3};
 if(/^TOTAL\b/.test(t)&&!/^TOTAL\s+(?:DE\s+ITENS|DOS\s+ITENS)/.test(t))return {money,rank:2};
 return null;
}
function parsePhoto(text,photo=0){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,750);
 const items=[],pending=[],scores=[],errors=[],totals=[];
 let active=null,expected=null;
 function finish(){
  if(!active)return;
  const x=active;active=null;
  if(x.liquid===null && x.gross!==null)x.liquid=Math.max(0,x.gross-x.discount);
  if(!x.name||!(x.liquid>0)||!Number.isSafeInteger(x.liquid)){pending.push({number:x.number,name:x.name||'Linha sem descrição',reason:'Valor líquido não identificado',photo});return}
  const hasArithmetic=x.unitCents!==null&&x.gross!==null&&Math.abs(Math.round(x.qty*x.unitCents)-x.gross)<=2;
  const discountCheck=x.gross!==null&&x.liquid!==null&&Math.abs(x.gross-x.discount-x.liquid)<=2;
  if(x.unitCents!==null&&x.gross!==null&&!hasArithmetic)errors.push('Confira quantidade ou preço do item '+x.number+' ('+x.name+').');
  if(x.gross!==null&&x.netPrinted&&x.discount>0&&!discountCheck)errors.push('Desconto ou valor líquido divergente no item '+x.number+'.');
  const quality=(x.barcode?2:0)+(x.netPrinted?3:0)+(x.unitCents!==null?1:0)+(hasArithmetic?1:0);
  items.push({...x,cents:x.liquid,photo,quality,sourcePhotos:[photo],name:x.name.slice(0,100),grossCents:x.gross,discountCents:x.discount});
 }
 for(let i=0;i<lines.length;i++){
  const line=lines[i],t=norm(line);
  if(/^QTD\.?\s*TOTAL\s+DE\s+ITENS|^TOTAL\s+DE\s+ITENS|^QUANTIDADE\s+TOTAL/.test(t)){
   const n=Number(t.match(/\b(\d{1,3})\s*$/)?.[1]||0);if(n>0&&n<400)expected=n;
  }
  const total=amountAndRank(t);if(total){totals.push({...total,photo});finish();continue}
  if(isSummary(t)){finish();continue}
  const header=itemHeader(line);
  if(header){finish();active={...header,qty:1,unit:'un',unitCents:null,gross:null,discount:0,liquid:null,netPrinted:false};continue}
  if(active){
   if(/^DESCONTO\b/.test(t)){
    const disc=endMoney(t);if(disc!==null)active.discount+=disc;
    continue;
   }
   if(/^VALOR\s+L[IÍ1]Q(?:U[IÍ1])?DO\b|^VLR\s+L[IÍ1]Q\b/.test(t)){
    const v=endMoney(t);if(v!==null){active.liquid=v;active.netPrinted=true}
    continue;
   }
   const q=parseQuantity(line);
   if(q){
    active.qty=q.qty;active.unit=q.unit;active.unitCents=q.unitCents;
    active.gross=Math.round(q.qty*q.unitCents);
    if(Math.abs(active.gross)>1e12)active.gross=null;
    continue;
   }
   // Alguns layouts imprimem um total do item em linha isolada.
   if(/^VALOR\s+(?:DO\s+ITEM|BRUTO)\b/.test(t)){
    const v=endMoney(t);if(v!==null)active.gross=v;continue;
   }
   if(!/CNPJ|CPF|DOC\.?|DATA|HORA/.test(t)&&t.length>2&&!isJunk(t)&&!endMoney(t)&&active.name.length<90){
    // Texto de descrição continua na linha seguinte
    active.name=(active.name+' '+t).slice(0,100);
   }
   continue;
  }
  if(isJunk(t))continue;
  const simple=old()?.parseItem?.(line);
  if(simple&&simple.cents>0&&/[A-ZÀ-Ÿ]{3}/.test(simple.name)){
   items.push({...simple,photo,number:null,barcode:null,quality:1,sourcePhotos:[photo],grossCents:simple.cents,discountCents:0});
  }
 }
 finish();
 const lower=lines.map(norm);
 const base=old()?.parse?.(text)||{};
 const title=lower.find(x=>/^(?:SUPERMERCADO|MERCADO|ATACAD|MINIMERCADO|COMERCIAL|HIPERMERCADO|PADARIA|DISTRIBUIDORA)/.test(x))||base.merchant||'';
 const merchant=title.slice(0,120);
 const date=base.date||null;
 const sum=items.reduce((n,x)=>n+x.cents,0);
 const last=totals.sort((a,b)=>b.rank-a.rank)[0]||null;
 return {items,pending,errors,totals,total:last?.money??null,totalRank:last?.rank||0,expected,merchant,date,raw:lines.join('\n'),sum,photo};
}
function combine(photos){
 const pages=(photos||[]).map((p,i)=>parsePhoto(typeof p==='string'?p:p.text,i));
 const items=[],issues=[],pending=[],indices=new Map(),seenUnnumbered=new Map(),totals=[],dates=new Set(),merchants=new Set();
 let expected=null;
 for(const page of pages){
  pending.push(...page.pending);issues.push(...page.errors);totals.push(...page.totals);
  if(page.expected!==null){if(expected!==null&&expected!==page.expected)issues.push('As imagens apresentam contagens diferentes de itens. Confira se todas são da mesma nota.');expected=Math.max(expected||0,page.expected)}
  if(page.date)dates.add(page.date);if(page.merchant)merchants.add(norm(page.merchant));
  for(const item of page.items){
   let key=null;
   if(item.number!==null&&item.barcode)key='item:'+item.number+':'+item.barcode;
   if(key&&indices.has(key)){
    const index=indices.get(key),existing=items[index];
    if(existing.cents!==item.cents)issues.push('Fotos sobrepostas mostram valores diferentes para o item '+item.number+' ('+item.name+'). Confira manualmente.');
    const chosen=item.quality>existing.quality?item:existing;
    items[index]={...chosen,sourcePhotos:[...new Set([...existing.sourcePhotos,...item.sourcePhotos])]};
    continue;
   }
   if(item.number===null){
    const k=norm(item.name)+'|'+item.qty+'|'+item.cents;
    if(seenUnnumbered.has(k)&&seenUnnumbered.get(k)!==page.photo)issues.push('Possível item repetido entre fotos: '+item.name+'. Confira antes de salvar.');
    seenUnnumbered.set(k,page.photo);
   }
   if(key)indices.set(key,items.length);
   items.push(item);
  }
 }
 if(dates.size>1)issues.push('As fotos contêm datas diferentes. Confira se pertencem à mesma compra.');
 const candidates=totals.sort((a,b)=>b.rank-a.rank);
 const total=candidates[0]?.money??null;
 if(candidates.some(v=>v.rank>=4&&total!==null&&v.money!==total))issues.push('Valores totais diferentes entre as fotos. Verifique se todas pertencem à mesma nota.');
 if(merchants.size>1)issues.push('As fotos parecem mostrar lojas diferentes. Verifique se pertencem à mesma nota.');
 const sum=items.reduce((n,x)=>n+x.cents,0);
 if(expected!==null&&items.length!==expected)issues.push('A nota indica '+expected+' itens, mas foram reconhecidos '+items.length+'. Fotografe as partes faltantes ou complete manualmente.');
 if(pending.length)issues.push(pending.length+' item(ns) identificado(s) sem valor líquido confiável.');
 if(total!==null&&sum!==total)issues.push('Soma de itens '+(sum/100).toFixed(2)+' diferente do total a pagar '+(total/100).toFixed(2)+'. Revise os descontos e itens ausentes.');
 if(!pages.length||!items.length)issues.push('Nenhum item identificado com segurança; fotografe mais de perto ou preencha manualmente.');
 return {items,total,sum,expected,merchant:pages.find(p=>p.merchant)?.merchant||'',date:pages.find(p=>p.date)?.date||null,pending,issues:[...new Set(issues)],raw:pages.map((p,i)=>'FOTO '+(i+1)+'\n'+p.raw).join('\n\n'),pageCount:pages.length,balanced:total!==null&&items.length>0&&sum===total&&(expected===null||expected===items.length)&&pending.length===0};
}
const api={parsePhoto,combine,parseQuantity,itemHeader};
root.MeuFluxoReceiptMulti=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
