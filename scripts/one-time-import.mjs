// One-time, explicitly owner-requested catalogue ingest; never a cron.
// Large Admitad CSV/XML/gzip is parsed on GitHub's runner, rather than in
// Cloudflare Free's 10ms CPU budget. Secret feed URL remains only in Worker env.
import {streamVerifiedDeals} from "../lib/admitad-stream.js";
import {parseFeed,normalizeOffer} from "../lib/flash-sale.js";

const ORIGIN="https://buysell.best";
const AUD=ORIGIN+"/_ops/import";
const LIMIT=10000;
const WAIT=ms=>new Promise(r=>setTimeout(r,ms));
const SERVICE="/__ops/import/";
let cached="",issued=0;
function authenticAffiliate(url){
 try{
  const u=new URL(url);
  if(u.protocol!=="https:"||u.username||u.password)return false;
  return /(^|\.)rzekl\.com$|(^|\.)admitad\.com$|(^|\.)ali\.ski$/i.test(u.hostname) ||
    (/(^|\.)aliexpress\.com$/i.test(u.hostname) && (
      u.searchParams.has("aff_fcid")||u.searchParams.has("admitad_uid")));
 }catch{return false;}
}
async function idToken(){
 const now=Date.now();
 if(cached&&now-issued<180000)return cached;
 const token=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 const endpoint=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
 if(!token||!endpoint)throw Error("GITHUB_OIDC_IDENTITY_UNAVAILABLE");
 const separator=endpoint.includes("?")?"&":"?";
 const resp=await fetch(endpoint+separator+"audience="+encodeURIComponent(AUD),{
  headers:{Authorization:"Bearer "+token}});
 if(!resp.ok)throw Error("GITHUB_OIDC_REQUEST_FAILED");
 const j=await resp.json();
 if(typeof j.value!=="string"||j.value.length>9000)throw Error("GITHUB_OIDC_INVALID");
 // Diagnostic emits ONLY boolean comparisons, never the JWT or any claim values.
 // The Worker independently verifies cryptographic signature and time.
 try{
  const pieces=j.value.split(".");
  const claim=JSON.parse(Buffer.from(pieces[1],"base64url").toString("utf8"));
  const seconds=Math.floor(now/1000);
  const expected="Gamagek/buysell-best/.github/workflows/one-time-affiliate-import.yml@refs/heads/main";
  const checks={
   issuer:claim.iss==="https://token.actions.githubusercontent.com",
   audience:claim.aud===AUD,
   repository:claim.repository==="Gamagek/buysell-best",
   branch:claim.ref==="refs/heads/main",
   workflow:claim.workflow_ref===expected,
   event:claim.event_name==="push",
   expiry:typeof claim.exp==="number"&&claim.exp>seconds&&claim.exp<=seconds+600,
   issued:typeof claim.iat==="number"&&claim.iat<=seconds+60&&claim.iat>seconds-1200,
   notBefore:typeof claim.nbf!=="number"||claim.nbf<=seconds+30
  };
  console.log("OIDC_CLAIM_CHECK",JSON.stringify(checks));
  // Public JWKS signature preflight: log strictly boolean outcomes, never JWT/JWK values.
  const crypt={alg:false,keyIdPresent:false,jwksReachable:false,kidMatched:false,signatureVerified:false};
  try{
   const hdr=JSON.parse(Buffer.from(pieces[0],"base64url").toString("utf8"));
   crypt.alg=hdr.alg==="RS256";
   crypt.keyIdPresent=typeof hdr.kid==="string"&&hdr.kid.length<160;
   const reply=await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{
    headers:{accept:"application/json"},redirect:"error"});
   crypt.jwksReachable=reply.ok;
   if(reply.ok){
    const data=await reply.json();
    const key=Array.isArray(data.keys)?data.keys.find(v=>v.kid===hdr.kid&&v.kty==="RSA"):null;
    crypt.kidMatched=!!key;
    if(key){
     const pub=await crypto.subtle.importKey("jwk",key,{
      name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
     crypt.signatureVerified=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",
      pub,Buffer.from(pieces[2],"base64url"),
      Buffer.from(pieces[0]+"."+pieces[1],"utf8"));
    }
   }
  }catch{/* intentionally no exception details or secret data in logs */}
  console.log("OIDC_CRYPTO_CHECK",JSON.stringify(crypt));
 }catch{console.log("OIDC_CLAIM_CHECK_UNAVAILABLE");}
 cached=j.value;issued=now;return cached;
}
async function call(path,{body=null,feed=false}={}){
 const auth=await idToken();
 const r=await fetch(ORIGIN+SERVICE+path,{method:"POST",
  headers:{"authorization":"Bearer "+auth,...(body?{"content-type":"application/json"}:{})},
  body:body?JSON.stringify(body):null,redirect:"error"});
 if(!r.ok){
  const error=await r.json().catch(()=>({error:"HTTP_"+r.status}));
  throw Error("IMPORT_"+String(error.error||r.status).replace(/[^A-Z0-9_-]/gi,"_").slice(0,90));
 }
 return feed?r:await r.json();
}
function originalSourceRow(p){
 return {
  offer_id:p.id,name:p.title,category_name:p.category,
  price:p.price,oldprice:p.originalPrice,currencyId:"USD",
  picture:p.imageSource,tracking_link:p.destination,description:p.description,
  ...(p.saleEnd?{sale_end:p.saleEnd}:{})
 };
}
function priority(groups){
 const first=[],rest=[];
 for(const group of groups){
  const p=group.offers||[];
  if(p.length)first.push(p[0]);
  rest.push(...p.slice(1));
 }
 const filter=arr=>arr.filter(p=>authenticAffiliate(p.destination)&&Number(p.discount)>=20&&
  p.currency==="USD"&&p.imageSource&&p.title&&p.title.length>=12);
 const sorter=(a,b)=>b.discount-a.discount||a.price-b.price;
 const top=filter(first).sort(sorter),remaining=filter(rest).sort(sorter);
 const out=[],seen=new Set();
 for(const p of [...top,...remaining]){
  if(seen.has(p.id))continue;seen.add(p.id);
  out.push(originalSourceRow(p));
  if(out.length>=LIMIT)break;
 }
 return out;
}

