
(function(root){
'use strict';
let photos=[],draft=null,loading=false,ocrPromise=null,activeRun=0;
const P=()=>root.MeuFluxoReceiptMulti;
const f=n=>fmt(n);
function setUp(entry=null){
 photos=Array.isArray(entry?.receiptPhotos)&&entry.receiptPhotos.length?entry.receiptPhotos.slice(0,8):
   entry?.receipt?[entry.receipt]:[];
 state.editingReceiptPhotos=[...photos];state.editingReceipt=photos[0]||null;
 state.receiptOCRUsed=false;draft=null;activeRun++;
}
function controlHTML(){
 return `<div class="field span-2 receipt-multi-field"><label>Fotos da mesma nota fiscal (até 8 partes)</label><p class="help">Fotografe a nota por partes, de perto, com leve sobreposição entre as fotos. Todas serão reunidas em uma única compra, nunca como despesas separadas.</p>
 <div class="receipt-photo-inputs">
  <label class="btn btn-outline btn-sm" for="entry-receipt">${ico('plus')} Escolher fotos</label><input type="file" id="entry-receipt" accept="image/jpeg,image/png,image/webp,image