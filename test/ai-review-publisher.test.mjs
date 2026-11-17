import test from "node:test";
import assert from "node:assert/strict";
import {validReviewClaims,verifyReviewIdentity} from "../lib/github-oidc-review.js";
import {screening,renderAiReview,reviewOperations} from "../lib/ai-review-store.js";
import {makePrompt,parseGenerated,optionalResearch,parse4getResults} from "../scripts/hf-bulk-review-publisher.mjs";

const PRODUCT={slug:"example-headphones-product-1005010507993958",title:"Wireless Travel Bluetooth Headphones Long Battery Case",destination:"https://rzekl.com/g/verified123/?ulp=https%3A%2F%2Fwww.aliexpress.com%2Fitem%2F1005010507993958.html",price:12.4,category:"Electronics"};
const good={
 slug:PRODUCT.slug,model:"ggml-org/Qwen3-1.7B-GGUF Q4_K_M",
 summary:PRODUCT.title+" is an AliExpress listing offered at a feed-reported price of USD 12.40. A buyer comparing portable audio options should inspect the chosen version and connector compatibility before deciding. Listing words alone cannot establish sound performance or battery endurance; check seller documentation for the exact model rather than relying on illustrative claims.",
 buyer_checks:[
  "Which Bluetooth codec and device systems does the exact product variation support?",
  "What is the actual unit battery duration, and is the charging case included?",
  "Which connector or charger works with the specific model chosen at checkout?",
  "What total landed price, delivery and return terms apply to the selected colour?"
 ],
 verdict:"Consider this listing only as a starting point for comparison. Confirm the exact selection, dimensions, power options, seller details and total checkout price. The source feed does not demonstrate first-hand quality or independently verified specifications.",
 sources:[]
};
test("review writes require signed GitHub OIDC from one exact workflow and audience",async()=>{
 const now=Math.floor(Date.now()/1000),claims={
  iss:"https://token.actions.githubusercontent.com",aud:"https://buysell.best/_ops/reviews",
  repository:"Gamagek/buysell-best",ref:"refs/heads/main",
  workflow_ref:"Gamagek/buysell-best/.github/workflows/hf-bulk-review-publish.yml@refs/heads/main",
  event_name:"schedule",iat:now,exp:now+300,nbf:now-5
 };
 assert.equal(validReviewClaims(claims,now),true);
 assert.equal(validReviewClaims({...claims,aud:"https://buysell.best/_ops/import"},now),false);
 assert.equal(validReviewClaims({...claims,workflow_ref:"Gamagek/buysell-best/.github/workflows/hf-source-review.yml@refs/heads/main"},now),false);
 assert.equal(validReviewClaims({...claims,repository:"attacker/buysell-best"},now),false);
 assert.equal(validReviewClaims({...claims,event_name:"pull_request"},now),false);
 assert.equal(await verifyReviewIdentity(new Request("https://buysell.best/__ops/reviews/publish")),false);
});
test("published notes are source-limited, HTML-escaped and independent of star ratings",()=>{
 const checked=screening(good,PRODUCT);assert.equal(checked.ok,true,checked.reasons.join(","));
 const html=renderAiReview({summary:checked.clean.summary,buyer_checks_json:JSON.stringify(checked.clean.buyer_checks),
 verdict:checked.clean.verdict,sources_json:"[]",published_at:"2026-11-17"});
 assert.match(html,/AI-assisted buying analysis/);
 assert.match(html,/not a first-hand test/i);
 assert.match(html,/Wireless Travel Bluetooth/);
 assert.equal(screening({...good,summary:good.summary+" We tested this and it is guaranteed."},PRODUCT).ok,false);
 assert.equal(screening({...good,slug:"somebody-elses-product"},PRODUCT).ok,false);
 const unsafe=renderAiReview({summary:'<script>alert(1)</script>',buyer_checks_json:JSON.stringify(checked.clean.buyer_checks),verdict:'<b>fake</b>',sources_json:"[]",published_at:"2026-11-17"});
 assert.doesNotMatch(unsafe,/<script>/);assert.match(unsafe,/&lt;script&gt;/);
});
test("unsigned public requests cannot ask for reviews or mutate D1",async()=>{
 const res=await reviewOperations(new Request("https://buysell.best/__ops/reviews/candidates",{method:"POST"}),{DB:{prepare(){throw Error("UNAUTHORIZED_ACCESS")}}});
 assert.equal(res.status,401);
});
test("Qwen structured output parsing handles prose-free JSON and refuses invalid generation",()=>{
 const json=JSON.stringify({summary:good.summary,buyer_checks:good.buyer_checks,verdict:good.verdict});
 assert.deepEqual(parseGenerated(json).buyer_checks,good.buyer_checks);
 assert.deepEqual(parseGenerated("intro "+json+" end").buyer_checks,good.buyer_checks);
 assert.throws(()=>parseGenerated("not json"),/AI_JSON_INVALID/);
 assert.match(makePrompt({...PRODUCT,description:"Source description"},[]),/product title/i);
});
test("4get is opt-in only, public provider is excluded, and results are trimmed",async()=>{
 let called=0;
 const fetcher=async()=>{called++;return new Response(JSON.stringify({status:"ok",web:[{title:"Technical reference",url:"https://electronics.example.org/specs"}]}),{headers:{"content-type":"application/json"}})};
 assert.deepEqual(await optionalResearch(PRODUCT,{base:"",fetcher}),[]);
 assert.deepEqual(await optionalResearch(PRODUCT,{base:"https://4get.ca/",fetcher}),[]);
 assert.equal(called,0);
 assert.deepEqual(await optionalResearch(PRODUCT,{base:"https://private-search.example.org/",fetcher}),[{title:"Technical reference",url:"https://electronics.example.org/specs"}]);
 assert.equal(called,1);
 assert.equal(parse4getResults({web:[{url:"http://insecure.example.org",title:"No"}]}).length,0);
});
