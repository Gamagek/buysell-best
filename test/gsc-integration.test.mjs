import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, webcrypto} from 'node:crypto';
import {
  propertyIdentifier, monitoredUrls, accessToken,
  googleRequest, indexStatus, syncSearchConsole
} from '../lib/gsc-integration.js';

test('only the configured buysell.best property is accepted', () => {
  assert.equal(propertyIdentifier('sc-domain:buysell.best'), 'sc-domain:buysell.best');
  assert.equal(propertyIdentifier('https://buysell.best'), 'https://buysell.best/');
  assert.equal(propertyIdentifier(' https://buysell.best/ '), 'https://buysell.best/');
  for (const site of ['sc-domain:vid.best','https://evil.example/','https://buysell.best.evil.test/','']) {
    assert.throws(() => propertyIdentifier(site), /GSC_PROPERTY_INVALID/);
  }
});

test('monitoring candidates contain canonical guides and shopping products without duplicates', () => {
  const urls = monitoredUrls();
  assert.ok(urls.length >= 58);
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(urls.every(url => url.startsWith('https://buysell.best/')));
  assert.ok(urls.includes('https://buysell.best/insights/'));
  assert.ok(urls.some(url => url.includes('/insights/compare-auto-insurance-quotes/')));
  assert.ok(urls.some(url => url.includes('/products/')));
});

test('OAuth uses signed JWT with read-only Search Console scope and Google token endpoint', async () => {
  const {privateKey} = generateKeyPairSync('rsa', {modulusLength:2048});
  const credential = {
    type:'service_account',
    client_email:'buysell-best-search-console@buysell-best-seo.iam.gserviceaccount.com',
    private_key: privateKey.export({type:'pkcs8',format:'pem'}).toString(),
    token_uri:'https://oauth2.googleapis.com/token'
  };
  let calls = 0;
  const fakeFetch = async (url, init) => {
    calls++;
    assert.equal(url,'https://oauth2.googleapis.com/token');
    assert.equal(init.method,'POST');
    const data = new URLSearchParams(init.body);
    const signed = data.get('assertion').split('.');
    assert.equal(signed.length,3);
    const body = JSON.parse(Buffer.from(signed[1],'base64url').toString('utf8'));
    assert.equal(body.scope,'https://www.googleapis.com/auth/webmasters.readonly');
    assert.equal(body.iss,credential.client_email);
    assert.equal(body.aud,url);
    return new Response(JSON.stringify({access_token:'test-only-token'}),{status:200});
  };
  const token = await accessToken(JSON.stringify(credential), fakeFetch, webcrypto);
  assert.equal(token,'test-only-token');
  assert.equal(calls,1);
  await assert.rejects(
    () => accessToken(JSON.stringify({...credential,token_uri:'https://malicious.example/token'}),fakeFetch,webcrypto),
    /GSC_TOKEN_URI_INVALID/
  );
  assert.equal(calls,1);
});

test('Google request adds bearer auth and errors do not contain sensitive response bodies', async () => {
  let seen = null;
  const url='https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
  const response = await googleRequest(url,'dummy',{siteUrl:'sc-domain:buysell.best'},async (target,opts)=>{
    seen={target,opts};
    return new Response(JSON.stringify({inspectionResult:{indexStatusResult:{coverageState:'Indexed'}}}));
  });
  assert.equal(response.inspectionResult.indexStatusResult.coverageState,'Indexed');
  assert.equal(seen.target,url);
  assert.equal(seen.opts.headers.authorization,'Bearer dummy');
  assert.deepEqual(JSON.parse(seen.opts.body),{siteUrl:'sc-domain:buysell.best'});
  await assert.rejects(
    () => googleRequest(url,'dummy',{},async()=>new Response('sensitive error',{status:403})),
    /GSC_API_HTTP_403/
  );
});

test('inspection parser preserves coverage and canonical fields',()=>{
  assert.deepEqual(indexStatus({inspectionResult:{indexStatusResult:{
    verdict:'PASS',coverageState:'Submitted and indexed',indexingState:'INDEXING_ALLOWED',
    robotsTxtState:'ALLOWED',pageFetchState:'SUCCESSFUL',
    googleCanonical:'https://buysell.best/',userCanonical:'https://buysell.best/',
    lastCrawlTime:'2026-10-15T00:00:00Z'
  }}}), {
    verdict:'PASS',coverage:'Submitted and indexed',indexing:'INDEXING_ALLOWED',
    robots:'ALLOWED',fetch:'SUCCESSFUL',
    googleCanonical:'https://buysell.best/',userCanonical:'https://buysell.best/',
    lastCrawl:'2026-10-15T00:00:00Z'
  });
  assert.equal(indexStatus({}).verdict,'');
});

test('a Worker without configuration skips GSC without interfering with other cron tasks',async()=>{
  assert.deepEqual(await syncSearchConsole({}),{status:'not-configured'});
  assert.deepEqual(await syncSearchConsole({DB:{}}),{status:'not-configured'});
});
