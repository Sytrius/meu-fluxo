
const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../receipts-v14.js');
test('extrai itens, total, loja e data de nota de mercado e sinaliza diferença',()=>{
 const o=R.parse(`MERCADO CENTRAL
CNPJ: 12.345.678/0001-90
15/11/2026 14:30
ARROZ BRANCO 5KG 20,00
LEITE INTEGRAL 2 UN 5,50 11,00
QUEIJO COALHO 0,500 KG 40,00 20,00
TOTAL A PAGAR R$ 51,00`);
 assert.equal(o.date,'2026-11-15');
 assert.equal(o.merchant,'MERCADO CENTRAL');
 assert.equal(o.items.length,3);
 assert.equal(o.items[1].qty,2);
 assert.equal(o.items[2].unit,'kg');
 assert.equal(o.total,5100);
 assert.equal(o.sum,5100);
 assert.equal(o.balanced,true);
});
test('não confunde pagamento, desconto e troco com produtos',()=>{
 const o=R.parse(`MERCADO TESTE
DETERGENTE 5,00
TOTAL 5,00
PAGAMENTO PIX 5,00
TROCO 0,00
DESCONTO 0,00
CNPJ 11222333000144`);
 assert.equal(o.items.length,1);
 assert.equal(o.sum,500);
 assert.equal(o.total,500);
});
test('inconsistência na multiplicação não vira item sem correção',()=>{
 assert.equal(R.parseItem('LEITE 2 UN 5,00 20,00'),null);
});
test('nota sem itens exige revisão manual',()=>{
 const o=R.parse('NOTA\nVALOR TOTAL 47,90');
 assert.equal(o.items.length,0);
 assert.match(o.warning,/manualmente/);
});
test('inconsistência entre soma e total fica explícita',()=>{
 const o=R.parse('SUPERMERCADO\nARROZ 20,00\nFEIJAO 15,00\nTOTAL 40,00');
 assert.equal(o.balanced,false);
 assert.match(o.warning,/não coincide/);
});
test('datas inexistentes não são aceitas como data da compra',()=>{
 assert.equal(R.parse('LOJA\n31/02/2026\nARROZ 5,00').date,null);
});
test('preços por kg, litro e unidade com produtos legados',()=>{
 const tx=[{id:'a',type:'expense',date:'2026-10-01',merchant:'A',items:[{name:'Leite',qty:2,unit:'l',cents:1400},{name:'Arroz',qty:500,unit:'g',cents:250},{name:'Sabonete',qty:2,cents:700}]},
 {id:'b',type:'expense',date:'2026-11-01',merchant:'B',items:[{name:'ARROZ',qty:1,unit:'kg',cents:600}]},
 {id:'c',type:'expense',date:'2026-11-01',deletedAt:'2026-11-02',items:[{name:'Arroz',qty:1,cents:100000}]}];
 const prices=R.priceRecords(tx);
 assert.equal(prices.length,4);
 assert.equal(prices.find(x=>x.unit==='g').pricePerUnit,500);
 const arroz=R.catalog(tx).find(x=>x.key==='ARROZ|kg');
 assert.equal(arroz.count,2);
 assert.equal(arroz.first.pricePerUnit,500);
 assert.equal(arroz.latest.pricePerUnit,600);
 assert.equal(R.catalog(tx).find(x=>x.key==='SABONETE|un').latest.pricePerUnit,350);
});
test('não inventa preços de transações sem itens',()=>{
 assert.equal(R.catalog([{id:'x',type:'expense',title:'Mercado',cents:2000,items:[]}]).length,0);
});
