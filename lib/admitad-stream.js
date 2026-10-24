// Bounded, streaming Admitad CSV / XML feed selection.
// An oversized affiliate export must never be loaded into a single JS string.
// This module does NOT publish, invent, or review products: its caller performs
// provenance/affiliate/price filtering through normalizeOffer() before publishing.
const RAW_LIMIT = 2_000_000_000; // Absolute streaming cap, not an in-memory allocation.
const TEXT_LIMIT = 2_400_000_000; // Expanded gzip guard on GitHub runner only.
const JSON_LIMIT = 25_000_000;
const RECORD_LIMIT = 350_000;
const ROW_LIMIT = 256_000;

function csvFields(header) {
 const sample=header.replace(/^\ufeff/,"").replace(/\r$/,"");
 const separators=[",",";","\t","|","--"];
 let best=",",bestCount=0;
 for(const delimiter of separators){
  let quoted=false,count=0;
  for(let i=0;i<sample.length;i++){
   const c=sample[i];
   if(c==='"'){if(quoted&&sample[i+1]==='"')i++;else quoted=!quoted;}
   else if(!quoted&&sample.startsWith(delimiter,i)){count++;i+=delimiter.length-1;}
  }
  if(count>bestCount){bestCount=count;best=delimiter;}
 }
 return best;
}

function quoteParity(text){
 let count=0;
 for(let i=0;i<text.length;i++)if(text[i]==='"')count++;
 return (count&1)!==0;
}
async function* decodedChunks(response) {
 if(!response.body)throw new Error("FLASH_FEED_NO_STREAM");
 const original=response.body.getReader();
 const first=await original.read();
 if(first.done)return;
 let firstPending=first.value;
 let rawRead=0;
 const raw=new ReadableStream({
  async pull(controller){
   let next;
   if(firstPending){next={done:false,value:firstPending};firstPending=null;}
   else next=await original.read();
   if(next.done){controller.close();return;}
   rawRead+=next.value.byteLength;
   if(rawRead>RAW_LIMIT){
    controller.error(new Error("FLASH_FEED_RAW_TOO_LARGE"));
    await original.cancel().catch(()=>{});
    return;
   }
   controller.enqueue(next.value);
  },
  async cancel(){await original.cancel().catch(()=>{});}
 });
 // Admitad supplies both plain and .gz exports. Detect actual gzip magic,
 // rather than trusting a possibly stale content-encoding header.
 const gzip=first.value.length>1 && first.value[0]===0x1f&&first.value[1]===0x8b;
 if(gzip&&typeof DecompressionStream!=="function")throw new Error("FLASH_FEED_GZIP_UNSUPPORTED");
 const stream=gzip?raw.pipeThrough(new DecompressionStream("gzip")):raw;
 const reader=stream.getReader(),decoder=new TextDecoder("utf-8");
 let expanded=0;
 try{
  while(true){
   const next=await reader.read();
   if(next.done)break;
   expanded+=next.value.byteLength;
   if(expanded>TEXT_LIMIT)throw new Error("FLASH_FEED_EXPANDED_TOO_LARGE");
   yield decoder.decode(next.value,{stream:true});
  }
  const tail=decoder.decode();
  if(tail)yield tail;
 }finally{try{await reader.cancel();}catch{}}
}

async function* csvRecords(chunks) {
 let pending="";
 for await(const part of chunks){
  let start=0;
  for(let i=0;i<part.length;i++){
   if(part[i]!=="\n")continue;
   const segment=part.slice(start,i).replace(/\r$/,"");
   start=i+1;
   pending+=segment;
   if(pending.length>ROW_LIMIT)throw new Error("FLASH_FEED_ROW_TOO_LONG");
   if(quoteParity(pending))pending+="\n";
   else{if(pending.trim())yield pending;pending="";}
  }
  pending+=part.slice(start);
  if(pending.length>ROW_LIMIT)throw new Error("FLASH_FEED_ROW_TOO_LONG");
 }
 if(quoteParity(pending))throw new Error("FLASH_FEED_CSV_INCOMPLETE");
 if(pending.trim())yield pending;
}

async function* xmlRecords(chunks){
 let text="";
 for await(const chunk of chunks){
  text+=chunk;
  while(true){
   const open=/<(offer|product)\b[^>]*>/i.exec(text);
   if(!open){
    // XML document headers and catalog metadata are not product records.
    if(text.length>20_000)text=text.slice(-1024);
    break;
   }
   if(open.index>0)text=text.slice(open.index);
   const close="</"+open[1].toLowerCase()+">";
   const end=text.toLowerCase().indexOf(close,open[0].length);
   if(end<0){
    if(text.length>ROW_LIMIT)throw new Error("FLASH_FEED_ROW_TOO_LONG");
    break;
   }
   const record=text.slice(0,end+close.length);
   text=text.slice(end+close.length);
   yield record;
  }
 }
 if(/<(?:offer|product)\b/i.test(text))throw new Error("FLASH_FEED_XML_INCOMPLETE");
}

function pickTop(group,offer,perCategory){
 if(group.offers.some(row=>row.id===offer.id))return false;
 const rows=group.offers;
 rows.push(offer);
 rows.sort((a,b)=>b.discount-a.discount||a.price-b.price||String(a.id).localeCompare(String(b.id)));
 if(rows.length>perCategory)rows.length=perCategory;
 return true;
}

