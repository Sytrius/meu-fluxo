const test=require('node:test');
const assert=require('node:assert/strict');
const parser=require('../chat-parser.js');
const TODAY='2026-11-15';
const parse=(text)=>parser.parse(text,{today:TODAY});
test('frase da captura: quatro despesas, preco por kg nao e quinto gasto',()=>{
 const p=parse('gastei 30 reais no mercado hoje, 15 reais no café, 10 com queijo coalio e 5 com pão, o quilo do queijo qualio é 23 reais');
 assert.deepEqual(p.entries.map(e=>e.cents),[3000,1500,1000,500]);
 assert.equal(p.entries.reduce((n,e)=>n+e.cents,0),6000);
 assert.equal(p.entries.length,4);
 assert.equal(p.notes.length,1);
 assert.match(p.notes[0],/23 reais/);
 assert(p.entries.every(e=>e.date===TODAY));
 assert.deepEqual(p.entries.map(e=>e.title),['Mercado','Café','Queijo coalio','Pão']);
});
test('segunda tentativa da captura: valor sem verbo vira compra reconhecida',()=>{
 const p=parse('15 reais no café.');assert.equal(p.entries[0].cents,1500);assert.equal(p.entries[0].title,'Café');
});
test('frase original simples continua funcionando',()=>{
 let p=parse('Gastei R$ 45,90 no supermercado ontem');
 assert.equal(p.entries[0].cents,4590);assert.equal(p.entries[0].date,'2026-11-14');assert.equal(p.entries[0].title,'Supermercado');
 p=parse('Recebi R$ 1.500 de salário hoje');
 assert.equal(p.entries[0].cents,150000);assert.equal(p.entries[0].type,'income');
});
test('soma sem descricoes nao e lancada silenciosamente',()=>{
 const p=parse('Gastei R$ 20 e R$ 30');assert.match(p.error,/mais de um valor/);
});
test('preco por unidade nao deve virar despesa',()=>{
 const p=parse('O quilo do queijo custa R$ 23');assert(!p.entries);assert.match(p.error,/preço por unidade/);
});
test('um lancamento e uma referencia de preco',()=>{
 const p=parse('gastei 10 reais com queijo coalho, o quilo do queijo é 23 reais');
 assert.equal(p.entries.length,1);assert.equal(p.entries[0].cents,1000);assert.equal(p.notes.length,1);
});
test('valor decimal ambíguo pede confirmacao',()=>{
 const p=parse('gastei 1,234 no mercado');assert.match(p.error,/ambíguo/);
});
test('formato de data brasileira e validacao',()=>{
 const p=parse('gastei 20 reais com pão 12/11/2026');
 assert.equal(p.entries[0].date,'2026-11-12');
 assert.match(parse('gastei 20 reais com pão 31/02/2026').error,/inválida/);
});
test('quantidades nao confundidas com valores pagos',()=>{
 const p=parse('comprei 2 kg de arroz por R$ 16, e 3 leites por R$ 6');
 assert.deepEqual(p.entries.map(e=>e.cents),[1600,600]);
 assert.match(p.entries[0].title,/2 kg/);
});
test('sem inventar valor a partir de quantidade',()=>{
 assert(parse('comprei 2 kg de arroz').error);
});
test('sem texto nao cria entrada',()=>{
 assert(parse('').error);
});
