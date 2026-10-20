import {trendingSitemapEntry} from "./trending-sitemap.js";
import {IMAGE_SITEMAP_URL,imageSitemapFromCanonical} from "./image-sitemap.js";
import {editorialSitemapEntries} from "./editorial-product-pages.js";
import {HIGH_INTENT_GUIDES, highIntentPath} from './high-intent-guides.js';
import {guideSitemapEntries} from './shopping-guides.js';
import {productSitemapEntries} from './affiliate-products.js';
import {travelSitemapEntries} from './travel-guides.js';
import {careerSitemapEntries} from './career-guides.js';

// Read-only Google Search Console monitoring. Credentials never leave the Worker.
const PROPERTY_PREFIX = 'https://buysell.best/';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const READ_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const WRITE_SCOPE = 'https://www.googleapis.com/auth/webmasters';
const SITEMAP_URL = 'https://buysell.best/sitemap.xml';
const INSPECTIONS_PER_RUN = 5;

export function propertyIdentifier(value) {
  const raw = String(value || '').trim();
  if (raw === 'sc-domain:buysell.best') return raw;
  if (raw === 'https://buysell.best' || raw === PROPERTY_PREFIX) return PROPERTY_PREFIX;
  throw new Error('GSC_PROPERTY_INVALID');
}

function urlsFromSitemap(xml) {
  return [...xml.matchAll(/<url>\s*<loc>(https:\/\/buysell\.best\/[^<]*)<\/loc>/g)].map(item=>item[1]);
}

export function monitoredUrls() {
  // Mirror all canonical, published URL groups in the runtime sitemap.
  // Prioritize the newly published country career pages and their hub.
  const staticPaths = [
    '/', '/categories.html', '/post-ad.html', '/about.html', '/contact.html',
    '/privacy.html', '/terms.html', '/products/trending-100/',
    ...['phones','electronics','vehicles','property','fashion','furniture','services','other']
      .map(category=>'/category/'+category)
  ];
  const priority = urlsFromSitemap(careerSitemapEntries());
  const other = [
    ...staticPaths.map(path=>new URL(path,PROPERTY_PREFIX).href),
    ...urlsFromSitemap(guideSitemapEntries()),
    ...urlsFromSitemap(editorialSitemapEntries()),
    ...urlsFromSitemap(productSitemapEntries()),
    ...urlsFromSitemap(travelSitemapEntries()),
    ...urlsFromSitemap('<url><loc>https://buysell.best/insights/</loc></url>'+HIGH_INTENT_GUIDES.map(
      guide=>'<url><loc>https://buysell.best'+highIntentPath(guide)+'</loc></url>'
    ).join(''))
  ];
  return [...new Set([...priority,...other])].filter(url=>new URL(url).origin==='https://buysell.best');
}

export async function submitSitemap(siteUrl, token, fetcher=fetch, sitemapUrl=SITEMAP_URL) {
  const property=propertyIdentifier(siteUrl);
  // Never send Google a user-controlled sitemap feed URL.
  if(sitemapUrl!==SITEMAP_URL && sitemapUrl!==IMAGE_SITEMAP_URL)
    throw new Error('GSC_SITEMAP_URL_INVALID');
  const endpoint='https://www.googleapis.com/webmasters/v3/sites/'+
    encodeURIComponent(property)+'/sitemaps/'+encodeURIComponent(sitemapUrl);
  // Google's sitemaps.submit endpoint uses PUT and returns no body on success.
  const response=await fetcher(endpoint,{method:'PUT',headers:{authorization:'Bearer '+token}});
  if(!response.ok) throw new Error('GSC_SITEMAP_HTTP_'+response.status);
  return {submitted:true,url:sitemapUrl};
}

