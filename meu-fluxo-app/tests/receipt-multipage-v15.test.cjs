
const test=require('node:test');
const assert=require('node:assert/strict');
require('../receipts-v14.js');
const P=require('../receipt-multipage-v15.js');
const fragment1=`SUPERMERCADO CHAGAS
15/11/2026
N01 7891222333444 AMACIANTE DOWNY
UN X 14,70
Desconto -0,29
Valor Liquido 14,41
N02 7891222333555 LAVA ROUPAS 1L
UN X 28,20
Desconto -0,56
Valor Liquido 27,64
N03 7891222333666 DES AEROSOL
UN X 14,99
Desconto -0,30
Valor Liquido 14,69`;
const fragment2=`N03 7891222333666 DES AEROSOL
UN X 14,99
Desconto -0,30
Valor Liquido 14,69
N04 7891222333777 PEITO DE FRANGO
UN X 21,75
Desconto -0,44
Valor Liquido 21,31
QTD. TOTAL DE ITENS 004
SUB.TOTAL DE ITENS 79,64
Descontos R$ -1,59
VALOR A PAGAR R$ 78,05`;
test('lê itens multilinha, desconto e valor líquido sem somar preço bruto',()=>{
 const x=P.parsePhoto(fragment1);
 assert.equal(x.items.length,3);
 assert.deepEqual(x.items.map(i=>i.cents),[1441,2764,1469]);
 assert.equal(x.items[0].number,1);
 assert.equal(x.items[0].discountCents,29);
 assert.equal(x.items[1].grossCents,2820);
 assert.equal(x.items[0].qty,1);
});
test('une fotos da mesma nota por número/código evitando duplicar trecho sobreposto',()=>{
 const p=P.combine([fragment1,fragment2]);
 assert.equal(p.pageCount,2);
 assert.equal(p.items.length,4);
 assert.equal(p.items.find(x=>x.number===3).sourcePhotos.length,2);
 assert.equal(p.sum,7805);
 assert.equal(p.total,7805);
 assert.equal(p.expected,4);
 assert.equal(p.balanced,true);
 assert.equal(p.issues.length,0);
});
test('leitura parcial não é marcada como completa',()=>{
 const p=P.combine([fragment2]);
 assert.equal(p.items.length,2);
 assert.equal(p.expected,4);
 assert.match(p.issues.join(' '),/foram reconhecidos 2/);
 assert.equal(p.balanced,false);
});
test('não duplica despesa por desconto ou por total impresso',()=>{
 const p=P.parsePhoto(`SUPERMERCADO CHAGAS
N01 7891222333444 SABONETE
UN X 5,00
Desconto -0,20
Valor Liquido 4,80
TOTAL 4,80
PAGAMENTO PIX 4,80
TROCO 0,00`);
 assert.equal(p.items.length,1);
 assert.equal(p.items[0].cents,480);
 assert.equal(p.total,480);
});
test('duplicata numérica com preço divergente fica com aviso',()=>{
 const p=P.combine([fragment1,fragment2.replace('14,69','14,50')]);
 assert.match(p.issues.join(' '),/valores diferentes/);
});
test('recusa inventar preço quando só há produto e código',()=>{
 const p=P.parsePhoto('N01 7891222333444 FRANGO CONGELADO\nN02 7891222333555 ARROZ');
 assert.equal(p.items.length,0);
 assert.equal(p.pending.length,2);
});
test('com fotos de lojas diferentes, gera aviso em vez de garantir compra única',()=>{
 const p=P.combine([fragment1,fragment2.replace('N03 7891222333666', 'SUPERMERCADO DOIS\nN03 7891222333666')]);
 assert.match(p.issues.join(' '),/lojas diferentes/);
});

test('nota extensa com 27 itens, três fotos e áreas sobrepostas não duplica valores',()=>{
 const lines=Array.from({length:27},(_,i)=>{
  const n=String(i+1).padStart(2,'0'),barcode='789000000'+String(i+1).padStart(4,'0');
  return 'N'+n+' '+barcode+' PRODUTO '+n+'\nUN X 10,00\nDesconto -0,10\nValor Liquido 9,90';
 });
 const first='SUPERMERCADO CHAGAS\n15/11/2026\n'+lines.slice(0,10).join('\n');
 const middle=lines.slice(9,20).join('\n');
 const last=lines.slice(19).join('\n')+'\nQTD. TOTAL DE ITENS 027\nVALOR A PAGAR R$ 267,30';
 const merged=P.combine([first,middle,last]);
 assert.equal(merged.items.length,27);
 assert.equal(merged.total,26730);
 assert.equal(merged.sum,26730);
 assert.equal(merged.expected,27);
 assert.equal(merged.balanced,true);
});
