// Account-wide Cloudflare D1 Free-plan row budget guard for NEW bulk publishing.
// D1 quota is billed per ACCOUNT and resets at 00:00 UTC, unlike the
// Sri Lanka-local editorial publication date. This guard does not affect
// existing product page rendering or search-console monitoring.
//
// Set D1_ANALYTICS_READ_TOKEN as a Cloudflare Worker SECRET with only
// Account Analytics Read access for this account. Never commit the token.
// Until valid telemetry is available, new bulk imports FAIL CLOSED.

export const DAILY_D1_ROWS_READ_LIMIT=5_000_000;
export const DAILY_D1_ROWS_WRITTEN_LIMIT=100_000;
export const D1_PAUSE_RATIO=0.75;
const ACCOUNT="de9e41200f6bdfab80553c8eb08f9b16";
const DB="822532f2-1e71-41c5-8d3b-0b678c903e0a";
const GRAPHQL="https://api.cloudflare.com/client/v4/graphql";
const BUDGET_QUERY='query D1ReadWriteBudget($id: string!, $day: Date!) { viewer { accounts(filter: { accountTag: $id }) { d1AnalyticsAdaptiveGroups(limit: 200, filter: { date_geq: $day, date_leq: $day }) { dimensions { date databaseId } sum { rowsRead rowsWritten } } } } }';

function integer(x){return typeof x==="number"&&Number.isSafeInteger(x)&&x>=0?x:null;}
export function evaluateD1Budget(rows,now=new Date()){
 const day=now.toISOString().slice(0,10);
 if(!Array.isArray(rows)||rows.length<1)return {allowed:false,status:"analytics-empty",utcDay:day};
 let reads=0,writes=0,seen=new Set(),foundOwnDb=false;
 for(const item of rows){
  if(item?.dimensions?.date!==day)return {allowed:false,status:"analytics-day-mismatch",utcDay:day};
  const id=item?.dimensions?.databaseId;
  if(typeof id!=="string"||!/^[a-f0-9-]{32,40}$/i.test(id)||seen.has(id))
    return {allowed:false,status:"analytics-invalid-database",utcDay:day};
  seen.add(id);
  if(id===DB)foundOwnDb=true;
  const r=integer(item?.sum?.rowsRead),w=integer(item?.sum?.rowsWritten);
  if(r===null||w===null||!Number.isSafeInteger(reads+r)||!Number.isSafeInteger(writes+w))
    return {allowed:false,status:"analytics-invalid-counters",utcDay:day};
  reads+=r;writes+=w;
 }
 if(!foundOwnDb)return {allowed:false,status:"analytics-own-db-missing",utcDay:day};
 const readFraction=reads/DAILY_D1_ROWS_READ_LIMIT;
 const writeFraction=writes/DAILY_D1_ROWS_WRITTEN_LIMIT;
 const usage=Math.max(readFraction,writeFraction);
 // Adaptive throttle in the run BEFORE the hard 75% stop.
 const hourlyMax=usage>=0.7?5:usage>=0.6?20:50;
 return {allowed:usage<D1_PAUSE_RATIO,status:usage>=D1_PAUSE_RATIO?"daily-d1-75pct-limit":"under-limit",
  utcDay:day,rowsRead:reads,rowsWritten:writes,readPercent:+(100*readFraction).toFixed(2),
  writePercent:+(100*writeFraction).toFixed(2),hourlyMax:usage>=D1_PAUSE_RATIO?0:hourlyMax,
  nextResetUtc:day+"T00:00:00Z",source:"cloudflare-account-wide-graphql"};
}
export async function inspectD1Quota(env,{now=new Date(),fetcher=fetch}={}){
 const day=now.toISOString().slice(0,10);
 if(typeof env?.D1_ANALYTICS_READ_TOKEN!=="string"||env.D1_ANALYTICS_READ_TOKEN.length<20)
  return {allowed:false,status:"analytics-token-not-configured",utcDay:day,hourlyMax:0};
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const result=await fetcher(GRAPHQL,{method:"POST",redirect:"error",headers:{
   authorization:"Bearer "+env.D1_ANALYTICS_READ_TOKEN,"content-type":"application/json"
  },body:JSON.stringify({query:BUDGET_QUERY,variables:{id:ACCOUNT,day}}),signal:controller.signal});
  if(!result.ok)return {allowed:false,status:"analytics-http-error",utcDay:day,hourlyMax:0};
  // Prevent excessive response parsing if the provider response is malformed.
  if(Number(result.headers?.get("content-length")||0)>100000)
   return {allowed:false,status:"analytics-response-too-large",utcDay:day,hourlyMax:0};
  const text=await result.text();
  if(text.length>100000)return {allowed:false,status:"analytics-response-too-large",utcDay:day,hourlyMax:0};
  const payload=JSON.parse(text);
  if(Array.isArray(payload.errors)&&payload.errors.length)
   return {allowed:false,status:"analytics-graphql-error",utcDay:day,hourlyMax:0};
  const accounts=payload?.data?.viewer?.accounts;
  if(!Array.isArray(accounts)||accounts.length!==1)
   return {allowed:false,status:"analytics-account-unavailable",utcDay:day,hourlyMax:0};
  return evaluateD1Budget(accounts[0]?.d1AnalyticsAdaptiveGroups,now);
 }catch{return {allowed:false,status:"analytics-unavailable",utcDay:day,hourlyMax:0};}
 finally{clearTimeout(timeout);}
}
