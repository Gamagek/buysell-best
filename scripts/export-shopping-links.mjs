import {readFile,writeFile} from "node:fs/promises";
import {SHOPPING_GUIDES,SHOPPING_PRODUCTS,shoppingDestination,guideSitemapEntries} from "../lib/shopping-guides.js";
import {AFFILIATE_PRODUCTS,productSitemapEntries} from "../lib/affiliate-products.js";
import {travelSitemapEntries} from "../lib/travel-guides.js";
const quote = value => '"'+String(value??"").replace(/"/g,'""')+'"';
const rows = [["Product ID","Product","Link type","Merchant URL","Reference URL","Admitad affiliate URL (add here)","Related guides"]];
for(const product of SHOPPING_PRODUCTS) rows.push([product.id,product.name,product.linkKind,product.merchantUrl,product.referenceUrl,shoppingDestination(product)!==product.merchantUrl?shoppingDestination(product):"",SHOPPING_GUIDES.filter(g=>g.selection.some(c=>c.productId===product.id)).map(g=>"https://buysell.best/guides/"+g.slug+"/").join(" | ")]);
for(const product of AFFILIATE_PRODUCTS.filter(p=>!SHOPPING_PRODUCTS.some(item=>item.merchantUrl===p.sellerUrl))) rows.push([product.id,product.title,"item",product.sellerUrl,"User-supplied listing and promotional images",product.affiliateUrl,"https://buysell.best/products/"+product.slug+"/"]);
await writeFile(new URL("../shopping-links.csv",import.meta.url),'\ufeff'+rows.map(row=>row.map(quote).join(",")).join("\n")+"\n");
console.log("Exported "+(rows.length-1)+" product link records to shopping-links.csv");
// Keep the review worksheet current without claiming account-level Link Checker
// approval. Supplied deeplinks and structurally valid URLs are not that approval.
const reviewPath=new URL("../shopping-links-to-verify-2026-10-15.csv",import.meta.url);
function parseCsv(text) {
  const records=[];let row=[],value="",quoted=false;
  text=text.replace(/^\uFEFF/,"");
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(char==='"') {if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(char===","&&!quoted){row.push(value);value="";}
    else if(char==="\n"&&!quoted){row.push(value.replace(/\r$/,""));records.push(row);row=[];value="";}
    else value+=char;
  }
  if(value||row.length){row.push(value.replace(/\r$/,""));records.push(row);}
  return records;
}
const review=parseCsv(await readFile(reviewPath,"utf8"));
for(const row of review.slice(1)) {
  const product=SHOPPING_PRODUCTS.find(product=>product.id===row[0]);
  if(!product?.details)continue;
  const destination=shoppingDestination(product);
  const retainApproval=row[7]===product.merchantUrl&&row[8]===destination&&row[9]==="YES";
  row[1]=product.name;row[5]=product.referenceUrl;
  row[6]=SHOPPING_GUIDES.filter(g=>g.selection.some(c=>c.productId===product.id)).map(g=>"https://buysell.best/guides/"+g.slug+"/").join(" | ");
  row[7]=product.merchantUrl;row[8]=destination;row[9]=retainApproval?"YES":"NO";
  row[10]="Imported from uploaded document; exact listing title and hero image retrieved on 2026-10-15. "+(product.affiliateSource==="same-campaign-deeplink-template"?"Deeplink constructed with the same supplied campaign because this row contained a direct merchant URL. ":"")+(retainApproval?"Existing account-review YES retained for the unchanged destination; this export did not perform network approval.":"URL structure and item ID checked; Admitad account Link Checker/commission eligibility, live stock, seller, selected variant and shipping are not independently verified.");
}
await writeFile(reviewPath,'\ufeff'+review.map(row=>row.map(quote).join(",")).join("\n")+"\n");
console.log("Synced the first 20 review rows; account-level verification remains NO.");
const sitemapPath=new URL("../sitemap.xml",import.meta.url);
const old=await readFile(sitemapPath,"utf8");
const preserved=old.replace(/<url>\s*<loc>https:\/\/buysell\.best\/(?:guides|shopping-methodology|products|hotels|promo-codes)(?:\/|<)[\s\S]*?<\/url>/g,"");
await writeFile(sitemapPath,preserved.replace("</urlset>",productSitemapEntries()+guideSitemapEntries()+travelSitemapEntries()+"</urlset>"));
console.log("Updated the static fallback sitemap without removing existing marketplace URLs.");
