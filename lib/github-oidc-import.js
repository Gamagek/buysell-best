// Authenticate a single GitHub Actions workflow identity without storing static
// credentials or leaking Admitad Worker secret URLs to GitHub.
// HTTPS GitHub-issued OIDC JWT, RS256, strict repo/ref/workflow/audience.
const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="https://buysell.best/_ops/import";
const REPOSITORY="Gamagek/buysell-best";
const REF="refs/heads/main";
const WORKFLOW=REPOSITORY+"/.github/workflows/one-time-affiliate-import.yml@"+REF;
let jwksCache=null,expiry=0;
function decodeB64(input){
 const norm=input.replace(/-/g,"+").replace(/_/g,"/");
 const plain=atob(norm.padEnd(Math.ceil(norm.length/4)*4,"="));
 return Uint8Array.from(plain,x=>x.charCodeAt(0));
}
function decodeJSON(value){return JSON.parse(new TextDecoder().decode(decodeB64(value)));}
export function validateClaims(claims,now=Math.floor(Date.now()/1000)){
 const audit=Array.isArray(claims?.aud)?claims.aud:[claims?.aud];
 return claims?.iss===ISSUER && audit.length===1 && audit[0]===AUDIENCE &&
  claims?.repository===REPOSITORY &&
  claims?.ref===REF &&
  claims?.workflow_ref===WORKFLOW &&
  claims?.event_name==="push" &&
  typeof claims.exp==="number"&&claims.exp>now&&claims.exp<=now+600 &&
  typeof claims.iat==="number"&&claims.iat<=now+60&&claims.iat>now-1200 &&
  (typeof claims.nbf!=="number"||claims.nbf<=now+30);
}
export async function verifyGithubImportIdentity(request,{fetcher=fetch,now=Date.now()}={}){
 const value=request.headers.get("authorization")||"";
 if(!value.startsWith("Bearer ")||value.length>9000)return false;
 const token=value.slice(7),pieces=token.split(".");
 if(pieces.length!==3 || pieces.some(x=>!x||x.length>8000))return false;
 let header,claims;
 try{
  header=decodeJSON(pieces[0]);claims=decodeJSON(pieces[1]);
 }catch{return false;}
 // Log only fixed reason codes AFTER a well-formed expected-claim token, never
 // URL/query strings, token bits, signing keys or JWT claim values.
 if(!validateClaims(claims,Math.floor(now/1000)))return false;
 const denied=reason=>{console.warn("IMPORT_OIDC_VERIFY_"+reason);return false;};
 if(header.alg!=="RS256"||typeof header.kid!=="string"||header.kid.length>160)
  return denied("HEADER_INVALID");
 let stage="JWKS_FETCH";
 try{
  let keys=jwksCache;
  if(!keys||expiry<=now){
   const r=await fetcher(ISSUER+"/.well-known/jwks",
    {redirect:"error",headers:{accept:"application/json"}});
   if(!r.ok)return denied("JWKS_HTTP_ERROR");
   stage="JWKS_PARSE";
   const data=await r.json();
   if(!Array.isArray(data?.keys)||data.keys.length>80)return denied("JWKS_UNEXPECTED");
   keys=data.keys;
   jwksCache=keys;expiry=now+300_000;
  }
  stage="KID_MATCH";
  const key=keys.find(x=>x.kid===header.kid&&x.kty==="RSA"&&(!x.alg||x.alg==="RS256")&&(!x.use||x.use==="sig"));
  if(!key)return denied("KID_NOT_FOUND");
  stage="JWK_IMPORT";
  const pub=await crypto.subtle.importKey("jwk",key,
   {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  stage="SIGNATURE_VERIFY";
  const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",pub,
   decodeB64(pieces[2]),new TextEncoder().encode(pieces[0]+"."+pieces[1]));
  if(!valid)return denied("SIGNATURE_INVALID");
  return true;
 }catch{return denied(stage+"_ERROR");}
}
