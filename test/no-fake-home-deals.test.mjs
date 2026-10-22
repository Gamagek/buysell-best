import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("production local listings never merge synthetic used products into real classified data",async()=>{
 const app=await readFile("js/app.js","utf8");
 assert.match(app,/const LISTINGS=\[\];/);
 assert.doesNotMatch(app,/demo-iphone-15|demo-s24|demo-laptop/);
 assert.doesNotMatch(app,/dummyjson\.com\/products/);
 assert.match(app,/No verified local classifieds are listed/);
 assert.match(app,/api\/listings\?limit=20/,"real local listings remain intact");
});
test("global deals are not overridden with unsupported catalogue previews",async()=>{
 const source=await readFile("data/global-deals.js","utf8");
 assert.match(source,/container\.querySelector\("\.flash-global-deals"\)/);
 assert.match(source,/!live\.temporary/);
 assert.match(source,/Verified offers pending/);
 assert.doesNotMatch(source,/FALLBACK_DEALS\.map\(renderDealCard\)/);
});
test("market pulse doesn't label expired October events as active 2026 offers",async()=>{
 const source=await readFile("data/market-timeline.js","utf8");
 assert.doesNotMatch(source,/Live before Oct 6|Oct 6–7, 2026|More deals start Oct 5/);
 assert.doesNotMatch(source,/state:"NOW"/);
 assert.match(source,/Actual daily verified USD deal cards/);
});
test("Adsterra sponsored click remains in place on the website",async()=>{
 const source=await readFile("js/sponsored-click.js","utf8");
 assert.match(source,/data-sponsored-navigation/);
 assert.match(source,/NATIVE_SCRIPT/);
 assert.match(source,/Continue to /);
});