async function submitChangedSitemap(db, env, fetcher, now, cryptoImpl) {
  const urls=monitoredUrls();
  // Compare actual page-image associations, not just the number of page URLs.
  // Include future published D1 listing pictures if the listings table exists.
  const canonicalStatic=[guideSitemapEntries(),editorialSitemapEntries(),productSitemapEntries()].join('\n');
  let dynamicInventory='';
  try {
    const rows=await db.prepare(
      "SELECT slug,image_url,COALESCE(updated_at,created_at) AS changed FROM listings "+
      "WHERE COALESCE(status,'active')='active' AND slug IS NOT NULL "+
      "ORDER BY slug LIMIT 50000"
    ).all();
    dynamicInventory=(rows.results||[]).map(r=>[r.slug,r.image_url||'',r.changed||''].join('|')).join('\n');

  } catch (_) { /* D1 installations without a listings table still work. */ }
    // Flash-sale photos only enter the image sitemap when verified and cached
    // in first-party R2. Include those changes in sitemap submission hashing.
    try{
      const sale=await db.prepare("SELECT slug,content_hash,modified_at FROM flash_categories ORDER BY slug LIMIT 200").all();
      const media=await db.prepare("SELECT image_key FROM flash_media ORDER BY image_key LIMIT 5000").all();
      dynamicInventory+='\nFLASH:'+JSON.stringify(sale.results||[])+'\nMEDIA:'+JSON.stringify(media.results||[]);
    }catch(_){}
  const imageSnapshot=imageSitemapFromCanonical(
    '<?xml version="1.0"?><urlset>'+canonicalStatic+'</urlset>'
  );
  const source=urls.join('\n')+'\n'+canonicalStatic+'\n'+imageSnapshot+'\n'+dynamicInventory;
  const digest=await cryptoImpl.subtle.digest('SHA-256',utf8(source));
  const version=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  const configs=[
    {url:SITEMAP_URL,ok:'sitemap_submission_hash',attempt:'sitemap_attempt_version',
      time:'sitemap_submission_time',error:'sitemap_submission_error'},
    {url:IMAGE_SITEMAP_URL,ok:'image_sitemap_submission_hash',attempt:'image_sitemap_attempt_version',
      time:'image_sitemap_submission_time',error:'image_sitemap_submission_error'}
  ];
  const attemptId=now.toISOString().slice(0,10)+':'+version;
  const pending=[];
  for(const cfg of configs) {
    const previous=await db.prepare('SELECT value FROM gsc_state WHERE name=?').bind(cfg.ok).first();
    if(previous?.value===version) continue;
    const attempted=await db.prepare('SELECT value FROM gsc_state WHERE name=?').bind(cfg.attempt).first();
    if(attempted?.value!==attemptId)pending.push(cfg);
  }
  if(!pending.length)return {status:'unchanged-or-already-attempted'};
  let token;
  try {
    token=await accessToken(env.GSC_SERVICE_ACCOUNT_JSON,fetcher,cryptoImpl,WRITE_SCOPE);
  } catch (error) {
    const code=/^GSC_[A-Z0-9_]+$/.test(error?.message||'')?error.message:'GSC_SITEMAP_ERROR';
    for(const cfg of pending) {
      await db.prepare('INSERT INTO gsc_state(name,value) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').bind(cfg.attempt,attemptId).run();
      await db.prepare('INSERT INTO gsc_state(name,value) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').bind(cfg.error,code).run();
    }
    return {status:'error',code};
  }
  const result={status:'ok',submitted:[],errors:[]};
  for(const cfg of pending) {
    await db.prepare('INSERT INTO gsc_state(name,value) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').bind(cfg.attempt,attemptId).run();
    try {
      await submitSitemap(env.GSC_SITE_URL,token,fetcher,cfg.url);
      await db.prepare('INSERT INTO gsc_state(name,value) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').bind(cfg.ok,version).run();
      await db.prepare('INSERT INTO gsc_state(name,value) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').bind(cfg.time,now.toISOString()).run();
      await db.prepare('DELETE FROM gsc_state WHERE name=?').bind(cfg.error).run();
      result.submitted.push(cfg.url);
    } catch(error) {
      const code=/^GSC_[A-Z0-9_]+$/.test(error?.message||'')?error.message:'GSC_SITEMAP_ERROR';
      await db.prepare('INSERT INTO gsc_state(name,value) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').bind(cfg.error,code).run();
      result.errors.push({sitemap:cfg.url,code});
    }
  }
  return result;
}

function base64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function utf8(value) { return new TextEncoder().encode(value); }

export async function accessToken(serviceAccountJson, fetcher = fetch, cryptoImpl = crypto, scope = READ_SCOPE) {
  let credentials;
  try { credentials = JSON.parse(serviceAccountJson); } catch (_) { throw new Error('GSC_SECRET_JSON_INVALID'); }
  if (credentials.type !== 'service_account' ||
      !/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(credentials.client_email || '') ||
      typeof credentials.private_key !== 'string' ||
      !credentials.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('GSC_SECRET_FORMAT_INVALID');
  }
  // Never trust a token_uri supplied in uploaded JSON: tokens go to Google only.
  if (credentials.token_uri && credentials.token_uri !== TOKEN_ENDPOINT) throw new Error('GSC_TOKEN_URI_INVALID');
  const raw = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  let pkcs8;
  try { pkcs8 = Uint8Array.from(atob(raw), character => character.charCodeAt(0)); }
  catch (_) { throw new Error('GSC_PRIVATE_KEY_INVALID'); }
  const key = await cryptoImpl.subtle.importKey(
    'pkcs8', pkcs8, {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['sign']
  );
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(utf8(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const claim = base64Url(utf8(JSON.stringify({
    iss: credentials.client_email, scope, aud: TOKEN_ENDPOINT,
    iat: now, exp: now + 3300
  })));
  const unsigned = header + '.' + claim;
  const signature = await cryptoImpl.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(unsigned));
  const assertion = unsigned + '.' + base64Url(new Uint8Array(signature));
  const response = await fetcher(TOKEN_ENDPOINT, {
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }).toString()
  });
  if (!response.ok) throw new Error('GSC_TOKEN_HTTP_' + response.status);
  const token = (await response.json()).access_token;
  if (typeof token !== 'string' || !token) throw new Error('GSC_TOKEN_MISSING');
  return token;
}

