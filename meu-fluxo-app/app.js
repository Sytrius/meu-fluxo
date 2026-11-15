'use strict';
/* Meu Fluxo — PWA independente, sem CDN e sem telemetria. */
const VERSION='1.2.0';
const CATEGORIES = [
 {name:'Alimentação',emoji:'🥑',color:'#18a889',keywords:['mercado','supermercado','arroz','feijao','feijão','comida','almoço','almoco','jantar','lanche','cafe','café','queijo','coalho','coalio','pão','pao','padaria','restaurante','pizza','leite','fruta','verdura']},
 {name:'Moradia',emoji:'🏡',color:'#7c8cba',keywords:['aluguel','condominio','condomínio','energia','luz','água','agua','casa','gás','gas','internet','conta de luz']},
 {name:'Transporte',emoji:'🚘',color:'#e1a35b',keywords:['uber','99','gasolina','combustivel','combustível','onibus','ônibus','transporte','passagem','moto','carro','estacionamento']},
 {name:'Saúde',emoji:'💊',color:'#d1749c',keywords:['farmacia','farmácia','medicamento','remedio','remédio','consulta','dentista','exame','saúde']},
 {name:'Educação',emoji:'📚',color:'#6d91c5',keywords:['curso','livro','escola','faculdade','aula','educação']},
 {name:'Lazer',emoji:'🎮',color:'#9b80c8',keywords:['jogo','cinema','show','lazer','assinatura','netflix','spotify','passeio','viagem']},
 {name:'Compras',emoji:'🛍️',color:'#de9582',keywords:['roupa','sapato','camisa','sandalia','sandália','celular','presente','eletrônico']},
 {name:'Serviços',emoji:'🧰',color:'#77aaad',keywords:['manutenção','manutencao','conserto','corte','salão','salao','serviço','servico']},
 {name:'Salário',emoji:'💼',color:'#399d86',keywords:['salário','salario','pagamento recebido','ordenado']},
 {name:'Outros',emoji:'✨',color:'#9a9fa5',keywords:[]}
];
const METHODS=['Pix','Dinheiro','Débito','Crédito','Transferência','Outro'];
const DEFAULT_SETTINGS={theme:'light',budgets:{},chat:[],name:'',defaultMethod:'Pix'};
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconPaths={
 home:'<rect x="3" y="10" width="18" height="11" rx="2"/><path d="m3 10 9-7 9 7"/>',
 receipt:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 message:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z"/>',
 chart:'<path d="M3 3v18h18M7 16l4-5 4 2 5-7"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.9 1.9-.06-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 .98V21h-3v-1.62a1.7 1.7 0 0 0-1-.98 1.7 1.7 0 0 0-1.88.34l-.06.06-1.9-1.9.06-.06A1.7 1.7 0 0 0 7.6 15a1.7 1.7 0 0 0-.98-1H5v-3h1.62a1.7 1.7 0 0 0 .98-1 1.7 1.7 0 0 0-.34-1.88L7.2 8.06l1.9-1.9.06.06A1.7 1.7 0 0 0 11 6.6a1.7 1.7 0 0 0 1-.98V4h3v1.62a1.7 1.7 0 0 0 1 .98 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.9 1.9-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 .98 1H22v3h-1.62a1.7 1.7 0 0 0-.98 1Z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
 upload:'<path d="M12 17V5m-4 4 4-4 4 4M4 17v3h16v-3"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 wallet:'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 10h18M16 15h2"/>',
 arrowUp:'<path d="m5 15 7-7 7 7M12 8v12"/>',
 arrowDown:'<path d="m5 9 7 7 7-7M12 4v12"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 close:'<path d="M5 5 19 19M19 5 5 19"/>',
 edit:'<path d="M12 20h9M4 17l-1 4 4-1L20 7l-3-3Z"/>',
 trash:'<path d="M4 7h16M10 4h4M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
 moon:'<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 sparkle:'<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3ZM20 19l1 2M3 20l2 1"/>',
 alert:'<path d="M12 3 2 21h20L12 3ZM12 9v5M12 18h.01"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 send:'<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
 mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
 photo:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 16-6-6L5 20"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',
 refresh:'<path d="M20 11a8 8 0 1 0-2.4 5.7M20 4v7h-7"/>',
 file:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10l-7-7ZM13 3v7h7"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
 cloudOff:'<path d="M2 2 22 22M8 6a7 7 0 0 1 12 7 5 5 0 0 1-1 9H7a5 5 0 0 1-1-10"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4"/>',
 bot:'<rect x="4" y="6" width="16" height="14" rx="4"/><path d="M12 2v4M8 12h.01M16 12h.01M9 16h6"/>',
 filter:'<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
 undo:'<path d="M9 14 4 9l5-5M4 9h9a7 7 0 1 1 0 14"/>'
};
function ico(key, size=18){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[key]||iconPaths.info}</svg>`}
const fmt=(c)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(c)||0)/100);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const monthNow=()=>today().slice(0,7);
const formatDate=(s)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return '—';const [y,m,d]=s.split('-');return `${d}/${m}/${y}`};
function niceMonth(m){const [y,mo]=m.split('-').map(Number);if(!y||!mo)return '';return new Date(y,mo-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
function moveMonth(m,diff){const [y,mo]=m.split('-').map(Number);const dt=new Date(y,mo-1+diff,1);return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`}
const normalize=(s)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const uuid=()=>globalThis.crypto?.randomUUID?.()||('id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
function parseCents(raw){let s=String(raw??'').trim().replace(/\s|R\$/gi,'');if(!s||s.startsWith('-'))return null;if(!/^\d[\d.,]*$/.test(s))return null;
 let integer='',fraction='';
 if(s.includes(',')&&s.includes('.')){if(s.lastIndexOf(',')<s.lastIndexOf('.'))return null;const a=s.split(',');if(a.length!==2||!/^(\d{1,3})(\.\d{3})*$|^\d+$/.test(a[0])||!/^\d{1,2}$/.test(a[1]))return null;integer=a[0].replaceAll('.','');fraction=a[1]}
 else if(s.includes(',')){const a=s.split(',');if(a.length!==2||!/^\d+$/.test(a[0])||!/^\d{1,2}$/.test(a[1]))return null;integer=a[0];fraction=a[1]}
 else if(s.includes('.')){if(/^\d{1,3}(\.\d{3})+$/.test(s)){integer=s.replaceAll('.','')}else{const a=s.split('.');if(a.length!==2||!/^\d+$/.test(a[0])||!/^\d{1,2}$/.test(a[1]))return null;integer=a[0];fraction=a[1]}}
 else integer=s;
 const cents=Number(integer)*100+Number((fraction+'00').slice(0,2));return Number.isSafeInteger(cents)&&cents>0&&cents<=999999999999?cents:null;
}
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const [y,m,d]=s.split('-').map(Number);const v=new Date(y,m-1,d);return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d}
function monthAddDate(date,delta){const [y,m,d]=date.split('-').map(Number);const first=new Date(y,m-1+delta,1);const max=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();return `${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-${String(Math.min(d,max)).padStart(2,'0')}`}
const sum=(list)=>list.reduce((a,e)=>a+(e.cents||0),0);
const catInfo=(name)=>CATEGORIES.find(c=>c.name===name)||CATEGORIES[CATEGORIES.length-1];
const classify=(name,type='expense')=>{if(type==='income')return normalize(name).includes('salario')?'Salário':'Outros';const s=normalize(name);return CATEGORIES.find(c=>c.name!=='Salário'&&c.keywords.some(k=>{const v=normalize(k);return v.length<=3?new RegExp('(?:^|\\W)'+v+'(?:$|\\W)').test(s):s.includes(v)}))?.name||'Outros'};
function uiToast(msg,kind='info'){const zone=$('#toast-zone');if(!zone)return;const t=document.createElement('div');t.className='toast';t.textContent=msg;t.style.borderLeft='4px solid '+(kind==='error'?'#f77880':'#31c99f');zone.append(t);setTimeout(()=>t.remove(),4800)}
let db=null,localFallback=false;
const PROFILE_KEY='meu-fluxo-active-profile';
const ACTIVE_LOCAL={id:'local',name:'Meu perfil local',kind:'local'};
let activeProfile=ACTIVE_LOCAL;
let firebaseClient=null;
function saveSelectedProfile(profile){
 try{
  if(profile.kind==='google')localStorage.setItem(PROFILE_KEY,JSON.stringify({kind:'google',id:profile.id,name:profile.name||'Google',email:profile.email||''}));
  else localStorage.removeItem(PROFILE_KEY);
 }catch(err){console.warn('Não foi possível guardar o perfil selecionado',err)}
}
function loadSelectedProfile(){
 try{
  const record=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
  if(record?.kind==='google'&&typeof record.id==='string'&&record.id.length>2&&record.id.length<200&&typeof record.name==='string'&&typeof record.email==='string')return {kind:'google',id:record.id,name:record.name.slice(0,120),email:record.email.slice(0,200)};
 }catch(err){console.warn('Perfil salvo indisponível',err)}
 return ACTIVE_LOCAL;
}
const profileDbName=()=>activeProfile.kind==='google'?'meu-fluxo-google-'+activeProfile.id:'meu-fluxo-v1';
const profileFallbackKey=()=>activeProfile.kind==='google'?'meu-fluxo-fallback-google-'+activeProfile.id:'meu-fluxo-fallback';
function profileCaption(){return activeProfile.kind==='google'?(activeProfile.name||activeProfile.email||'Google'):'Perfil local'}
function profileBadge(){return esc(profileCaption().slice(0,2).toUpperCase())}
function profileMenuHTML(){
 const signed=activeProfile.kind==='google';
 return `<div class="profile-control"><button type="button" class="avatar profile-trigger" data-action="profile-menu" aria-haspopup="menu" aria-expanded="false" aria-controls="profile-popover" aria-label="Abrir menu da conta" title="Conta e perfil">${profileBadge()}</button><div id="profile-popover" class="profile-popover" role="menu" hidden><div class="profile-popover-header"><strong>${esc(profileCaption())}</strong><span>${signed?esc(activeProfile.email||'Conta Google conectada'):'Histórico local deste aparelho'}</span></div><div class="profile-popover-actions">${signed?'<button type="button" role="menuitem" data-action="google-logout">Sair da conta Google</button>':'<button type="button" role="menuitem" data-action="google-login">Entrar com Google</button>'}<button type="button" role="menuitem" data-nav="settings">Configurações</button></div></div></div>`;
}
function toggleProfileMenu(){const menu=$('#profile-popover'),trigger=$('.profile-trigger');if(!menu||!trigger)return;menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden))}
function closeProfileMenu(){const menu=$('#profile-popover'),trigger=$('.profile-trigger');if(menu)menu.hidden=true;if(trigger)trigger.setAttribute('aria-expanded','false')}
async function switchProfile(profile){
 if(db){db.close();db=null}localFallback=false;
 activeProfile=profile;state.entries=[];state.deletedEntries=[];state.settings={...DEFAULT_SETTINGS};state.pending=null;state.importBuffer=null;state.lastDeleted=null;
 await openDB();await reload();saveSelectedProfile(profile);state.page='dashboard';closeOverlay();render();
}

