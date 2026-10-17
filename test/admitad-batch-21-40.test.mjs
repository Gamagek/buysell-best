import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {
  EDITORIAL_PRODUCTS,editorialProductPath,renderEditorialProductPage,renderEditorialProductGrid,editorialSitemapEntries
} from '../lib/editorial-product-pages.js';
import {SHOPPING_PRODUCTS,SHOPPING_GUIDES,renderShoppingGuide} from '../lib/shopping-guides.js';

const origin='https://buysell.best';
const ids=["st-luggage-strap","st-pack-cover","st-umbrella-sleeve","ed-controller-switch","ed-controller-multi","ed-controller-wired","ed-audio-analog","ed-audio-usb","ed-audio-speaker","ed-projector-smart","ed-projector-lcd","ed-projector-battery","ed-mic-dynamic","ed-mic-condenser","ed-mic-wireless","ed-keyboard-mechanical","ed-keyboard-magnetic","ed-keyboard-slim","ed-stand-rotating","ed-stand-vertical"];
const itemIds=["1005012890883774","1005007955824229","1005011743025425","1005006215959751","1005008500550817","1005007185107783","1005005801911172","1005006425171300","1005007427213591","1005012765586533","1005012110049301","1005012935908391","1005006356702381",null,"1005005042094333","1005007921521644","1005008217715572","1005006702683329","1005012494685405","1005006108235341"];
test('worksheet rows 21–40 use 19 supplied tracking links and leave FIFINE K669B fallback unmodified',async()=>{
  const overrides=JSON.parse(await readFile('content/affiliate-links.json','utf8'));
  assert.equal(EDITORIAL_PRODUCTS.length,20);
  assert.deepEqual(EDITORIAL_PRODUCTS.map(p=>p.id),ids);
  for(let i=0;i<20;i++){
    const id=ids[i],record=SHOPPING_PRODUCTS.find(p=>p.id===id);
    assert.ok(record);
    assert.equal(record.editorialPage,true);
    assert.ok(record.slug);
    assert.match(record.image.src,/^\/assets\/products\/editorial\/[a-z0-9-]+\.svg$/);
    assert.equal(record.image.kind,'editorial-concept');
    if(itemIds[i]){
      const dest=new URL(overrides[id]);
      assert.equal(dest.hostname,'rzekl.com');
      assert.equal(dest.pathname,'/g/1e8d1144948a33a283af16525dc3e8/');
      const original=new URL(dest.searchParams.get('ulp'));
      assert.equal(original.hostname,'www.aliexpress.com');
      assert.ok(original.pathname.endsWith('/'+itemIds[i]+'.html'),id+' wrong item ID');
      assert.ok(record.merchantUrl.endsWith('/'+itemIds[i]+'.html'),id+' merchant mismatch');
    } else {
      assert.equal(id,'ed-mic-condenser');
      assert.equal(overrides[id],undefined);
      assert.equal(record.linkKind,'search');
      assert.ok(record.merchantUrl.includes('/w/wholesale-'));
    }
  }
  // Prior batch must retain all its exact imported tracking URLs.
  for (const row of SHOPPING_PRODUCTS.filter(p=>p.details)) assert.ok(overrides[row.id]?.startsWith('https://rzekl.com/g/'));
});

test('twenty original, crawlable candidate pages have canonical URLs, useful content and correct image SEO',async()=>{
  const fallback=await readFile('sitemap.xml','utf8');
  for(const p of EDITORIAL_PRODUCTS){
    const url=origin+editorialProductPath(p);
    const doc=new JSDOM(renderEditorialProductPage(p),{url}).window.document;
    assert.equal(doc.querySelector('h1').textContent.includes(p.name),true);
    assert.equal(doc.querySelector('link[rel="canonical"]').href,url);
    assert.match(doc.querySelector('meta[name="robots"]').content,/index,follow,max-image-preview/);
    assert.equal(doc.querySelector('meta[property="og:image"]').content,origin+p.image.src);
    assert.equal(doc.querySelector('meta[property="og:image:width"]').content,'1200');
    assert.equal(doc.querySelector('meta[property="og:image:height"]').content,'800');
    assert.equal(doc.querySelector('meta[property="og:image:alt"]').content,p.image.alt);
    assert.equal(doc.querySelector('.shopping-detail-image img').src,origin+p.image.src);
    assert.ok(doc.querySelector('figcaption').textContent.includes('not a seller photograph'),p.id);
    const ld=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(x=>JSON.parse(x.textContent));
    assert.equal(ld[0]['@type'],'Article');
    assert.equal(ld[0].datePublished,'2026-10-17');
    assert.ok(!ld.some(x=>x['@type']==='Product'&&x.offers),'no invented offer schema');
    assert.ok(doc.querySelector('a[data-sponsored-navigation][data-shopping-product="'+p.id+'"]'));
    assert.ok(doc.querySelectorAll('.shopping-prose section').length>=5);
    assert.ok(doc.querySelector('main').textContent.trim().split(/\s+/).length>=340,p.id+' thin article');
    assert.ok(fallback.includes('<loc>'+url+'</loc>'),p.id+' sitemap not updated');
    assert.ok(fallback.includes('<image:loc>'+origin+p.image.src+'</image:loc>'),p.id+' image sitemap not updated');
  }
  assert.equal(new Set(EDITORIAL_PRODUCTS.map(p=>p.slug)).size,20);
  assert.equal((editorialSitemapEntries().match(/<url>/g)||[]).length,20);
  const index=new JSDOM(renderEditorialProductGrid()).window.document;
  assert.equal(index.querySelectorAll('.shopping-card').length,20);
});

test('each candidate is linked from its original buying guide and no existing ads config was changed',async()=>{
  for(const p of EDITORIAL_PRODUCTS){
    const guide=SHOPPING_GUIDES.find(g=>g.selection.some(c=>c.productId===p.id));
    assert.ok(guide,p.id+' missing buying guide');
    assert.ok(renderShoppingGuide(guide).includes('href="'+editorialProductPath(p)+'"'),p.id+' not internally linked');
  }
  const worker=await readFile('worker.js','utf8');
  assert.ok(worker.includes('renderEditorialProductPage(editorial)'));
  assert.ok(worker.includes('editorialSitemapEntries()'));
  const ads=await readFile('lib/display-ads.js','utf8');
  const sponsored=await readFile('js/sponsored-click.js','utf8');
  assert.ok(ads.includes('ad'));
  assert.ok(sponsored.includes('data-sponsored-navigation'));
});
