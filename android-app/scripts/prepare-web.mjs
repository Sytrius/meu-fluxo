import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here=path.dirname(fileURLToPath(import.meta.url));
const mobile=path.resolve(here,'..');
const source=path.resolve(mobile,'../meu-fluxo-app');
const dest=path.resolve(mobile,'www');
await fs.rm(dest,{recursive:true,force:true});
await fs.mkdir(dest,{recursive:true});
await fs.cp(source,dest,{
  recursive:true,
  filter:(file)=>{
    const relative=path.relative(source,file);
    if (!relative) return true;
    const parts=relative.split(path.sep);
    if(parts.some(x=>['tests','.git','node_modules'].includes(x))) return false;
    if(file.endsWith('.md')||file.endsWith('.cjs'))return false;
    return true;
  }
});
const index=path.join(dest,'index.html');
const html=await fs.readFile(index,'utf8');
if(!html.includes('<script src="app.js" defer></script>'))throw new Error('HTML principal mudou: revisão do adaptador nativo necessária.');
const updated=html.replace('<script src="app.js" defer></script>','<script src="native.js" defer></script>\n  <script src="app.js" defer></script>');
await fs.writeFile(index,updated);
const appJs=path.join(dest,'app.js');
const js=await fs.readFile(appJs,'utf8');
if(!js.includes("if('serviceWorker' in navigator&&location.protocol!=='file:')"))throw new Error('Registro do Service Worker mudou.');
await fs.writeFile(appJs,js.replace("if('serviceWorker' in navigator&&location.protocol!=='file:')",
  "if(!globalThis.MeuFluxoNative?.available&&'serviceWorker' in navigator&&location.protocol!=='file:')"));
await build({
  entryPoints:[path.resolve(mobile,'src/native.mjs')],
  bundle:true,
  platform:'browser',
  format:'iife',
  target:'es2022',
  outfile:path.resolve(dest,'native.js'),
  minify:true,
  logLevel:'info'
});
console.log('Pacote web offline copiado e ponte Android integrada.');
