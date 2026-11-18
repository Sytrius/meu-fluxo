const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve(process.argv[2], 'package.json'))('playwright');

const site = path.resolve(__dirname, '../www');
const types = { '.js':'text/javascript', '.html':'text/html', '.css':'text/css', '.svg':'image/svg+xml' };
const testOrigin = 'https://meu-fluxo.example';
async function serveApp(context) {
  await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.origin !== testOrigin) return route.abort();
  const file = path.resolve(site, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(site + path.sep)) return route.fulfill({ status:403 });
  try {
    return route.fulfill({ contentType:types[path.extname(file)] || 'application/octet-stream',body:await fs.readFile(file) });
  } catch { return route.fulfill({ status:404 }); }
  });
}

const item = (name, qty, unit, cents) => ({ name, qty, unit, cents });
function expense(id, date, title, items, category = 'Alimentação') {
  return {
    id, date, title, items, category, type:'expense', cents:items.reduce((sum,item) => sum + item.cents, 0),
    method:'Pix', nature:'variable', createdAt:'2026-08-01T00:00:00Z', updatedAt:'2026-08-01T00:00:00Z'
  };
}
const fixtures = [
  expense('sept', '2026-09-06', 'Mercado de setembro', [item('Arroz',500,'g',450),item('Banana',1,'kg',730)]),
  expense('oct', '2026-10-04', 'Mercado de outubro', [item('Banana',1,'kg',705)]),
  expense('nov', '2026-11-05', 'Feira de novembro', [item('Arroz',1,'kg',1200),item('Feijão',2,'kg',1990)]),
  expense('refill', '2026-11-23', 'Reposição do mercado', [item('Arroz',500,'g',600)]),
  expense('food', '2026-11-07', 'Restaurante Exemplo', [item('Almoço',1,'un',5000)])
];

async function seed(context, url) {
  const page = await context.newPage();
  await page.goto(url);
  await page.getByRole('heading', {name:/Visão geral/}).waitFor();
  await page.evaluate(entries => new Promise((resolve, reject) => {
    const open = indexedDB.open('meu-fluxo-v1',1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('transactions','readwrite');
      const store = tx.objectStore('transactions');
      for (const entry of entries) store.put(entry);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }), fixtures);
  await page.reload();
  return page;
}

const nav = (page, label) => page.locator('.mobile-nav').getByRole('button',{name:label,exact:true});
const compact = text => text.replace(/\s+/g, ' ');
async function fit(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'A página ultrapassou a largura da tela.');
}

async function swipeLeft(page) {
  await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
  const deck = await page.locator('.market-total').boundingBox();
  const client = await page.context().newCDPSession(page);
  const x = Math.round(deck.x + deck.width * .8), y = Math.round(deck.y + deck.height / 2);
  try {
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for (let n=1;n<=5;n++) {
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x - n * 24,y}]});
    }
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } finally { await client.detach(); }
}