function readUnsignedClaims(jwt){
 // Non-sensitive booleans only. Never print a JWT, its header, payload or token.
 try{
  const [head,data]=jwt.split(".");
  return {
   header:JSON.parse(Buffer.from(head,"base64url").toString("utf8")),
   data:JSON.parse(Buffer.from(data,"base64url").toString("utf8"))
  };
 }catch{return null;}
}
async function reportSafeIdentityPreflight(){
 const token=await idToken(),parsed=readUnsignedClaims(token);
 if(!parsed){console.log("OIDC_PREFLIGHT",JSON.stringify({parse:false}));return;}
 const data=parsed.data;
 const checks={
  issuer:data.iss==="https://token.actions.githubusercontent.com",
  audience:data.aud===AUD,
  repository:data.repository==="Gamagek/buysell-best",
  branch:data.ref==="refs/heads/main",
  workflow:data.workflow_ref==="Gamagek/buysell-best/.github/workflows/one-time-affiliate-import.yml@refs/heads/main",
  event:data.event_name==="push",
  algorithm:parsed.header.alg==="RS256",
  time:typeof data.exp==="number"&&data.exp>Date.now()/1000&&data.exp<Date.now()/1000+600
 };
 try{
  const keys=await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",
   {redirect:"error",headers:{accept:"application/json"}});
  if(keys.ok){
   const doc=await keys.json();
   checks.signingKeyPresent=Array.isArray(doc.keys)&&doc.keys.some(k=>k.kid===parsed.header.kid);
  }else checks.signingKeyPresent=false;
 }catch{checks.signingKeyPresent=false;}
 console.log("OIDC_PREFLIGHT",JSON.stringify(checks));
}

async function main(){
 if(process.env.GITHUB_REPOSITORY!=="Gamagek/buysell-best"||
  process.env.GITHUB_REF!=="refs/heads/main"||
  process.env.GITHUB_EVENT_NAME!=="push")throw Error("UNAUTHORIZED_WORKFLOW_CONTEXT");
 await reportSafeIdentityPreflight();
 const ready=await call("init");
 if(ready.status!=="ready")throw Error("IMPORT_D1_R2_UNAVAILABLE");
 console.log("One-time authenticated source download started.");
 const feed=await call("feed",{feed:true});
 const scan=await streamVerifiedDeals(feed,{
  parseFeed,normalizeOffer,now:new Date(),
  categories:500,perCategory:40,maxRecords:1000000
 });
 const rows=priority(scan.groups);
 console.log("Verified feed scan",JSON.stringify({format:scan.format,scanned:scan.scanned,
  eligible:scan.eligible,selected:rows.length}));
 if(rows.length===0)throw Error("NO_ACTUAL_APPROVED_AFFILIATE_OFFERS");
 let published=0,skipped=0,failed=0;
 // Max two in-flight Cloudflare requests, each with <=5 seller photo fetches.
 for(let i=0;i<rows.length;i+=10){
  const chunks=[rows.slice(i,i+5),rows.slice(i+5,i+10)].filter(x=>x.length);
  const results=await Promise.allSettled(chunks.map(chunk=>call("batch",{body:{rows:chunk}})));
  for(const result of results){
   if(result.status==="rejected"){failed++;continue;}
   const data=result.value;
   if(data.status!=="processed"){failed++;continue;}
   published+=Number(data.published)||0;
   skipped+=Number(data.skipped)||0;
  }
  if(failed>=10)throw Error("IMPORT_BATCH_FAILURE_LIMIT");
  if((i+10)%250===0||i+10>=rows.length)
   console.log("Published verified products",JSON.stringify({selected:rows.length,
    attempted:Math.min(rows.length,i+10),published,skipped,failed}));
  await WAIT(70);
 }
 console.log("ONE_TIME_COMPLETE",JSON.stringify({selected:rows.length,published,skipped,failed}));
 if(published===0)throw Error("NO_VERIFIED_PRODUCTS_WITH_STORED_SELLER_PHOTOS");
 if(failed)process.exitCode=1;
}
main().catch(e=>{console.error("ONE_TIME_FAILED",String(e?.message||"unavailable").slice(0,120));process.exitCode=1;});
