import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("one-off importer is Cloudflare-account-only, and never silently enables paused scheduled tasks",async()=>{
 const wr=await readFile("wrangler.toml","utf8");
 const w=await readFile("worker.js","utf8");
 const source=await readFile("lib/manual-admitad-import.js","utf8");
 assert.match(wr,/crons\s*=\s*\[\s*\]/);
 assert.match(wr,/name\s*=\s*"buysell-admitad-manual"/);
 assert.match(wr,/class_name\s*=\s*"ManualAdmitadImport"/);
 assert.doesNotMatch(wr,/schedules\s*=/);
 assert.match(w,/export \{ManualAdmitadImport\}/);
 assert.doesNotMatch(source,/fetch\(request|async fetch/);
 assert.match(source,/isAuthorizedOneShotEvent\(event\)/);
 assert.match(source,/retries:\{limit:1,delay:"5 seconds",backoff:"constant"\}/);
 assert.match(source,/syncFlashSale\(this\.env\)/);
 assert.doesNotMatch(source,/ALIEXPRESS_PRODUCT_FEED_URL|GSC_SERVICE_ACCOUNT_JSON/);
});

test("Cloudflare REST string params and Worker object payload are accepted without widening scope", async()=>{
 const {isAuthorizedOneShotEvent}=await import("../lib/one-shot-workflow-payload.js");
 assert.equal(isAuthorizedOneShotEvent({payload:JSON.stringify({mode:"one-shot-approved-feed"})}),true);
 assert.equal(isAuthorizedOneShotEvent({payload:{mode:"one-shot-approved-feed"}}),true);
 assert.equal(isAuthorizedOneShotEvent({payload:{mode:"one-shot-approved-feed",other:"x"}}),false);
 assert.equal(isAuthorizedOneShotEvent({payload:"INVALID"}),false);
 assert.equal(isAuthorizedOneShotEvent({payload:{mode:"cron"}}),false);
 assert.equal(isAuthorizedOneShotEvent({}),false);
});
