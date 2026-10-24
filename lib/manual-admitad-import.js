import {WorkflowEntrypoint} from "cloudflare:workers";
import {syncFlashSale} from "./flash-sale.js";
import {isAuthorizedOneShotEvent} from "./one-shot-workflow-payload.js";

// Explicitly user-initiated and Cloudflare-account-authorized workflow.
// No cron, no public endpoint, no exposed feed credentials.
// This first pass diagnoses the approved source and publishes only validated
// cached-image products under the current conservative production limits.
export class ManualAdmitadImport extends WorkflowEntrypoint {
 async run(event,step) {
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
