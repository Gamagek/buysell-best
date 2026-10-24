import {WorkflowEntrypoint} from "cloudflare:workers";
import {syncFlashSale} from "./flash-sale.js";
import {isAuthorizedOneShotEvent} from "./one-shot-workflow-payload.js";

// Explicitly user-initiated and Cloudflare-account-authorized workflow.
// No cron, no public endpoint, no exposed feed credentials.
// This first pass diagnoses the approved source and publishes only validated
// cached-image products under the current conservative production limits.
export class ManualAdmitadImport extends WorkflowEntrypoint {
 async run(event,step) {
  // Account-authenticated Cloudflare Workflows-only OIDC verification probe.
  // No public route, credentials, token inspection, cron or R2/D1 mutations.
  let request=event?.payload;
  if(typeof request==="string"){
    if(request.length>1000)return {status:"rejected-mode"};
    try{request=JSON.parse(request);}catch{return {status:"rejected-mode"};}
  }
  if(request && typeof request==="object" && !Array.isArray(request) &&
     Object.keys(request).length===1 && request.mode==="diagnose-oidc-provider"){
    return step.do("read-public-oidc-signing-key-metadata",{retries:{limit:0},timeout:"30 seconds"},async()=>{
      try{
        const response=await fetch("https://token.actions.githubusercontent.com/.well-known/jwks",{
          headers:{accept:"application/json"},redirect:"error"});
        if(!response.ok)return {status:"provider-http-error",http_status:response.status};
        const data=await response.json();
        if(!Array.isArray(data.keys))return {status:"provider-bad-json"};
        const keys=data.keys.filter(k=>k.kty==="RSA"&&k.alg==="RS256"&&k.use==="sig");
        if(!keys.length)return {status:"provider-no-rsa-keys",key_count:data.keys.length};
        let imported=false;
        try{await crypto.subtle.importKey("jwk",keys[0],
         {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);imported=true;}catch{}
        return {status:imported?"ok":"jwk-import-error",key_count:data.keys.length,imported};
      }catch{return {status:"provider-network-error"};}
    });
  }
  if(!isAuthorizedOneShotEvent(event))return {status:"rejected-mode"};
  return await step.do("one-shot-source-verified-feed",{
   retries:{limit:1,delay:"5 seconds",backoff:"constant"},
   timeout:"10 minutes"
  },async()=>{
   const result=await syncFlashSale(this.env);
   // Never expose feed URL, seller credentials or raw source response.
   return {status:result.status,offers:result.offers||0,categories:result.categories||0,
    imagesCached:result.imagesCached||0,code:result.code||null};
  });
 }
}
