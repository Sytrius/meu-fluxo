
(function(root){
'use strict';
let photos=[],draft=null,loading=false,scriptPromise=null,runId=0;
const P=()=>root.MeuFluxoReceiptMulti, money=n=>fmt(n);
function setUp(entry=null){
 photos=Array.isArray(entry?.receiptPhotos)&&entry.receiptPhotos.length?entry.receiptPhotos.slice(0,8):entry?.receipt?[entry.receipt]:[];
 state.editingReceiptPhotos=[...photos];state.editingReceipt=photos[0]||null;state.receiptOCRUsed=false;draft=null;runId++;
}
function controlHTML(){
 return `<div class="field span-2 receipt-multi-field"><label>Fotos da mesma nota (até 8 partes)</label><p class="help">Fotografe a nota por trechos, de perto e com sobreposição. Todas as imagens serão reunidas em uma única compra, sem despesas duplicadas.</p><div class="receipt-photo-inputs"><label class="btn btn-outline btn-sm" for="entry-receipt">${ico('plus')} Selecionar fotos</label><input type="file" id="entry-receipt" class="receipt-hidden-input" accept="image/jpeg,image/png,image/webp" multiple><label class="btn btn-outline btn-sm" for="entry-receipt-camera">${ico('camera')} Fotografar outro trecho</label><input type="file" id="entry-receipt-camera" class="receipt-hidden-input" accept="image/jpeg,image/png,image/webp" capture="environment"></div><div id="receipt-status" class="receipt-photo-gallery"></div><p class="help">Para notas grandes: 5 a 8 produtos por foto, luz uniforme, papel plano e 20% de sobreposição. Inclua o cabeçalho e o total final.</p><div class="receipt-ocr-actions"><button type="button" class="btn btn-primary btn-sm" data-action="receipt-multi-scan">${ico('scan')} Ler fotos como uma compra</button></div><div id="receipt-ocr-status" class="help" role="status" aria-live="polite"></div><div id="receipt-ocr-review"></div><label id="receipt-review-label" class="receipt-verified" hidden><input type="checkbox" id="receipt-reviewed"> Conferi todos os produtos, preços, descontos e quantidades antes de salvar.</label></div>`;
}
function status(msg){const e=$('#receipt-ocr-status');if(e)e.textContent=msg}
function renderPhotos(){
 const e=$('#receipt-status');if(!e)return;
 e.innerHTML=photos.length?photos.map((uri,i)=>`<div class="receipt-photo"><img src="${uri}" alt="Parte ${i+1} da mesma nota"><small>Foto ${i+1}</small><button type="button" class="icon-btn" data-action="receipt-remove-one" data-index="${i}" aria-label="Excluir foto ${i+1}">${ico('close',14)}</button></div>`).join(''):'<span class="help">Nenhuma foto anexada.</span>';
}
async function compress(file){
 if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Use imagens JPG, PNG ou WebP.');
 if(file.size>16*1024*1024)throw Error('Imagem acima de 16 MB. Fotografe apenas um trecho da nota.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();await new Promise((ok,fail)=>{image.onload=ok;image.onerror=()=>fail(Error('Não consegui abrir a foto.'));image.src=url});
  const scale=Math.min(1,2600/Math.max(image.width,image.height),1900/image.width);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  let data=canvas.toDataURL('image/jpeg',.86);
  if(data.length>2200000)data=canvas.toDataURL('image/jpeg',.65);
  if(data.length>2200000)throw Error('Esta foto ficou grande demais para o backup. Fotografe uma parte menor.');
  return data;
 }finally{URL.revokeObjectURL(url)}
}
function invalidate(){
 draft=null;state.receiptOCRUsed=false;runId++;
 const area=$('#receipt-ocr-review');if(area)area.innerHTML='';
 const label=$('#receipt-review-label');if(label)label.hidden=true;
}
async function addPhotos(files){
 const incoming=Array.from(files||[]);if(!incoming.length)return;
 if(loading)throw Error('Conclua a leitura atual antes de adicionar fotos.');
 if(photos.length+incoming.length>8)throw Error('Máximo de 8 fotos por nota. Remova fotos antes de adicionar outras.');
 const added=[];for(const file of incoming)added.push(await compress(file));
 photos=[...photos,...added];state.editingReceiptPhotos=[...photos];state.editingReceipt=photos[0]||null;
 invalidate();renderPhotos();status(photos.length+' fotos vinculadas à mesma compra. Inicie a leitura quando terminar de fotografar.');
}
function removePhoto(index){
 if(loading)throw Error('Conclua a leitura antes de remover uma foto.');
 const i=Number(index);if(!Number.isInteger(i)||i<0||i>=photos.length)return;
 photos.splice(i,1);state.editingReceiptPhotos=[...photos];state.editingReceipt=photos[0]||null;
 invalidate();renderPhotos();status('Foto removida. Refaça a leitura para atualizar os itens.');
}
function resetAll(){
 if(loading)throw Error('Conclua a leitura antes de remover as fotos.');
 photos=[];state.editingReceiptPhotos=[];state.editingReceipt=null;invalidate();renderPhotos();
}
function script(){
 if(root.Tesseract)return Promise.resolve(root.Tesseract);
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src='./vendor/ocr/tesseract.min.js';el.async=true;
  el.onload=()=>root.Tesseract?resolve(root.Tesseract):reject(Error('Motor de OCR indisponível.'));
  el.onerror=()=>reject(Error('Não foi possível carregar o OCR. Abra o app com internet na primeira vez.'));
  document.head.append(el);
 }).catch(e=>{scriptPromise=null;throw e});
 return scriptPromise;
}
async function enhance(uri){
 if(!root.Image||!document.createElement)return uri;
 const image=new Image();await new Promise((ok,fail)=>{image.onload=ok;image.onerror=fail;image.src=uri});
 const scale=Math.min(1.5,2600/Math.max(image.width,image.height),Math.sqrt(4200000/(image.width*image.height)));
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(image.width*scale));c.height=Math.max(1,Math.round(image.height*scale));
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,c.width,c.height);
 const data=ctx.getImageData(0,0,c.width,c.height),a=data.data,hist=new Uint32Array(256);
 for(let i=0;i<a.length;i+=16)hist[Math.round(.299*a[i]+.587*a[i+1]+.114*a[i+2])]++;
 let count=0,lo=0,hi=255,samples=a.length/16;
 for(let v=0;v<256;v++){count+=hist[v];if(count>=samples*.06){lo=v;break}}
 count=0;for(let v=0;v<256;v++){count+=hist[v];if(count>=samples*.94){hi=v;break}}
 if(hi-lo<25)return uri;
 for(let i=0;i<a.length;i+=4){
  const l=.299*a[i]+.587*a[i+1]+.114*a[i+2],v=Math.max(0,Math.min(255,Math.round((l-lo)*255/(hi-lo))));
  a[i]=v;a[i+1]=v;a[i+2]=v;
 }
 ctx.putImageData(data,0,0);return c.toDataURL('image/jpeg',.87);
}
function score(text){const p=P().parsePhoto(text);return p.items.length*4+p.items.filter(i=>i.netPrinted).length*3-p.pending.length*2-p.errors.length*2}
async function scan(){
 if(loading)return;
 if(!photos.length)throw Error('Adicione uma ou mais fotografias da nota.');
 if(!P())throw Error('Leitor multipágina indisponível. Atualize o aplicativo.');
 const token=++runId;loading=true;draft=null;state.receiptOCRUsed=false;
 const btn=$('[data-action="receipt-multi-scan"]');if(btn)btn.disabled=true;
 let worker;
 try{
  status('Preparando o OCR em português...');
  const tess=await script(),base=new URL('./vendor/ocr/',root.location.href).href;
  worker=await tess.createWorker('por',1,{workerPath:base+'worker.min.js',corePath:base+'core',langPath:base+'lang',workerBlobURL:false,logger:m=>{if(m?.status==='recognizing text')status('Lendo foto, '+Math.round((m.progress||0)*100)+'%...')}});
  const readings=[];
  for(let i=0;i<photos.length;i++){
   if(token!==runId)return;
   status('Reconhecendo foto '+(i+1)+' de '+photos.length+'. Não feche a tela.');
   const first=await worker.recognize(photos[i]);let best=String(first?.data?.text||'').slice(0,30000);
   if(P().parsePhoto(best).items.length<3||P().parsePhoto(best).pending.length>1){
    try{
     status('Tentando reforçar contraste da foto '+(i+1)+'...');
     const enhanced=await enhance(photos[i]);
     if(enhanced!==photos[i]){const second=await worker.recognize(enhanced),text=String(second?.data?.text||'').slice(0,30000);if(score(text)>score(best))best=text}
    }catch(error){console.warn('Realce de imagem não aplicado',error)}
   }
   readings.push(best);
  }
  if(token!==runId||!$('#entry-form'))return;
  draft=P().combine(readings);renderDraft();
  status('Leitura concluída. Confira itens reconhecidos e avisos. Nenhuma transação foi salva.');
 }catch(e){status('Falha de leitura: '+(e?.message||String(e))+'. Faça fotos mais próximas ou preencha manualmente.');throw e}
 finally{if(worker)try{await worker.terminate()}catch(error){console.warn(error)}loading=false;if(btn)btn.disabled=false}
}
function renderDraft(){
 const host=$('#receipt-ocr-review');if(!host||!draft)return;
 const items=draft.items.slice(0,140).map(x=>`<div class="receipt-ocr-line"><span>${x.number!==null?'#'+x.number+' · ':''}${esc(x.name)} · ${x.qty} ${esc(x.unit)} <small>(foto ${x.sourcePhotos.map(n=>n+1).join(', ')})</small></span><strong>${money(x.cents)}</strong></div>`).join('');
 host.innerHTML=`<div class="receipt-ocr-panel"><h3 class="panel-title">Uma compra, ${draft.pageCount} foto(s) e ${draft.items.length} item(ns)</h3><p class="help">Loja: ${esc(draft.merchant||'a confirmar')} · Data: ${esc(draft.date||'a confirmar')}</p><div class="receipt-ocr-totals"><span>Itens reconhecidos: <strong>${money(draft.sum)}</strong></span><span>Valor total: <strong>${draft.total===null?'não identificado':money(draft.total)}</strong></span>${draft.expected!==null?`<span>Quantidade impressa: ${draft.expected}</span>`:''}</div>${draft.balanced?'<p class="receipt-ocr-ok">Os valores reconhecidos conferem com o total. Confira nomes e quantidades.</p>':'<div class="note">A leitura não foi conciliada completamente. Confira os itens antes de registrar.</div>'}${draft.issues.length?`<div class="receipt-ocr-warning"><strong>Verificações necessárias:</strong><ul>${draft.issues.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>`:''}${items||'<div class="note">Nenhum item foi reconhecido com segurança.</div>'}${draft.pending.length?`<div class="note">${draft.pending.length} linha(s) sem valor líquido confiável. Complete os produtos manualmente.</div>`:''}<details><summary>Texto reconhecido de todas as fotos</summary><pre class="receipt-ocr-raw">${esc(draft.raw)}</pre></details><button type="button" class="btn btn-primary btn-sm" data-action="receipt-multi-apply">Preencher compra para revisão</button><p class="help">Preencher não registra despesas. Confirme os dados no formulário.</p></div>`;
}
function apply(){
 if(!draft||!$('#entry-form'))throw Error('Leia as fotos antes de aplicar.');
 if(!draft.items.length)throw Error('Nenhum produto reconhecido. Você pode cadastrar manualmente.');
 if(state.items.length&&!confirm('Substituir os itens que já estão no formulário?'))return;
 if(draft.issues.length&&!confirm('A leitura contém valores a conferir. Você precisará corrigir e completar os itens. Aplicar mesmo assim?'))return;
 const title=$('#entry-title'),merchant=$('#entry-merchant'),date=$('#entry-date'),amount=$('#entry-amount');
 if(!title||!merchant||!date||!amount)throw Error('O formulário da compra não está aberto.');
 if(draft.merchant){if(merchant.value.trim()&&merchant.value!==draft.merchant&&!confirm('Substituir o estabelecimento informado?'))return;merchant.value=draft.merchant}
 if(draft.date)date.value=draft.date;
 if(!title.value.trim())title.value=(draft.merchant?'Compra em '+draft.merchant:'Compra de supermercado').slice(0,120);
 const total=draft.total??draft.sum;if(total>0)amount.value=(total/100).toFixed(2).replace('.',',');
 state.items=draft.items.map(x=>({name:x.name,qty:x.qty,unit:x.unit,cents:x.cents,amount:(x.cents/100).toFixed(2).replace('.',',')}));
 refreshItemRows();$('#entry-type').value='expense';$$('[data-type]').forEach(x=>x.classList.toggle('active',x.dataset.type==='expense'));
 state.receiptOCRUsed=true;
 const label=$('#receipt-review-label');if(label)label.hidden=false;
 const box=$('#receipt-reviewed');if(box)box.checked=false;
 status(draft.issues.length?'Corrija ou complete os itens para que a soma confira e marque a confirmação antes de salvar.':'Revise cada produto e marque a confirmação antes de salvar.');
 uiToast('Compra preparada, mas ainda não registrada.');
}
function acceptExternalDraft(result,source){
 if(loading)throw Error('Conclua a leitura local antes de aplicar a IA.');
 if(!photos.length||!result||!Array.isArray(result.items))throw Error('A prévia de IA é inválida.');
 draft={...result,pageCount:photos.length,source:source||'IA',raw:result.raw||'Análise visual externa sujeita a revisão.'};
 state.receiptOCRUsed=false;
 renderDraft();
 status('Prévia '+(source||'IA')+' recebida. Confira os valores e clique em Preencher compra para revisão.');
}
function canSave(){
 if(state.receiptOCRUsed&&!$('#receipt-reviewed')?.checked)throw Error('Antes de registrar, marque que conferiu produtos, quantidades, descontos e valores da nota.');
 return true;
}
async function action(button){
 const a=button.dataset.action;
 if(a==='receipt-multi-scan'){await scan();return true}
 if(a==='receipt-multi-apply'){apply();return true}
 if(a==='receipt-remove-one'){removePhoto(button.dataset.index);return true}
 if(a==='remove-photo'){resetAll();return true}
 return false;
}
root.MeuFluxoReceiptCapture={setUp,controlHTML,addPhotos,removePhoto,resetAll,renderPhotos,scan,apply,acceptExternalDraft,canSave,action,getPhotos:()=>photos.slice(),getDraft:()=>draft};
})(typeof globalThis!=='undefined'?globalThis:this);
