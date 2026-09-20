import {json,getCountry,getCurrency} from "./_lib.js";

const API="https://open.er-api.com/v6/latest/USD";
const CACHE_KEY="https://buysell.best/__fx_usd__";

async function getRates(context){
  const cache=globalThis.caches?.default;
  let cached=null;
  if(cache) cached=await cache.match(CACHE_KEY);
  if(cached) return cached.json();
  const response=await fetch(API,{headers:{"user-agent":"BuySell.Best currency display"}});
  if(!response.ok) throw new Error("rate source unavailable");
  const data=await response.json();
  if(data.result!=="success") throw new Error("rate source error");
  if(cache) await cache.put(CACHE_KEY,new Response(JSON.stringify(data),{headers:{"content-type":"application/json","cache-control":"public,max-age=21600"}}));
  return data;
}

export async function onRequestGet(context){
  const url=new URL(context.request.url);
  const from=String(url.searchParams.get("from")||"USD").toUpperCase();
  const to=String(url.searchParams.get("to")||getCurrency(getCountry(context.request))).toUpperCase();
  const amount=Number(url.searchParams.get("amount"));
  if(!Number.isFinite(amount)||amount<0||amount>100000000000) return json({error:"Invalid amount."},400);
  if(from===to) return json({ok:true,from,to,amount,converted:amount,rate:1,updated:null});
  try{
    const data=await getRates(context);
    const usdToFrom=from==="USD"?1:Number(data.conversion_rates?.[from]);
    const usdToTo=to==="USD"?1:Number(data.conversion_rates?.[to]);
    if(!Number.isFinite(usdToFrom)||!Number.isFinite(usdToTo)||usdToFrom<=0||usdToTo<=0) return json({error:"Currency not supported."},422);
    const rate=usdToTo/usdToFrom;
    return json({ok:true,from,to,amount,rate,converted:amount*rate,updated:data.time_last_update_utc||null,source:"ExchangeRate-API Open Access"});
  }catch(_){
    return json({error:"Live exchange rate unavailable. Showing original price only."},503);
  }
}