async function run(browser, url, width) {
  const context = await browser.newContext({ viewport:{width,height:820}, isMobile:true, hasTouch:true, deviceScaleFactor:2,
    locale:'pt-BR', serviceWorkers:'block' });
  await serveApp(context);
  await context.route('**/firebase-config.js', route => route.fulfill({ contentType:'text/javascript', body:'globalThis.MEU_FLUXO_FIREBASE_CONFIG={};' }));
  try {
    const page = await seed(context,url);
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await fit(page);
    console.log(await page.locator('.mobile-nav [data-nav="market"]').evaluate(button => {
      const rect = button.getBoundingClientRect();
      const bar = getComputedStyle(button.closest('.mobile-nav'));
      const hit = document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
      return { width:innerWidth, height:innerHeight, viewport:visualViewport.height, scale:visualViewport.scale,
        scrollWidth:document.documentElement.scrollWidth, rect:rect.toJSON(), position:bar.position, z:bar.zIndex, hit:hit?.className };
    }));
    await nav(page,'Mercado').tap();
    assert.match(await page.locator('#market-month-label').textContent(),/novembro/i);
    assert.deepEqual(await page.locator('.market-purchase time').allTextContents(),['05/11/2026','23/11/2026']);
    assert.deepEqual(await page.locator('.market-purchase .market-label').allTextContents(),['Compra principal','Reposição']);
    assert.match(compact(await page.locator('.market-history').innerText()),/R\$ 12,00 por kg.*\+33,3%.*setembro/i);
    assert.equal(await page.locator('.market-graph circle').count(),2);
    await fit(page);

    await page.getByRole('button',{name:'Mês anterior',exact:true}).tap();
    assert.match(await page.locator('#market-month-label').textContent(),/outubro/i);
    await page.getByRole('button',{name:'Mês anterior',exact:true}).tap();
    assert.match(await page.locator('#market-month-label').textContent(),/setembro/i);
    await swipeLeft(page);
    await page.getByRole('heading',{name:'outubro de 2026', exact:true}).waitFor();
    await page.getByRole('button',{name:'Próximo mês',exact:true}).tap();

    await nav(page,'Transações').tap();
    await page.getByRole('button',{name:'Editar Reposição do mercado',exact:true}).tap();
    const modal = page.getByRole('dialog');
    assert.equal(await modal.locator('#entry-amount').inputValue(),'6,00');
    await modal.locator('#entry-date').fill('2026-11-24');
    const value = modal.getByRole('textbox',{name:'Valor total do item 1'});
    await value.fill('7,50');
    await modal.getByRole('button',{name:'Adicionar item',exact:true}).tap();
    assert.equal(await value.inputValue(),'7,50');
    await modal.getByRole('button',{name:'Remover item',exact:true}).last().tap();
    assert.equal(await value.inputValue(),'7,50');
    await modal.getByRole('button',{name:'Usar soma dos itens',exact:true}).tap();
    assert.equal(await modal.locator('#entry-amount').inputValue(),'7,50');
    await modal.locator('#entry-market-kind').selectOption('reposicao');
    await fit(page);
    await modal.getByRole('button',{name:'Salvar alterações',exact:true}).tap();
    await modal.waitFor({state:'hidden'});
    await page.reload();
    await nav(page,'Mercado').tap();
    assert.deepEqual(await page.locator('.market-purchase time').allTextContents(),['05/11/2026','24/11/2026']);
    assert.match(compact(await page.locator('.market-history').innerText()),/R\$ 13,00 por kg.*\+44,4%/);
    assert.equal(await page.locator('.market-purchase').count(),2);

    for (const title of ['Orçamentos','Contas','Cartões','Configurações']) {
      await page.locator('.mobile-more summary').tap();
      await nav(page,title).tap();
      await page.locator('#page-content h1').waitFor();
      await fit(page);
    }
    assert.equal(await page.getByText('Leitura com IA — configuração do proprietário').count(),0);
    await nav(page,'Assistente').tap();
    await page.locator('#page-content h1').waitFor();
    await fit(page);
    assert.deepEqual(errors,[]);
    console.log(`Tela ${width}px: navegação, toque horizontal, preços por kg, edição persistente e demais abas verificados.`);
  } finally { await context.close(); }
}

async function checkAdPlacement(browser,width) {
  const context = await browser.newContext({ viewport:{width,height:820}, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  await serveApp(context);
  await context.route('**/native.js', route => route.fulfill({contentType:'text/javascript',body:`
    const listeners = {};
    window.adSlots = [];
    window.emitBannerUnavailable = () => listeners.bannerUnavailable();
    window.MeuFluxoNative = { available:true, googleAuth:{ getCurrentUser:async () => ({user:null}) }, homeAds:{
      addListener:async (name,callback) => {listeners[name]=callback},
      setSlot:async frame => {window.adSlots.push(frame)},
      openPrivacy:async () => ({status:'test'})
    }};
  `}));
  try {
    const page = await context.newPage();
    await page.goto(testOrigin);
    const band = page.locator('#home-ad-band');
    await band.waitFor({state:'visible'});
    await fit(page);
    const geometry = await page.evaluate(() => {
      const slot = document.querySelector('.home-ad-slot').getBoundingClientRect();
      const button = document.querySelector('.mobile-nav button').getBoundingClientRect();
      return {width:slot.width,height:slot.height,gap:button.top-slot.bottom,last:adSlots.at(-1)};
    });
    assert.ok(geometry.width >= 320 && geometry.height === 50 && geometry.gap >= 12);
    assert.equal(geometry.last.visible,true);
    await page.getByRole('button',{name:'Novo lançamento',exact:true}).tap();
    await band.waitFor({state:'hidden'});
    assert.equal(await page.evaluate(() => adSlots.at(-1).visible),false);
    await page.getByRole('button',{name:'Cancelar',exact:true}).tap();
    await band.waitFor({state:'visible'});
    await page.locator('.mobile-more summary').tap();
    await band.waitFor({state:'hidden'});
    await page.locator('.mobile-more summary').tap();
    await band.waitFor({state:'visible'});
    await nav(page,'Mercado').tap();
    await band.waitFor({state:'detached'});
    assert.equal(await page.evaluate(() => adSlots.at(-1).visible),false);
    await nav(page,'Início').tap();
    await band.waitFor({state:'visible'});
    await page.evaluate(() => emitBannerUnavailable());
    await band.waitFor({state:'hidden'});
    await fit(page);
    console.log(`Publicidade ${width}px: área própria, separação do menu e ocultação ao editar, navegar ou ficar sem anúncio.`);
  } finally { await context.close(); }
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch(process.env.MEU_FLUXO_TEST_CHROME ? {channel:'chrome'} : {});
    for (const width of [320,390]) {
      await run(browser,testOrigin,width);
      await checkAdPlacement(browser,width);
    }
  } finally {
    await browser?.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
