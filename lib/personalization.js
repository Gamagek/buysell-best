const CURRENCY_BY_COUNTRY={US:"USD",CA:"CAD",GB:"GBP",IE:"EUR",DE:"EUR",FR:"EUR",IT:"EUR",ES:"EUR",AU:"AUD",NZ:"NZD",IN:"INR",LK:"LKR",PK:"PKR",BD:"BDT",NP:"NPR",SG:"SGD",MY:"MYR",JP:"JPY",KR:"KRW",AE:"AED",SA:"SAR",ZA:"ZAR",BR:"BRL",MX:"MXN"};

export function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});}
export function getCountry(request){return String(request.cf?.country||request.headers.get("CF-IPCountry")||"US").toUpperCase().slice(0,2)||"US";}
export function getCurrency(country){return CURRENCY_BY_COUNTRY[country]||"USD";}
export function cleanId(value){const s=String(value||"");return /^[A-Za-z0-9_-]{8,120}$/.test(s)?s:null;}
export async function ensureSchema(DB){
  if(!DB)return false;
  await DB.batch([
    DB.prepare("CREATE TABLE IF NOT EXISTS visitor_profiles (visitor_id TEXT PRIMARY KEY, country TEXT NOT NULL, currency TEXT NOT NULL, personalization_enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS behavior_events (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor_id TEXT NOT NULL, event_type TEXT NOT NULL, listing_id TEXT, category TEXT, brand TEXT, query TEXT, item_price REAL, item_currency TEXT, item_location TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS interest_scores (visitor_id TEXT NOT NULL, category TEXT NOT NULL, score REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(visitor_id,category))"),
    DB.prepare("CREATE TABLE IF NOT EXISTS item_affinity (visitor_id TEXT NOT NULL, listing_id TEXT NOT NULL, score REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(visitor_id,listing_id))"),
    DB.prepare("CREATE TABLE IF NOT EXISTS listing_stats (listing_id TEXT PRIMARY KEY, view_count INTEGER NOT NULL DEFAULT 0, unique_view_count INTEGER NOT NULL DEFAULT 0, like_count INTEGER NOT NULL DEFAULT 0, interested_count INTEGER NOT NULL DEFAULT 0, save_count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS listing_views (visitor_id TEXT NOT NULL, listing_id TEXT NOT NULL, view_bucket TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(visitor_id,listing_id,view_bucket))"),
    DB.prepare("CREATE TABLE IF NOT EXISTS listing_unique_views (visitor_id TEXT NOT NULL, listing_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(visitor_id,listing_id))"),
    DB.prepare("CREATE TABLE IF NOT EXISTS listing_reactions (visitor_id TEXT NOT NULL, listing_id TEXT NOT NULL, reaction_type TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(visitor_id,listing_id,reaction_type))"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_behavior_events_visitor_time ON behavior_events(visitor_id,created_at DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_interest_scores_visitor_score ON interest_scores(visitor_id,score DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_item_affinity_visitor_score ON item_affinity(visitor_id,score DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_listing_views_listing_time ON listing_views(listing_id,created_at DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_listing_reactions_listing ON listing_reactions(listing_id,reaction_type)")
  ]);
  return true;
}
export const EVENT_WEIGHTS={view:1,search:2,like:4,interested:5,show_more:8,save:6,contact:3,hide:-6};
export const REACTION_TYPES={like:"like",interested:"interested",save:"save"};
