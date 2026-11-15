/* Meu Fluxo 1.3 — contas, transferências e cartões. Nenhuma operação usa servidor.
   Todos os valores monetários são centavos inteiros. */
(function(root){
'use strict';
const max=999999999999;
const blank=()=>({accounts:[],cards:[],transfers:[],payments:[]});
const string=(s,len=100)=>typeof s==='string'&&s.trim().length>0&&s.length<=len;
const int=(n,negative=false)=>Number.isSafeInteger(n)&&(negative?Math.abs(n)<=max:n>=0&&n<=max);
const dateOk=(s)=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const [y,m,d]=s.split('-').map(Number);const t=new Date(y,m-1,d);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d};
const monthOk=(s)=>typeof s==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(s);
function addMonths(m,n){const [y,mo]=m.split('-').map(Number);const d=new Date(y,mo-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function billingMonth(date,closeDay){
 if(!dateOk(date))throw Error('Data inválida na compra.');
 return addMonths(date.slice(0,7),Number(date.slice(-2))>=closeDay?1:0);
}
function dueDate(month,closingDay,dueDay){
 if(!monthOk(month))throw Error('Mês da fatura inválido.');
 const dueMonth=dueDay>closingDay?month:addMonths(month,1);
 return dueMonth+'-'+String(dueDay).padStart(2,'0');
}
function normAccount(x){
 if(!x||!string(x.id,120)||!string(x.name,90)||!['bank','wallet','cash','savings'].includes(x.kind)||!int(x.openingCents,true))throw Error('Conta inválida no histórico financeiro.');
 return {id:x.id,name:x.name.trim(),kind:x.kind,openingCents:x.openingCents};
}
function normCard(x){
 if(!x||!string(x.id,120)||!string(x.name,90)||!int(x.limitCents)||x.limitCents<=0||!Number.isInteger(x.closingDay)||!Number.isInteger(x.dueDay)||x.closingDay<1||x.closingDay>28||x.dueDay<1||x.dueDay>28)throw Error('Cartão inválido. Use dias de 1 a 28.');
 return {id:x.id,name:x.name.trim(),limitCents:x.limitCents,closingDay:x.closingDay,dueDay:x.dueDay};
}
function normTransfer(x){
 if(!x||!string(x.id,120)||!string(x.fromId,120)||!string(x.toId,120)||x.fromId===x.toId||!int(x.cents)||x.cents<1||!dateOk(x.date))throw Error('Transferência inválida.');
 return {id:x.id,fromId:x.fromId,toId:x.toId,cents:x.cents,date:x.date,note:typeof x.note==='string'?x.note.slice(0,160):''};
}
function normPayment(x){
 if(!x||!string(x.id,120)||!string(x.accountId,120)||!string(x.cardId,120)||!monthOk(x.invoiceMonth)||!int(x.cents)||x.cents<1||!dateOk(x.date))throw Error('Pagamento de fatura inválido.');
 return {id:x.id,accountId:x.accountId,cardId:x.cardId,invoiceMonth:x.invoiceMonth,cents:x.cents,date:x.date};
}
function normalize(input){
 if(input===undefined||input===null)return blank();
 if(typeof input!=='object'||Array.isArray(input))throw Error('Dados de contas e cartões inválidos.');
 const out={};const schema={accounts:normAccount,cards:normCard,transfers:normTransfer,payments:normPayment};
 for(const [key,parse] of Object.entries(schema)){
  const values=input[key]===undefined?[]:input[key];
  if(!Array.isArray(values)||values.length>10000)throw Error('Lista financeira inválida: '+key);
  const ids=new Set();out[key]=values.map(x=>{const y=parse(x);if(ids.has(y.id))throw Error('Identificador financeiro repetido: '+key);ids.add(y.id);return y});
 }
 const accountIds=new Set(out.accounts.map(x=>x.id)), cardIds=new Set(out.cards.map(x=>x.id));
 if(out.transfers.some(t=>!accountIds.has(t.fromId)||!accountIds.has(t.toId)))throw Error('Transferência com conta inexistente.');
 if(out.payments.some(p=>!accountIds.has(p.accountId)||!cardIds.has(p.cardId)))throw Error('Pagamento vinculado a conta ou cartão inexistente.');
 return out;
}
function accountBalance(account,transactions,finance,asOf='9999-12-31'){
 let cents=account.openingCents;
 for(const tx of transactions)if(!tx.deletedAt&&tx.accountId===account.id&&!tx.cardId&&tx.date<=asOf)cents+=tx.type==='income'?tx.cents:-tx.cents;
 for(const transfer of finance.transfers)if(transfer.date<=asOf){
  if(transfer.fromId===account.id)cents-=transfer.cents;
  if(transfer.toId===account.id)cents+=transfer.cents;
 }
 for(const payment of finance.payments)if(payment.date<=asOf&&payment.accountId===account.id)cents-=payment.cents;
 return cents;
}
function invoice(card,transactions,finance,month){
 if(!monthOk(month))throw Error('Mês inválido.');
 const charges=transactions.filter(e=>!e.deletedAt&&e.type==='expense'&&e.cardId===card.id&&billingMonth(e.date,card.closingDay)===month);
 const paid=finance.payments.filter(p=>p.cardId===card.id&&p.invoiceMonth===month);
 const total=charges.reduce((n,e)=>n+e.cents,0),payments=paid.reduce((n,p)=>n+p.cents,0);
 return {month,charges,paid,total,payments,remaining:total-payments,dueDate:dueDate(month,card.closingDay,card.dueDay)};
}
function cardLiability(card,transactions,finance){
 return transactions.filter(e=>!e.deletedAt&&e.type==='expense'&&e.cardId===card.id).reduce((n,e)=>n+e.cents,0)-
 finance.payments.filter(p=>p.cardId===card.id).reduce((n,p)=>n+p.cents,0);
}
function checkTransfer(input,finance){
 const t=normTransfer(input),a=new Set(finance.accounts.map(x=>x.id));
 if(!a.has(t.fromId)||!a.has(t.toId))throw Error('Selecione contas válidas para transferir.');
 return t;
}
function checkPayment(input,finance,transactions){
 const p=normPayment(input);
 const now=new Date();const current=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 if(p.date>current)throw Error('Agendamento de pagamento futuro ainda não está disponível. Selecione uma data até hoje.');
 if(!finance.accounts.some(x=>x.id===p.accountId))throw Error('Conta pagadora não existe.');
 const card=finance.cards.find(x=>x.id===p.cardId);
 if(!card)throw Error('Cartão não cadastrado.');
 const remaining=invoice(card,transactions,finance,p.invoiceMonth).remaining;
 if(p.cents>remaining)throw Error('Pagamento excede o saldo restante da fatura.');
 return p;
}
function merge(local,remote,priority){
 const current=normalize(local),incoming=normalize(remote);
 const result=blank(),conflicts=[];
 for(const key of Object.keys(result)){
  const map=new Map(current[key].map(x=>[x.id,x]));
  for(const entry of incoming[key]){
   if(!map.has(entry.id))map.set(entry.id,entry);
   else if(JSON.stringify(map.get(entry.id))!==JSON.stringify(entry)){
    conflicts.push({kind:key,id:entry.id,local:map.get(entry.id),backup:entry});
    if(priority==='backup')map.set(entry.id,entry);
   }
  }
  result[key]=[...map.values()];
 }
 return {finance:normalize(result),conflicts};
}
const api={blank,normalize,billingMonth,dueDate,accountBalance,invoice,cardLiability,checkTransfer,checkPayment,merge,dateOk,monthOk,addMonths};
root.MeuFluxoFinance=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
