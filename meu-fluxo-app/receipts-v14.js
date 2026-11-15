
(function(root){
'use strict';
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const cents=s=>{
 let v=String(s||'').replace(/R\$/gi,'').replace(/\s/g,'');
 if(!/^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$/.test(v))return null;
 const pieces=v.split(',');
 const result=Number(pieces[0].replace(/\./g,''))*100+Number(pieces[1]);
 return Number.isSafeInteger(result)&&result>=0&&result<=999999999999?result:null;
};
function validDate(iso){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
 const [y,m,d]=iso.split('-').map(Number),check=new Date(y,m-1,d);
 return check.getFullYear()===y&&check.getMonth()===m-1&&check.getDate()===d;
}
function extractDate(lines){
 for(const line of lines){const m=line.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
 if(m){const iso=m[3]+'-'+m[2]+'-'+m[1];if(validDate(iso))return iso}}
 return null;
}
function normalizeName(name){
 return fold(name).replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
function totalFromLine(line){
 const t=fold(line);
 if(/SUB\s*TOTAL|DESCONTO|TROCO|PAGO|PAGAMENTO|VALOR\s+RECEBIDO|CARTAO|DINHEIRO|PIX|TAXAS|TRIBUTOS/.test(t))return null;
 if(!/^(?:TOTAL(?:\s+(?:A\s+PAGAR|DA\s+COMPRA|GERAL))?|VALOR\s+TOTAL|TOTAL\s+R\$)\b/.test(t))return null;
 const m=line.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*$/);
 return m?cents(m[1]):null;
}
const irrelevant=/\b(?:CNPJ|CPF|CHAVE\s+DE\s+ACESSO|QR\s*CODE|PROTOCOLO|CUPOM|CODIGO\s+DE\s+BARRAS|VALOR\s+TOTAL|TOTAL\s+A\s+PAGAR|SUBTOTAL|DESCONTO|TROCO|PAGAMENTO|AUTORIZACAO|ICMS|TRIBUTOS|NFC.?E|CONSULTA|WWW\.|HTTP|BOLETO|CARTAO|CREDITO|DEBITO|PIX|OPERADOR)\b/;
function parseItem(line){
 const t=fold(line);
 if(t.length<5||irrelevant.test(t))return null;
 // Descrição + quantidade + unidade + preço unitário + preço total.
 const detailed=line.match(/^(.{3,95}?)\s+(\d{1,3}(?:[.,]\d{1,3})?)\s*(KG|G|UN|UND|UNID|L|LT|ML)\s+(?:X\s*)?(?:R\$\s*)?(\d+(?:\.\d{3})*,\d{2})\s+(?:R\$\s*)?(\d+(?:\.\d{3})*,\d{2})\s*$/i);
 if(detailed){
  const qty=Number(detailed[2].replace(',','.'));
  const unit=detailed[3].toLowerCase().replace(/^(und|unid)$/,'un').replace(/^lt$/,'l');
  const total=cents(detailed[5]),unitCost=cents(detailed[4]);
  if(!qty||!Number.isFinite(qty)||total===null||total<=0||unitCost===null||!normalizeName(detailed[1]))return null;
  // Se a aritmética não bate, descartar a leitura para evitar valores errados.
  if(Math.abs(total-Math.round(qty*unitCost))>2)return null;
  return {name:detailed[1].trim().replace(/^[0-9]{1,4}\s+/,'').slice(0,100),qty,unit,cents:total};
 }
 // Descrição + valor total. Aceitar apenas quando tiver vírgula decimal.
 const simple=line.match(/^(.{3,95}?)\s+(?:R\$\s*)?(\d+(?:\.\d{3})*,\d{2})\s*$/);
 if(!simple)return null;
 const name=simple[1].replace(/^\s*\d{1,4}\s+/,'').trim();
 if(!/[a-zA-ZÀ-ÿ]{3}/.test(name)||/\b\d{11,14}\b/.test(name))return null;
 const value=cents(simple[2]);if(value===null||value<=0)return null;
 return {name:name.slice(0,100),qty:1,unit:'un',cents:value};
}
function parse(text){
 const lines=String(text||'').split(/\r?\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,250);
 const items=[],unknown=[];
 let total=null;
 for(const line of lines){
  const v=totalFromLine(line);
  if(v!==null){total=v;continue}
  const item=parseItem(line);
  if(item)items.push(item);
  else unknown.push(line);
 }
 // O nome da loja é apenas uma sugestão e deve ser confirmado pelo usuário.
 const merchant=unknown.find(x=>/[a-zA-ZÀ-ÿ]{4}/.test(x)&&!/CNPJ|CPF|NFC|DOC\.?|FISCAL|DATA|HORA|CUPOM|EMISS|WWW|HTTP/i.test(x))?.slice(0,120)||'';
 const date=extractDate(lines);
 const sum=items.reduce((n,e)=>n+e.cents,0);
 return {items,total,merchant,date,raw:lines.join('\n'),sum,balanced:total!==null&&sum===total,warning:total!==null&&sum!==total?'A soma dos itens encontrados não coincide com o total da nota. Revise ou complete os itens antes de registrar.':items.length===0?'Nenhum item pôde ser reconhecido com segurança. Preencha os dados manualmente.':''};
}
function priceRecords(entries){
 const result=[];
 for(const e of entries||[]){
  if(e.deletedAt||e.type!=='expense'||!Array.isArray(e.items))continue;
  for(const item of e.items){
   if(!item||typeof item.name!=='string'||!Number.isSafeInteger(item.cents)||item.cents<=0)continue;
   const qty=Number(item.qty),unit=String(item.unit||'un').toLowerCase();
   if(!Number.isFinite(qty)||qty<=0)continue;
   let quantity=qty,baseUnit='un';
   if(unit==='g'){quantity=qty/1000;baseUnit='kg'}
   else if(unit==='kg'){baseUnit='kg'}
   else if(unit==='ml'){quantity=qty/1000;baseUnit='l'}
   else if(unit==='l'||unit==='lt'){baseUnit='l'}
   else if(unit==='un'||unit==='und'||unit==='unid'){baseUnit='un'}
   else continue;
   if(quantity<=0)continue;
   const pricePerUnit=Math.round(item.cents/quantity);
   const name=normalizeName(item.name);
   if(!name||!Number.isSafeInteger(pricePerUnit)||pricePerUnit<=0)continue;
   result.push({key:name+'|'+baseUnit,name:item.name.slice(0,100),date:e.date,merchant:String(e.merchant||'').slice(0,120),qty,unit,totalCents:item.cents,pricePerUnit,baseUnit,transactionId:e.id});
  }
 }
 return result.sort((a,b)=>a.date.localeCompare(b.date));
}
function catalog(entries){
 const map=new Map();
 for(const rec of priceRecords(entries)){
  let item=map.get(rec.key);
  if(!item){item={key:rec.key,name:rec.name,unit:rec.baseUnit,records:[]};map.set(rec.key,item)}
  item.records.push(rec);
 }
 return [...map.values()].map(x=>({...x,count:x.records.length,first:x.records[0],latest:x.records[x.records.length-1]})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
}
const api={parse,parseItem,normalizeName,priceRecords,catalog};
root.MeuFluxoReceipts=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
