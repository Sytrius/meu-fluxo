const test=require('node:test');
const assert=require('node:assert/strict');
const parser=require('../receipt-file-v16.js');

test('CSV gerado com metadados vira uma compra, preservando linhas repetidas',async()=>{
 const csv='Loja;Mercado Exemplo\nData;2026-11-14\nTotal pago;36,05\nQuantidade de itens;3\nItem;Código de Barras;Descrição do Produto;Quantidade;Unidade;Preço Unitário (R$);Desconto (R$);Valor Líquido (R$)\n1;7891111111111;Leite integral;1;un;10,00;0,20;9,80\n2;7891111111111;Leite integral;1;un;10,00;0,20;9,80\n3;7892222222222;Arroz branco;2;un;8,25;0,05;16,45';
 const file={name:'lista.csv',size:Buffer.byteLength(csv),text:async()=>csv};
 const result=await parser.parse(file);
 assert.equal(result.items.length,3);
 assert.equal(result.items[1].barcode,'7891111111111');
 assert.equal(result.items[2].qty,2);
 assert.equal(result.sum,3605);
 assert.equal(result.total,3605);
 assert.equal(result.balanced,true);
});

test('planilha parcial avisa a diferença e não descarta produto',()=>{
 const result=parser.mapped([
  ['Loja','Mercado'],['Total pago','12,00'],
  ['Item','Descrição do Produto','Qtd / Preço Unit.','Valor Líquido (R$)'],
  ['1','Arroz','1 UN × R$ 5,00','4,90'],
  ['2','Arroz','1 UN × R$ 5,00','4,90']
 ]);
 assert.equal(result.items.length,2);
 assert.equal(result.sum,980);
 assert.equal(result.balanced,false);
 assert.match(result.issues.join(' '),/difere do total/);
});

test('CSV com nome perigoso é dado, nunca fórmula ou HTML',()=>{
 const result=parser.mapped([['Produto','Valor Líquido (R$)'],['<img src=x onerror=alert(1)>','2,50']]);
 assert.equal(result.items[0].name,'<img src=x onerror=alert(1)>');
 assert.equal(result.items[0].cents,250);
});
