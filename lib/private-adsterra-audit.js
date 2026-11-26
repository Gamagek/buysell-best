// Temporary, authenticated, read-only Adsterra publisher audit.
// Strictly private: never returns a publisher token or allows arbitrary URLs.
// Remove this route after the owner's one-time performance review.
const AUDIT_PATH="/__ops/adsterra/audit";
function json(payload,status=200){
 return Response.json(payload,{status,headers:{
  "cache-control":"no-store","x-robots-tag":"noindex",
  "x-content-type-options":"nosniff","referrer-policy":"no-referrer"
 }});
}
async function equalSecret(a,b){
 if(typeof a!=="string"||typeof b!=="string"||b.length<48||a.length!==b.length)return false;
 const [x,y]=await Promise.all([crypto.subtle.digest("SHA-256",new TextEncoder().encode(a)),
                                crypto.subtle.digest("SHA-256",new TextEncoder().encode(b))]);
 const ba=new Uint8Array(x),bb=new Uint8Array(y);let diff=0;
 for(let i=0;i<ba.length;i++)diff|=ba[i]^bb[i];
 return diff===0;
}
function sanitize(value,depth=0){
 if(depth>6)return null;
 if(Array.isArray(value))return value.slice(0,100).map(v=>sanitize(v,depth+1));
 if(value&&typeof value==="object"){
  const out={};
  for(const [key,val] of Object.entries(value).slice(0,55)){
   if(/(?:token|password|secret|credential|api.?key|authorization)/i.test(key))continue;
   out[key]=sanitize(val,depth+1);
  }
  return out;
 }
 if(typeof value==="string")return value.slice(0,300);
 return typeof value==="number"||typeof value==="boolean"?value:null;
}
export async function servePrivateAdsterraAudit(request,env){
 if(new URL(request.url).pathname!==AUDIT_PATH)return json({error:"not-found"},404);
 if(request.method!=="POST")return json({error:"not-found"},404);
 const access=env?.ADSTERRA_AUDIT_ACCESS_KEY;
 const provided=request.headers.get("x-bsb-audit-key");
 if(!await equalSecret(provided,access))return json({error:"not-found"},404);
 const token=env?.ADSTERRA_PUBLISHER_API_TOKEN;
 if(typeof token!=="string"||token.length<12)return json({error:"publisher-api-token-not-configured"},503);
 let kind;
 try{
  if(Number(request.headers.get("content-length"))>160)throw Error("too-large");
  const data=await request.json();kind=data?.kind;
 }catch{return json({error:"invalid-request"},400);}
 const paths={
  domains:"domains.json",
  placements:"placements.json",
  stats:"stats.json?start_date=2026-11-01&finish_date=2026-11-26&group_by%5B%5D=placement",
  geo:"stats.json?start_date=2026-11-01&finish_date=2026-11-26&group_by%5B%5D=country"
 };
 if(!Object.hasOwn(paths,kind))return json({error:"unsupported-report"},400);
 const url="https://api3.adsterratools.com/publisher/"+paths[kind];
 try{
  const upstream=await fetch(url,{
   method:"GET",redirect:"error",
   headers:{"X-API-Key":token,"Accept":"application/json"},
   signal:AbortSignal.timeout(12000)
  });
  const body=await upstream.text();
  let parsed;
  try{parsed=JSON.parse(body)}catch{parsed={error:"invalid-json-response"};}
  return json({report:kind,upstream_http_status:upstream.status,
   data:sanitize(parsed),truncated:body.length>25000});
 }catch(e){
  return json({report:kind,error:"upstream-unavailable"},502);
 }
}
