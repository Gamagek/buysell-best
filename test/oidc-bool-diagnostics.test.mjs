import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("one-time import logs only boolean OIDC comparisons, never bearer token or claims",async()=>{
 const source=await readFile("scripts/one-time-import.mjs","utf8");
 assert.match(source,/OIDC_CLAIM_CHECK/);
 assert.match(source,/issuer:claim\.iss===/);
 assert.match(source,/audience:claim\.aud===AUD/);
 assert.match(source,/workflow:claim\.workflow_ref===expected/);
 assert.doesNotMatch(source,/console\.log\(\s*claim\s*\)/);
 assert.doesNotMatch(source,/console\.log\(\s*j\.value\s*\)/);
 assert.doesNotMatch(source,/console\.log\(\s*auth\s*\)/);
 assert.match(source,/console\.log\("OIDC_CLAIM_CHECK",JSON\.stringify\(checks\)\)/);
 const ops=await readFile("lib/one-time-import-ops.js","utf8");
 assert.match(ops,/verifyGithubImportIdentity\(request\)/);
 const cfg=await readFile("wrangler.toml","utf8");
 assert.match(cfg,/crons\s*=\s*\[\s*\]/,"recurring schedules remain off");
});
