/* Importa uma lista de compra CSV ou XLSX no próprio aparelho. Não grava transações. */
(function(root){
'use strict';
const clean=s=>String(s??'').replace(/\uFFFD/g,'').trim();
const fold=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function cents(value){
 if(typeof value==='number')return Number.isFinite(value)?Math.round(value*100):null;
 const raw=clean(value).replace(/R\$/gi,'').replace(/\s/g,'');
 if(!raw)return null;
 const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;
 if(!/^-?\d+(?:\.\d{1,2})?$/.test(normalized))return null;
 const n=Math.round(Number(normalized)*100);
 return Number.isSafeInteger(n)?n:null;
}
function csvRows(text){
 const separator=(text.split(/\r?\n/).find(line=>line.trim())||'').includes(';')?';':',';
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(!quoted&&c===separator){row.push(cell);cell=''}
  else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}
  else cell+=c;
 }
 if(quoted)throw Error('CSV com aspas incompletas.');
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
function columnIndex(ref){let n=0;for(const c of (ref.match(/^[A-Z]+/)||[''])[0])n=n*26+c.charCodeAt(0)-64;return n-1}
function xmlRows(xml,strings){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('Planilha XLSX inválida.');
 return [...doc.getElementsByTagName('row')].map(row=>{
  const cells=[];
  for(const cell of row.getElementsByTagName('c')){
   const pos=columnIndex(cell.getAttribute('r')||'');if(pos<0||pos>60)continue;
   const type=cell.getAttribute('t');const raw=cell.getElementsByTagName('v')[0]?.textContent??'';
   cells[pos]=type==='s'?strings[Number(raw)]??'':type==='inlineStr'?cell.getElementsByTagName('is')[0]?.textContent??'':raw;
  }
  return cells;
 }).filter(row=>row.some(x=>clean(x)));
}
async function xlsxRows(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const u16=p=>view.getUint16(p,true),u32=p=>view.getUint32(p,true);
 let end=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(u32(p)===0x06054b50){end=p;break}
 if(end<0)throw Error('Arquivo XLSX inválido.');
 const count=u16(end+10);if(count>500)throw Error('Planilha excessivamente grande.');
 let offset=u32(end+16);const files=new Map(),decode=new TextDecoder();
 for(let i=0;i<count;i++){
  if(u32(offset)!==0x02014b50)throw Error('Estrutura XLSX inválida.');
  const method=u16(offset+10),packed=u32(offset+20),unpacked=u32(offset+24);
  const nameLen=u16(offset+28),extraLen=u16(offset+30),commentLen=u16(offset+32);
  const name=decode.decode(bytes.subarray(offset+46,offset+46+nameLen));
  if(name==='xl/sharedStrings.xml'||/^xl\/worksheets\/sheet\d+\.xml$/.test(name)){
   if(unpacked>5_000_000)throw Error('Planilha acima do limite de leitura.');
   files.set(name,{method,packed,unpacked,local:u32(offset+42)});
  }
  offset+=46+nameLen+extraLen+commentLen;
 }
 async function read(name){
  const entry=files.get(name);if(!entry)return null;
  const p=entry.local;if(u32(p)!==0x04034b50)throw Error('XLSX com dados inválidos.');
  const start=p+30+u16(p+26)+u16(p+28),compressed=bytes.subarray(start,start+entry.packed);
  if(compressed.length!==entry.packed)throw Error('XLSX incompleto.');
  if(entry.method===0)return decode.decode(compressed);
  if(entry.method!==8||typeof DecompressionStream!=='function')throw Error('Este aparelho não consegue abrir XLSX. Peça ao Gemini um arquivo CSV.');
  const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const plain=new Uint8Array(await new Response(stream).arrayBuffer());
  if(plain.length!==entry.unpacked)throw Error('XLSX danificado.');
  return decode.decode(plain);
 }
 const sheet=[...files.keys()].filter(x=>/^xl\/worksheets\/sheet\d+\.xml$/.test(x)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]))[0];
 if(!sheet)throw Error('Nenhuma aba de planilha encontrada.');
 const shared=await read('xl/sharedStrings.xml');let strings=[];
 if(shared){const doc=new DOMParser().parseFromString(shared,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('Textos da planilha inválidos.');strings=[...doc.getElementsByTagName('si')].map(si=>si.textContent)}
 return xmlRows(await read(sheet),strings);
}
function mapped(rows){
 if(!Array.isArray(rows)||rows.length<2||rows.length>1000)throw Error('A lista deve ter cabeçalho e até 300 produtos.');
 const aliases={number:['item','numero','n'],barcode:['codigodebarras','cdigodebarras','codigo','ean'],name:['descricaodoproduto','descriodoproduto','descricao','produto','nome'],quantity:['quantidade','qtd'],qtyunit:['qtdprecounit','qtdpreounit','qtdprecounitario'],unit:['unidade','un'],unitPrice:['precounitario','precounitarior','preounitario','valorunitario'],discount:['desconto','descontor','descontors'],net:['valorliquido','valorliquidor','valorlquido','valorlquidor','totaldoitem','valortotal','valor']};
 const find=(row,names)=>row.findIndex(c=>names.includes(fold(c)));
 let header=-1,map={};
 for(let i=0;i<Math.min(rows.length,12);i++){
  const row=rows[i];const name=find(row,aliases.name),net=find(row,aliases.net);
  if(name>=0&&net>=0){header=i;for(const [key,names] of Object.entries(aliases))map[key]=find(row,names);break}
 }
 if(header<0)throw Error('Cabeçalho não encontrado. Inclua Descrição do Produto e Valor Líquido (R$).');
 const metadata={};
 for(const row of rows.slice(0,header)){
  const key=fold(row[0]);if(['loja','estabelecimento'].includes(key))metadata.merchant=clean(row[1]);
  if(key==='data')metadata.date=clean(row[1]);
  if(['totalpago','valortotaldanota','valortotal'].includes(key))metadata.total=cents(row[1]);
  if(['quantidadedeitens','totaldeitens'].includes(key))metadata.count=Number(row[1]);
 }
 const items=[],issues=[],numbers=new Set();
 for(let i=header+1;i<rows.length;i++){
  const row=rows[i];if(!row.some(x=>clean(x)))continue;
  const value=key=>map[key]>=0?row[map[key]]:'';
  const name=clean(value('name')).slice(0,100),net=cents(value('net'));
  if(!name&&!clean(value('net')))continue;
  if(!name||net===null||net<=0){issues.push('Linha '+(i+1)+' sem produto ou valor líquido válido.');continue}
  const qtyText=clean(value('qtyunit'));let qty=Number(clean(value('quantity')).replace(',','.'));
  if(!Number.isFinite(qty)||qty<=0){const match=qtyText.match(/(\d+(?:[,.]\d+)?)\s*(UN|KG|G|ML|L)\b/i);qty=match?Number(match[1].replace(',','.')):1}
  let unit=fold(value('unit'))||qtyText.match(/\b(UN|KG|G|ML|L)\b/i)?.[1]?.toLowerCase()||'un';
  if(!['un','kg','g','l','ml'].includes(unit))unit='un';
  const number=Number(value('number'));if(Number.isInteger(number)&&number>0){if(numbers.has(number))issues.push('Número de item '+number+' repetido.');numbers.add(number)}
  const gross=cents(value('unitPrice')),disc=cents(value('discount'));
  if(gross!==null&&disc!==null&&Math.abs(Math.round(gross*qty)-disc-net)>2)issues.push('Preço e desconto não conferem na linha '+(i+1)+'.');
  const rawBarcode=clean(value('barcode'));let barcode=/^\d{8,14}$/.test(rawBarcode)?rawBarcode:null;
  if(!barcode&&/^\d+(?:\.\d+)?E\+?\d+$/i.test(rawBarcode)){const n=Number(rawBarcode);if(Number.isSafeInteger(n))barcode=n.toFixed(0)}
  items.push({name,qty,unit,cents:net,number:Number.isInteger(number)&&number>0?number:null,barcode,sourcePhotos:[]});
  if(items.length>300)throw Error('Máximo de 300 produtos por compra.');
 }
 if(!items.length)throw Error('Nenhum produto válido encontrado na planilha.');
 const sum=items.reduce((n,item)=>n+item.cents,0),total=metadata.total&&metadata.total>0?metadata.total:null;
 if(total===null)issues.push('Total impresso ausente; confirme o valor de pagamento na nota.');
 else if(total!==sum)issues.push('Soma dos produtos difere do total pago.');
 if(!metadata.date)issues.push('Data ausente; confirme a data da compra.');
 if(!metadata.merchant)issues.push('Loja ausente; informe o estabelecimento se desejar.');
 if(metadata.count&&metadata.count!==items.length)issues.push('Quantidade de itens informada difere da lista.');
 return {items,pending:[],issues,merchant:metadata.merchant||'',date:/^\d{4}-\d{2}-\d{2}$/.test(metadata.date)?metadata.date:null,
  total,sum,expected:metadata.count||null,pageCount:0,balanced:total===sum&&!issues.length,raw:'Lista importada de arquivo. Confira na nota original.'};
}
async function parse(file){
 if(!file||file.size>6_000_000)throw Error('Escolha um CSV ou XLSX de até 6 MB.');
 const name=String(file.name||'').toLowerCase();
 const rows=name.endsWith('.csv')?csvRows((await file.text()).replace(/^\uFEFF/,'')):
  name.endsWith('.xlsx')?await xlsxRows(new Uint8Array(await file.arrayBuffer())):null;
 if(!rows)throw Error('Formato inválido. Use CSV ou XLSX.');
 return mapped(rows);
}
const api={parse,mapped,csvRows,cents,xlsxRows};
root.MeuFluxoReceiptFile=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
