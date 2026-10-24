import {verifyGithubImportIdentity} from "./github-oidc-import.js";
import {normalizeFeedExportUrl,fetchApprovedFeed} from "./flash-sale.js";
import {initOneTimeCatalogue,importOneTimeVerifiedBatch} from "./bulk-products.js";

async function boundedBody(request,max=64000){
 if(!request.body)throw new Error("EMPTY_BODY");
 const reader=request.body.getReader(),decoder=new TextDecoder();
 let out="",size=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>max)throw new Error("REQUEST_TOO_LARGE");
   out+=decoder.decode(value,{stream:true});
  }
  return out+decoder.decode();
 }finally{try{await reader.cancel();}catch{}}
}
function json(data,status=200){
 return Response.json(data,{status,headers:{"cache-control":"no-store","x-robots-tag":"noindex","x-content-type-options":"nosniff"}});
}
export async function serveAuthorizedImport(request,env){
 if(request.method!=="POST")return json({error:"method-not-allowed"},405);
 if(!await verifyGithubImportIdentity(request))return json({error:"forbidden"},403);
 const path=new URL(request.url).pathname;
 if(path==="/__ops/import/feed"){
  const source=normalizeFeedExportUrl(env.ALIEXPRESS_PRODUCT_FEED_URL);
  if(!source)return json({error:"source-not-configured"},503);
  try{
   const response=await fetchApprovedFeed(source);
   // Original Admitad link, access token and other upstream headers stay private.
   return new Response(response.body,{status:200,headers:{
    "content-type":"application/octet-stream",
    "cache-control":"private, no-store",
    "x-robots-tag":"noindex",
    "x-content-type-options":"nosniff"
   }});
  }catch{return json({error:"approved-source-unavailable"},502);}
 }
 if(path==="/__ops/import/init"){
  return json(await initOneTimeCatalogue(env));
 }
 if(path==="/__ops/import/batch"){
  let data;
  try{data=JSON.parse(await boundedBody(request));}catch{return json({error:"invalid-body"},400);}
  if(!data||Object.keys(data).length!==1||!Array.isArray(data.rows)||data.rows.length<1||data.rows.length>5)
   return json({error:"invalid-batch-size"},400);
  try{
   return json(await importOneTimeVerifiedBatch(env,data.rows));
  }catch(error){
   if(/7500|quota|exceeded/i.test(String(error?.message||"")))
    return json({error:"database-quota",retryable:false},503);
   return json({error:"batch-failed"},503);
  }
 }
 return json({error:"not-found"},404);
}
