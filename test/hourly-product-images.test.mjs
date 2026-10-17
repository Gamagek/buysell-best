import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {SHOPPING_PRODUCTS,SHOPPING_GUIDES,renderShoppingGuide,guideSitemapEntries,guidePath} from '../lib/shopping-guides.js';

const ORIGIN='https://buysell.best';
test('seller photo provenance is never replaced by an illustrative candidate thumbnail',async()=>{
 const seller=SHOPPING_PRODUCTS.filter(p=>p.details);
 assert.equal(seller.length,20);
 for(const p of seller){
  assert.ok(p.image?.sourceUrl,p.id);
  assert.match(p.image.src,/\.webp$/);
  assert.equal(p.image.listingUrl,p.merchantUrl);
 }
});

test('hourly image sync preserves catalogue and approved image provenance',async()=>{
 const workflow=await readFile('.github/workflows/hourly-product-images.yml','utf8');
 const generator=await readFile('scripts/sync-editorial-product-images.mjs','utf8');
 assert.match(workflow,/17 \* \* \* \*/);
 assert.ok(workflow.includes('node scripts/sync-editorial-product-images.mjs'));
 assert.ok(workflow.includes('npm run content:export'));
 assert.ok(workflow.includes('npm test'));
 assert.ok(workflow.includes('git diff --cached --quiet'));
 assert.ok(generator.includes("if(product.details)continue"));
 assert.ok(generator.includes("not the actual AliExpress seller item"));
});

test('editorial concept thumbnails are honest image files with no broken product-detail links',async()=>{
 const concepts=SHOPPING_PRODUCTS.filter(p=>p.image?.kind==='editorial-concept');
 const catalog=await readFile('content/shopping-catalog.json','utf8');
 assert.ok(catalog.includes('"products"'));
 assert.ok(SHOPPING_PRODUCTS.every(p=>Boolean(p.image)) || concepts.length===0,
 'Once the first image job is run, no guide candidate should lack an image');
 for(const product of concepts){
  assert.match(product.image.src,/^\/assets\/products\/editorial\/[a-z0-9-]+\.svg$/);
  assert.match(product.image.alt,/not a photograph/);
  const svg=await readFile('.'+product.image.src,'utf8');
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('NOT AN ACTUAL SELLER PRODUCT PHOTO'));
  assert.ok(svg.includes('not the actual AliExpress seller item'));
  assert.ok(!/<script|onload=|<foreignObject/i.test(svg));
 }
 if(!concepts.length)return;
 assert.equal(concepts.length,51);
 const guide=SHOPPING_GUIDES.find(g=>g.selection.some(s=>concepts.find(p=>p.id===s.productId)));
 const html=renderShoppingGuide(guide),doc=new JSDOM(html,{url:ORIGIN+guidePath(guide)}).window.document;
 assert.ok(doc.querySelector('.shopping-product-photo figcaption').textContent.includes('Original illustrative concept') ||
  [...doc.querySelectorAll('.shopping-product-photo figcaption')].some(x=>x.textContent.includes('Original illustrative concept')));
 assert.equal(doc.querySelectorAll('.shopping-product-photo a[href^="/products/"]').length,
  guide.selection.filter(s=>SHOPPING_PRODUCTS.some(p=>p.id===s.productId&&p.details)).length);
});

test('image sitemap includes every newly illustrated guide product when generated',async()=>{
 const maps=guideSitemapEntries(),xml=new JSDOM('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+maps+'</urlset>',{contentType:'application/xml'}).window.document;
 const fallback=await readFile('sitemap.xml','utf8');
 const illustrated=SHOPPING_PRODUCTS.filter(p=>p.image?.kind==='editorial-concept');
 for(const guide of SHOPPING_GUIDES){
  const entry=[...xml.querySelectorAll('url')].find(e=>e.querySelector('loc')?.textContent===ORIGIN+guidePath(guide));
  assert.ok(entry,guide.slug);
  for(const selection of guide.selection){
   const image=SHOPPING_PRODUCTS.find(p=>p.id===selection.productId)?.image;
   if(image)assert.ok([...entry.getElementsByTagNameNS('http://www.google.com/schemas/sitemap-image/1.1','loc')].some(n=>n.textContent===ORIGIN+image.src),guide.slug);
  }
 }
 if(illustrated.length){
  for(const product of illustrated){
   assert.ok(fallback.includes(ORIGIN+product.image.src),'fallback sitemap missing '+product.id);
  }
 }
});
