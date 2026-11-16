import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deadline} from '../src/deadline.mjs';
test('operação nativa travada termina com erro, sem aguardar para sempre',async()=>{
 await assert.rejects(deadline(new Promise(()=>{}),20,'Tempo excedido'),/Tempo excedido/);
});
test('resposta tardia após timeout não se torna sucesso',async()=>{
 let finish;const task=new Promise(resolve=>{finish=resolve});
 await assert.rejects(deadline(task,10,'Tempo excedido'),/Tempo excedido/);
 finish('tarde');
 assert.equal(await deadline(Promise.resolve('ok'),100,'erro'),'ok');
});
