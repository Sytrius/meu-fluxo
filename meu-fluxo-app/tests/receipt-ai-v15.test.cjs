const test=require('node:test'),assert=require('node:assert/strict');
require('../receipt-hybrid-v15.js');
require('../receipt-ai-v15.js');
const ai=globalThis.MeuFluxoReceiptAI;
test('Gemini fica desabilitado sem App Check e não chama a rede',async()=>{
 assert.equal(ai.configured(),false);
 await assert.rejects(()=>ai.analyze(['data:image/jpeg;base64,QUJD']),/não habilitada/);
});
test('foto inválida ou lote excessivo falha antes de qualquer chamada online',async()=>{
 await assert.rejects(()=>ai.analyze([]),/1 a 8/);
 await assert.rejects(()=>ai.analyze(['https://evil.example/image.jpg']),/formato inválido/);
 await assert.rejects(()=>ai.analyze(Array(9).fill('data:image/jpeg;base64,QUJD')),/1 a 8/);
});
