const test=require('node:test'),assert=require('node:assert/strict');
const H=require('../receipt-hybrid-v15.js');
const official='http://nfce.sefaz.pe.gov.br/nfce/consulta?p='+('1'.repeat(44))+'|2|1|7|ABC';
test('somente QR Code de consulta oficial PE é aceito',()=>{
 assert.equal(H.officialURL(official).startsWith('https://nfce.sefaz.pe.gov.br/nfce/consulta?p='),true);
 for(const x of ['https://nfce.sefaz.pe.gov.br.evil.com/nfce/consulta?p='+('1'.repeat(44)),'javascript:alert(1)','https://google.com','http://nfce.sefaz.pe.gov.br/nfce/consulta?p=123','https://nfce.sefaz.pe.gov.br/other?p='+('1'.repeat(44))]){
  assert.equal(H.officialURL(x),null,x);
 }
});
test('aceita chave fiscal de 44 dígitos, mas não inventa link',()=>{
 assert.equal(H.fromAccessKey('1'.repeat(44)),'1'.repeat(44));
 assert.equal(H.fromAccessKey('1'.repeat(43)),null);
});
const mock={merchant:'SUPERMERCADO CHAGAS',date:'2026-11-15',itemCount:3,totalCents:2500,items:[
 {number:1,barcode:'7891111111111',name:'Arroz',quantity:2,unit:'un',grossCents:1000,discountCents:20,netCents:980},
 {number:2,barcode:'7892222222222',name:'Leite',quantity:1,unit:'l',grossCents:1000,discountCents:0,netCents:1000},
 {number:3,barcode:'7893333333333',name:'Café',quantity:1,unit:'un',grossCents:520,discountCents:0,netCents:520}
]};
test('monta compra conciliada sem salvar e com descontos líquidos',()=>{
 const r=H.validateReceipt(mock);
 assert.equal(r.items.length,3);assert.equal(r.sum,2500);assert.equal(r.balanced,true);
 assert.equal(r.items[0].qty,2);assert.equal(r.items[0].cents,980);
});
test('não inventa preço de produto ilegível',()=>{
 const m=structuredClone(mock);m.items[1].name='';m.items[1].netCents=0;
 const r=H.validateReceipt(m);
 assert.equal(r.items.length,2);assert.equal(r.balanced,false);
 assert.match(r.issues.join(' '),/não|diferente/i);
});
test('mesmo código com linhas diferentes é comprado duas vezes',()=>{
 const m=structuredClone(mock);m.items[1].barcode=m.items[0].barcode;
 assert.equal(H.validateReceipt(m).items.length,3);
});
test('mesmo número repetido é detectado e não soma duas vezes',()=>{
 const m=structuredClone(mock);m.items.push({...m.items[0]});
 const r=H.validateReceipt(m);assert.equal(r.items.length,3);
 assert.match(r.issues.join(' '),/repetido/);
 assert.equal(r.balanced,false);
});
test('divergência bruto menos desconto não é ignorada',()=>{
 const m=structuredClone(mock);m.items[0].discountCents=200;
 const r=H.validateReceipt(m);assert.match(r.issues.join(' '),/não coincidem/);
});
