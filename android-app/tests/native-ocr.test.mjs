import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {deadline} from '../src/deadline.mjs';
const source=(await fs.readFile(new URL('../src/native.mjs',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
function bridge(fail=false){
 const writes=[],deleted=[],reads=[];
 const ctx={console,crypto:webcrypto,deadline,
 Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'android'},registerPlugin:()=>({}),
 Directory:{Cache:'CACHE'},Filesystem:{
 writeFile:async options=>{writes.push(options);return {uri:'file:///cache/'+options.path}},
 deleteFile:async options=>{deleted.push(options)}
 },App:{addListener:()=>Promise.resolve()},DocumentScanner:{},BarcodeScanner:{},BarcodeFormat:{},Script:{Latin:'LATIN'},
 TextRecognition:{processImage:async options=>{reads.push(options);if(fail)throw Error('Imagem ilegível');return {text:'ARROZ 10,00'}}}
 };
 vm.runInNewContext(source,ctx);
 return {api:ctx.MeuFluxoNative,writes,deleted,reads};
}
test('ponte transforma foto anexada em caminho local ML Kit e limpa somente a cópia',async()=>{
 const {api,writes,deleted,reads}=bridge();
 const original='data:image/jpeg;base64,QUJD';
 assert.equal(await api.recognizePhoto(original),'ARROZ 10,00');
 assert.equal(writes[0].data,'QUJD');assert.equal(writes[0].directory,'CACHE');
 assert.equal(reads[0].path,'file:///cache/'+writes[0].path);assert.equal(reads[0].script,'LATIN');
 assert.equal(deleted[0].path,writes[0].path);assert.notEqual(deleted[0].path,original);
});
test('falha do ML Kit também limpa apenas cache e retorna erro',async()=>{
 const {api,writes,deleted}=bridge(true);
 await assert.rejects(api.recognizePhoto('data:image/png;base64,QUJD'),/Imagem ilegível/);
 assert.equal(deleted[0].path,writes[0].path);
});
