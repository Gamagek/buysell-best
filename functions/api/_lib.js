const CURRENCY_BY_COUNTRY={US:"USD",CA:"CAD",GB:"GBP",IE:"EUR",DE:"EUR",FR:"EUR",IT:"EUR",ES:"EUR",AU:"AUD",NZ:"NZD",IN:"INR",LK:"LKR",PK:"PKR",BD:"BDT",NP:"NPR",SG:"SGD",MY:"MYR",JP:"JPY",KR:"KRW",AE:"AED",SA:"SAR",ZA:"ZAR",BR:"BRL",MX:"MXN"};

export function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
}
export function getCountry(request){
  return String(request.cf?.country || request.headers.get("CF-IPCountry") || "US").toUpperCase().slice(0,2) || "US";
}
export function getCurrency(country){return CURRENCY_BY_COUNTRY[country]||"USD";}
export function cleanId(value){
  const s=String(value||"");
  return /^[A-Za-z0-9_-]{8,120}$/.test(s)?s:null;
}
export async function ensureSchema(DB){
  if(!DB) return false;
  await DB.batch([
    DB.prepare("CREATE TABLE IF NOT EXISTS visitor_profiles (visitor_id TEXT PRIMARY KEY, country TEXT NOT NULL, currency TEXT NOT NULL, personalization_enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS behavior_events (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor_id TEXT NOT NULL, event_type TEXT NOT NULL, listing_id TEXT, category TEXT, brand TEXT, query TEXT, item_price REAL, item_currency TEXT, item_location TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS interest_scores (visitor_id TEXT NOT NULL, category TEXT NOT NULL, score REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(visitor_id,category))"),
    DB.prepare("CREATE TABLE IF NOT EXISTS item_affinity (visitor_id TEXT NOT NULL, listing_id TEXT NOT NULL, score REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(visitor_id,listing_id))"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_behavior_events_visitor_time ON behavior_events(visitor_id,created_at DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_interest_scores_visitor_score ON interest_scores(visitor_id,score DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_item_affinity_visitor_score ON item_affinity(visitor_id,score DESC)")
  ]);
  return true;
}
export const EVENT_WEIGHTS={view:1,search:2,like:4,show_more:8,save:6,contact:3,hide:-6};
