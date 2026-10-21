import test from "node:test";
import assert from "node:assert/strict";
import {ensureSchema} from "../lib/personalization.js";

function stubDB({failOnce=false}={}){
  let calls=0,prepared=0;
  return {
    get calls(){return calls;},
    get prepared(){return prepared;},
    prepare(sql){
      assert.match(sql,/^(?:CREATE TABLE|CREATE INDEX)/);
      prepared++;
      return {sql};
    },
    async batch(statements){
      calls++;
      assert.equal(statements.length,14,"full legacy D1 schema should still be installed once");
      if(failOnce && calls===1)throw new Error("temporary D1 quota error 7500");
      return statements;
    }
  };
}

test("concurrent visitor actions share one schema initialization per D1 binding",async()=>{
  const db=stubDB();
  const result=await Promise.all(Array.from({length:20},()=>ensureSchema(db)));
  assert.ok(result.every(x=>x===true));
  assert.equal(db.calls,1);
  assert.equal(db.prepared,14);
  assert.equal(await ensureSchema(db),true);
  assert.equal(db.calls,1,"sequential repeated requests must reuse success");
});

test("a separate Worker D1 binding still creates its own schema",async()=>{
  const first=stubDB(),second=stubDB();
  await ensureSchema(first);
  await ensureSchema(second);
  assert.equal(first.calls,1);
  assert.equal(second.calls,1);
});

test("a D1 quota/init error does not poison future legitimate schema attempts",async()=>{
  const db=stubDB({failOnce:true});
  await assert.rejects(()=>ensureSchema(db),/7500/);
  assert.equal(db.calls,1);
  assert.equal(await ensureSchema(db),true);
  assert.equal(db.calls,2);
  assert.equal(await ensureSchema(db),true);
  assert.equal(db.calls,2);
});

test("missing optional database still safely reports no schema",async()=>{
  assert.equal(await ensureSchema(null),false);
  assert.equal(await ensureSchema(undefined),false);
});
