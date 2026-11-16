
(function(root){
'use strict';
const H=()=>root.MeuFluxoReceiptHybrid;
function controls(){
 return `<section class="field span-2 hybrid-receipt">
 <h3 class="panel-title">Criar a lista no Gemini</h3>
 <p class="help">Abra o Gemini, envie as fotos da nota e peça uma planilha com todos os produtos. Baixe o arquivo e selecione em “Importar lista da nota” acima.</p>
 <div class="hybrid-choice">
  <div><strong>Passo 1: abrir o Gemini</strong><p class="help">As fotos são enviadas por você no Gemini, fora do Meu Fluxo. Verifique as condições de privacidade da sua conta Google.</p>
   <div class="hybrid-actions"><button type="button" class="btn btn-primary btn-sm" data-action="hybrid-gemini-open">Abrir Gemini</button><button type="button" class="btn btn-outline btn-sm" data-action="hybrid-prompt-copy">Copiar instruções</button></div>
   <details><summary>Instruções para colar no Gemini</summary><pre class="receipt-ocr-raw" id="receipt-gemini-prompt">${esc(PROMPT)}</pre></details><div id="hybrid-ai-status" class="help" aria-live="polite"></div>
  </div>
  <div><strong>Consulta fiscal opcional</strong><p class="help">O portal oficial pode ajudar a conferir a nota, mas nem sempre exibe a lista de produtos.</p>
   <div class="hybrid-actions">
   <input id="hybrid-qr-input" class="input" maxlength="1800" placeholder="Ou cole o link do QR / chave de 44 dígitos">
   <button type="button" class="btn btn-outline btn-sm" data-action="hybrid-qr-paste">Consultar</button></div>
   <div id="hybrid-qr-result" class="help" aria-live="polite"></div>
  </div>
 </div></section>`;
}
const PROMPT=`Transcreva TODAS as fotos desta mesma nota fiscal como UMA compra. As fotos podem se sobrepor. Use a numeração impressa dos itens para retirar duplicatas entre fotos, mas preserve linhas diferentes do mesmo produto. Não invente dados ilegíveis. Confira os valores brutos, descontos e líquidos; a soma dos valores líquidos deve bater com o valor a pagar impresso. Se faltar algo, indique ao final o que precisa de revisão.

Gere um arquivo CSV UTF-8 para download (preferencialmente) ou XLSX, com uma única tabela e estas colunas exatas:
Item;Código de Barras;Descrição do Produto;Quantidade;Unidade;Preço Unitário (R$);Desconto (R$);Valor Líquido (R$)

Antes do cabeçalho, adicione quatro linhas com exatamente duas células: Loja;[nome], Data;[AAAA-MM-DD], Total pago;[valor em reais], Quantidade de itens;[número impresso]. Se não conseguir ler um desses campos, deixe a segunda célula vazia. Cada item deve ocupar uma linha. Valores usam vírgula decimal, sem fórmula. Quantidade e preço unitário devem corresponder ao valor bruto impresso; desconto é positivo e valor líquido é o total daquele item depois do desconto. Nunca use ponto e vírgula dentro de uma célula sem aspas CSV. Não junte produtos. Entregue o ARQUIVO para baixar, não apenas uma tabela no chat.`;
function showQr(raw){
 const url=H().officialURL(raw),area=$('#hybrid-qr-result');
 if(url){if(area)area.innerHTML='<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir consulta oficial NFC-e de Pernambuco</a><p>Você poderá conferir os produtos no portal, mas não há importação automática garantida.</p>';return true}
 if(H().fromAccessKey(raw)){if(area)area.innerHTML='<p>Chave de 44 dígitos reconhecida. Consulte no <a href="https://www.sefaz.pe.gov.br/Servicos/ICMS/Paginas/Documentos_Fiscais.aspx" target="_blank" rel="noopener noreferrer">portal oficial da SEFAZ-PE</a>, informando a chave.</p>';return true}
 if(area)area.textContent='Não foi identificado endereço da NFC-e de Pernambuco. Cole o link oficial do QR ou use a leitura local.';return false;
}
async function scanQR(){
 if(root.MeuFluxoNative?.available){
  const photos=root.MeuFluxoReceiptCapture?.getPhotos?.()||[];
  const area=$('#hybrid-qr-result');if(area)area.textContent='Procurando QR nas fotos anexadas...';
  let raw='';
  for(const photo of photos){
   const codes=await root.MeuFluxoNative.readPhotoQR(photo);
   raw=codes.find(c=>H().officialURL(c))||'';if(raw)break;
  }
  if(!raw){if(area)area.textContent='Nenhum QR visível nas fotos. Fotografe o quadrado completo do QR, abaixo da chave de acesso. A chave impressa não é um QR Code.';return}
  if(!raw)throw Error('Leitura do QR Code cancelada ou sem resultado.');
  const field=$('#hybrid-qr-input');if(field)field.value=raw;
  showQr(raw);return;
 }
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
 if(a==='hybrid-qr-paste'){showQr($('#hybrid-qr-input')?.value||'');return true}
 if(a==='hybrid-prompt-copy'){
  if(root.navigator?.clipboard?.writeText)await root.navigator.clipboard.writeText(PROMPT);
  else {const field=document.createElement('textarea');field.value=PROMPT;document.body.append(field);field.select();const copied=document.execCommand('copy');field.remove();if(!copied)throw Error('Selecione e copie as instruções exibidas nesta tela.');}
  const status=$('#hybrid-ai-status');if(status)status.textContent='Instruções copiadas. Cole no Gemini junto com as fotos.';
  return true;
 }
 if(a==='hybrid-gemini-open'){
  if(root.MeuFluxoNative?.available)await root.MeuFluxoNative.openGemini();
  else root.open('https://gemini.google.com/app','_blank','noopener,noreferrer');
  return true;
 }
 return false;
}
root.MeuFluxoReceiptHybridUI={controls,action,showQr};
})(typeof globalThis!=='undefined'?globalThis:this);
