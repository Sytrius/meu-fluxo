const test=require('node:test');
const assert=require('node:assert/strict');
const F=require('../finance-v13.js');
const A={id:'nubank',name:'Nubank',kind:'bank',openingCents:100000};
const B={id:'pay',name:'99Pay',kind:'wallet',openingCents:20000};
const C={id:'card',name:'Cartão',limitCents:300000,closingDay:25,dueDay:10};
const day='2026-11-15';
const E=(id,cents,type='expense',fields={})=>({id,cents,type,date:day,deletedAt:null,...fields});
function fixture(){
 return F.normalize({accounts:[A,B],cards:[C],transfers:[],payments:[]});
}
test('normaliza estado vazio e rejeita dados inválidos',()=>{
 assert.deepEqual(F.normalize(),F.blank());
 assert.throws(()=>F.normalize({accounts:[A,A]}),/repetido/);
 assert.throws(()=>F.normalize({accounts:[{...A,openingCents:NaN}]}),/inválida/);
 assert.throws(()=>F.normalize({cards:[{...C,closingDay:31}]}),/dias/);
 assert.throws(()=>F.normalize({transfers:[{id:'x',fromId:'nubank',toId:'pay',cents:5,date:day}]}),/inexistente/);
});
test('salda contas sem contabilizar compras no cartão nem taxas futuras',()=>{
 const f=fixture();
 const tx=[E('despesa',12000,'expense',{accountId:'nubank'}),
 E('receita',30000,'income',{accountId:'nubank'}),
 E('cartao',45000,'expense',{cardId:'card'}),
 E('semConta',9000)];
 const t=F.checkTransfer({id:'t',fromId:'nubank',toId:'pay',cents:10000,date:day},f);
 f.transfers.push(t);
 assert.equal(F.accountBalance(A,tx,f),108000);
 assert.equal(F.accountBalance(B,tx,f),30000);
 assert.equal(F.cardLiability(C,tx,f),45000);
 assert.equal(F.accountBalance(A,tx,f,'2026-11-14'),100000);
});
test('pagamento reduz conta e cartão, mas não vira nova despesa',()=>{
 const f=fixture();
 const tx=[E('card',45000,'expense',{cardId:'card'})];
 const statement=F.invoice(C,tx,f,'2026-11');
 assert.equal(statement.total,45000);
 assert.equal(statement.remaining,45000);
 assert.equal(statement.dueDate,'2026-12-10');
 const p=F.checkPayment({id:'p',cardId:'card',accountId:'nubank',invoiceMonth:'2026-11',cents:20000,date:day},f,tx);
 f.payments.push(p);
 assert.equal(F.accountBalance(A,tx,f),80000);
 assert.equal(F.invoice(C,tx,f,'2026-11').remaining,25000);
 assert.equal(F.cardLiability(C,tx,f),25000);
 assert.throws(()=>F.checkPayment({...p,id:'p2',cents:26000},f,tx),/excede/);
});
test('compras após fechamento vão à fatura seguinte e juros não são inventados',()=>{
 assert.equal(F.billingMonth('2026-11-24',25),'2026-11');
 assert.equal(F.billingMonth('2026-11-25',25),'2026-12');
 assert.equal(F.dueDate('2026-12',25,10),'2027-01-10');
 assert.equal(F.dueDate('2026-12',5,10),'2026-12-10');
});
test('parcelamento previsto é contado na fatura do mês de cada parcela, e limite total reservado',()=>{
 const f=fixture();
 const tx=[E('p1',3000,'expense',{cardId:'card',date:'2026-11-20'}),E('p2',3000,'expense',{cardId:'card',date:'2026-12-20'}),E('p3',3000,'expense',{cardId:'card',date:'2027-01-20'})];
 assert.equal(F.invoice(C,tx,f,'2026-11').total,3000);
 assert.equal(F.invoice(C,tx,f,'2026-12').total,3000);
 assert.equal(F.invoice(C,tx,f,'2027-01').total,3000);
 assert.equal(F.cardLiability(C,tx,f),9000);
});
test('mesclagem preserva contas existentes e reporta divergências',()=>{
 const base=fixture(),incoming=fixture();
 incoming.accounts[0].openingCents=120000;
 incoming.accounts.push({id:'cash',name:'Dinheiro',kind:'cash',openingCents:1000});
 assert.equal(F.merge(base,incoming,'local').finance.accounts[0].openingCents,100000);
 assert.equal(F.merge(base,incoming,'backup').finance.accounts[0].openingCents,120000);
 assert.equal(F.merge(base,incoming,'backup').finance.accounts.length,3);
 assert.equal(F.merge(base,incoming,'local').conflicts.length,1);
});
