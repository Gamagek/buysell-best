import {json,cleanId,ensureSchema,EVENT_WEIGHTS,REACTION_TYPES} from "../../lib/personalization.js";

export async function onRequestPost(context){
  const body=await context.request.json().catch(()=>null);
  if(!body||typeof body!=="object") return json({error:"Invalid JSON."},400);

  const visitor_id=cleanId(body.visitor_id);
  const listing_id=String(body.listing_id||"").slice(0,160);
  const type=String(body.reaction_type||"").toLowerCase();

  if(!visitor_id||!listing_id||!REACTION_TYPES[type]) return json({error:"Invalid reaction."},400);
  if(!context.env.DB) return json({ok:true,persisted:false,active:false});

  try{
    const DB=context.env.DB;
    await ensureSchema(DB);
    const now=new Date().toISOString();
    const existing=await DB.prepare(
      "SELECT 1 FROM listing_reactions WHERE visitor_id=? AND listing_id=? AND reaction_type=?"
    ).bind(visitor_id,listing_id,type).first();

    let active=false;
    let delta=0;

    if(existing){
      await DB.prepare(
        "DELETE FROM listing_reactions WHERE visitor_id=? AND listing_id=? AND reaction_type=?"
      ).bind(visitor_id,listing_id,type).run();
      delta=-1;
    }else{
      await DB.prepare(
        "INSERT INTO listing_reactions(visitor_id,listing_id,reaction_type,created_at) VALUES(?,?,?,?)"
      ).bind(visitor_id,listing_id,type,now).run();
      active=true;
      delta=1;

      const category=String(body.category||"").toLowerCase().slice(0,60);
      const brand=String(body.brand||"").slice(0,80);
      const weight=EVENT_WEIGHTS[type]||0;

      await DB.prepare(
        "INSERT INTO behavior_events(visitor_id,event_type,listing_id,category,brand,created_at) VALUES(?,?,?,?,?,?)"
      ).bind(visitor_id,type,listing_id,category,brand,now).run();

      if(category){
        await DB.prepare(
          "INSERT INTO interest_scores(visitor_id,category,score,updated_at) VALUES(?,?,?,?) ON CONFLICT(visitor_id,category) DO UPDATE SET score=MAX(0,interest_scores.score+excluded.score),updated_at=excluded.updated_at"
        ).bind(visitor_id,category,weight,now).run();
      }

      await DB.prepare(
        "INSERT INTO item_affinity(visitor_id,listing_id,score,updated_at) VALUES(?,?,?,?) ON CONFLICT(visitor_id,listing_id) DO UPDATE SET score=item_affinity.score+excluded.score,updated_at=excluded.updated_at"
      ).bind(visitor_id,listing_id,weight,now).run();
    }

    let updateSql="UPDATE listing_stats SET updated_at=? ";
    if(type==="like") updateSql+=", like_count=MAX(0,like_count+?)";
    if(type==="interested") updateSql+=", interested_count=MAX(0,interested_count+?)";
    if(type==="save") updateSql+=", save_count=MAX(0,save_count+?)";

    await DB.prepare("INSERT OR IGNORE INTO listing_stats(listing_id) VALUES(?)").bind(listing_id).run();
    await DB.prepare(updateSql+" WHERE listing_id=?").bind(now,delta,listing_id).run();

    const stats=await DB.prepare(
      "SELECT view_count,unique_view_count,like_count,interested_count,save_count FROM listing_stats WHERE listing_id=?"
    ).bind(listing_id).first();

    return json({ok:true,persisted:true,active,...stats});
  }catch(_){
    return json({ok:false,error:"Could not save reaction."},500);
  }
}

export async function onRequestOptions(){
  return new Response(null,{status:204,headers:{"access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"content-type"}});
}
