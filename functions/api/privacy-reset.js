import {json,cleanId,ensureSchema} from "../../lib/personalization.js";
export async function onRequestPost(context){
  const body=await context.request.json().catch(()=>null),visitor_id=cleanId(body?.visitor_id);
  if(!visitor_id)return json({error:"Invalid visitor id."},400);
  if(!context.env.DB)return json({ok:true,persisted:false});
  try{await ensureSchema(context.env.DB);await context.env.DB.batch([
    context.env.DB.prepare("DELETE FROM behavior_events WHERE visitor_id=?").bind(visitor_id),
    context.env.DB.prepare("DELETE FROM interest_scores WHERE visitor_id=?").bind(visitor_id),
    context.env.DB.prepare("DELETE FROM item_affinity WHERE visitor_id=?").bind(visitor_id),
    context.env.DB.prepare("DELETE FROM listing_views WHERE visitor_id=?").bind(visitor_id),
    context.env.DB.prepare("DELETE FROM listing_unique_views WHERE visitor_id=?").bind(visitor_id),
    context.env.DB.prepare("DELETE FROM listing_reactions WHERE visitor_id=?").bind(visitor_id),
    context.env.DB.prepare("DELETE FROM visitor_profiles WHERE visitor_id=?").bind(visitor_id)
  ]);return json({ok:true,persisted:true});}
  catch(_){return json({ok:false,error:"Could not reset data."},500);}
}
