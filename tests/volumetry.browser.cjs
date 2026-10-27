// Run with: node --test tests/volumetry.browser.cjs (requires Playwright).
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const root = path.join(__dirname, '..');
const engine = process.env.BROWSER_ENGINE || 'chromium';
const evidence = path.resolve(process.env.VOLUMETRY_EVIDENCE || 'test-results/volumetry', engine);
const currentWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const cacheName = currentWorker.match(/const CACHE\s*=\s*'([^']+)'/)[1];
let browser, server, origin, legacy = false, disconnected = false, droppedRequests = 0;

before(async () => {
 fs.mkdirSync(evidence, {recursive:true});
 server = http.createServer((req, res) => {
  // A real connection failure also works in WebKit, whose offline emulation
  // can reject navigation before allowing its service worker to respond.
  if (disconnected) {droppedRequests++; res.destroy(); return;}
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  try {
   let body = fs.readFileSync(file);
   if (legacy && file.endsWith('/index.html')) body = body.toString().replace('<link rel="stylesheet" href="./volumetry-mobile.css">', '');
   if (legacy && file.endsWith('/sw.js')) body = currentWorker
    .replace(cacheName, 'riverlab-v2-volumetry-1').replace(", './volumetry-mobile.css'", '');
   res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.webmanifest') ? 'application/manifest+json' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html');
   res.setHeader('Cache-Control', 'no-cache');
   res.end(body);
  } catch {res.writeHead(404).end();}
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 origin = 'http://127.0.0.1:' + server.address().port;
 const options = process.env.CHROMIUM_EXECUTABLE_PATH && engine === 'chromium' ? {
  executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
  args:['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
 } : {};
 browser = await playwright[engine].launch(options);
});
after(async () => {
 await browser?.close();
 if (server) await new Promise(resolve => server.close(resolve));
});

async function ready(page) {
 await page.waitForFunction(() => !!window.__riverlab && !!navigator.serviceWorker.controller);
 await page.evaluate(() => window.__riverlab.pauseGameplay());
}

// Deterministic display fixtures use the real renderer and real hint evaluator.
// They only set test state; no application source or poker rule is replaced.
async function scene(page, phase, language = 'es') {
 await page.evaluate(({phase, language}) => {
  clearTimers();
  const app = window.__riverlab, s = app.state;
  s.autoplay = false; s.hintsEnabled = true; s.currentBet = 2; s.minRaise = 2;
  s.turn = 0; s.turnStart = Date.now(); s.heroBank = 20; s.bankAtStart = 20;
  s.players.forEach(p => Object.assign(p, {stack:198, bet:2, invested:2, folded:false, allIn:false, acted:false, action:'check'}));
  s.players[0].cards = [{r:14,s:'s'}, {r:10,s:'s'}];
  const board = [{r:13,s:'s'}, {r:12,s:'s'}, {r:2,s:'d'}, {r:3,s:'c'}, {r:11,s:'s'}];
  s.board = board.slice(0, phase === 'preflop' ? 0 : phase === 'flop' ? 3 : phase === 'turn' ? 4 : 5);
  s.phase = phase === 'folded' ? 'river' : phase;
  if (phase === 'folded') s.players[0].folded = true;
  app.setLanguage(language); render(); app.pauseGameplay();
 }, {phase, language});
}

async function composition(page) {
 return page.evaluate(() => {
  const rect = e => e.getBoundingClientRect();
  const selectors = ['.hint-strength','.hint-explanation','.hint-message','.hint-draws','.hint-disclaimer','.hint-card > span','.hint-card > small'];
  const text = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(e => ({
   selector, text:e.textContent, font:parseFloat(getComputedStyle(e).fontSize),
   clipped:e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1
  })));
  const targets = [...document.querySelectorAll('.action-btn,.size-preset,.room-action,.nav-btn,#language-select,#raise-slider')].map(e => ({
   name:e.id || e.textContent, height:rect(e).height, width:rect(e).width,
   primary:e.matches('.action-btn,.size-preset,#raise-slider'),
   clipped:e.scrollWidth > e.clientWidth + 1
  }));
  const visible = ['.seat-hole','.player-body','.seat-action','.seat-chip','.hero-hand-badge','.community .card','.pot-display','.board-state','#hand-hints','.room-action'];
  const boxes = visible.flatMap(selector => [...document.querySelectorAll(selector)].map(e => ({selector, ...rect(e).toJSON()})));
  const overlap = [];
  for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) {
   const a=boxes[i], b=boxes[j];
   if (Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1) overlap.push([a.selector,b.selector]);
  }
  return {viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth, text, targets, overlap,
   hintHeight:rect(document.querySelector('#hand-hints')).height,
   cards:document.querySelectorAll('.hint-card').length,
   accessibleCards:[...document.querySelectorAll('.community .card:not(.empty),.hero .card')].every(e => !!e.getAttribute('aria-label'))};
 });
}

