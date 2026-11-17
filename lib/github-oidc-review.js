// Restrict GitHub OIDC review writes to the single scheduled AI publishing workflow.
// No permanent GitHub/Cloudflare token, no unsigned requests, no bypass on JWKS error.
const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="https://buysell.best/_ops/reviews";
const WORKFLOW="Gamagek/buysell-best/.github/workflows/hf-bulk-review-publish.yml@refs/heads/main";
let cachedKeys=null,cachedUntil=0;
function b64(input){
 const padded=input.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(input.length/4)*4,"=");
 return Uint8Array.from(atob(padded),x=>x.charCodeAt(0));
}
function jwtJSON(part){return JSON.parse(new TextDecoder().decode(b64(part)));}
export function validReviewClaims(c,now=Math.floor(Date.now()/1000)){
 const aud=Array.isArray(c?.aud)?c.aud:[c?.aud];
 return c?.iss===ISSUER&&aud.length===1&&aud[0]===AUDIENCE&&
  c?.repository==="Gamagek/buysell-best"&&c?.ref==="refs/heads/main"&&
  c?.workflow_ref===WORKFLOW&&
  ["schedule","workflow_dispatch","push"].includes(c?.event_name)&&
  typeof c.exp==="number"&&c.exp>now&&c.exp<=now+600&&
  typeof c.iat==="number"&&c.iat<=now+60&&c.iat>now-1200&&
  (typeof c.nbf!=="number"||c.nbf<=now+30);
}
export async function verifyReviewIdentity(request,{fetcher=fetch,now=Date.now()}={}){
 const auth=request.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer ")||auth.length>9000)return false;
 const parts=auth.slice(7).split(".");
 if(parts.length!==3||parts.some(x=>!x||x.length>8000))return false;
 let header,claims;
 try{header=jwtJSON(parts[0]);claims=jwtJSON(parts[1]);}catch{return false;}
 if(!validReviewClaims(claims,Math.floor(now/1000))||header.alg!=="RS256"||
    typeof header.kid!=="string"||header.kid.length>160)return false;
 try{
  let keys=cachedKeys;
  if(!keys||now>=cachedUntil){
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),10000);
   let response;
   try{response=await fetcher(ISSUER+"/.well-known/jwks",{redirect:"error",headers:{accept:"application/json"},signal:controller.signal});}
   finally{clearTimeout(timer);}
   if(!response?.ok)return false;
   const data=await response.json();
   if(!Array.isArray(data?.keys)||data.keys.length>80)return false;
   keys=data.keys;cachedKeys=keys;cachedUntil=now+300000;
  }
  const key=keys.find(k=>k.kid===header.kid&&k.kty==="RSA"&&(!k.alg||k.alg==="RS256")&&(!k.use||k.use==="sig"));
  if(!key)return false;
  const publicKey=await crypto.subtle.importKey("jwk",key,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",publicKey,b64(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
 }catch{return false;}
}