/**
 * Parse a large approved feed without allocating the entire export in memory.
 * Only the highest source-verified offers in a bounded number of categories
 * survive. Offer normalization is provided by the caller.
 *
 * Returning a completed snapshot means the entire eligible feed was processed.
 * Errors propagate and must leave the previously published snapshot intact.
 */
export async function streamVerifiedDeals(response,{parseFeed,normalizeOffer,now=new Date(),
 categories=150,perCategory=10,maxRecords=RECORD_LIMIT}={}){
 if(typeof parseFeed!=="function"||typeof normalizeOffer!=="function")throw new TypeError("feed parser required");
 const chunks=decodedChunks(response);
 const first=await chunks.next();
 if(first.done)throw new Error("FLASH_FEED_EMPTY");
 async function* everything(){
  yield first.value;
  for await(const piece of chunks)yield piece;
 }
 // Decompressed feeds may begin with a BOM and whitespace.
 let prefix=first.value.trimStart().replace(/^\ufeff/,"");
 if(!prefix){
  let text="";
  const iterator=everything()[Symbol.asyncIterator]();
  while(!text.trim()){
   const next=await iterator.next();
   if(next.done)throw new Error("FLASH_FEED_EMPTY");
   text+=next.value;
   if(text.length>ROW_LIMIT)throw new Error("FLASH_FEED_UNSUPPORTED_HEADER");
  }
  prefix=text.trimStart().replace(/^\ufeff/,"");
  async function* rest(){yield text;for await(const chunk of { [Symbol.asyncIterator](){return iterator;} })yield chunk;}
  return consume(prefix,rest(),{parseFeed,normalizeOffer,now,categories,perCategory,maxRecords});
 }
 return consume(prefix,everything(),{parseFeed,normalizeOffer,now,categories,perCategory,maxRecords});
}
async function consume(prefix,chunks,{parseFeed,normalizeOffer,now,categories,perCategory,maxRecords}){
 if(/^<!doctype\s+html|^<html[\s>]/i.test(prefix))throw new Error("FLASH_FEED_LOGIN_OR_HTML");
 let format=prefix.startsWith("<")?"xml":prefix.startsWith("[")||prefix.startsWith("{")?"json":"csv";
 if(format==="json"){
  let text="";
  for await(const chunk of chunks){
   text+=chunk;
   if(text.length>JSON_LIMIT)throw new Error("FLASH_FEED_JSON_TOO_LARGE");
  }
  const rows=parseFeed(text);
  return {groups:rankRows(rows,normalizeOffer,now,categories,perCategory),scanned:rows.length,format};
 }
 let scanned=0,eligible=0;
 const maxTracked=Math.max(categories,Math.min(categories*2,500));
 const buckets=new Map();
 const apply=(p)=>{
  if(!p)return;
  eligible++;
  let group=buckets.get(p.slug);
  if(!group){
   if(buckets.size>=maxTracked){
    let weakest=null,score=Infinity;
    for(const entry of buckets.values()){
     const top=entry.offers[0];
     const metric=top?.discount||0;
     if(metric<score){score=metric;weakest=entry;}
    }
    if(p.discount<=score)return;
    buckets.delete(weakest.slug);
   }
   group={name:p.category,slug:p.slug,offers:[]};
   buckets.set(p.slug,group);
  }
  pickTop(group,p,perCategory);
 };
 if(format==="csv"){
  let header=null;
  for await(const record of csvRecords(chunks)){
   if(!header){
    if(/^sep=[,;|\t]$/i.test(record.trim()))continue;
    header=record;continue;
   }
   scanned++;
   if(scanned>maxRecords)throw new Error("FLASH_FEED_RECORD_LIMIT");
   // Existing CSV semantics support quoted fields and all official delimiters.
   const data=parseFeed(header+"\n"+record);
   if(data[0])apply(normalizeOffer(data[0],now));
  }
 }else{
  for await(const record of xmlRecords(chunks)){
   scanned++;
   if(scanned>maxRecords)throw new Error("FLASH_FEED_RECORD_LIMIT");
   const data=parseFeed(record);
   if(data[0])apply(normalizeOffer(data[0],now));
  }
 }
 if(!scanned)throw new Error(format==="xml"?"FLASH_FEED_XML_NO_OFFERS":"FLASH_FEED_EMPTY");
 const groups=[...buckets.values()].filter(g=>g.offers.length)
  .sort((a,b)=>b.offers[0].discount-a.offers[0].discount||a.name.localeCompare(b.name))
  .slice(0,categories);
 return {groups,scanned,eligible,format};
}
function rankRows(rows,normalizeOffer,now,categories,perCategory) {
 if(rows.length>RECORD_LIMIT)throw new Error("FLASH_FEED_RECORD_LIMIT");
 const buckets=new Map();
 for(const row of rows){
  const p=normalizeOffer(row,now);if(!p)continue;
  const group=buckets.get(p.slug)||{name:p.category,slug:p.slug,offers:[]};
  pickTop(group,p,perCategory);
  buckets.set(p.slug,group);
 }
 return [...buckets.values()].sort((a,b)=>b.offers[0].discount-a.offers[0].discount).slice(0,categories);
}