for (const [width,height] of [[390,844], [320,640]]) {
 test(`${engine}: ${width} × ${height}, pistas completas y acciones accesibles`, async () => {
  const context = await browser.newContext({viewport:{width,height}, isMobile:true, hasTouch:true});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
   await page.goto(origin); await ready(page);
   assert.equal(await page.locator('link[href="./volumetry-mobile.css"]').count(), 1);
   const reports = [];
   for (const language of ['es','en']) for (const phase of ['preflop','flop','turn','river','folded']) {
    await scene(page, phase, language);
    const report = await composition(page); reports.push({phase,language,...report});
    const label = `${width}/${language}/${phase}`;
    assert(report.scrollWidth <= width + 1, label + ': horizontal overflow');
    assert.deepEqual(report.overlap, [], label + ': overlapping table/hint/control content');
    assert(report.accessibleCards, label + ': cards need accessible names');
    assert.equal(report.cards, ['preflop','folded'].includes(phase) ? 0 : 5, label);
    for (const item of report.text) {
     assert(!item.clipped, label + ': clipped ' + item.selector + ': ' + item.text);
     const minimum = item.selector.endsWith('small') ? 9 : 12;
     assert(item.font >= minimum, label + ': unreadable ' + item.selector);
    }
    for (const target of report.targets) {
     assert(target.height >= (target.primary ? 44 : 24) && target.width >= 24, label + ': small target ' + target.name);
     assert(!target.clipped, label + ': clipped control ' + target.name);
    }
    await page.screenshot({path:path.join(evidence, `${width}-${language}-${phase}.png`), fullPage:true});
   }
   await scene(page, 'flop');
   assert.match(await page.locator('.hint-draws').innerText(), /color.*escalera/);
   const cards = await page.locator('.hero .card').allTextContents();
   await page.locator('#hint-toggle').click();
   assert.equal(await page.locator('#hand-hints').isHidden(), true);
   assert.deepEqual(await page.locator('.hero .card').allTextContents(), cards);
   await page.locator('#hint-toggle').click();
   assert.equal(await page.locator('#hand-hints').isVisible(), true);
   assert.equal(await page.locator('#hint-toggle').getAttribute('aria-pressed'), 'true');
   await page.locator('#fold-button').focus();
   await page.keyboard.press('Tab');
   assert.equal(await page.locator('#call-button').evaluate(e => e === document.activeElement), true);
   assert.equal(await page.locator('#call-button').evaluate(e => getComputedStyle(e).outlineStyle), 'solid');
   await page.screenshot({path:path.join(evidence, `${width}-actions.png`)});
   const events = await page.evaluate(() => window.__riverlab.state.handEvents.length);
   await page.locator('#call-button').click();
   assert(await page.evaluate(n => window.__riverlab.state.handEvents.length > n, events));
   assert.deepEqual(errors, []);
   fs.writeFileSync(path.join(evidence, `${width}-metrics.json`), JSON.stringify(reports,null,2));
  } finally {await context.close();}
 });
}

test(`${engine}: escritorio conserva los estilos previos de volumetría`, async () => {
 const context = await browser.newContext({viewport:{width:1366,height:768}});
 const page = await context.newPage();
 try {
  await page.goto(origin); await ready(page); await scene(page,'flop');
  const before = await page.locator('.shell,.table-area,#hand-hints,.action-btn').evaluateAll(nodes => nodes.map(e => ({
   width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize
  })));
  await page.locator('link[href="./volumetry-mobile.css"]').evaluate(e => {e.disabled=true});
  const after = await page.locator('.shell,.table-area,#hand-hints,.action-btn').evaluateAll(nodes => nodes.map(e => ({
   width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize
  })));
  assert.deepEqual(after,before);
 } finally {await context.close();}
});

test(`${engine}: la actualización PWA elimina caché antigua y funciona offline`, async () => {
 const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page = await context.newPage();
 try {
  legacy = true;
  await page.goto(origin); await ready(page);
  assert.equal(await page.locator('link[href="./volumetry-mobile.css"]').count(), 0);
  await page.evaluate(async () => {
   await (await caches.open('another-app')).put('/unrelated',new Response('keep'));
   localStorage.setItem('riverlab.v03.hints','1');
   window.__riverlab.saveSession();
  });
  const saved = await page.evaluate(() => localStorage.getItem('riverlab.v03.session'));
  legacy = false;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(async name => (await caches.keys()).includes(name) && !(await caches.keys()).includes('riverlab-v2-volumetry-1'), cacheName);
  await page.reload(); await ready(page);
  const entries = await page.evaluate(async name => (await (await caches.open(name)).keys()).map(request => new URL(request.url).pathname), cacheName);
  for (const file of ['/index.html','/volumetry.css','/volumetry-mobile.css','/bots.js','/sound.js']) assert(entries.includes(file), 'Missing offline resource ' + file);
  assert(await page.evaluate(() => caches.has('another-app')));
  assert.equal(await page.evaluate(() => localStorage.getItem('riverlab.v03.session')), saved);
  // Make the server unreachable, so the worker must serve every resource.
  droppedRequests = 0; disconnected = true;
  await page.reload(); await ready(page);
  assert.equal(await page.locator('link[href="./volumetry-mobile.css"]').count(), 1);
  await scene(page, 'flop');
  assert.equal(await page.locator('#fold-button').evaluate(e => getComputedStyle(e).minHeight), '44px');
  assert.equal(await page.locator('#hand-hints').isVisible(), true);
  assert.equal(await page.locator('.hint-card').count(), 5);
  assert.equal(await page.evaluate(() => !!window.RiverlabBots && !!window.RiverlabAudio), true);
  assert(droppedRequests > 0, 'Offline verification must include failed network requests');
  fs.writeFileSync(path.join(evidence,'offline-cache.json'), JSON.stringify(entries,null,2));
 } finally {legacy = false; disconnected = false; await context.close();}
});
