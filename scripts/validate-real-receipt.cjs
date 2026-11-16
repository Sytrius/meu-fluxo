// Runs the production capture module in Chrome with the real, local OCR worker.
// Photos are supplied locally and are never uploaded or committed.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../meu-fluxo-app');
const fixture=require('../meu-fluxo-app/tests/fixtures/receipt-27-expected.json');
const args=process.argv.slice(2),photos=args.slice(0,2);
if(photos.length!==2){console.error('Usage: node scripts/validate-real-receipt.cjs TOP.jpg BOTTOM.jpg [report.json]');process.exit(2)}
const files=photos.map(p=>fs.readFileSync(p)),hashes=files.map(b=>crypto.createHash('sha256').update(b).digest('hex'));
if(hashes.some((h,i)=>h!==fixture.sourceSha256[i]))throw Error('Photos do not match the reviewed 27-item fixture (check order).');
const deps={
 '/vendor/ocr/tesseract.min.js':require.resolve('tesseract.js/dist/tesseract.min.js'),
 '/vendor/ocr/worker.min.js':require.resolve('tesseract.js/dist/worker.min.js')
};
const core=path.dirname(require.resolve('tesseract.js-core/package.json'));
const lang=path.dirname(require.resolve('@tesseract.js-data/por/package.json'));
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost').pathname;
 if(url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<form id="entry-form"></form><button data-action="receipt-multi-scan"></button><div id="receipt-ocr-status"></div><div id="receipt-ocr-review"></div>');return}
 let file=deps[url];
 if(/^\/vendor\/ocr\/core\/tesseract-core[\w.-]+$/.test(url))file=path.join(core,path.basename(url));
 if(url==='/vendor/ocr/lang/por.traineddata.gz')file=path.join(lang,'4.0.0_best_int/por.traineddata.gz');
 if(['/receipts-v14.js','/receipt-multipage-v15.js','/receipt-capture-v15.js'].includes(url))file=path.join(root,path.basename(url));
 if(!file||!fs.existsSync(file)){res.statusCode=404;res.end();return}
 res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(()=>{
  globalThis.state={items:[],receiptOCRUsed:false};globalThis.$=q=>document.querySelector(q);
  globalThis.fmt=n=>(n/100).toFixed(2);globalThis.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 });
 for(const name of ['receipts-v14.js','receipt-multipage-v15.js','receipt-capture-v15.js'])await page.addScriptTag({url:'/'+name});
 const result=await page.evaluate(async sources=>{
  const images=[];
  // Reproduce the production JPEG compression for these 738x1600 inputs.
  for(const uri of sources){const image=new Image();await new Promise((ok,fail)=>{image.onload=ok;image.onerror=fail;image.src=uri});const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);images.push(c.toDataURL('image/jpeg',.86))}
  MeuFluxoReceiptCapture.setUp({receiptPhotos:images});await MeuFluxoReceiptCapture.scan();return MeuFluxoReceiptCapture.getDraft();
 },files.map(b=>'data:image/jpeg;base64,'+b.toString('base64')));
 const exact=fixture.items.filter(g=>result.items.filter(i=>i.number===g.number&&i.qty===g.qty&&i.cents===g.net&&i.grossCents===g.gross&&i.discountCents===g.discount).length===1).length;
 const pass=exact===27&&result.items.length===27&&result.total===27248&&result.sum===27248&&result.balanced;
 const report={sourceSha256:hashes,engine:'tesseract.js 7.0.0 / por 4.0.0_best_int',productionCapture:true,expected:27,recognized:result.items.length,exactFinancialItems:exact,total:result.total,sum:result.sum,balanced:result.balanced,issues:result.issues,pass,note:'Exact financial fields only; product descriptions still require manual review.'};
 if(args[2])fs.writeFileSync(args[2],JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));process.exitCode=pass?0:1;
 }finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(error=>{console.error(error);process.exitCode=2});