export async function googleRequest(url, token, body, fetcher = fetch) {
  const response = await fetcher(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'authorization':'Bearer ' + token,
      ...(body === undefined ? {} : {'content-type':'application/json'})
    },
    ...(body === undefined ? {} : {body:JSON.stringify(body)})
  });
  if (!response.ok) throw new Error('GSC_API_HTTP_' + response.status);
  return response.json();
}

export function indexStatus(result) {
  const value = result?.inspectionResult?.indexStatusResult || {};
  return {
    verdict: value.verdict || '',
    coverage: value.coverageState || '',
    indexing: value.indexingState || '',
    robots: value.robotsTxtState || '',
    fetch: value.pageFetchState || '',
    googleCanonical: value.googleCanonical || '',
    userCanonical: value.userCanonical || '',
    lastCrawl: value.lastCrawlTime || ''
  };
}

function dateRange(now) {
  // Use complete days, allowing Google's performance data time to settle.
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(date.getTime() - 3 * 86400000);
  const start = new Date(end.getTime() - 27 * 86400000);
  return [start.toISOString().slice(0,10), end.toISOString().slice(0,10)];
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS gsc_state (name TEXT PRIMARY KEY, value TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS gsc_performance (dimension TEXT NOT NULL, item TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, clicks REAL NOT NULL, impressions REAL NOT NULL, ctr REAL NOT NULL, position REAL NOT NULL, checked_at TEXT NOT NULL, PRIMARY KEY (dimension,item,start_date,end_date))"),
    db.prepare("CREATE TABLE IF NOT EXISTS gsc_url_inspections (url TEXT PRIMARY KEY, checked_at TEXT NOT NULL, verdict TEXT, coverage_state TEXT, indexing_state TEXT, robots_state TEXT, fetch_state TEXT, google_canonical TEXT, user_canonical TEXT, last_crawl TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS gsc_sitemaps (path TEXT PRIMARY KEY, checked_at TEXT NOT NULL, last_submitted TEXT, last_downloaded TEXT, errors INTEGER, warnings INTEGER, pending INTEGER)"),
    db.prepare("CREATE TABLE IF NOT EXISTS gsc_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, completed_at TEXT, status TEXT NOT NULL, inspected INTEGER NOT NULL DEFAULT 0, performance_rows INTEGER NOT NULL DEFAULT 0, error_code TEXT)")
  ]);
}

async function saveRows(db, statements) {
  for (let index=0; index<statements.length; index+=50)
    await db.batch(statements.slice(index,index+50));
}

