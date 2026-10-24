import test from "node:test";
import assert from "node:assert/strict";
import {verifyGithubImportIdentity} from "../lib/github-oidc-import.js";
import {readFile} from "node:fs/promises";

const audience="https://buysell.best/_ops/import";
function claims(){
 const now=Math.floor(Date.now()/1000);
 return {iss:"https://token.actions.githubusercontent.com",aud:audience,
  repository:"Gamagek/buysell-best",ref:"refs/heads/main",
  workflow_ref:"Gamagek/buysell-best/.github/workflows/one-time-affiliate-import.yml@refs/heads/main",
  event_name:"push",iat:now,nbf:now-5,exp:now+300};
}
test("trusted repo/ref/job JWT cryptographic verifier never weakens signature checks",async()=>{
 const keys=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
 const jwk=await crypto.subtle.exportKey("jwk",keys.publicKey);
 Object.assign(jwk,{kid:"our-ci-signer",use:"sig",alg:"RS256"});
 const b64=d=>Buffer.from(d).toString("base64url");
 const input=b64(JSON.stringify({alg:"RS256",kid:"our-ci-signer"}))+"."+b64(JSON.stringify(claims()));
 const sig=b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",keys.privateKey,new TextEncoder().encode(input)));
 const req=new Request(audience,{headers:{authorization:"Bearer "+input+"."+sig}});
 const realWarn=console.warn,logs=[];
 console.warn=(...args)=>logs.push(args.join(" "));
 try{
  assert.equal(await verifyGithubImportIdentity(req,{fetcher:async()=>Response.json({keys:[jwk]})}),true);
  const original=req.headers.get("authorization");
  const segments=original.slice("Bearer ".length).split(".");
  const first=segments[2][0];
  segments[2]=(first==="A"?"B":"A")+segments[2].slice(1);
  const forged="Bearer "+segments.join(".");
  const bad=new Request(audience,{headers:{authorization:forged}});
  assert.equal(await verifyGithubImportIdentity(bad,{fetcher:async()=>Response.json({keys:[jwk]})}),false);
 }finally{console.warn=realWarn;}
 assert.ok(logs.every(x=>x.startsWith("IMPORT_OIDC_VERIFY_")));
 assert.ok(logs.every(x=>!x.includes("Bearer ")&&!x.includes("our-ci-signer")));
});
test("GitHub OIDC diagnostics never log JWT, identity claims or config values",async()=>{
 const server=await readFile("lib/github-oidc-import.js","utf8");
 const gh=await readFile("scripts/one-time-import.mjs","utf8");
 const cfg=await readFile("wrangler.toml","utf8");
 assert.match(server,/IMPORT_OIDC_VERIFY_/);
 assert.match(server,/JWK_IMPORT|SIGNATURE_VERIFY/);
 assert.match(gh,/OIDC_CRYPTO_CHECK/);
 assert.match(gh,/TRUSTED_GITHUB_PUBLIC_JWK/);
 assert.match(gh,/if\(crypt\.signatureVerified\)console\.log/);
 assert.match(gh,/signatureVerified/);
 assert.match(gh,/JSON.stringify\(crypt\)/);
 assert.doesNotMatch(server,/console\.warn\([^)]*(?:token|claims|header|key)\s*\)/);
 assert.match(cfg,/crons\s*=\s*\[\s*\]/);
});