function reqP(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function openDB(){if(!('indexedDB' in globalThis)){localFallback=true;return}try{db=await new Promise((res,rej)=>{const r=indexedDB.open(profileDbName(),1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('transactions'))d.createObjectStore('transactions',{keyPath:'id'});if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings',{keyPath:'key'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('Banco bloqueado'))})}catch(e){console.warn('IndexedDB indisponível',e);localFallback=true}}
function fallbackRead(){try{return JSON.parse(localStorage.getItem(profileFallbackKey())||'{}')}catch{return {}}}
function fallbackWrite(data){localStorage.setItem(profileFallbackKey(),JSON.stringify(data))}
async function readData(){
 let records,settings;
 if(localFallback){
  const d=fallbackRead();records=Array.isArray(d.entries)?d.entries:[];
  settings={...DEFAULT_SETTINGS,...(d.settings||{})};
 }else{
  const tx=db.transaction(['transactions','settings'],'readonly');
  const [all,row]=await Promise.all([reqP(tx.objectStore('transactions').getAll()),reqP(tx.objectStore('settings').get('app'))]);
  records=all;settings={...DEFAULT_SETTINGS,...(row?.value||{})};
 }
 return {entries:records.filter(x=>!x.deletedAt),deletedEntries:records.filter(x=>!!x.deletedAt),settings};
}
async function saveTransaction(entry){if(localFallback){const d=fallbackRead();d.entries=Array.isArray(d.entries)?d.entries:[];const i=d.entries.findIndex(e=>e.id===entry.id);if(i>=0)d.entries[i]=entry;else d.entries.push(entry);fallbackWrite(d);return}await new Promise((res,rej)=>{const tx=db.transaction('transactions','readwrite');tx.objectStore('transactions').put(entry);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function saveTransactionsBatch(entries){if(localFallback){const d=fallbackRead();const map=new Map((d.entries||[]).map(e=>[e.id,e]));for(const e of entries)map.set(e.id,e);d.entries=[...map.values()];fallbackWrite(d);return}await new Promise((res,rej)=>{const tx=db.transaction('transactions','readwrite');const store=tx.objectStore('transactions');for(const e of entries)store.put(e);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function removeTransaction(id){
 const now=new Date().toISOString();
 if(localFallback){
  const d=fallbackRead();
  d.entries=(d.entries||[]).map(e=>e.id===id?{...e,deletedAt:now,updatedAt:now}:e);
  fallbackWrite(d);
  return;
 }
 await new Promise((resolve,reject)=>{
  const tx=db.transaction('transactions','readwrite'),store=tx.objectStore('transactions');
  const request=store.get(id);
  request.onsuccess=()=>{if(request.result)store.put({...request.result,deletedAt:now,updatedAt:now})};
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
}
async function saveSettings(){if(localFallback){const d=fallbackRead();d.settings=state.settings;fallbackWrite(d);return}await new Promise((res,rej)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put({key:'app',value:state.settings});tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function importBatch(entries,settings,mode){if(localFallback){const d=fallbackRead();const old=mode==='replace'?[]:(d.entries||[]);const map=new Map(old.map(e=>[e.id,e]));for(const e of entries)if(!map.has(e.id))map.set(e.id,e);d.entries=[...map.values()];if(mode==='replace')d.settings=settings;fallbackWrite(d);return}await new Promise((res,rej)=>{const tx=db.transaction(['transactions','settings'],'readwrite');const s=tx.objectStore('transactions');if(mode==='replace'){s.clear();tx.objectStore('settings').put({key:'app',value:settings})}for(const e of entries){if(mode==='replace')s.put(e);else s.add(e).onerror=(evt)=>{if(evt.target.error?.name==='ConstraintError'){evt.preventDefault();evt.stopPropagation()}}}tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
const state={entries:[],deletedEntries:[],settings:{...DEFAULT_SETTINGS},page:'dashboard',month:monthNow(),filter:{q:'',type:'all',category:'all'},pending:null,editId:null,editingReceipt:null,items:[],importBuffer:null,lastDeleted:null};
function ordered(entries=state.entries){return [...entries].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')))}
function monthEntries(m=state.month){return state.entries.filter(e=>e.date.startsWith(m))}
function stats(m=state.month){const entries=monthEntries(m);const income=sum(entries.filter(e=>e.type==='income'));const expense=sum(entries.filter(e=>e.type==='expense'));return {income,expense,balance:income-expense,entries}}
function formatSigned(n){return (n<0?'−':'')+fmt(Math.abs(n))}
function render(){document.documentElement.dataset.theme=state.settings.theme==='dark'?'dark':'light';const labels={dashboard:'Visão geral',transactions:'Transações',assistant:'Assistente',budgets:'Orçamentos',settings:'Configurações'};const items=[['dashboard','home','Visão geral'],['transactions','receipt','Transações'],['assistant','message','Assistente'],['budgets','chart','Orçamentos'],['settings','settings','Configurações']];
 $('#app').innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">${ico('chart',22)}</div><div>meu fluxo<small>FINANÇAS OFFLINE</small></div></div><div class="nav-section">SEU ESPAÇO</div><nav aria-label="Navegação principal">${items.map(([p,ic,label])=>`<button class="nav-link ${state.page===p?'active':''}" data-nav="${p}">${ico(ic)}${esc(label)}</button>`).join('')}</nav><div class="side-bottom"><div class="privacy-panel"><div class="lock">${ico('lock',21)}</div><strong>Seus dados. Seu controle.</strong><p>Seu histórico permanece neste aparelho. Exporte um arquivo para levar a outro dispositivo.</p></div><div class="side-caption">Meu Fluxo v${VERSION} · Sem nuvem</div></div></aside><main class="workspace"><header class="topbar"><div class="crumb">MEU FLUXO <span class="muted">/</span> <strong>${labels[state.page]}</strong></div><div class="top-actions"><div class="status-pill"><span class="dot"></span> ${esc(profileCaption())}</div><button class="icon-btn" data-action="theme" aria-label="Alternar tema" title="Alternar tema">${ico(state.settings.theme==='dark'?'sun':'moon')}</button>${profileMenuHTML()}</div></header><div id="page-content">${pageHTML()}</div><footer class="offline-note">${ico('lock',13)} Nenhum lançamento é enviado a servidores. Faça backups em arquivo regularmente.</footer></main></div><nav class="mobile-nav" aria-label="Menu inferior">${items.map(([p,ic,label])=>`<button class="${state.page===p?'active':''}" data-nav="${p}" aria-label="${label}">${ico(ic)}<span>${label==='Visão geral'?'Início':label}</span></button>`).join('')}</nav>`;
}
const pageHTML=()=>({dashboard:dashboardHTML,transactions:transactionsHTML,assistant:assistantHTML,budgets:budgetsHTML,settings:settingsHTML}[state.page]||dashboardHTML)();
function monthSelect(){return `<input type="month" id="month-pick" class="subtle-select" value="${state.month}" aria-label="Selecionar mês">`}
function cardMetric(label,value,ic,foot,className=''){return `<div class="card kpi"><div class="kpi-label">${label}<span class="kpi-icon">${ico(ic)}</span></div><div><div class="kpi-value ${className}">${value}</div><div class="kpi-foot">${foot}</div></div></div>`}
function trendChart(){const months=Array.from({length:6},(_,i)=>moveMonth(state.month,i-5));const datasets=months.map(m=>stats(m));const max=Math.max(1,...datasets.flatMap(d=>[d.income,d.expense]));const W=620,H=234,padL=14,padR=14,padT=14,padB=28;const innerW=W-padL-padR,innerH=H-padT-padB;const x=i=>padL+i*innerW/5;const y=v=>padT+(1-v/max)*innerH;const makePts=(key)=>datasets.map((d,i)=>`${x(i)},${y(d[key])}`).join(' ');const levels=[0,.25,.5,.75,1].map(v=>`<line x1="${padL}" y1="${y(max*v)}" x2="${W-padR}" y2="${y(max*v)}" stroke="var(--line)" stroke-dasharray="3 5"/>`).join('');return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Receitas e despesas dos últimos seis meses">${levels}<polyline points="${makePts('income')}" fill="none" stroke="#17aa86" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/> <polyline points="${makePts('expense')}" fill="none" stroke="#d38c80" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${datasets.map((d,i)=>`<circle cx="${x(i)}" cy="${y(d.income)}" r="4.3" fill="#17aa86"><title>${niceMonth(months[i])}: receitas ${fmt(d.income)}</title></circle><circle cx="${x(i)}" cy="${y(d.expense)}" r="4.3" fill="#d38c80"><title>${niceMonth(months[i])}: despesas ${fmt(d.expense)}</title></circle><text x="${x(i)}" y="${H-3}" text-anchor="middle" fill="var(--muted)" font-size="11">${new Date(+months[i].slice(0,4),+months[i].slice(5)-1,1).toLocaleString('pt-BR',{month:'short'}).replace('.','')}</text>`).join('')}</svg>`}
function categoryData(entries=monthEntries()){return [...CATEGORIES].filter(c=>c.name!=='Salário').map(c=>({...c,total:sum(entries.filter(e=>e.type==='expense'&&e.category===c.name))})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total)}
function categoryHTML(){const data=categoryData();if(!data.length)return emptyHTML('Sem categorias neste mês','Ao registrar despesas, o detalhamento aparece aqui.','chart');const max=data[0].total;return `<div class="category-list">${data.slice(0,6).map(c=>`<div class="category-row"><div class="cat-top"><span class="cat-title"><span class="cat-emblem" style="background:${c.color}18">${c.emoji}</span>${esc(c.name)}</span><span>${fmt(c.total)}</span></div><div class="progress"><div style="width:${Math.max(2,Math.round(c.total/max*100))}%;background:${c.color}"></div></div></div>`).join('')}</div>`}
function emptyHTML(title,msg,ic='receipt'){return `<div class="empty">${ico(ic,32)}<strong>${title}</strong>${msg}</div>`}
function txRow(e){const c=catInfo(e.category);return `<div class="tx-row"><span class="tx-icon">${e.type==='income'?'💸':c.emoji}</span><div class="tx-main"><div class="tx-name">${esc(e.title)}</div><div class="tx-meta">${formatDate(e.date)} · ${esc(e.category)}${e.merchant?' · '+esc(e.merchant):''}</div></div><div class="tx-money ${e.type==='income'?'positive':''}">${e.type==='income'?'+':'−'} ${fmt(e.cents)}</div></div>`}
function financialInsights(){const current=stats(),prev=stats(moveMonth(state.month,-1));let out=[];if(!state.entries.length)return `<div class="insight"><span class="insight-icon">${ico('sparkle')}</span><div class="insight-body"><strong>Comece com um lançamento</strong><span>Seus resumos e comparações aparecerão automaticamente.</span></div></div>`;
 if(prev.expense>0){const change=Math.round((current.expense-prev.expense)/prev.expense*100);out.push({title:change>0?'Despesas aumentaram':change<0?'Despesas diminuíram':'Despesas estáveis',desc:`${Math.abs(change)}% ${change>0?'a mais':change<0?'a menos':'de variação'} em relação ao mês anterior.`,ic:change>0?'alert':'chart'})}
 if(current.expense>0){const biggest=categoryData()[0];if(biggest)out.push({title:'Maior categoria de despesas',desc:`${biggest.name} representa ${Math.round(biggest.total/current.expense*100)}% do total gasto neste mês.`,ic:'chart'});const limit=Object.values(state.settings.budgets).reduce((a,v)=>a+(Number(v)||0),0);if(limit)out.push({title:'Acompanhe seus limites',desc:`Você utilizou ${Math.round(current.expense/limit*100)}% da soma de seus orçamentos cadastrados.`,ic:'wallet'})}
 if(!out.length)out.push({title:'Seu controle está em andamento',desc:'Continue registrando despesas para encontrar padrões.',ic:'sparkle'});
 return out.slice(0,3).map(o=>`<div class="insight"><span class="insight-icon">${ico(o.ic)}</span><div class="insight-body"><strong>${esc(o.title)}</strong><span>${esc(o.desc)}</span></div></div>`).join('')}
function dashboardHTML(){const s=stats();const all=state.entries;const prev=stats(moveMonth(state.month,-1));return `<div class="page-head"><div><p class="eyebrow">CONTROLE COM TRANQUILIDADE</p><h1 class="page-title">Visão geral <span style="color:var(--brand)">✦</span></h1><p class="page-sub">Tudo sobre seu dinheiro, com privacidade e simplicidade.</p></div><div class="head-buttons">${monthSelect()}<button class="btn btn-primary" data-action="new">${ico('plus')} Novo lançamento</button></div></div><div class="grid-kpi">${cardMetric('Resultado do mês',formatSigned(s.balance),'wallet',niceMonth(state.month),s.balance>=0?'positive':'negative')}${cardMetric('Receitas',fmt(s.income),'arrowDown',`${s.entries.filter(e=>e.type==='income').length} lançamento(s)`,'positive')}${cardMetric('Despesas',fmt(s.expense),'arrowUp',`${s.entries.filter(e=>e.type==='expense').length} lançamento(s)`)}${cardMetric('Variação de despesas',prev.expense?`${Math.round((s.expense-prev.expense)/prev.expense*100)}%`:'—','chart',prev.expense?'Em relação ao mês anterior':'Sem dados do mês anterior')}</div><div class="dashboard-layout"><div class="stack"><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Evolução financeira</h2><p class="panel-sub">Receitas e despesas nos últimos seis meses até ${niceMonth(state.month)}</p></div><span class="tag">6 meses</span></div><div class="chart">${trendChart()}</div><div class="chart-legend"><span><i class="legend-dot" style="background:#17aa86"></i>Receitas</span><span><i class="legend-dot" style="background:#d38c80"></i>Despesas</span></div></section><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Últimas transações</h2><p class="panel-sub">Movimentações mais recentes</p></div><button class="text-link" data-nav="transactions">Ver tudo ${ico('chevron',13)}</button></div>${all.length?`<div class="tx-list">${ordered().slice(0,5).map(txRow).join('')}</div>`:emptyHTML('Tudo pronto para começar','Adicione sua primeira receita ou despesa.')}</section></div><div class="stack"><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Para onde foi seu dinheiro?</h2><p class="panel-sub">Despesas por categoria no mês</p></div></div>${categoryHTML()}</section><section class="card panel"><h2 class="panel-title">Seu radar financeiro ${ico('sparkle',16)}</h2><p class="panel-sub">Informações calculadas no próprio aparelho</p>${financialInsights()}</section><section class="banner"><strong>Registre conversando ✨</strong><p>Digite “gastei R$ 25 no mercado ontem” e confira antes de salvar. Tudo funciona localmente.</p><button class="btn" data-nav="assistant">${ico('message')} Abrir assistente</button></section></div></div>`}
function transactionsHTML(){let items=ordered().filter(e=>(state.filter.type==='all'||e.type===state.filter.type)&&(state.filter.category==='all'||e.category===state.filter.category));const q=normalize(state.filter.q);if(q)items=items.filter(e=>normalize([e.title,e.category,e.merchant,e.note,e.method,(e.items||[]).map(x=>x.name).join(' ')].join(' ')).includes(q));const totalIn=sum(items.filter(e=>e.type==='income')),totalOut=sum(items.filter(e=>e.type==='expense'));return `<div class="page-head"><div><p class="eyebrow">HISTÓRICO COMPLETO</p><h1 class="page-title">Suas transações</h1><p class="page-sub">Pesquise, edite e acompanhe cada movimentação.</p></div><div class="head-buttons"><button class="btn btn-outline" data-action="export-json">${ico('download')} Exportar</button><button class="btn btn-primary" data-action="new">${ico('plus')} Novo lançamento</button></div></div><div class="control-bar"><div class="search">${ico('search')}<input class="input" id="filter-query" placeholder="Buscar por descrição, item, loja..." value="${esc(state.filter.q)}" aria-label="Buscar transações"></div><select id="filter-type" class="subtle-select" aria-label="Filtrar tipo"><option value="all">Todos os tipos</option><option value="expense" ${state.filter.type==='expense'?'selected':''}>Despesas</option><option value="income" ${state.filter.type==='income'?'selected':''}>Receitas</option></select><select id="filter-cat" class="subtle-select" aria-label="Filtrar categoria"><option value="all">Todas as categorias</option>${CATEGORIES.map(c=>`<option ${state.filter.category===c.name?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="card panel"><div class="panel-head"><h2 class="panel-title">${items.length} registro(s)</h2><div class="stat-summary"><span class="tag income">Entradas ${fmt(totalIn)}</span><span class="tag expense">Saídas ${fmt(totalOut)}</span></div></div>${items.length?`<div class="table-scroll" style="margin:20px -23px -17px"><table class="table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${items.map(e=>`<tr><td style="white-space:nowrap">${formatDate(e.date)}</td><td><strong>${esc(e.title)}</strong><div class="muted" style="font-size:10px;margin-top:5px">${esc(e.merchant||e.method)}${e.installment?' · '+e.installment.index+'/'+e.installment.total+' parcelas':''}${e.receipt?' · 📎':''}</div></td><td>${catInfo(e.category).emoji} ${esc(e.category)}</td><td><span class="tag ${e.type}">${e.type==='income'?'Receita':'Despesa'}</span></td><td><strong class="${e.type==='income'?'positive':''}">${e.type==='income'?'+':'−'} ${fmt(e.cents)}</strong></td><td><button class="icon-btn" data-action="edit" data-id="${esc(e.id)}" aria-label="Editar ${esc(e.title)}" title="Editar">${ico('edit')}</button> <button class="icon-btn" data-action="delete" data-id="${esc(e.id)}" aria-label="Excluir ${esc(e.title)}" title="Excluir">${ico('trash')}</button></td></tr>`).join('')}</tbody></table></div>`:emptyHTML('Nada encontrado','Experimente outros filtros ou adicione uma transação.','search')}</div>`}
function assistantHTML(){let chat=state.settings.chat||[];return `<div class="page-head"><div><p class="eyebrow">ASSISTENTE LOCAL</p><h1 class="page-title">Converse com suas finanças</h1><p class="page-sub">Registre e consulte gastos em português, mesmo sem internet.</p></div><button class="btn btn-outline" data-action="clear-chat">${ico('trash')} Limpar conversa</button></div><div class="assistant-shell"><section class="card chat-card"><div class="chat-header"><div style="display:flex;gap:12px;align-items:center"><div class="bot-icon">${ico('bot',23)}</div><div><h2 class="panel-title">Assistente Meu Fluxo</h2><p class="panel-sub"><span class="dot"></span> Processamento no dispositivo</p></div></div><span class="badge">SEM NUVEM</span></div><div class="chat-history" id="chat-history">${chat.length?chat.map(c=>`<div class="bubble ${c.role==='user'?'user':''}">${esc(c.text)}</div>`).join(''):`<div class="bubble">Olá! 👋 Sou seu assistente financeiro local. Posso preparar lançamentos e responder consultas básicas com base no seu histórico.

Experimente: “Gastei R$ 35,90 no mercado ontem”.</div>`}${state.pending?pendingHTML(state.pending):''}</div><div class="chat-quick"><button class="chip" data-chat-example="Quanto gastei este mês?">Quanto gastei este mês?</button><button class="chip" data-chat-example="Meu saldo do mês">Saldo do mês</button><button class="chip" data-chat-example="Gastei R$ 25 no mercado hoje">Exemplo de despesa</button></div><form class="chat-compose" id="chat-form"><input id="chat-input" class="input" maxlength="350" autocomplete="off" placeholder="Ex.: recebi 1500 reais de salário..." aria-label="Mensagem financeira"><button type="button" class="icon-btn" data-action="voice" aria-label="Ditado por voz" aria-pressed="false" title="Iniciar ditado por voz">${ico('mic')}</button><button type="submit" class="btn btn-primary" aria-label="Enviar mensagem">${ico('send')}</button></form><div id="voice-status" class="voice-status" role="status" aria-live="polite" hidden></div></section><aside class="assistant-tips"><div class="card panel"><h3 class="panel-title">Como posso ajudar?</h3><div class="tip-list"><div class="tip">💬 <strong>Lançamentos por texto</strong><span>“Gastei R$ 42 com gasolina ontem.”</span></div><div class="tip">📊 <strong>Consultas rápidas</strong><span>“Quanto gastei em alimentação este mês?”</span></div><div class="tip">✅ <strong>Confirmação segura</strong><span>Os dados só são salvos após sua aprovação.</span></div><div class="tip">🔒 <strong>Privacidade</strong><span>Não há IA remota. As respostas usam regras locais e seus registros.</span></div></div></div><div class="note" style="margin-top:16px">O assistente entende frases simples. Não faz leitura automática de notas nem interpreta mensagens complexas como uma IA na nuvem. O microfone, quando disponível, pode depender de serviços do navegador.</div></aside></div>`}
function pendingHTML(p){
 const batch=p.kind==='batch',entries=batch?p.entries:[p];
 const total=entries.reduce((n,e)=>n+e.cents,0);
 const detail=entries.map((e,i)=>`<div class="pending-entry"><div class="pending-entry-main"><strong>${i+1}. ${esc(e.title)}</strong><span>${fmt(e.cents)} · ${formatDate(e.date)} · ${esc(e.category)}</span></div><div class="pending-entry-actions"><button type="button" class="btn btn-outline btn-sm" data-action="edit-pending" data-index="${i}">Editar</button>${batch?`<button type="button" class="btn btn-outline btn-sm" data-action="remove-pending" data-index="${i}">Remover</button>`:''}</div></div>`).join('');
 const notes=batch?(p.notes||[]):[];
 return `<div class="chat-pending"><strong>${batch?`Confira os ${entries.length} lançamentos antes de salvar`:'Confira o lançamento antes de salvar'}</strong><div class="detail pending-detail">${detail}</div>${notes.length?`<div class="note" style="margin-top:9px"><strong>Informações adicionais (não são despesas):</strong>${notes.map(n=>`<div>${esc(n)}</div>`).join('')}</div>`:''}<div class="pending-summary">Total previsto: <strong>${fmt(total)}</strong> · Nenhum valor foi salvo ainda</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" data-action="confirm-pending">${ico('check')} Confirmar ${batch?entries.length+' lançamentos':'lançamento'}</button><button class="btn btn-outline btn-sm" data-action="cancel-pending">Cancelar tudo</button></div></div>`;
}
function budgetsHTML(){const s=stats(),data=CATEGORIES.filter(c=>c.name!=='Salário');const existing=state.settings.budgets||{};return `<div class="page-head"><div><p class="eyebrow">SEUS LIMITES</p><h1 class="page-title">Orçamentos mensais</h1><p class="page-sub">Defina um teto de gastos para cada categoria. Os limites são locais e podem ser exportados.</p></div><div class="head-buttons">${monthSelect()}<button class="btn btn-primary" data-action="edit-budgets">${ico('edit')} Definir limites</button></div></div><div class="grid-kpi">${cardMetric('Despesa do mês',fmt(s.expense),'arrowUp',niceMonth(state.month))}${cardMetric('Limite total',fmt(Object.values(existing).reduce((a,v)=>a+(Number(v)||0),0)),'wallet','Soma dos limites definidos')}${cardMetric('Categorias com limite',String(Object.values(existing).filter(Number).length),'chart','Orçamentos configurados')}${cardMetric('Lançamentos do mês',String(s.entries.length),'receipt','Receitas e despesas')}</div><div class="card panel"><h2 class="panel-title">Acompanhamento por categoria</h2><p class="panel-sub">O consumo é calculado a partir do histórico do mês selecionado</p>${data.map(c=>{const used=sum(s.entries.filter(e=>e.type==='expense'&&e.category===c.name));const lim=Number(existing[c.name]||0);const perc=lim?Math.round(used/lim*100):0;return `<div class="budget-row"><div><div class="budget-name">${c.emoji} ${c.name}</div><div class="budget-meta">${lim?perc+'% do limite utilizado':'Sem limite definido'}</div></div><div class="progress" style="height:10px"><div style="width:${lim?Math.min(100,perc):0}%;background:${lim&&used>lim?'var(--red)':c.color}"></div></div><div class="budget-num">${fmt(used)} <div class="muted" style="font-size:10px;font-weight:500">de ${lim?fmt(lim):'—'}</div></div></div>`}).join('')}</div>`}
function settingsHTML(){return `<div class="page-head"><div><p class="eyebrow">CONTROLE E PRIVACIDADE</p><h1 class="page-title">Configurações</h1><p class="page-sub">Seus dados são seus. Exporte, transfira e restaure sem nuvem.</p></div></div><section class="card panel" style="margin-bottom:18px"><h2 class="panel-title">Perfil e conta Google</h2><p class="page-sub" style="margin:9px 0 16px">Perfil atual: <strong>${esc(profileCaption())}</strong>. Os dados de cada conta ficam em um banco local separado neste dispositivo.</p><div class="setting-row"><div><strong>Usar sem conta</strong><p>Seu histórico original continua disponível no perfil local.</p></div><button class="btn btn-outline" data-action="profile-local">${ico('user')} Perfil local</button></div><div class="setting-row"><div><strong>${activeProfile.kind==='google'?'Conta Google conectada':'Login com Google'}</strong><p>${activeProfile.kind==='google'?'Você está conectado. O histórico desta conta permanece salvo apenas neste aparelho. Para sair, use o avatar no canto superior direito.':'Para entrar com Google, clique no avatar no canto superior direito. O login não sincroniza o histórico financeiro entre aparelhos.'}</p></div><span class="tag">${activeProfile.kind==='google'?'Conectado':'Perfil local'}</span></div><div class="note" style="margin-top:12px">⚠️ Perfis nesta versão separam os históricos por conta, mas <strong>não são proteção contra outras pessoas com acesso ao navegador</strong>. Para privacidade, use o bloqueio de tela do aparelho e backups criptografados.</div></section><div class="grid-2"><section class="card panel"><h2 class="panel-title">Backup e transferência</h2><p class="page-sub" style="margin-bottom:20px">Use o mesmo arquivo no Android, Windows ou outro dispositivo. Inclui histórico, categorias, orçamentos e conversa.</p><div class="setting-row"><div><strong>Exportar backup completo (.json)</strong><p>Arquivo legível que contém seus dados financeiros. Pode incluir fotografias anexadas.</p></div><button class="btn btn-primary" data-action="export-json">${ico('download')} Exportar</button></div><div class="setting-row"><div><strong>Backup criptografado (.mfbackup)</strong><p>Protegido por uma senha que só você conhece; inclui notas e histórico. Pode ser enviado pelo compartilhamento do celular.</p></div><div class="backup-actions"><button class="btn btn-primary" data-action="export-secure">${ico('lock')} Salvar</button><button class="btn btn-outline" data-action="share-secure">${ico('share')} Enviar protegido</button><button class="btn btn-outline" data-action="share-plain">${ico('share')} Enviar sem senha</button></div></div><div class="setting-row"><div><strong>Importar backup (.json ou .mfbackup)</strong><p>Junta somente registros ainda não existentes ou restaura o backup substituindo os dados atuais.</p></div><button class="btn btn-outline" data-action="import-open">${ico('upload')} Importar</button></div><div class="setting-row"><div><strong>Exportar planilha (.csv)</strong><p>Para abrir no Excel ou LibreOffice. Não inclui fotos nem orçamento.</p></div><button class="btn btn-outline" data-action="export-csv">${ico('download')} CSV</button></div><div class="note" style="margin-top:19px">🔒 O backup protegido é a opção recomendada para enviar por e-mail. A opção <strong>Enviar sem senha</strong> gera um JSON legível: quem obtiver o arquivo poderá consultar suas finanças. Estar conectado ao Google não criptografa o anexo.</div></section><section class="card panel"><h2 class="panel-title">Preferências e armazenamento</h2><div class="setting-row"><div><strong>Aparência</strong><p>Escolha o tema que for mais confortável.</p></div><select class="subtle-select" id="theme-select"><option value="light" ${state.settings.theme==='light'?'selected':''}>Claro</option><option value="dark" ${state.settings.theme==='dark'?'selected':''}>Escuro</option></select></div><div class="setting-row"><div><strong>Método de pagamento padrão</strong><p>Preenchido ao criar novos lançamentos.</p></div><select class="subtle-select" id="method-select">${METHODS.map(m=>`<option ${state.settings.defaultMethod===m?'selected':''}>${m}</option>`).join('')}</select></div><div class="setting-row"><div><strong>Armazenamento</strong><p>${localFallback?'Modo compatível: armazenamento local simples':'IndexedDB: banco de dados local do navegador'} · ${state.entries.length} transações</p></div><span class="badge">OFFLINE</span></div><div class="setting-row"><div><strong>Apagar todos os dados</strong><p>Exclui definitivamente o histórico neste aparelho. Faça backup antes.</p></div><button class="btn btn-danger" data-action="reset">${ico('trash')} Apagar</button></div></section></div><section class="card panel" style="margin-top:18px"><h2 class="panel-title">Como transferir seus dados para outro dispositivo</h2><div class="grid-2" style="margin-top:16px"><div class="note"><b>1. No dispositivo de origem</b><br>Vá a Configurações e toque em <b>Exportar</b>. Envie o arquivo .json ao outro aparelho por Quick Share, Bluetooth, e-mail ou cabo.</div><div class="note"><b>2. No dispositivo de destino</b><br>Abra Meu Fluxo, toque em <b>Importar</b> e selecione o arquivo. Escolha <b>Mesclar</b> ou <b>Substituir</b>.</div></div><p class="help" style="margin-top:13px">Não existe sincronização automática. Se registrar movimentações em dois dispositivos, exporte de um e importe com a opção Mesclar no outro. Registros com o mesmo identificador não são duplicados; versões editadas do mesmo registro não são mescladas automaticamente.</p></section>`}
function openOverlay(html){$('#overlay').innerHTML=`<div class="modal-backdrop" id="modal-backdrop"><div class="modal" tabindex="-1" role="dialog" aria-modal="true" aria-label="Janela de edição">${html}</div></div>`;$('#overlay .modal')?.focus();}
function closeOverlay(){ $('#overlay').innerHTML='';state.editId=null;state.editingReceipt=null;state.items=[];}
function newEntryData(){return {id:uuid(),type:'expense',title:'',cents:0,date:today(),category:'Alimentação',merchant:'',method:state.settings.defaultMethod||'Pix',note:'',receipt:null,items:[],recurring:false,nature:'variable',createdAt:new Date().toISOString()}}
function entryModal(entry=null){const e=entry?{...entry}:newEntryData();state.editId=entry?.id||null;state.editingReceipt=entry?.receipt||null;state.items=Array.isArray(entry?.items)?entry.items.map(i=>({...i})):[];openOverlay(`<div class="modal-head"><h2>${entry?'Editar lançamento':'Novo lançamento'}</h2><button type="button" class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><form id="entry-form"><div class="form-grid"><div class="field span-2"><label>Tipo de movimentação</label><div class="type-choices"><button type="button" class="type-choice ${e.type==='expense'?'active':''}" data-type="expense">${ico('arrowUp')} Despesa</button><button type="button" class="type-choice ${e.type==='income'?'active':''}" data-type="income">${ico('arrowDown')} Receita</button></div><input type="hidden" id="entry-type" value="${e.type}"></div><div class="field span-2"><label for="entry-title">Descrição *</label><input class="input" id="entry-title" maxlength="120" required placeholder="Ex.: Compras do supermercado" value="${esc(e.title)}"></div><div class="field"><label for="entry-amount">Valor total (R$) *</label><input class="input" id="entry-amount" inputmode="decimal" required placeholder="0,00" value="${e.cents?esc((e.cents/100).toFixed(2).replace('.',',')):''}"></div><div class="field"><label for="entry-date">Data *</label><input type="date" class="input" id="entry-date" required value="${esc(e.date)}"></div><div class="field"><label for="entry-category">Categoria</label><select id="entry-category" class="select">${CATEGORIES.map(c=>`<option ${c.name===e.category?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label for="entry-method">Pagamento</label><select id="entry-method" class="select">${METHODS.map(m=>`<option ${m===e.method?'selected':''}>${esc(m)}</option>`).join('')}</select></div><div class="field"><label for="entry-merchant">Estabelecimento / origem</label><input class="input" id="entry-merchant" maxlength="120" value="${esc(e.merchant)}" placeholder="Opcional"></div><div class="field"><label for="entry-nature">Natureza</label><select id="entry-nature" class="select"><option value="variable" ${e.nature==='variable'?'selected':''}>Essencial variável</option><option value="recurring" ${e.nature==='recurring'?'selected':''}>Essencial recorrente</option><option value="occasional" ${e.nature==='occasional'?'selected':''}>Ocasional</option><option value="discretionary" ${e.nature==='discretionary'?'selected':''}>Discricionária</option></select></div><div class="field span-2"><label for="entry-note">Observações</label><textarea class="textarea" id="entry-note" maxlength="800" placeholder="Detalhes adicionais...">${esc(e.note)}</textarea></div><div class="field span-2"><label>Itens da compra (opcional)</label><div class="entry-items" id="entry-items">${itemRowsHTML()}</div><div><button type="button" class="btn btn-soft btn-sm" data-action="add-item">${ico('plus')} Adicionar item</button></div><small>Se informar itens, a soma dos preços totais dos itens deve coincidir com o valor do lançamento.</small></div><div class="field"><label for="entry-installments">Parcelamento</label><select class="select" id="entry-installments" ${entry?'disabled':''}>${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===0?'selected':''}>${i===0?'À vista':`${i+1} parcelas mensais`}</option>`).join('')}</select><small>${entry?'Para editar parcelas, altere cada lançamento separado.':'Parcelas mensais têm valor total dividido sem perder centavos.'}</small></div><div class="field"><label for="entry-receipt">Fotografia da nota (opcional)</label><input id="entry-receipt" class="input" type="file" accept="image/*" capture="environment"><small>Imagem salva só no aparelho e incluída no backup JSON.</small><div id="receipt-status" class="receipt-preview">${state.editingReceipt?`<img src="${state.editingReceipt}" alt="Nota anexada"><span>Imagem anexada</span><button type="button" class="btn btn-sm btn-outline" data-action="remove-photo">Remover</button>`:''}</div></div><div class="field span-2"><label style="display:flex;align-items:center;gap:10px"><input id="entry-recurring" type="checkbox" ${e.recurring?'checked':''}> Marcar como despesa/receita recorrente</label><small>Esta marcação não cria lançamentos automaticamente.</small></div></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close">Cancelar</button><button type="submit" class="btn btn-primary">${ico('check')} ${entry?'Salvar alterações':'Registrar'}</button></div></form>`);$('#entry-title')?.focus()}
function itemRowsHTML(){return state.items.map((item,i)=>`<div class="item-line"><input class="input" placeholder="Produto" data-item-index="${i}" data-item-field="name" maxlength="100" value="${esc(item.name||'')}" aria-label="Nome do item ${i+1}"><input class="input" placeholder="Qtd." inputmode="decimal" data-item-index="${i}" data-item-field="qty" value="${esc(item.qty??1)}" aria-label="Quantidade do item ${i+1}"><input class="input" placeholder="Total R$" inputmode="decimal" data-item-index="${i}" data-item-field="amount" value="${item.cents?esc((item.cents/100).toFixed(2).replace('.',',')):''}" aria-label="Valor total do item ${i+1}"><button type="button" class="icon-btn" style="width:34px;height:39px" data-action="remove-item" data-index="${i}" aria-label="Remover item">${ico('close',14)}</button></div>`).join('')}
function refreshItemRows(){const root=$('#entry-items');if(root)root.innerHTML=itemRowsHTML()}
function validateEntry(e){if(!e.title||e.title.length>120)throw Error('Informe uma descrição com até 120 caracteres.');if(!Number.isSafeInteger(e.cents)||e.cents<=0||e.cents>999999999999)throw Error('Informe um valor válido maior que zero.');if(!validDate(e.date))throw Error('Data inválida.');if(!['expense','income'].includes(e.type))throw Error('Tipo inválido.');if(!CATEGORIES.some(c=>c.name===e.category))throw Error('Categoria inválida.');if(e.items?.length){let total=0;for(const it of e.items){if(!it.name?.trim()||!Number.isSafeInteger(it.cents)||it.cents<=0||!Number.isFinite(Number(it.qty))||Number(it.qty)<=0)throw Error('Preencha corretamente os itens da compra.');total+=it.cents}if(total!==e.cents)throw Error(`Os itens somam ${fmt(total)}, mas o lançamento vale ${fmt(e.cents)}. Corrija antes de salvar.`)}}
function collectEntry(){const old=state.editId?state.entries.find(e=>e.id===state.editId):null;const amount=parseCents($('#entry-amount').value);const title=$('#entry-title').value.trim();const type=$('#entry-type').value;const e={...newEntryData(),...(old||{}),type,title,cents:amount,date:$('#entry-date').value,category:$('#entry-category').value,method:$('#entry-method').value,merchant:$('#entry-merchant').value.trim(),nature:$('#entry-nature').value,note:$('#entry-note').value.trim(),recurring:$('#entry-recurring').checked,receipt:state.editingReceipt,items:state.items.filter(it=>it.name||it.amount).map(it=>({name:String(it.name||'').trim(),qty:Number(String(it.qty||1).replace(',','.')),cents:parseCents(it.amount)||0}))};validateEntry(e);return e}
async function handleEntrySubmit(){const e=collectEntry();const old=!!state.editId;const n=old?1:Number($('#entry-installments').value||1);if(n>1&&e.items.length)throw Error('Para parcelar uma compra com itens, registre o total sem detalhamento ou crie os lançamentos manualmente.');if(n>1&&e.cents<n)throw Error('O valor total deve ter pelo menos um centavo por parcela.');const group=n>1?uuid():null;const base=Math.floor(e.cents/n),rem=e.cents%n;const entries=Array.from({length:n},(_,i)=>({...e,id:n===1?e.id:uuid(),date:n===1?e.date:monthAddDate(e.date,i),cents:n===1?e.cents:base+(i<rem?1:0),title:n===1?e.title:`${e.title} (${i+1}/${n})`,installment:n===1?(e.installment||null):{group,index:i+1,total:n,originalCents:e.cents},createdAt:old?e.createdAt:new Date().toISOString()}));await saveTransactionsBatch(entries);await reload();state.pending=null;closeOverlay();render();uiToast(old?'Lançamento atualizado.':n>1?`${n} parcelas registradas.`:'Lançamento salvo no aparelho.')}
async function reload(){const v=await readData();state.entries=v.entries;state.deletedEntries=v.deletedEntries||[];state.settings=v.settings}
function chatAdd(role,text){state.settings.chat=[...(state.settings.chat||[]),{role,text:String(text).slice(0,700),date:new Date().toISOString()}].slice(-80)}
function chatResponse(input){const plain=normalize(input);const month=plain.includes('mes passado')?moveMonth(monthNow(),-1):monthNow();const cat=CATEGORIES.find(c=>c.name!=='Outros'&&plain.includes(normalize(c.name)));
 if(/\b(quanto|total|saldo|balanco|resumo|media|gast|receb|receit)\b/.test(plain)&&(/\?|quanto|qual|saldo|resumo|balanco|media/.test(plain))){const s=stats(month);let sub=cat?sum(monthEntries(month).filter(e=>e.type==='expense'&&e.category===cat.name)):s.expense;
 if(plain.includes('saldo')||plain.includes('balanco'))return {text:`Em ${niceMonth(month)} você registrou ${fmt(s.income)} de receitas, ${fmt(s.expense)} de despesas e um resultado de ${formatSigned(s.balance)}. Esse resultado não é o saldo da sua conta bancária.`};
 if(plain.includes('recebi')||plain.includes('receita')||plain.includes('ganhei'))return {text:`Receitas registradas em ${niceMonth(month)}: ${fmt(s.income)}.`};
 if(plain.includes('media')||plain.includes('média')){const d=new Date();const days=month===monthNow()?d.getDate():new Date(+month.slice(0,4),+month.slice(5),0).getDate();return {text:`Média diária de despesas registradas em ${niceMonth(month)}: ${fmt(Math.round(s.expense/days))}, dividindo pelo número de dias considerados.`}}
 return {text:`${cat?'Despesas em '+cat.name:'Total de despesas'} em ${niceMonth(month)}: ${fmt(sub)}. Baseado somente nos lançamentos registrados.`}}
 if(plain.includes('ultimas')||plain.includes('últimas')){const list=ordered().slice(0,3);return {text:list.length?`Seus últimos registros:\n${list.map(x=>`${formatDate(x.date)} — ${x.title}: ${x.type==='income'?'+':'−'} ${fmt(x.cents)}`).join('\n')}`:'Você ainda não tem lançamentos.'}}
 return parseChatExpense(input);
}
function parseChatExpense(input){
 const parsed=globalThis.MeuFluxoChatParser?.parse(input,{today:today()});
 if(!parsed)return {text:'O parser financeiro não carregou. Atualize o aplicativo e tente novamente.'};
 if(parsed.error)return {text:parsed.error};
 const rows=parsed.entries.map(e=>({...newEntryData(),...e,category:classify(e.title,e.type),method:state.settings.defaultMethod||'Pix'}));
 return {pending:rows.length===1&&!(parsed.notes||[]).length?rows[0]:{kind:'batch',entries:rows,notes:parsed.notes||[]}};
}
async function handleChat(input){const txt=input.trim();if(!txt)return;if(txt.length>350){uiToast('Mensagem muito longa (máximo de 350 caracteres).','error');return}if(state.pending){uiToast('Confirme ou cancele o lançamento pendente antes de enviar outra mensagem.');return}chatAdd('user',txt);let result;try{result=chatResponse(txt)}catch(e){result={text:'Não consegui interpretar a mensagem. Tente novamente com um lançamento mais simples.'}}if(result.pending){state.pending=result.pending;const qty=state.pending.kind==='batch'?state.pending.entries.length:1;chatAdd('assistant',qty>1?'Identifiquei '+qty+' despesas. Revise cada valor abaixo e confirme tudo de uma vez.':'Preparei o lançamento abaixo. Confira antes de confirmar.')}else chatAdd('assistant',result.text);await saveSettings();render();$('#chat-history')?.scrollTo(0,100000)}
function openPendingForEdit(index=0){
 if(!state.pending)return;
 const entries=state.pending.kind==='batch'?state.pending.entries:[state.pending],e=entries[Number(index)];
 if(!e)return;
 const cats=CATEGORIES.map(c=>`<option value="${esc(c.name)}" ${c.name===e.category?'selected':''}>${esc(c.name)}</option>`).join('');
 openOverlay(`<div class="modal-head"><h2>Corrigir lançamento</h2><button type="button" class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><form id="pending-edit-form" data-index="${Number(index)}"><div class="form-grid"><div class="field span-2"><label for="pending-title">Descrição</label><input class="input" id="pending-title" maxlength="120" required value="${esc(e.title)}"></div><div class="field"><label for="pending-amount">Valor (R$)</label><input class="input" id="pending-amount" required inputmode="decimal" value="${esc((e.cents/100).toFixed(2).replace('.',','))}"></div><div class="field"><label for="pending-date">Data</label><input type="date" class="input" id="pending-date" required value="${esc(e.date)}"></div><div class="field span-2"><label for="pending-category">Categoria</label><select id="pending-category" class="select">${cats}</select></div></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close">Cancelar</button><button type="submit" class="btn btn-primary">Atualizar prévia</button></div></form>`);
}
function submitPendingEdit(form){
 const index=Number(form.dataset.index),batch=state.pending?.kind==='batch',e=batch?state.pending.entries[index]:state.pending;
 if(!e)throw Error('A prévia já não está disponível.');
 const amended={...e,title:$('#pending-title').value.trim(),cents:parseCents($('#pending-amount').value),date:$('#pending-date').value,category:$('#pending-category').value};
 validateEntry(amended);
 if(batch)state.pending.entries[index]=amended;
 else state.pending=amended;
 closeOverlay();render();uiToast('Prévia corrigida. Confirme para salvar.');
}
async function removePendingRow(index){
 if(state.pending?.kind!=='batch')return;
 const i=Number(index);
 if(!Number.isInteger(i)||i<0||i>=state.pending.entries.length)return;
 state.pending.entries.splice(i,1);
 if(!state.pending.entries.length){state.pending=null;chatAdd('assistant','Prévia cancelada. Nenhum gasto foi salvo.');await saveSettings()}
 render();
}
let pendingSaving=false;
async function pendingConfirm(){
 if(!state.pending||pendingSaving)return;
 pendingSaving=true;
 try{
  const batch=state.pending.kind==='batch';
  const entries=batch?state.pending.entries:[state.pending];
  for(const entry of entries)validateEntry(entry);
  await saveTransactionsBatch(entries);
  state.pending=null;
  const sumCents=entries.reduce((total,e)=>total+e.cents,0);
  chatAdd('assistant','✅ '+entries.length+' lançamento(s) registrado(s), total '+fmt(sumCents)+'.');
  await saveSettings();await reload();render();uiToast('Lançamentos salvos com sucesso.');
 }finally{pendingSaving=false}
}
function budgetModal(){openOverlay(`<div class="modal-head"><h2>Definir limites mensais</h2><button class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><form id="budget-form"><p class="help" style="margin-bottom:18px">Deixe em branco para não definir limite. Os valores valem para todos os meses e podem ser alterados.</p><div class="form-grid">${CATEGORIES.filter(c=>c.name!=='Salário').map(c=>`<div class="field"><label for="budget-${normalize(c.name)}">${c.emoji} ${c.name}</label><input class="input" id="budget-${normalize(c.name)}" data-budget-cat="${esc(c.name)}" inputmode="decimal" placeholder="Sem limite" value="${state.settings.budgets[c.name]?esc((state.settings.budgets[c.name]/100).toFixed(2).replace('.',',')):''}"></div>`).join('')}</div><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close">Cancelar</button><button type="submit" class="btn btn-primary">Salvar limites</button></div></form>`)}
function importModal(){openOverlay(`<div class="modal-head"><h2>Importar histórico</h2><button type="button" class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><div class="note">Selecione um backup <b>.json</b> ou <b>.mfbackup</b> exportado pelo Meu Fluxo. Seus dados atuais não serão apagados sem sua confirmação.</div><div class="field" style="margin-top:18px"><label for="import-file">Arquivo de backup</label><input id="import-file" type="file" class="input" accept=".json,.mfbackup,application/json"></div><div id="import-preview" class="help" style="margin-top:14px"></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close">Cancelar</button><button type="button" class="btn btn-primary" data-action="import-review">${ico('upload')} Analisar arquivo</button></div>`)}
function safeReceipt(s){return typeof s==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)&&s.length<2_500_000?s:null}
function validateImported(obj){if(!obj||obj.app!=='meu-fluxo'||![1,2].includes(obj.schemaVersion)||!Array.isArray(obj.transactions)||obj.transactions.length>50000)throw Error('Arquivo não é um backup compatível do Meu Fluxo.');const ids=new Set();const arr=[];for(const raw of obj.transactions){if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||raw.id.length>120||ids.has(raw.id))throw Error('Backup contém identificadores inválidos ou duplicados.');ids.add(raw.id);if(typeof raw.title!=='string'||raw.title.length>120||!['income','expense'].includes(raw.type)||!Number.isSafeInteger(raw.cents)||raw.cents<=0||raw.cents>999999999999||!validDate(raw.date)||!CATEGORIES.some(c=>c.name===raw.category))throw Error('Backup contém uma transação inválida.');const items=Array.isArray(raw.items)?raw.items:[];if(items.length>300||items.some(it=>typeof it.name!=='string'||it.name.length>100||!Number.isSafeInteger(it.cents)||it.cents<0||!Number.isFinite(Number(it.qty))))throw Error('Backup contém itens inválidos.');arr.push({id:raw.id,title:raw.title,type:raw.type,cents:raw.cents,date:raw.date,category:raw.category,merchant:String(raw.merchant||'').slice(0,120),note:String(raw.note||'').slice(0,800),method:METHODS.includes(raw.method)?raw.method:'Outro',nature:['variable','recurring','occasional','discretionary'].includes(raw.nature)?raw.nature:'variable',recurring:!!raw.recurring,receipt:safeReceipt(raw.receipt),items:items.map(it=>({name:it.name,qty:Number(it.qty),cents:it.cents})),installment:raw.installment||null,createdAt:typeof raw.createdAt==='string'?raw.createdAt:''})}
 const importedSettings=obj.settings&&typeof obj.settings==='object'?obj.settings:{};const budgets={};for(const c of CATEGORIES){const b=importedSettings.budgets?.[c.name];if(Number.isSafeInteger(b)&&b>=0&&b<=999999999999)budgets[c.name]=b}const chat=Array.isArray(importedSettings.chat)?importedSettings.chat.slice(-80).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.text==='string').map(x=>({role:x.role,text:x.text.slice(0,700),date:typeof x.date==='string'?x.date:''})):[];const settings={...DEFAULT_SETTINGS,theme:importedSettings.theme==='dark'?'dark':'light',defaultMethod:METHODS.includes(importedSettings.defaultMethod)?importedSettings.defaultMethod:'Pix',budgets,chat};return {entries:arr,settings}}
async function readImportFile(){const file=$('#import-file')?.files?.[0];if(!file)throw Error('Selecione um arquivo JSON.');if(file.size>40*1024*1024)throw Error('Backup muito grande. Limite de 40 MB por importação.');const content=await file.text();let parsedFile=JSON.parse(content);if(parsedFile?.format==='meu-fluxo-encrypted-v1'){
 const password=prompt('Digite a senha usada para criptografar este backup:');if(password===null)return;if(!password)throw Error('Informe a senha do backup.');parsedFile=await decryptBackup(parsedFile,password)
 }else if(file.name.endsWith('.mfbackup'))throw Error('Formato criptografado inválido.');
 const parsed=validateImported(parsedFile);if(parsedFile.profile?.kind==='google'&& (activeProfile.kind!=='google'||activeProfile.id!==parsedFile.profile.id)){
 throw Error('Este backup pertence a outra conta Google. Entre com a conta de origem para restaurar.');
 }state.importBuffer=parsed;const exist=new Set(state.entries.map(e=>e.id));const news=parsed.entries.filter(e=>!exist.has(e.id)).length;$('#import-preview').innerHTML=`<div class="note"><b>${parsed.entries.length} transações</b> no backup · <b>${news} novas</b> neste aparelho.<br><br><b>Mesclar:</b> adiciona somente registros novos, sem substituir alterações feitas nos já existentes.<br><b>Substituir:</b> apaga o histórico atual e restaura o conteúdo do arquivo, incluindo preferências e orçamentos.</div><div class="modal-actions"><button class="btn btn-outline" data-action="import-merge">${ico('plus')} Mesclar (${news})</button><button class="btn btn-danger" data-action="import-replace">${ico('refresh')} Substituir tudo</button></div>`}
async function doImport(mode){if(!state.importBuffer)return;const entries=state.importBuffer.entries;const settings=state.importBuffer.settings;if(mode==='replace'){const ok=confirm(`ATENÇÃO: substituir todos os ${state.entries.length} registros locais pelos ${entries.length} do arquivo? Os registros que não estiverem no backup serão perdidos. Faça backup antes.`);if(!ok)return}else if(!confirm(`Adicionar registros novos do backup sem alterar os existentes?`))return;const newEntries=entries.filter(e=>!state.entries.some(x=>x.id===e.id));const count=newEntries.length;await importBatch(mode==='replace'?entries:newEntries,settings,mode);state.importBuffer=null;state.pending=null;await reload();closeOverlay();state.page='dashboard';render();uiToast(mode==='replace'?`Backup restaurado: ${entries.length} registros.`:`Importação concluída: ${count} novos registros.`)}
function backupPayload(){return {app:'meu-fluxo',schemaVersion:2,exportedAt:new Date().toISOString(),version:VERSION,profile:{kind:activeProfile.kind,id:activeProfile.id,email:activeProfile.email||null},transactions:ordered([...state.entries,...state.deletedEntries]),settings:state.settings}}
// Criptografia local WebCrypto: PBKDF2 SHA-256 + AES-256-GCM com salt/IV aleatórios.
const bytesToBase64=bytes=>{let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(out)};
const base64ToBytes=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
async function deriveBackupKey(password,salt){
 if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues)throw Error('Criptografia indisponível. Abra o aplicativo por HTTPS.');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptBackup(payload,password){
 if(password.length<12)throw Error('Use uma senha com pelo menos 12 caracteres.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await deriveBackupKey(password,salt);
 const data=new TextEncoder().encode(JSON.stringify(payload));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data);
 return {format:'meu-fluxo-encrypted-v1',schemaVersion:1,kdf:'PBKDF2-SHA256',iterations:310000,cipher:'AES-256-GCM',salt:bytesToBase64(salt),iv:bytesToBase64(iv),ciphertext:bytesToBase64(new Uint8Array(encrypted))};
}
async function decryptBackup(wrapper,password){
 if(wrapper.format!=='meu-fluxo-encrypted-v1'||wrapper.kdf!=='PBKDF2-SHA256'||wrapper.cipher!=='AES-256-GCM'||wrapper.iterations!==310000)throw Error('Formato de backup criptografado não suportado.');
 if(typeof wrapper.ciphertext!=='string'||wrapper.ciphertext.length>60*1024*1024)throw Error('Backup inválido ou muito grande.');
 try{const salt=base64ToBytes(wrapper.salt),iv=base64ToBytes(wrapper.iv);if(salt.length!==16||iv.length!==12)throw Error('Parâmetros inválidos');
 const key=await deriveBackupKey(password,salt);const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,base64ToBytes(wrapper.ciphertext));
 return JSON.parse(new TextDecoder().decode(bytes));
 }catch{throw Error('Não foi possível abrir: senha incorreta ou backup danificado.');}
}
async function exportSecure(share=false){
 const password=prompt('Crie uma senha forte (mínimo 12 caracteres) para proteger seu backup. Você precisará dela para restaurar:');
 if(password===null)return;if(password.length<12)throw Error('Use uma senha com pelo menos 12 caracteres.');
 const confirmPassword=prompt('Repita a senha do backup para confirmar:');if(confirmPassword===null)return;if(password!==confirmPassword)throw Error('As senhas digitadas não coincidem.');
 const wrapper=await encryptBackup(backupPayload(),password);
 const fileName=`meu-fluxo-${activeProfile.kind==='google'?'google':'local'}-${today()}.mfbackup`;
 const file=new File([JSON.stringify(wrapper)],fileName,{type:'application/octet-stream'});
 if(share&&navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:'Backup criptografado Meu Fluxo',text:'Backup protegido por senha. Compartilhe a senha por outro meio.'});uiToast('Compartilhamento enviado ao aplicativo escolhido.');return}catch(err){if(err.name==='AbortError')return;console.warn('Compartilhamento indisponível',err)}}
 downloadBlob(file,fileName);uiToast(share?'Backup salvo. Anexe o arquivo ao Gmail manualmente; não envie a senha no mesmo e-mail.':'Backup criptografado salvo. Guarde a senha separadamente.');
}
async function shareBackupWithoutPassword(){
 if(activeProfile.kind!=='google')throw Error('Entre com Google antes de compartilhar um backup sem senha, ou utilize o backup protegido.');
 if(!confirm('ATENÇÃO: este backup NÃO será criptografado. Quem obtiver o arquivo ou acessar o e-mail poderá ler seus lançamentos, notas e dados financeiros. Deseja continuar mesmo assim?'))return;
 const fileName='meu-fluxo-sem-senha-'+today()+'.json';
 const file=new File([JSON.stringify(backupPayload(),null,2)],fileName,{type:'application/json'});
 if(navigator.canShare?.({files:[file]})&&navigator.share){
  try{await navigator.share({files:[file],title:'Meu Fluxo - backup sem senha',text:'Backup pessoal em JSON sem criptografia. Manter privado.'});uiToast('Arquivo compartilhado com o aplicativo escolhido.');return}
  catch(err){if(err?.name==='AbortError')return;console.warn('Compartilhamento por arquivo indisponível',err)}
 }
 downloadBlob(file,fileName);
 uiToast('Backup JSON baixado. Para enviar, anexe o arquivo manualmente ao Gmail.');
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function exportJSON(){const payload=backupPayload();downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`meu-fluxo-backup-${today()}.json`);uiToast('Backup JSON criado. Guarde o arquivo com segurança.')}
function csvCell(s){const val=String(s??'').replace(/\r?\n/g,' ');const safe=/^\s*[=+\-@]/.test(val)?"'"+val:val;return `"${safe.replace(/"/g,'""')}"`}
function exportCSV(){const fields=['Data','Tipo','Descrição','Categoria','Valor (R$)','Pagamento','Estabelecimento','Natureza','Observações','Itens'];const lines=[fields.map(csvCell).join(';'),...ordered().map(e=>[e.date,e.type==='income'?'Receita':'Despesa',e.title,e.category,(e.cents/100).toFixed(2).replace('.',','),e.method,e.merchant,e.nature,e.note,(e.items||[]).map(i=>`${i.name} (${i.qty}) ${fmt(i.cents)}`).join(' | ')].map(csvCell).join(';'))];downloadBlob(new Blob(['\ufeff',lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),`meu-fluxo-historico-${today()}.csv`);uiToast('CSV exportado para planilha.')}
async function processReceipt(file){if(!file)return;if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type))throw Error('Escolha uma imagem JPG, PNG ou WebP.');if(file.size>12*1024*1024)throw Error('Imagem muito grande. Limite: 12 MB.');const url=URL.createObjectURL(file);try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não foi possível ler a fotografia.'));image.src=url});const scale=Math.min(1,1200/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.74);if(data.length>2_500_000)throw Error('Imagem ficou grande demais. Tente outra foto.');state.editingReceipt=data;$('#receipt-status').innerHTML=`<img src="${data}" alt="Nota anexada"><span>Foto salva localmente</span><button type="button" class="btn btn-sm btn-outline" data-action="remove-photo">Remover</button>`}finally{URL.revokeObjectURL(url)}}
async function loadFirebaseClient(){
 if(firebaseClient)return firebaseClient;
 if(!globalThis.MEU_FLUXO_FIREBASE_CONFIG?.apiKey||!globalThis.MEU_FLUXO_FIREBASE_CONFIG?.authDomain)throw Error('Login Google ainda não configurado. O proprietário precisa preencher firebase-config.js e autorizar o domínio no Firebase Authentication.');
 if(!navigator.onLine)throw Error('É necessária internet para entrar na conta Google.');
 const [{initializeApp},auth]=await Promise.all([
 import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);
 const app=initializeApp(globalThis.MEU_FLUXO_FIREBASE_CONFIG,'meu-fluxo-auth');
 firebaseClient={auth,instance:auth.getAuth(app)};await auth.setPersistence(firebaseClient.instance,auth.browserLocalPersistence);return firebaseClient;
}
async function signInGoogle(){
 const {auth,instance}=await loadFirebaseClient();
 const provider=new auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 const result=await auth.signInWithPopup(instance,provider);
 const user=result.user;if(!user?.uid||!user.providerData?.some(x=>x.providerId==='google.com'))throw Error('Conta Google não verificada.');
 await switchProfile({kind:'google',id:user.uid,name:user.displayName||user.email||'Google',email:user.email||''});
 uiToast('Conta Google selecionada. Histórico local separado.');
}
async function signOutGoogle(){if(activeProfile.kind!=='google'){uiToast('Você já está no perfil local.');return}const client=await loadFirebaseClient();await client.auth.signOut(client.instance);await switchProfile(ACTIVE_LOCAL);uiToast('Você saiu da conta Google.');}
async function initGoogleSession(){
 if(!globalThis.MEU_FLUXO_FIREBASE_CONFIG?.apiKey||!navigator.onLine)return;
 try{const {auth,instance}=await loadFirebaseClient();await auth.authStateReady(instance);
 const user=instance.currentUser;
 if(user?.uid&&user.providerData?.some(x=>x.providerId==='google.com')){
 const verified={kind:'google',id:user.uid,name:user.displayName||user.email||'Google',email:user.email||''};
 if(activeProfile.kind!== 'google'||activeProfile.id!==verified.id)await switchProfile(verified);
 else {activeProfile=verified;saveSelectedProfile(verified);render()}
 }else if(activeProfile.kind==='google'){await switchProfile(ACTIVE_LOCAL);uiToast('Sua sessão Google não está mais ativa. Entre novamente para acessar o perfil Google.','error')}
 }catch(err){console.warn('Login Google não disponível',err)}
}
async function clearAll(){if(!confirm('Apagar permanentemente TODO o histórico deste aparelho? Faça backup antes.'))return;if(!confirm('Confirma a exclusão definitiva? Esta ação não pode ser desfeita.'))return;await importBatch([],{...DEFAULT_SETTINGS},'replace');await reload();state.pending=null;state.page='dashboard';render();uiToast('Os dados locais foram apagados.')}
async function deleteEntry(id){const e=state.entries.find(x=>x.id===id);if(!e)return;if(!confirm(`Excluir o lançamento “${e.title}” de ${fmt(e.cents)}?`))return;await removeTransaction(id);state.lastDeleted=e;await reload();render();uiToast('Lançamento excluído. Use o botão Desfazer abaixo.');const zone=$('#toast-zone');const bar=document.createElement('div');bar.className='toast';bar.innerHTML=`Lançamento removido. <button class="btn btn-sm btn-soft" id="undo-delete">${ico('undo')} Desfazer</button>`;zone.append(bar);$('#undo-delete',bar)?.addEventListener('click',async()=>{try{await saveTransaction(e);await reload();render();bar.remove();uiToast('Lançamento restaurado.')}catch(err){uiToast(err.message,'error')}});setTimeout(()=>bar.remove(),11000)}
async function onAction(btn){const a=btn.dataset.action;switch(a){case 'theme':state.settings.theme=state.settings.theme==='dark'?'light':'dark';await saveSettings();render();break;case 'new':entryModal();break;case 'close':closeOverlay();break;case 'edit':{const e=state.entries.find(x=>x.id===btn.dataset.id);if(e)entryModal(e);break}case 'delete':await deleteEntry(btn.dataset.id);break;case 'export-json':exportJSON();break;case 'export-secure':await exportSecure(false);break;case 'share-secure':await exportSecure(true);break;case 'share-plain':await shareBackupWithoutPassword();break;case 'profile-menu':toggleProfileMenu();break;case 'google-login':closeProfileMenu();if(activeProfile.kind==='google'){uiToast('Você já está conectado com Google.');break}await signInGoogle();break;case 'google-logout':closeProfileMenu();await signOutGoogle();break;case 'profile-local':if(activeProfile.kind==='google'){uiToast('Use Sair para deixar a conta Google.');break}await switchProfile(ACTIVE_LOCAL);break;case 'export-csv':exportCSV();break;case 'import-open':importModal();break;case 'import-review':await readImportFile();break;case 'import-merge':await doImport('merge');break;case 'import-replace':await doImport('replace');break;case 'reset':await clearAll();break;case 'edit-budgets':budgetModal();break;case 'add-item':state.items.push({name:'',qty:1,amount:''});refreshItemRows();break;case 'remove-item':state.items.splice(Number(btn.dataset.index),1);refreshItemRows();break;case 'remove-photo':state.editingReceipt=null;$('#receipt-status').innerHTML='';break;case 'confirm-pending':await pendingConfirm();break;case 'cancel-pending':state.pending=null;chatAdd('assistant','Lançamento cancelado; nada foi salvo.');await saveSettings();render();break;case 'edit-pending':openPendingForEdit(btn.dataset.index||0);break;case 'remove-pending':await removePendingRow(btn.dataset.index);break;case 'clear-chat':if(confirm('Apagar o histórico da conversa neste dispositivo? Isso não apaga transações.')){state.settings.chat=[];state.pending=null;await saveSettings();render()}break;case 'voice':startSpeech();break;case 'voice-consent':state.settings.voiceConsent=true;closeOverlay();beginSpeech();await saveSettings();break;}}
function voiceErrorMessage(code){
 const errors={
 'not-allowed':'Acesso ao microfone negado. Permita o microfone nas configurações deste site e nas configurações de privacidade do Windows/Android.',
 'service-not-allowed':'Este navegador bloqueou o serviço de reconhecimento de voz. Teste Chrome/Edge ou o ditado do teclado (Windows: Win + H).',
 'audio-capture':'Nenhum microfone disponível. Confira se o microfone está conectado e permitido no sistema.',
 'no-speech':'Não consegui ouvir sua fala. Clique novamente e fale perto do microfone.',
 'network':'O serviço de reconhecimento de voz do navegador precisa de conexão e está indisponível agora.',
 'language-not-supported':'O reconhecimento de voz em português não é compatível com este navegador.',
 'aborted':'Ditado de voz cancelado.'
 };
 return errors[code]||'Não foi possível transcrever o áudio ('+String(code||'erro desconhecido')+'). Tente Chrome/Edge ou use o ditado do teclado.';
}
function updateVoiceControls(listening){
 const button=$('[data-action="voice"]');
 if(button){
  button.classList.toggle('voice-active',!!listening);
  button.setAttribute('aria-pressed',String(!!listening));
  button.setAttribute('aria-label',listening?'Parar de ouvir':'Ditado por voz');
  button.title=listening?'Parar ditado':'Iniciar ditado por voz';
 }
 const status=$('#voice-status');
 if(status){status.hidden=!listening;status.textContent=listening?'🎙️ Ouvindo... fale sua despesa. Clique novamente para parar.':''}
}
function beginSpeech(){
 const SR=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
 if(!SR){uiToast('Reconhecimento de voz não disponível neste navegador. No Windows use Win + H no campo de texto; no Android use o microfone do teclado.','error');return}
 if(voiceRecognition&&voiceActive){voiceRecognition.stop();return}
 if(!globalThis.isSecureContext){uiToast('O microfone exige conexão HTTPS. Abra o Meu Fluxo no endereço publicado, não no arquivo HTML local.','error');return}
 const rec=new SR();
 voiceRecognition=rec;
 rec.lang='pt-BR';
 rec.interimResults=false;
 rec.continuous=false;
 rec.maxAlternatives=1;
 let heard=false,failed=false;
 rec.onstart=()=>{voiceActive=true;updateVoiceControls(true);uiToast('Microfone ativado. Fale sua despesa e confira o texto antes de enviar.')};
 rec.onresult=event=>{
  let speech='';
  for(let i=event.resultIndex||0;i<event.results.length;i++)if(event.results[i]?.[0]?.transcript)speech+=event.results[i][0].transcript+' ';
  speech=speech.trim();
  if(!speech)return;
  heard=true;
  const field=$('#chat-input');
  if(field){field.value=speech;field.focus();uiToast('Texto reconhecido. Confira e clique em Enviar para continuar.')}
 };
 rec.onerror=event=>{
  failed=true;
  if(event?.error!=='aborted')uiToast(voiceErrorMessage(event?.error),'error');
 };
 rec.onend=()=>{
  if(voiceRecognition===rec)voiceRecognition=null;
  voiceActive=false;updateVoiceControls(false);
  if(!heard&&!failed)uiToast('O ditado terminou sem texto. Tente falar novamente ou use o teclado.');
 };
 try{rec.start()}catch(err){voiceRecognition=null;voiceActive=false;updateVoiceControls(false);uiToast('Não foi possível iniciar o microfone: '+(err?.message||'verifique as permissões do site.'),'error')}
}
function startSpeech(){
 if(voiceActive&&voiceRecognition){voiceRecognition.stop();return}
 const SR=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
 if(!SR){uiToast('Este navegador não oferece reconhecimento de voz por esta API. Alternativas: Windows Win + H; Android microfone do teclado.','error');return}
 if(!globalThis.isSecureContext){uiToast('Abra o Meu Fluxo por HTTPS para permitir o microfone.','error');return}
 if(!state.settings.voiceConsent){
  openOverlay(`<div class="modal-head"><h2>Ditado por voz</h2><button type="button" class="icon-btn" data-action="close" aria-label="Fechar">${ico('close')}</button></div><p class="page-sub">O navegador pode enviar seu áudio a um serviço de reconhecimento online. O ditado pode não funcionar offline ou em alguns navegadores. O texto reconhecido será exibido para revisão antes de ser enviado ao assistente.</p><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close">Cancelar</button><button type="button" class="btn btn-primary" data-action="voice-consent">${ico('mic')} Concordar e falar</button></div>`);
  return;
 }
 beginSpeech();
}
let voiceRecognition=null,voiceActive=false;
function renderFilterTable(){const container=$('#page-content');if(container&&state.page==='transactions')container.innerHTML=transactionsHTML()}
document.addEventListener('click',async(evt)=>{const nav=evt.target.closest('[data-nav]');if(nav){closeProfileMenu();state.page=nav.dataset.nav;state.pending=null;render();window.scrollTo(0,0);return}const ex=evt.target.closest('[data-chat-example]');if(ex){await handleChat(ex.dataset.chatExample);return}const type=evt.target.closest('[data-type]');if(type){$('#entry-type').value=type.dataset.type;$$('[data-type]').forEach(x=>x.classList.toggle('active',x.dataset.type===type.dataset.type));if(!state.editId)$('#entry-category').value=classify($('#entry-title').value,type.dataset.type);return}const action=evt.target.closest('[data-action]');if(action){try{await onAction(action)}catch(e){console.error(e);uiToast(e?.message||'Não foi possível concluir a operação.','error')}return}if(!evt.target.closest('.profile-control'))closeProfileMenu();if(evt.target.id==='modal-backdrop')closeOverlay()});
document.addEventListener('input',e=>{if(e.target.matches('[data-item-field]')){const i=Number(e.target.dataset.itemIndex);state.items[i][e.target.dataset.itemField]=e.target.value}if(e.target.id==='filter-query'){state.filter.q=e.target.value;const start=e.target.selectionStart;renderFilterTable();const el=$('#filter-query');el?.focus();el?.setSelectionRange(start,start)}if(e.target.id==='entry-title'&&!state.editId){const select=$('#entry-category');if(select)select.value=classify(e.target.value,$('#entry-type').value)}});
document.addEventListener('change',async e=>{try{if(e.target.id==='month-pick'&&/^\d{4}-\d{2}$/.test(e.target.value)){state.month=e.target.value;render()}else if(e.target.id==='filter-type'){state.filter.type=e.target.value;renderFilterTable()}else if(e.target.id==='filter-cat'){state.filter.category=e.target.value;renderFilterTable()}else if(e.target.id==='theme-select'){state.settings.theme=e.target.value;await saveSettings();render()}else if(e.target.id==='method-select'){state.settings.defaultMethod=e.target.value;await saveSettings();render()}else if(e.target.id==='entry-receipt'){await processReceipt(e.target.files[0])}}catch(err){uiToast(err.message,'error')}});
document.addEventListener('submit',async evt=>{try{if(evt.target.id==='entry-form'){evt.preventDefault();await handleEntrySubmit()}else if(evt.target.id==='pending-edit-form'){evt.preventDefault();submitPendingEdit(evt.target)}else if(evt.target.id==='chat-form'){evt.preventDefault();const field=$('#chat-input');await handleChat(field.value)}else if(evt.target.id==='budget-form'){evt.preventDefault();const budgets={};for(const input of $$('[data-budget-cat]')){const raw=input.value.trim();if(raw){const value=parseCents(raw);if(!value)throw Error(`Limite inválido para ${input.dataset.budgetCat}.`);budgets[input.dataset.budgetCat]=value}}state.settings.budgets=budgets;await saveSettings();closeOverlay();render();uiToast('Limites atualizados.')}}catch(err){console.error(err);uiToast(err?.message||'Falha ao salvar.','error')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeProfileMenu();if($('#overlay').children.length)closeOverlay()}});
async function init(){try{activeProfile=loadSelectedProfile();await openDB();await reload();render();await initGoogleSession();if(localFallback)uiToast('IndexedDB indisponível: modo de armazenamento local simplificado. Faça backups frequentes.');if('serviceWorker' in navigator&&location.protocol!=='file:'){navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Service Worker:',e))}}catch(err){console.error(err);$('#app').innerHTML=`<div class="empty"><strong>Não foi possível iniciar o aplicativo.</strong>Verifique as permissões de armazenamento do navegador e tente novamente.</div>`}}
init();
