
(function(root){
'use strict';
const F=()=>root.MeuFluxoFinance;
const finance=()=>F().normalize(state.settings.finance);
const money=n=>fmt(n);
function accountOptions(f,chosen=''){return f.accounts.map(a=>`<option value="${esc(a.id)}" ${chosen===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}
function sourceOptions(accountId='',cardId='',type='expense'){
 const f=finance();
 return `<option value="">Sem conta vinculada</option>${f.accounts.length?`<optgroup label="Contas">${f.accounts.map(a=>`<option value="a:${esc(a.id)}" ${a.id===accountId?'selected':''}>${esc(a.name)}</option>`).join('')}</optgroup>`:''}${type==='expense'&&f.cards.length?`<optgroup label="Cartões de crédito">${f.cards.map(c=>`<option value="c:${esc(c.id)}" ${c.id===cardId?'selected':''}>${esc(c.name)}</option>`).join('')}</optgroup>`:''}`;
}
function sourceField(e){return `<div class="field span-2"><label for="entry-source">Conta ou cartão (opcional)</label><select id="entry-source" class="select">${sourceOptions(e.accountId,e.cardId,e.type)}</select><small>O pagamento de uma fatura não é somado novamente às despesas. Lançamentos antigos ficam sem conta.</small></div>`}
function sourceFromValue(value){const v=String(value||'');return {accountId:v.startsWith('a:')?v.slice(2):null,cardId:v.startsWith('c:')?v.slice(2):null}}
function validLink(e){
 const f=finance();
 if(e.accountId&&e.cardId)throw Error('Escolha somente uma conta ou cartão.');
 if(e.accountId&&!f.accounts.some(x=>x.id===e.accountId))throw Error('A conta selecionada não existe.');
 if(e.cardId&&(!f.cards.some(x=>x.id===e.cardId)||e.type!=='expense'))throw Error('Cartão só pode ser vinculado a despesa.');if(e.accountId&&e.method==='Crédito')throw Error('Para uma compra no crédito, selecione o cartão cadastrado, não uma conta bancária.');
 return true;
}
function pendingSource(e,i){return `<label class="pending-source-label" for="pending-source-${i}">Conta ou cartão</label><select class="subtle-select pending-source" id="pending-source-${i}" data-fin-pending-index="${i}">${sourceOptions(e.accountId,e.cardId,e.type)}</select>`}
function changePendingSource(input){
 if(!state.pending)return;const i=Number(input.dataset.finPendingIndex),list=state.pending.kind==='batch'?state.pending.entries:[state.pending],e=list[i];if(!e)return;
 const source=sourceFromValue(input.value);Object.assign(e,source);if(e.cardId)e.method='Crédito';else if(e.method==='Crédito')e.method=state.settings.defaultMethod==='Crédito'?'Pix':state.settings.defaultMethod||'Pix';validLink(e);
}
function summary(){
 const f=finance();if(!f.accounts.length)return '';
 const total=f.accounts.reduce((sum,a)=>sum+F().accountBalance(a,state.entries,f,today()),0);
 return `<div class="card panel fin-summary-banner"><div><strong>Saldo nas contas cadastradas</strong><p class="panel-sub">Somente movimentações vinculadas; valores sem conta não alteram estes saldos.</p></div><strong class="fin-money">${formatSigned(total)}</strong><button class="btn btn-outline btn-sm" data-nav="accounts">Ver contas</button></div>`;
}
function accountsPage(){
 const f=finance(),balance=f.accounts.reduce((sum,a)=>sum+F().accountBalance(a,state.entries,f,today()),0);
 const unlinked=state.entries.filter(e=>!e.accountId&&!e.cardId).length;
 const entries=f.accounts.map(a=>{
  const val=F().accountBalance(a,state.entries,f,today());
  const type={bank:'Banco',wallet:'Carteira digital',cash:'Dinheiro',savings:'Poupança'}[a.kind];
  return `<div class="card panel fin-account"><div class="fin-heading"><div><span class="eyebrow">${type}</span><h2 class="panel-title">${esc(a.name)}</h2></div><button type="button" class="icon-btn" data-action="fin-edit-account" data-id="${esc(a.id)}" aria-label="Editar ${esc(a.name)}">${ico('edit')}</button></div><strong class="fin-money">${formatSigned(val)}</strong><p class="panel-sub">Saldo inicial: ${formatSigned(a.openingCents)}</p></div>`;
 }).join('');
 const history=[...f.transfers].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30).map(t=>{
  const from=f.accounts.find(x=>x.id===t.fromId),to=f.accounts.find(x=>x.id===t.toId);
  return `<div class="fin-line"><div><strong>${esc(from?.name||'?')} → ${esc(to?.name||'?')}</strong><small>${formatDate(t.date)}${t.note?' · '+esc(t.note):''}</small></div><strong>${money(t.cents)}</strong></div>`;
 }).join('');
 return `<div class="page-head"><div><p class="eyebrow">SEU DINHEIRO</p><h1 class="page-title">Contas e transferências</h1><p class="page-sub">Registre seus saldos manualmente, sem conectar a bancos.</p></div><div class="head-buttons"><button class="btn btn-outline" data-action="fin-transfer" ${f.accounts.length<2?'disabled':''}>Transferir</button><button class="btn btn-primary" data-action="fin-add-account">${ico('plus')} Nova conta</button></div></div><section class="card panel fin-total"><div><span class="panel-sub">Saldo em contas</span><div class="fin-money">${formatSigned(balance)}</div></div><div class="note">${unlinked} lançamento(s) sem vínculo não foram incluídos no cálculo.</div></section>${f.accounts.length?`<div class="fin-grid">${entries}</div>`:`<section class="card panel"><h2 class="panel-title">Nenhuma conta cadastrada</h2><p class="panel-sub">Adicione Nubank, 99Pay ou dinheiro em espécie para começar.</p><button class="btn btn-primary" data-action="fin-add-account">Cadastrar</button></section>`}<section class="card panel" style="margin-top:20px"><h2 class="panel-title">Transferências</h2>${history||'<p class="panel-sub">Nenhuma transferência registrada.</p>'}<p class="help">Transferir dinheiro entre suas próprias contas não cria uma receita ou despesa.</p></section>`;
}
function months(card,f){
 const found=new Set([monthNow()]);
 for(const e of state.entries)if(e.cardId===card.id&&e.type==='expense')found.add(F().billingMonth(e.date,card.closingDay));
 for(const p of f.payments)if(p.cardId===card.id)found.add(p.invoiceMonth);
 return [...found].sort().reverse().slice(0,18);
}
function cardsPage(){
 const f=finance(),old=state.entries.filter(e=>!e.cardId&&/crédito|credito/i.test(e.method||'')).length;
 const cards=f.cards.map(c=>{
  const liability=F().cardLiability(c,state.entries,f);
  const invoices=months(c,f).map(m=>{
   const inv=F().invoice(c,state.entries,f,m);
   if(!inv.total&&!inv.payments)return '';
   return `<div class="fin-line"><div><strong>${esc(niceMonth(m))}</strong><small>Vencimento ${formatDate(inv.dueDate)} · Compras ${money(inv.total)} · Pago ${money(inv.payments)}</small></div><div class="fin-inline"><strong>${money(inv.remaining)}</strong><button class="btn btn-outline btn-sm" data-action="fin-pay" data-id="${esc(c.id)}" data-month="${m}" ${inv.remaining<=0||!f.accounts.length?'disabled':''}>Pagar</button></div></div>`;
  }).filter(Boolean).join('');
  return `<section class="card panel fin-card"><div class="fin-heading"><div><p class="eyebrow">CRÉDITO</p><h2 class="panel-title">${esc(c.name)}</h2></div><button class="icon-btn" data-action="fin-edit-card" data-id="${esc(c.id)}" aria-label="Editar ${esc(c.name)}">${ico('edit')}</button></div><div class="fin-grid"><div><p class="panel-sub">Valor comprometido</p><strong class="fin-money">${money(liability)}</strong></div><div><p class="panel-sub">Limite disponível estimado</p><strong class="fin-money">${formatSigned(c.limitCents-liability)}</strong></div></div><p class="help">Limite ${money(c.limitCents)} · Fecha dia ${c.closingDay} · Vence dia ${c.dueDay}. Parcelas futuras já comprometem o limite.</p><h3 class="fin-subheading">Faturas</h3>${invoices||'<p class="panel-sub">Ainda não há compras vinculadas.</p>'}</section>`;
 }).join('');
 return `<div class="page-head"><div><p class="eyebrow">CONTROLE DE CRÉDITO</p><h1 class="page-title">Cartões e faturas</h1><p class="page-sub">Uma compra é despesa; o pagamento da fatura reduz o saldo da conta, sem duplicar gastos.</p></div><button class="btn btn-primary" data-action="fin-add-card">${ico('plus')} Novo cartão</button></div>${old?`<div class="note" style="margin-bottom:16px">${old} lançamento(s) antigos com método crédito ainda não têm cartão associado. Edite-os para incluí-los nas faturas.</div>`:''}${f.cards.length?cards:'<section class="card panel"><h2 class="panel-title">Nenhum cartão cadastrado</h2><p class="panel-sub">Cadastre um cartão e vincule as novas despesas a ele.</p><button class="btn btn-primary" data-action="fin-add-card">Cadastrar cartão</button></section>'}`;
}
function accountModal(item=null){
 const types=[['bank','Conta bancária'],['wallet','Carteira digital'],['cash','Dinheiro em espécie'],['savings','Poupança']];
 openOverlay(`<div class="modal-head"><h2>${item?'Editar':'Nova'} conta</h2><button class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><form id="fin-account-form" data-id="${esc(item?.id||'')}"><div class="form-grid"><div class="field span-2"><label for="fin-name">Nome</label><input id="fin-name" class="input" maxlength="90" required placeholder="Ex.: Nubank" value="${esc(item?.name||'')}"></div><div class="field"><label for="fin-kind">Tipo</label><select id="fin-kind" class="select">${types.map(([k,v])=>`<option value="${k}" ${k===item?.kind?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label for="fin-opening">Saldo inicial (R$)</label><input id="fin-opening" class="input" inputmode="decimal" value="${item?(item.openingCents/100).toFixed(2).replace('.',','):'0,00'}"></div></div><p class="help">Saldo inicial é seu ponto de partida. Lançamentos vinculados serão somados a esse valor.</p><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close">Cancelar</button><button class="btn btn-primary" type="submit">Salvar conta</button></div></form>`);
}
function cardModal(item=null){
 openOverlay(`<div class="modal-head"><h2>${item?'Editar':'Novo'} cartão</h2><button class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><form id="fin-card-form" data-id="${esc(item?.id||'')}"><div class="form-grid"><div class="field span-2"><label for="fin-card-name">Nome do cartão</label><input id="fin-card-name" class="input" required maxlength="90" value="${esc(item?.name||'')}" placeholder="Ex.: Cartão Nubank"></div><div class="field"><label for="fin-limit">Limite (R$)</label><input id="fin-limit" class="input" inputmode="decimal" required value="${item?(item.limitCents/100).toFixed(2).replace('.',','):''}"></div><div class="field"><label for="fin-close">Dia do fechamento</label><input id="fin-close" class="input" type="number" min="1" max="28" required value="${item?.closingDay||25}"></div><div class="field"><label for="fin-due">Dia do vencimento</label><input id="fin-due" class="input" type="number" min="1" max="28" required value="${item?.dueDay||10}"></div></div><p class="help">Dias de 1 a 28. Por segurança, não altere fechamento/vencimento depois de usar o cartão: isso mudaria faturas antigas.</p><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close">Cancelar</button><button class="btn btn-primary" type="submit">Salvar cartão</button></div></form>`);
}
function transferModal(){
 const f=finance();if(f.accounts.length<2)throw Error('Cadastre duas contas para transferir.');
 openOverlay(`<div class="modal-head"><h2>Transferência</h2><button class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><form id="fin-transfer-form"><div class="form-grid"><div class="field"><label for="fin-from">De</label><select class="select" id="fin-from">${accountOptions(f)}</select></div><div class="field"><label for="fin-to">Para</label><select class="select" id="fin-to">${accountOptions(f,f.accounts[1].id)}</select></div><div class="field"><label for="fin-transfer-amount">Valor (R$)</label><input class="input" id="fin-transfer-amount" inputmode="decimal" required></div><div class="field"><label for="fin-transfer-date">Data</label><input class="input" id="fin-transfer-date" type="date" value="${today()}" required></div><div class="field span-2"><label for="fin-transfer-note">Observação (opcional)</label><input class="input" id="fin-transfer-note" maxlength="160"></div></div><p class="help">O valor sai de uma conta e entra em outra, sem alterar a renda ou as despesas totais.</p><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close">Cancelar</button><button class="btn btn-primary" type="submit">Transferir</button></div></form>`);
}
function paymentModal(cardId,month){
 const f=finance(),card=f.cards.find(c=>c.id===cardId);if(!card)throw Error('Cartão inexistente.');
 const inv=F().invoice(card,state.entries,f,month);
 if(!f.accounts.length)throw Error('Cadastre uma conta pagadora primeiro.');
 if(inv.remaining<=0)throw Error('Essa fatura já está paga.');
 openOverlay(`<div class="modal-head"><h2>Pagar fatura</h2><button class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><form id="fin-payment-form" data-card="${esc(cardId)}" data-month="${month}"><p class="page-sub">${esc(card.name)} · ${esc(niceMonth(month))}</p><div class="note">Compras: ${money(inv.total)} · Pago: ${money(inv.payments)} · <strong>Restante: ${money(inv.remaining)}</strong><br>Este pagamento não será registrado como nova despesa.</div><div class="form-grid" style="margin-top:16px"><div class="field"><label for="fin-payment-account">Conta pagadora</label><select class="select" id="fin-payment-account">${accountOptions(f)}</select></div><div class="field"><label for="fin-payment-amount">Valor a pagar (R$)</label><input class="input" id="fin-payment-amount" inputmode="decimal" required value="${(inv.remaining/100).toFixed(2).replace('.',',')}"></div><div class="field"><label for="fin-payment-date">Data</label><input class="input" type="date" id="fin-payment-date" value="${today()}" required></div></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close">Cancelar</button><button class="btn btn-primary" type="submit">Confirmar pagamento</button></div></form>`);
}
function signedMoney(raw){
 let text=String(raw||'').trim(),negative=text.startsWith('-');if(negative)text=text.slice(1);
 if(/^(0|0[,.]0{1,2})$/.test(text))return 0;
 const cents=parseCents(text);if(!cents)throw Error('Valor inválido.');
 return negative?-cents:cents;
}
let saving=false;
async function submit(form){
 if(saving)return;saving=true;
 try{
  const f=finance();
  if(form.id==='fin-account-form'){
   const old=f.accounts.find(a=>a.id===form.dataset.id);
   const record={id:old?.id||uuid(),name:$('#fin-name').value.trim(),kind:$('#fin-kind').value,openingCents:signedMoney($('#fin-opening').value)};
   f.accounts=old?f.accounts.map(a=>a.id===old.id?record:a):[...f.accounts,record];
  }else if(form.id==='fin-card-form'){
   const old=f.cards.find(c=>c.id===form.dataset.id);
   const record={id:old?.id||uuid(),name:$('#fin-card-name').value.trim(),limitCents:parseCents($('#fin-limit').value),closingDay:Number($('#fin-close').value),dueDay:Number($('#fin-due').value)};
   if(old&&(old.closingDay!==record.closingDay||old.dueDay!==record.dueDay)&&(state.entries.some(e=>e.cardId===old.id)||f.payments.some(p=>p.cardId===old.id)))throw Error('Não altere o fechamento/vencimento de cartão com lançamentos: isso mudaria faturas passadas.');
   f.cards=old?f.cards.map(c=>c.id===old.id?record:c):[...f.cards,record];
  }else if(form.id==='fin-transfer-form'){
   const record=F().checkTransfer({id:uuid(),fromId:$('#fin-from').value,toId:$('#fin-to').value,cents:parseCents($('#fin-transfer-amount').value),date:$('#fin-transfer-date').value,note:$('#fin-transfer-note').value.trim()},f);
   f.transfers.push(record);
  }else if(form.id==='fin-payment-form'){
   const record=F().checkPayment({id:uuid(),cardId:form.dataset.card,invoiceMonth:form.dataset.month,accountId:$('#fin-payment-account').value,cents:parseCents($('#fin-payment-amount').value),date:$('#fin-payment-date').value},f,state.entries);
   f.payments.push(record);
  }else return false;
  const next=F().normalize(f),oldValue=state.settings.finance;state.settings.finance=next;
  try{await saveSettings()}catch(error){state.settings.finance=oldValue;throw error}
  closeOverlay();render();uiToast('Informação financeira salva localmente.');return true;
 }finally{saving=false}
}
async function action(btn){
 const f=finance(),kind=btn.dataset.action;
 if(kind==='fin-add-account'){accountModal();return true}
 if(kind==='fin-edit-account'){const x=f.accounts.find(a=>a.id===btn.dataset.id);if(!x)throw Error('Conta não encontrada.');accountModal(x);return true}
 if(kind==='fin-add-card'){cardModal();return true}
 if(kind==='fin-edit-card'){const x=f.cards.find(c=>c.id===btn.dataset.id);if(!x)throw Error('Cartão não encontrado.');cardModal(x);return true}
 if(kind==='fin-transfer'){transferModal();return true}
 if(kind==='fin-pay'){paymentModal(btn.dataset.id,btn.dataset.month);return true}
 return false;
}
root.MeuFluxoFinanceUI={accountsPage,cardsPage,sourceField,sourceOptions,sourceFromValue,pendingSource,changePendingSource,validLink,summary,action,submit,finance};
})(typeof globalThis!=='undefined'?globalThis:this);
