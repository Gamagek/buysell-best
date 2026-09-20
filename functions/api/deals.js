let ebayTokenCache={token:"",expiresAt:0};

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store"
    }
  });
}
function cleanQuery(value,fallback="popular"){
  const s=String(value||fallback).replace(/[<>]/g," ").trim().slice(0,120);
  return s||fallback;
}
function limitValue(value){
  const n=Number(value);
  return Number.isFinite(n)?Math.min(20,Math.max(1,Math.floor(n))):8;
}
async function getEbayToken(env){
  const now=Date.now();
  if(ebayTokenCache.token&&ebayTokenCache.expiresAt>now+60000)return ebayTokenCache.token;
  if(!env.EBAY_CLIENT_ID||!env.EBAY_CLIENT_SECRET)return null;
  const basic=btoa(String(env.EBAY_CLIENT_ID)+":"+String(env.EBAY_CLIENT_SECRET));
  const r=await fetch("https://api.ebay.com/identity/v1/oauth2/token",{
    method:"POST",
    headers:{
      Authorization:"Basic "+basic,
      "Content-Type":"application/x-www-form-urlencoded",
      "Content-Language":"en-US"
    },
    body:"grant_type=client_credentials&scope="+encodeURIComponent("https://api.ebay.com/oauth/api_scope")
  });
  if(!r.ok)throw new Error("eBay authentication failed");
  const data=await r.json();
  if(!data.access_token)throw new Error("eBay did not return an access token");
  ebayTokenCache={token:data.access_token,expiresAt:now+Number(data.expires_in||7200)*1000};
  return data.access_token;
}
function mapItem(x){
  const p=Number(x?.price?.value);
  return {
    id:String(x?.itemId||x?.legacyItemId||"").slice(0,160),
    title:String(x?.title||"").slice(0,220),
    price:Number.isFinite(p)?p:0,
    currency:String(x?.price?.currency||"USD").toUpperCase(),
    image:String(x?.image?.imageUrl||x?.thumbnailImages?.[0]?.imageUrl||""),
    url:String(x?.itemWebUrl||x?.itemAffiliateWebUrl||""),
    merchant:"eBay",
    condition:String(x?.condition||""),
    location:String(x?.itemLocation?.city||x?.itemLocation?.country||""),
    sourceLabel:"Live eBay Browse API"
  };
}
export async function searchEbay(env,query,limit,exclude="",country="US"){
  const token=await getEbayToken(env);
  if(!token)return {configured:false,items:[]};
  const u=new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  u.searchParams.set("q",query);
  u.searchParams.set("limit",String(Math.min(20,Math.max(4,limit))));
  u.searchParams.set("sort","price");
  u.searchParams.set("filter","buyingOptions:{FIXED_PRICE}");
  const r=await fetch(u.toString(),{
    headers:{
      Authorization:"Bearer "+token,
      "X-EBAY-C-MARKETPLACE-ID":String(env.EBAY_MARKETPLACE_ID||"EBAY_US"),
      "X-EBAY-C-ENDUSERCTX":"contextualLocation=country="+String(country||"US").slice(0,2),
      Accept:"application/json",
      "Accept-Language":"en-US"
    }
  });
  if(!r.ok)throw new Error("eBay marketplace search failed");
  const data=await r.json();
  const items=(data.itemSummaries||[]).map(mapItem).filter(x=>x.id&&x.title&&x.url);
  return {configured:true,items:items.filter(x=>x.id!==exclude).slice(0,limit),source:"eBay Browse API"};
}
const POPULAR_QUERIES=["smartphone","laptop","wireless headphones","gaming monitor","mirrorless camera","smart watch","tablet","office chair"];
export async function onRequestGet(context){
  const u=new URL(context.request.url);
  const query=cleanQuery(u.searchParams.get("query"),"popular");
  const limit=limitValue(u.searchParams.get("limit"));
  const country=String(context.request.cf?.country||context.request.headers.get("CF-IPCountry")||"US").toUpperCase().slice(0,2);
  if(query==="popular"){
    const buckets=POPULAR_QUERIES.slice(0,4);
    const results=await Promise.all(buckets.map(q=>searchEbay(context.env,q,Math.max(2,Math.ceil(limit/buckets.length)),"",country).catch(()=>({configured:false,items:[]}))));
    const configured=results.some(x=>x.configured);
    if(!configured)return json({ok:false,configured:false,items:[],message:"Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in Cloudflare Worker secrets to enable live marketplace data."});
    const items=[...new Map(results.flatMap(x=>x.items).map(x=>[x.id,x])).values()].slice(0,limit);
    return json({ok:true,configured:true,items,source:"eBay Browse API"});
  }
  try{
    return json({ok:true,...await searchEbay(context.env,query,limit,"",country)});
  }catch(error){
    return json({ok:false,configured:Boolean(context.env.EBAY_CLIENT_ID&&context.env.EBAY_CLIENT_SECRET),items:[],message:String(error?.message||"Marketplace search failed.")},502);
  }
}
export async function onRequestOptions(){
  return new Response(null,{status:204,headers:{"access-control-allow-methods":"GET,OPTIONS"}});
}
