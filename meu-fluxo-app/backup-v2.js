/* Meu Fluxo 1.2 - compatibilidade de backups e identificação explícita de conflitos.
   O checksum detecta corrupção acidental; NÃO autentica um arquivo JSON sem criptografia. */
(function(root){
'use strict';
function signature(e){
 return JSON.stringify([
   e.type,e.title,e.cents,e.date,e.category,e.method||'Outro',e.merchant||'',
   e.note||'',e.nature||'variable',!!e.recurring,e.receipt||null,
   (e.items||[]).map(x=>[x.name,Number(x.qty),x.cents]),
   e.installment||null,e.deletedAt||null
 ]);
}
function compare(local,incoming){
 const existing=new Map(local.map(x=>[x.id,x]));
 const newEntries=[],identical=[],conflicts=[];
 for(const item of incoming){
  const old=existing.get(item.id);
  if(!old)newEntries.push(item);
  else if(signature(old)===signature(item))identical.push(item);
  else conflicts.push({local:old,backup:item,id:item.id});
 }
 return {newEntries,identical,conflicts};
}
async function sha256(text){
 if(!root.crypto?.subtle)throw Error('Verificação SHA-256 indisponível. Abra o aplicativo em HTTPS.');
 const hash=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
async function seal(backup){
 const {integrity:ignored,...base}=backup;
 if(base.schemaVersion!==2)throw Error('Versão incorreta ao gerar o backup.');
 return {...base,integrity:{algorithm:'SHA-256',checksum:await sha256(JSON.stringify(base))}};
}
async function verify(backup){
 if(!backup||typeof backup!=='object'||Array.isArray(backup))throw Error('Backup inválido.');
 if(backup.schemaVersion===1)return {legacy:true};
 if(backup.schemaVersion!==2)throw Error('Versão de backup não compatível.');
 const {integrity,...base}=backup;
 if(!integrity||integrity.algorithm!=='SHA-256'||typeof integrity.checksum!=='string'||!/^[a-f0-9]{64}$/.test(integrity.checksum))throw Error('Backup incompleto: verificação de integridade ausente.');
 if(await sha256(JSON.stringify(base))!==integrity.checksum)throw Error('Falha de integridade: arquivo de backup alterado ou corrompido. Nenhum dado foi importado.');
 return {legacy:false};
}
const api={signature,compare,seal,verify};
root.MeuFluxoBackups=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
