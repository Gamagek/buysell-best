import test from "node:test";
import assert from "node:assert/strict";
import {parseFeed} from "../lib/flash-sale.js";
import {normalizeCatalogOffer} from "../lib/catalog-offers.js";
import {researchCategory,renderBuyingResearch,renderEditorialVisual} from "../lib/bulk-editorial.js";
const link="https://rzekl.com/g/verified123/?ulp=https%3A%2F%2Fwww.aliexpress.com%2Fitem%2F1005001234567890.html";
const nestedLink=(id="1005001234567890")=>"https://rzekl.com/g/verified123/?ulp="+encodeURIComponent("https://s.click.aliexpress.com/deep_link.htm?aff_short_key=example&dl_target_url="+encodeURIComponent("https://www.aliexpress.com/item/"+id+".html"));
const xml='<yml_catalog><shop><offers><offer id="1005001234567890"><name>Wireless Bluetooth Travel Headphones 2026</name><categoryId>112</categoryId><price>9.04</price><currencyId>USD</currencyId><picture>https://ae-pic-a1.aliexpress-media.com/kf/example.jpg</picture><url>'+link.replace(/&/g,'&amp;')+'</url></offer></offers></shop></yml_catalog>';
test("original Admitad XML catalogue accepts real tracking and does not invent a discount",()=>{
 const [raw]=parseFeed(xml); const product=normalizeCatalogOffer(raw);
 assert.equal(product.id,"1005001234567890");
 assert.equal(product.currency,"USD");
 assert.equal(product.discount,0);
 assert.equal(product.originalPrice,null);
 assert.equal(product.destination,link);
 assert.match(product.imageSource,/aliexpress-media.com/);
});
test("untracked AliExpress URLs and unrelated redirect links never become published products",()=>{
 const base={id:"1005001234567890",name:"Wireless Bluetooth Travel Headphones 2026",price:"9.04",currencyId:"USD",image:"https://ae-pic-a1.aliexpress-media.com/kf/example.jpg",url:link};
 assert.ok(normalizeCatalogOffer(base));
 assert.equal(normalizeCatalogOffer({...base,url:nestedLink()})?.id,"1005001234567890");
 assert.equal(normalizeCatalogOffer({...base,url:nestedLink("1005001234567888")}),null);
 for(const url of ["https://www.aliexpress.com/item/1005001234567890.html","https://evil.example/go","http://rzekl.com/g/verified123/?ulp=x","https://rzekl.com/g/verified123/?ulp=https%3A%2F%2Fevil.example%2Fx"])assert.equal(normalizeCatalogOffer({...base,url}),null,url);
 assert.equal(normalizeCatalogOffer({...base,currencyId:"LKR"}),null);
 assert.equal(normalizeCatalogOffer({...base,name:"Tobacco Vape Machine New"}),null);
});
test("category research and generated visual are editorial, not fake product photos or tested ratings",()=>{
 const product=normalizeCatalogOffer(parseFeed(xml)[0]);
 const research=renderBuyingResearch(product),art=renderEditorialVisual(product);
 assert.match(research,/Bluetooth codec/);
 assert.match(research,/not a first-hand test/);
 assert.doesNotMatch(research,/5 stars|tested and approved/i);
 assert.match(art,/<svg/);
 assert.match(art,/not an actual product photo/);
 assert.equal(researchCategory(product).name,"Audio accessories");
});
