import {json,cleanId,ensureSchema} from "../../lib/personalization.js";
export async function onRequestGet(context){
  const url=new URL(context.request.url),ids=String(url.searchParams.get("ids")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,60).map(x=>x.slice(0,160)),visitor_id=cleanId(url.searchParams.get("visitor_id"));
  if(!ids.length)return json({ok:true,stats:{}});
  if(!context.env.DB)return json({ok:true,stats:{}});
  try{
    const DB=context.env.DB;await ensureSchema(DB);const qs=ids.map(()=>"?").join(",");
    const rows=await DB.prepare("SELECT listing_id,view_count,unique_view_count,like_count,interested_count,save_count FROM listing_stats WHERE listing_id IN ("+qs+")").bind(...ids).all();
    const stats={};ids.forEach(id=>stats[id]={view_count:0,unique_view_count:0,like_count:0,interested_count:0,save_count:0,mine:{}});
    (rows.results||[]).forEach(r=>stats[r.listing_id]={view_count:Number(r.view_count||0),unique_view_count:Number(r.unique_view_count||0),like_count:Number(r.like_count||0),interested_count:Number(r.interested_count||0),save_count:Number(r.save_count||0),mine:{}});
    if(visitor_id){const reactions=await DB.prepare("SELECT listing_id,reaction_type FROM listing_reactions WHERE visitor_id=? AND listing_id IN ("+qs+")").bind(visitor_id,...ids).all();(reactions.results||[]).forEach(r=>{if(stats[r.listing_id])stats[r.listing_id].mine[r.reaction_type]=true;});}
    return json({ok:true,stats});
  }catch(_){return json({ok:false,stats:{},error:"Could not read listing statistics."},500);}
}
