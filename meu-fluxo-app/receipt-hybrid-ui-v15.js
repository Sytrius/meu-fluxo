
(function(root){
'use strict';
const H=()=>root.MeuFluxoReceiptHybrid;
function controls(){
 const available=root.MeuFluxoReceiptAI?.configured?.();
 return `<section class="field span-2 hybrid-receipt">
 <h3 class="panel-title">Leitura inteligente</h3>
 <p class="help">A leitura local acima continua disponível sem internet. Estes recursos são opcionais.</p>
 <div class="hybrid-choice">
  <div><strong>1. Consulta QR Code NFC-e</strong><p class="help">Abra a página fiscal oficial de Pernambuco. Ela pode mostrar os produtos, mas não fornece importação automática garantida.</p>
   <div class="hybrid-actions"><button type="button" class="btn btn-outline btn-sm" data-action="hybrid-qr-scan">Ler QR das fotos</button>
   <input id="hybrid-qr-input" class="input" maxlength="1800" placeholder="Ou cole o link do QR / chave de 44 dígitos">
   <button type="button" class="btn btn-outline btn-sm" data-action="hybrid-qr-paste">Consultar</button></div>
   <div id="hybrid-qr-result" class="help" aria-live="polite"></div>
  </div>
  <div><strong>2. Análise Gemini (online)</strong><p class="help">Somente com sua autorização: fotos da nota serão enviadas ao Google. No plano gratuito os dados enviados podem ser usados para melhorar serviços. Exige Firebase AI Logic + App Check configurados pelo administrador.</p>
   <button type="button" class="btn btn-primary btn-sm" data-action="hybrid-ai-start">${available?'Analisar com Gemini':'IA — configuração pendente'}</button>
   <div id="hybrid-ai-status" class="help" aria-live="polite">${available?'Nenhuma imagem é enviada automaticamente.':'OCR local e QR continuam disponíveis.'}</div>
  </div>
 </div></section>`;
}
function showQr(raw){
 const url=H().officialURL(raw),area=$('#hybrid-qr-result');
 if(url){if(area)area.innerHTML='<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir consulta oficial NFC-e de Pernambuco</a><p>Você poderá conferir os produtos no portal, mas não há importação automática garantida.</p>';return true}
 if(H().fromAccessKey(raw)){if(area)area.innerHTML='<p>Chave de 44 dígitos reconhecida. Consulte no <a href="https://www.sefaz.pe.gov.br/Servicos/ICMS/Paginas/Documentos_Fiscais.aspx" target="_blank" rel="noopener noreferrer">portal oficial da SEFAZ-PE</a>, informando a chave.</p>';return true}
 if(area)area.textContent='Não foi identificado endereço da NFC-e de Pernambuco. Cole o link oficial do QR ou use a leitura local.';return false;
}
async function scanQR(){
 const photos=root.MeuFluxoReceiptCapture?.getPhotos?.()||[];
 if(!photos.length)throw Error('Adicione uma foto do QR Code da nota.');
 if(typeof root.BarcodeDetector!=='function')throw Error('Este navegador não oferece leitura de QR Code. Leia o QR pela câmera do celular e cole o link aqui.');
 const detector=new root.BarcodeDetector({formats:['qr_code']});
 const area=$('#hybrid-qr-result');if(area)area.textContent='Procurando QR nas imagens...';
 for(const uri of photos){
  const img=new Image();await new Promise((ok,fail)=>{img.onload=ok;img.onerror=fail;img.src=uri});
  const codes=await detector.detect(img);
  for(const code of codes)if(H().officialURL(code.rawValue)){const field=$('#hybrid-qr-input');if(field)field.value=code.rawValue;showQr(code.rawValue);return}
 }
 throw Error('QR não encontrado. Fotografe o código de perto ou cole o endereço obtido pela câmera.');
}
async function analyzeAI(){
 const photos=root.MeuFluxoReceiptCapture?.getPhotos?.()||[];
 if(!photos.length)throw Error('Adicione fotos da nota antes da análise.');
 if(!root.MeuFluxoReceiptAI?.configured?.())throw Error('Firebase AI Logic/App Check ainda não foi habilitado pelo administrador. Use o leitor offline.');
 if(!root.navigator?.onLine)throw Error('A análise com IA exige internet.');
 if(!confirm('AUTORIZAÇÃO PARA ENVIAR FOTOS\n\nAs '+photos.length+' fotos serão enviadas ao Google via Firebase AI Logic/Gemini. Elas podem conter dados fiscais ou pessoais e, no nível gratuito, poderão ser usadas para melhorar serviços. Há limites de uso. Cada imagem será analisada em uma solicitação separada, com no máximo uma nova tentativa em caso de falha temporária.\n\nVocê autoriza o envio destas fotos?'))return;
 const status=$('#hybrid-ai-status'),button=$('[data-action="hybrid-ai-start"]');
 if(button)button.disabled=true;if(status)status.textContent='Analisando imagens autorizadas, sem alterar seu histórico...';
 try{
  const result=await root.MeuFluxoReceiptAI.analyze(photos,({index,retrying})=>{if(status)status.textContent='Analisando foto '+(index+1)+' de '+photos.length+(retrying?' — serviço ocupado, tentando mais uma vez...':' — nenhuma despesa foi salva.');});
  if(!$('#entry-form'))return;
  root.MeuFluxoReceiptCapture.acceptExternalDraft(result,'Gemini');
  if(status)status.textContent='Prévia recebida. Revise TODOS os itens e valores antes de salvar.';
  uiToast('Prévia Gemini pronta, mas não foi registrada nenhuma compra.');
 }catch(error){if(status)status.textContent='Falha: '+(error?.message||String(error));throw error}
 finally{if(button)button.disabled=false}
}
async function action(button){
 const a=button.dataset.action;
 if(a==='hybrid-qr-scan'){await scanQR();return true}
 if(a==='hybrid-qr-paste'){showQr($('#hybrid-qr-input')?.value||'');return true}
 if(a==='hybrid-ai-start'){await analyzeAI();return true}
 return false;
}
root.MeuFluxoReceiptHybridUI={controls,action,showQr,scanQR};
})(typeof globalThis!=='undefined'?globalThis:this);
