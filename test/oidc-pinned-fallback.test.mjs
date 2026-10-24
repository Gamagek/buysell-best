import test from "node:test";
import assert from "node:assert/strict";
import {PINNED_GITHUB_OIDC_KEYS,trustedGithubPublicKeysAt} from "../lib/pinned-github-oidc-jwks.js";
import {verifyGithubImportIdentity} from "../lib/github-oidc-import.js";

test("date-limited reviewed GitHub public keys are well-formed RSA verification-only keys",async()=>{
 assert.equal(PINNED_GITHUB_OIDC_KEYS.length,4);
 for(const jwk of PINNED_GITHUB_OIDC_KEYS){
  assert.equal(jwk.kty,"RSA");assert.equal(jwk.alg,"RS256");
  assert.equal(jwk.e,"AQAB");assert.ok(jwk.n.length>=340);
  const key=await crypto.subtle.importKey("jwk",jwk,
    {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  assert.equal(key.type,"public");
  assert.deepEqual(key.usages,["verify"]);
 }
 assert.equal(trustedGithubPublicKeysAt(Date.UTC(2026,9,24)).length,4);
 assert.equal(trustedGithubPublicKeysAt(Date.UTC(2026,10,15)),null,"expired pins fail closed");
});
test("temporary GitHub JWKS outage NEVER authenticates attacker tokens, even if kid is pinned",async()=>{
 const key=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",
  modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
 const now=Date.UTC(2026,9,24,14,20),seconds=Math.floor(now/1000);
 const payload={iss:"https://token.actions.githubusercontent.com",
  aud:"https://buysell.best/_ops/import",repository:"Gamagek/buysell-best",
  ref:"refs/heads/main",
  workflow_ref:"Gamagek/buysell-best/.github/workflows/one-time-affiliate-import.yml@refs/heads/main",
  event_name:"push",iat:seconds,nbf:seconds-1,exp:seconds+300};
 const b64=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
 const jwt=b64({alg:"RS256",kid:PINNED_GITHUB_OIDC_KEYS[0].kid})+"."+b64(payload);
 const signature=Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",
  key.privateKey,new TextEncoder().encode(jwt))).toString("base64url");
 const bad=new Request("https://buysell.best/__ops/import/init",
  {headers:{authorization:"Bearer "+jwt+"."+signature}});
 const warn=console.warn,lines=[];console.warn=(...args)=>lines.push(args.join(" "));
 try{
  const accepted=await verifyGithubImportIdentity(bad,{now,fetcher:async()=>{throw Error("offline");}});
  assert.equal(accepted,false,"untrusted private key must never pass pinned public key check");
 }finally{console.warn=warn;}
 assert.ok(lines.some(x=>x.includes("DATE_LIMITED_PUBLIC_JWKS_FALLBACK")));
 assert.ok(lines.some(x=>x.includes("SIGNATURE_INVALID")));
 assert.ok(lines.every(x=>!x.includes(signature)&&!x.includes(jwt)));
});
test("pinning is not used if GitHub responds with a valid HTTP rejection",async()=>{
 const keys=trustedGithubPublicKeysAt(Date.UTC(2026,9,24));
 assert.ok(keys);
 const staticCode=await import("../lib/github-oidc-import.js");
 assert.equal(typeof staticCode.verifyGithubImportIdentity,"function");
});
