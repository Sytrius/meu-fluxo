
(function(root){
'use strict';
let draft=null,loading=false,scriptPromise=null;
const R=()=>root.MeuFluxoReceipts;
const money=n=>fmt(n);
const words=u=>({un:'unidade',kg:'kg',g:'g',l:'litro',ml:'ml'})[u]||'unidade';
function reset(){draft=null;loading=false}
function controls(){
 return `<div class="receipt-ocr-actions"><button type="button" class="btn btn-soft btn-sm" data-action="receipt-scan">${ico('upload')} Ler itens da foto</button><span class="help">Leitura no aparelho; revise antes de salvar. O motor OCR pode exigir download na primeira utilização.</span></div><div id="receipt-ocr-status" class="help" role="status" aria-live="polite"></div><div id="receipt-ocr-review"></div>`;
}
function showStatus(msg){
 const el=$('#receipt-ocr-status');if(el)el.textContent=msg;
}
function script(){
 if(root.Tesseract)return Promise.resolve(root.Tesseract);
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='./vendor/ocr/tesseract.min.js';s.async=true;
  s.onload=()=>root.Tesseract?resolve(root.Tesseract):reject(Error('Motor OCR indisponível.'));
  s.onerror=()=>reject(Error('Não foi possível carregar o leitor de notas. Conecte-se à internet para baixar os componentes na primeira utilização.'));
  document.head.append(s);
 }).catch(e=>{scriptPromise=null;throw e});
 return scriptPromise;
}
async function scan(){
 if(loading)return;
 const photo=state.editingReceipt;
 if(!photo)throw Error('Escolha uma fotografia da nota fiscal antes de tocar em Ler itens da foto.');
 if(!root.MeuFluxoReceipts)throw Error('Leitor de notas indisponível. Atualize o aplicativo.');
 loading=true;draft=null;
 const button=$('[data-action="receipt-scan"]');
 if(button)button.disabled=true;
 showStatus('Preparando leitor de notas em português. Na primeira utilização, o navegador precisa baixar o motor OCR...');
 let worker;
 try{
  const tess=await script();
  const base=new URL('./vendor/ocr/',root.location.href).href;
  worker=await tess.createWorker('por',1,{
   workerPath:base+'worker.min.js',corePath:base+'core',langPath:base+'lang',
   workerBlobURL:false,logger:m=>{
    const pct=Number.isFinite(m.progress)?' ('+Math.round(m.progress*100)+'%)':'';
    showStatus('Lendo nota: '+String(m.status||'processando')+pct);
   }
  });
  const result=await worker.recognize(photo);
  if(state.editingReceipt!==photo||!$('#entry-form'))return;
  const text=String(result?.data?.text||'').slice(0,16000);
  draft=R().parse(text);
  renderDraft();
  showStatus('Leitura concluída. Confira os dados e clique em Aplicar à compra. Nada foi registrado ainda.');
 }catch(e){
  showStatus('Falha na leitura: '+(e?.message||String(e))+'. É possível preencher a compra manualmente.');
  throw e;
 }finally{
  if(worker)try{await worker.terminate()}catch(e){console.warn('Finalização OCR',e)}
  loading=false;if(button)button.disabled=false;
 }
}
function renderDraft(){
 const el=$('#receipt-ocr-review');if(!el||!draft)return;
 const list=draft.items.slice(0,80).map((x,i)=>`<div class="receipt-ocr-line"><span>${i+1}. ${esc(x.name)} · ${esc(x.qty)} ${esc(words(x.unit))}</span><strong>${money(x.cents)}</strong></div>`).join('');
 el.innerHTML=`<div class="receipt-ocr-panel"><div class="fin-heading"><h3 class="panel-title">Prévia da nota — confira os dados</h3><span class="badge">${draft.items.length} item(ns)</span></div>
 <p class="help">Loja sugerida: <b>${esc(draft.merchant||'não identificada')}</b>. Data: <b>${esc(draft.date||'não identificada')}</b></p>
 ${list||'<div class="note">Nenhum item identificado com segurança. Você pode registrar manualmente.</div>'}
 <div class="receipt-ocr-totals"><span>Soma identificada: <strong>${money(draft.sum)}</strong></span><span>Total impresso: <strong>${draft.total===null?'não identificado':money(draft.total)}</strong></span></div>
 ${draft.warning?`<div class="note receipt-ocr-warning">${esc(draft.warning)}</div>`:''}
 <details><summary>Ver texto reconhecido (para corrigir erros)</summary><pre class="receipt-ocr-raw">${esc(draft.raw)}</pre></details>
 <button class="btn btn-primary btn-sm" type="button" data-action="receipt-apply">Aplicar à compra para revisão</button>
 <p class="help">A aplicação preenche o formulário, mas não salva a transação. Confirme todos os valores antes de registrar.</p></div>`;
}
function apply(){
 if(!draft||!$('#entry-form'))throw Error('Nenhuma leitura disponível para aplicar.');
 if(state.items.length&&!confirm('Substituir os itens já digitados pelos itens detectados na foto?'))return;
 if(!draft.items.length&&!draft.total)throw Error('Não consegui identificar um valor seguro. Digite a compra manualmente.');
 const title=$('#entry-title'),merchant=$('#entry-merchant'),date=$('#entry-date'),amount=$('#entry-amount');
 if(!title||!merchant||!date||!amount)throw Error('O formulário da compra não está aberto.');
 if(draft.merchant&&merchant.value.trim()&&!confirm('Substituir o nome do estabelecimento já preenchido?'))return;
 if(draft.merchant)merchant.value=draft.merchant;
 if(draft.date)date.value=draft.date;
 if(!title.value.trim())title.value=draft.merchant?'Compra em '+draft.merchant:'Compra com itens da nota';
 const finalCents=draft.total??draft.sum;
 if(finalCents>0)amount.value=(finalCents/100).toFixed(2).replace('.',',');
 state.items=draft.items.map(x=>({name:x.name,qty:x.qty,unit:x.unit,cents:x.cents,amount:(x.cents/100).toFixed(2).replace('.',',')}));
 refreshItemRows();
 $('#entry-type').value='expense';
 $$('[data-type]').forEach(x=>x.classList.toggle('active',x.dataset.type==='expense'));
 const cat=$('#entry-category');
 if(cat&&state.items.length&&cat.value==='Outros')cat.value='Alimentação';
 if(draft.sum!==finalCents&&state.items.length){
  showStatus('A soma dos itens não confere com o total. Corrija ou acrescente os itens antes de registrar; o app impedirá uma compra inconsistente.');
 }else showStatus('Campos preenchidos. Revise tudo e clique em Registrar para salvar.');
 uiToast('Leitura aplicada à compra. Confira os dados antes de salvar.');
}
function moneyUnit(c){return c.unit==='kg'?'kg':c.unit==='l'?'L':'un'}
function comparePrice(a,b){
 if(!a||!b||!b.pricePerUnit)return '';
 const diff=Math.round((a.pricePerUnit-b.pricePerUnit)/b.pricePerUnit*100);
 return (diff>0?'+':'')+diff+'%';
}
function rows(query=''){
 const q=R().normalizeName(query),catalog=R().catalog(state.entries).filter(x=>!q||R().normalizeName(x.name).includes(q));
 if(!catalog.length)return `<div class="empty"><strong>Nenhum produto encontrado</strong>Registre compras com itens detalhados para construir seu histórico.</div>`;
 return catalog.slice(0,180).map(item=>{
  const latest=item.latest,first=item.first,percent=item.count>1?comparePrice(latest,first):'—';
  return `<div class="receipt-product-row"><div class="receipt-product-name"><strong>${esc(item.name)}</strong><small>${item.count} compra(s) · última ${formatDate(latest.date)} · ${esc(latest.merchant||'sem loja')}</small></div><div class="receipt-product-price"><strong>${money(latest.pricePerUnit)}/${esc(moneyUnit(item))}</strong><small>Desde primeira compra: ${esc(percent)}</small></div><button type="button" class="btn btn-outline btn-sm" data-action="receipt-history" data-key="${esc(item.key)}">Detalhes</button></div>`;
 }).join('');
}
function page(){
 const catalog=R().catalog(state.entries);
 const receiptCount=state.entries.filter(x=>x.type==='expense'&&x.items?.length).length;
 return `<div class="page-head"><div><p class="eyebrow">HISTÓRICO DE CONSUMO</p><h1 class="page-title">Produtos e preços</h1><p class="page-sub">Compare o custo de produtos por unidade, kg ou litro usando compras registradas por você.</p></div><button class="btn btn-primary" data-action="receipt-new">${ico('plus')} Nova compra por foto</button></div>
 <div class="grid-kpi receipt-kpis"><div class="card kpi"><div class="kpi-label">Produtos identificados</div><div class="kpi-value">${catalog.length}</div><p class="panel-sub">Nomes e unidades distintas</p></div><div class="card kpi"><div class="kpi-label">Compras detalhadas</div><div class="kpi-value">${receiptCount}</div><p class="panel-sub">Somente transações confirmadas</p></div></div>
 <section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Histórico de preços</h2><p class="panel-sub">As comparações agrupam nomes iguais e unidades equivalentes; confira marcas e embalagens antes de comparar.</p></div></div><div class="search receipt-search">${ico('search')}<input class="input" id="price-filter" placeholder="Buscar arroz, leite, sabonete..." aria-label="Buscar produtos"></div><div id="price-results">${rows()}</div></section>
 <div class="note" style="margin-top:16px">Os preços são calculados a partir das notas e compras que você confirmou. Não são cotações da internet nem preços atuais das lojas. Fotos permanecem neste aparelho e são incluídas no backup.</div>`;
}
function filter(){
 const el=$('#price-results');if(el)el.innerHTML=rows($('#price-filter')?.value||'');
}
function history(key){
 const item=R().catalog(state.entries).find(x=>x.key===key);if(!item)throw Error('Produto não encontrado.');
 const list=[...item.records].reverse().slice(0,60).map(x=>`<div class="receipt-product-row"><div><strong>${formatDate(x.date)}</strong><small>${esc(x.merchant||'Loja não informada')} · ${x.qty} ${esc(words(x.unit))}</small></div><div class="receipt-product-price"><strong>${money(x.pricePerUnit)}/${esc(moneyUnit(item))}</strong><small>Total do item: ${money(x.totalCents)}</small></div></div>`).join('');
 const min=Math.min(...item.records.map(x=>x.pricePerUnit)),max=Math.max(...item.records.map(x=>x.pricePerUnit));
 openOverlay(`<div class="modal-head"><h2>${esc(item.name)}</h2><button class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><div class="note">Menor preço registrado: <strong>${money(min)}/${esc(moneyUnit(item))}</strong> · Maior: <strong>${money(max)}/${esc(moneyUnit(item))}</strong></div><div class="receipt-price-history">${list}</div><p class="help">Comparação baseada apenas no seu histórico. Produtos de marcas ou embalagens diferentes podem não ser equivalentes.</p>`);
}
async function action(btn){
 const name=btn.dataset.action;
 if(name==='receipt-new'){entryModal();$('#entry-receipt')?.focus();return true}
 if(name==='receipt-scan'){await scan();return true}
 if(name==='receipt-apply'){apply();return true}
 if(name==='receipt-history'){history(btn.dataset.key);return true}
 return false;
}
root.MeuFluxoReceiptsUI={controls,scan,apply,page,filter,history,action,reset};
})(typeof globalThis!=='undefined'?globalThis:this);
