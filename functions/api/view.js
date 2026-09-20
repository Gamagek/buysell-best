import {json,getCountry,getCurrency,cleanId,ensureSchema,EVENT_WEIGHTS} from "../../lib/personalization.js";
export async function onRequestPost(context){
  const body=await context.request.json().catch(()=>null);
  if(!body||typeof body!=="object")return json({error:"Invalid JSON."},400);
  const visitor_id=cleanId(body.visitor_id),listing_id=String(body.listing_id||"").slice(0,160);
  if(!visitor_id||!listing_id)return json({error:"visitor_id and listing_id are required."},400);
  if(!context.env.DB)return json({ok:true,persisted:false,view_count:0,unique_view_count:0});
  try{
    const DB=context.env.DB; await ensureSchema(DB);
    const now=new Date().toISOString(),country=getCountry(context.request),currency=getCurrency(country);
    await DB.prepare("INSERT INTO visitor_profiles(visitor_id,country,currency,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(visitor_id) DO UPDATE SET country=excluded.country,currency=excluded.currency,updated_at=excluded.updated_at").bind(visitor_id,country,currency,now,now).run();
    const bucketKey=new Date(Math.floor(Date.now()/3600000)*3600000).toISOString().slice(0,13);
    const bucketInsert=await DB.prepare("INSERT OR IGNORE INTO listing_views(visitor_id,listing_id,view_bucket,created_at) VALUES(?,?,?,?)").bind(visitor_id,listing_id,bucketKey,now).run();
    const uniqueInsert=await DB.prepare("INSERT OR IGNORE INTO listing_unique_views(visitor_id,listing_id,created_at) VALUES(?,?,?)").bind(visitor_id,listing_id,now).run();
    const changes=Number(bucketInsert.meta?.changes||0),uniqueChanges=Number(uniqueInsert.meta?.changes||0);
    await DB.prepare("INSERT INTO listing_stats(listing_id,view_count,unique_view_count,updated_at) VALUES(?,?,?,?) ON CONFLICT(listing_id) DO UPDATE SET view_count=listing_stats.view_count+excluded.view_count,unique_view_count=listing_stats.unique_view_count+excluded.unique_view_count,updated_at=excluded.updated_at").bind(listing_id,changes,uniqueChanges,now).run();
    if(changes){
      const category=String(body.category||"").toLowerCase().slice(0,60),brand=String(body.brand||"").slice(0,80);
      const item_price=Number.isFinite(Number(body.item_price))?Number(body.item_price):null;
      const item_currency=body.item_currency?String(body.item_currency).toUpperCase().slice(0,3):null;
      const item_location=body.item_location?String(body.item_location).slice(0,100):null;
      await DB.prepare("INSERT INTO behavior_events(visitor_id,event_type,listing_id,category,brand,item_price,item_currency,item_location,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(visitor_id,"view",listing_id,category,brand,item_price,item_currency,item_location,now).run();
      if(category)await DB.prepare("INSERT INTO interest_scores(visitor_id,category,score,updated_at) VALUES(?,?,?,?) ON CONFLICT(visitor_id,category) DO UPDATE SET score=MAX(0,interest_scores.score+excluded.score),updated_at=excluded.updated_at").bind(visitor_id,category,EVENT_WEIGHTS.view,now).run();
      await DB.prepare("INSERT INTO item_affinity(visitor_id,listing_id,score,updated_at) VALUES(?,?,?,?) ON CONFLICT(visitor_id,listing_id) DO UPDATE SET score=item_affinity.score+excluded.score,updated_at=excluded.updated_at").bind(visitor_id,listing_id,EVENT_WEIGHTS.view,now).run();
    }
    const stats=await DB.prepare("SELECT view_count,unique_view_count FROM listing_stats WHERE listing_id=?").bind(listing_id).first();
    return json({ok:true,persisted:true,...stats});
  }catch(_){return json({ok:true,persisted:false,view_count:0,unique_view_count:0,message:"Database temporarily unavailable."});}
}
export async function onRequestOptions(){return new Response(null,{status:204,headers:{"access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"content-type"}});}
