const test=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto=webcrypto;
const backups=require('../backup-v2.js');
const original={
 app:'meu-fluxo',schemaVersion:2,version:'1.2.0',exportedAt:'2026-11-15T12:00:00.000Z',
 profile:{kind:'local',id:'local',email:null},
 transactions:[{id:'tx1',type:'expense',title:'Mercado',date:'2026-11-15',category:'Alimentação',method:'Pix',cents:2000}],
 settings:{theme:'dark'}
};
test('backup v2 SHA-256 verifica arquivo intacto',async()=>{
 const sealed=await backups.seal(original);
 assert.equal(sealed.integrity.algorithm,'SHA-256');
 assert.equal(sealed.integrity.checksum.length,64);
 assert.deepEqual(await backups.verify(sealed),{legacy:false});
 assert.equal(original.integrity,undefined);
});
test('detecta conteúdo alterado no JSON antes da importação',async()=>{
 const sealed=await backups.seal(original);
 const broken=JSON.parse(JSON.stringify(sealed));
 broken.transactions[0].cents=999999;
 await assert.rejects(()=>backups.verify(broken),/integridade/);
});
test('detecta checksum ausente em backup v2',async()=>{
 await assert.rejects(()=>backups.verify(original),/integridade ausente/);
});
test('arquivos legados v1 ainda são aceitos',async()=>{
 assert.deepEqual(await backups.verify({...original,schemaVersion:1}),{legacy:true});
});
test('distingue registros novos, iguais e conflitos de edição',()=>{
 const base={...original.transactions[0]};
 const newer={...base,cents:2500};
 const review=backups.compare([base],[base,newer]);
 assert.equal(review.identical.length,1);
 assert.equal(review.conflicts.length,1);
});
test('exclusão deve aparecer como conflito, não desaparecer silenciosamente',()=>{
 const base={...original.transactions[0],deletedAt:null};
 const tombstone={...base,deletedAt:'2026-11-15T14:00:00.000Z'};
 const review=backups.compare([base],[tombstone]);
 assert.equal(review.conflicts.length,1);
 assert.equal(review.conflicts[0].backup.deletedAt,tombstone.deletedAt);
});
test('dados de preço e notas diferentes causam conflito',()=>{
 const base={...original.transactions[0],items:[{name:'Arroz',qty:1,cents:2000}],receipt:null};
 const different={...base,items:[{name:'Arroz',qty:2,cents:2000}]};
 assert.equal(backups.compare([base],[different]).conflicts.length,1);
});