export async function syncSearchConsole(env, opts={}) {
  // Missing configuration must never break the site's unrelated cron work.
  if (!env?.DB || !env.GSC_SERVICE_ACCOUNT_JSON || !env.GSC_SITE_URL) return {status:'not-configured'};
  const db = env.DB, fetcher = opts.fetcher || fetch, clock = opts.now || new Date();
  await ensureSchema(db);
  const startedAt = clock.toISOString();
  const started = await db.prepare('INSERT INTO gsc_runs (started_at,status) VALUES (?,?)').bind(startedAt,'running').run();
  const runId = started.meta?.last_row_id;
  let inspected = 0, perfRows = 0;
  try {
    const siteUrl = propertyIdentifier(env.GSC_SITE_URL);
    const token = await accessToken(env.GSC_SERVICE_ACCOUNT_JSON, fetcher, opts.cryptoImpl || crypto);
    // One authorized sitemap submission per changed URL inventory, at most daily
    // on permission failures. This does not request individual URL indexing.
    await submitChangedSitemap(db,env,fetcher,clock,opts.cryptoImpl||crypto);
    const encoded = encodeURIComponent(siteUrl);
    const apiBase = 'https://www.googleapis.com/webmasters/v3/sites/' + encoded;
    const previous = await db.prepare("SELECT value FROM gsc_state WHERE name='performance_day'").first();
    const today = startedAt.slice(0,10);
    if (previous?.value !== today) {
      const [startDate, endDate] = dateRange(clock);
      for (const [dimension, rowLimit] of [['page',250], ['query',100], ['site',1]]) {
        const body = {startDate,endDate,type:'web',rowLimit};
        if (dimension !== 'site') body.dimensions=[dimension];
        const result = await googleRequest(apiBase+'/searchAnalytics/query',token,body,fetcher);
        const statements = (result.rows || []).map(row => db.prepare(
          'INSERT INTO gsc_performance (dimension,item,start_date,end_date,clicks,impressions,ctr,position,checked_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(dimension,item,start_date,end_date) DO UPDATE SET clicks=excluded.clicks,impressions=excluded.impressions,ctr=excluded.ctr,position=excluded.position,checked_at=excluded.checked_at'
        ).bind(dimension, dimension === 'site' ? 'buysell.best' : String(row.keys?.[0] || ''),
          startDate,endDate,Number(row.clicks||0),Number(row.impressions||0),
          Number(row.ctr||0),Number(row.position||0),startedAt));
        await saveRows(db,statements); perfRows+=statements.length;
      }
      const sitemaps = await googleRequest(apiBase+'/sitemaps',token,undefined,fetcher);
      const sitemapStatements = (sitemaps.sitemap || []).map(item => db.prepare(
        'INSERT INTO gsc_sitemaps(path,checked_at,last_submitted,last_downloaded,errors,warnings,pending) VALUES (?,?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET checked_at=excluded.checked_at,last_submitted=excluded.last_submitted,last_downloaded=excluded.last_downloaded,errors=excluded.errors,warnings=excluded.warnings,pending=excluded.pending'
      ).bind(String(item.path||''),startedAt,item.lastSubmitted||null,item.lastDownloaded||null,
        Number(item.errors||0),Number(item.warnings||0),item.isPending?1:0));
      await saveRows(db,sitemapStatements);
      await db.prepare("INSERT INTO gsc_state(name,value) VALUES('performance_day',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(today).run();
    }
    const urls = monitoredUrls();
    // Keep a complete inventory, including optional live marketplace listings
    // when that D1 table exists. Never submit missing/unpublished item URLs.
    if (env.DB) {
      try {
        const listings=await env.DB.prepare("SELECT slug FROM listings WHERE slug IS NOT NULL AND COALESCE(status,'active')='active' LIMIT 500").all();
        for (const item of listings.results||[]) {
          const location=new URL('/item/'+encodeURIComponent(item.slug),PROPERTY_PREFIX).href;
          if(!urls.includes(location)) urls.push(location);
        }
      } catch (_) { /* listings table may not yet be migrated */ }
    }
    const state = await db.prepare("SELECT value FROM gsc_state WHERE name='inspection_cursor'").first();
    const position = Number.parseInt(state?.value||'0',10);
    const start = Number.isFinite(position) && position >= 0 ? position % urls.length : 0;
    for (let i=0; i<Math.min(INSPECTIONS_PER_RUN,urls.length); i++) {
      const url=urls[(start+i)%urls.length];
      // All inspection URLs are on our public, canonical origin.
      if (!url.startsWith(PROPERTY_PREFIX)) throw new Error('GSC_URL_INVALID');
      const result = await googleRequest(
        'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
        token,{inspectionUrl:url,siteUrl,languageCode:'en-US'},fetcher
      );
      const status=indexStatus(result);
      await db.prepare(
        'INSERT INTO gsc_url_inspections(url,checked_at,verdict,coverage_state,indexing_state,robots_state,fetch_state,google_canonical,user_canonical,last_crawl) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET checked_at=excluded.checked_at,verdict=excluded.verdict,coverage_state=excluded.coverage_state,indexing_state=excluded.indexing_state,robots_state=excluded.robots_state,fetch_state=excluded.fetch_state,google_canonical=excluded.google_canonical,user_canonical=excluded.user_canonical,last_crawl=excluded.last_crawl'
      ).bind(url,startedAt,status.verdict,status.coverage,status.indexing,status.robots,status.fetch,status.googleCanonical,status.userCanonical,status.lastCrawl).run();
      inspected++;
      await db.prepare("INSERT INTO gsc_state(name,value) VALUES('inspection_cursor',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String((start+i+1)%urls.length)).run();
    }
    if (runId != null) await db.prepare('UPDATE gsc_runs SET completed_at=?,status=?,inspected=?,performance_rows=? WHERE id=?').bind(new Date().toISOString(),'ok',inspected,perfRows,runId).run();
    return {status:'ok',inspected,performanceRows:perfRows};
  } catch (error) {
    // Save only sanitized error codes; never log credentials or OAuth responses.
    const code = /^GSC_[A-Z0-9_]+$/.test(String(error?.message)) ? error.message : 'GSC_UNEXPECTED_ERROR';
    if (runId != null) await db.prepare('UPDATE gsc_runs SET completed_at=?,status=?,inspected=?,performance_rows=?,error_code=? WHERE id=?').bind(new Date().toISOString(),'error',inspected,perfRows,code,runId).run();
    return {status:'error',code,inspected};
  }
}
