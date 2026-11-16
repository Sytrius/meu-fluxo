import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {receiptText} from '../src/receipt-layout.mjs';
const require=createRequire(import.meta.url),P=require('../../meu-fluxo-app/receipt-multipage-v15.js');
const nets=[1441,2764,1469,2131,2131,1798,260,309,465,833,920,245,490,451,293,446,558,529,664,293,489,530,563,4407,978,1566,225];
const gross=[1470,2820,1499,2175,2175,1835,265,315,475,850,939,250,500,460,299,455,569,540,678,299,499,540,575,4497,998,1598,229];
const money=n=>(n/100).toFixed(2).replace('.',',');
// Receipt amounts transcribed from the supplied images. Geometry simulates
// ML Kit's separate description and price blocks; it is not a device OCR test.
function page(start,end,summary=false){
 const left=[],right=[];let row=0;const slope=.08;
 function line(text,x){const y=row*30+slope*x;return {text,boundingBox:{left:x,top:y,right:x+90,bottom:y+20},cornerPoints:[{x,y},{x:x+90,y:y+7.2},{x:x+90,y:y+27.2},{x,y:y+20}]}}
 for(let n=start;n<=end;n++){
  const qty=({13:2,19:2,22:2,24:3,25:2,26:2})[n]||1;
  left.push(line(')'+String(n).padStart(3,'0')+' '+String(7890000000000+n)+' PRODUTO MERCADO',10));row++;
  left.push(line(qty+' UN X '+money(Math.round(gross[n-1]/qty)),10));right.push(line(money(gross[n-1]),600));row++;
  left.push(line('Desconto',10));right.push(line('-'+money(gross[n-1]-nets[n-1]),600));row++;
  left.push(line('Valor Líquido',10));right.push(line(money(nets[n-1]),600));row++;
 }
 if(summary)for(const [label,value] of [['QTD. TOTAL DE ITENS','027'],['VALOR TOTAL R$','278,04'],['Descontos R$','-5,56'],['VALOR A PAGAR R$','272,48']]){left.push(line(label,10));right.push(line(value,600));row++}
 return {blocks:[{lines:left},{lines:right}]};
}
test('27 itens em três fotos com colunas e inclinação: soma líquida 272,48 e quantidades',()=>{
 const draft=P.combine([page(1,11),page(8,22),page(16,27,true)].map(receiptText));
 assert.equal(draft.items.length,27);assert.equal(draft.expected,27);assert.equal(draft.total,27248);assert.equal(draft.sum,27248);
 assert.equal(draft.items.find(x=>x.number===24).qty,3);assert.equal(draft.items.find(x=>x.number===25).qty,2);assert.equal(draft.balanced,true);
});
test('nota extensa de 150 itens conserva linhas e avisa divergência',()=>{
 const text=Array.from({length:150},(_,i)=>`${i+1} ${7890000000000+i} PRODUTO\n1 UN X 1,00\nValor Líquido 1,00`).join('\n');
 const draft=P.combine([text+'\nQTD. TOTAL DE ITENS 150\nVALOR A PAGAR R$ 151,00']);
 assert.equal(draft.items.length,150);assert.equal(draft.balanced,false);
});
