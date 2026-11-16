const test=require('node:test');
const assert=require('node:assert/strict');
require('../receipts-v14.js');
const P=require('../receipt-multipage-v15.js');
const item=(number,barcode='7898136970341',amount='21,31')=>`${number} ${barcode} FILE PEITO FRANGO BANDEJA
IAURICEA 1KG
. UN X 21,75 21,75
Desconto -0,44
Valor Liquido ${amount}`;

test('colunas da foto: preço unitário e bruto repetidos não são uma quantidade de 21,75 unidades',()=>{
 const p=P.parsePhoto(item('004'));
 assert.equal(p.items[0].qty,1);
 assert.equal(p.items[0].grossCents,2175);
 assert.equal(p.items[0].discountCents,44);
 assert.equal(p.items[0].cents,2131);
 assert.deepEqual(p.errors,[]);
 assert.equal(P.parseQuantity('UN X 2 4,99').qty,2);
 assert.equal(P.parseQuantity('0,500 KG X 34,00').qty,.5);
});
test('número de item diferente preserva os dois frangos da foto com o mesmo código',()=>{
 const p=P.combine([item('004')+'\n'+item('005'),item('005')]);
 assert.equal(p.items.length,2);
 assert.deepEqual(p.items.map(x=>x.number),[4,5]);
 assert.equal(p.sum,4262);
});
test('líquido encerra o item antes de ruído e linhas sem um novo cabeçalho válido',()=>{
 const p=P.parsePhoto(item('004')+'\nUN X 14,99\nDesconto -0,90\nValor Liquido 44,07');
 assert.equal(p.items.length,1);
 assert.equal(p.items[0].cents,2131);
 assert.equal(p.items[0].grossCents,2175);
});
test('bruto da nota não entra em conflito com o total líquido a pagar',()=>{
 const p=P.combine([item('004')+'\nVALOR TOTAL R$ 21,75\nDescontos R$ -0,44\nVALOR A PAGAR R$ 21,31']);
 assert.equal(p.total,2131);
 assert.equal(p.balanced,true);
});
test('item cortado em uma foto deixa de ficar pendente quando outra foto o recupera',()=>{
 const p=P.combine(['004 7898136970341 FILE PEITO FRANGO BANDEJA',item('004')+'\nVALOR A PAGAR R$ 21,31']);
 assert.equal(p.pending.length,0);
 assert.equal(p.balanced,true);
});
test('soma coincidente não mascara conflito entre fotos sobrepostas',()=>{
 const p=P.combine([item('004')+'\nVALOR A PAGAR R$ 21,31',item('004','7898136970341','21,30')]);
 assert.equal(p.sum,p.total);
 assert.match(p.issues.join(' '),/valores diferentes/);
 assert.equal(p.balanced,false);
});
