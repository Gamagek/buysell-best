import {json,ensureSchema} from "../../lib/personalization.js";

export async function onRequestGet(context){
  const DB=context.env?.DB;
  if(!DB){
    return json({
      ok:false,
      db_bound:false,
      db_connected:false,
      message:"Cloudflare Pages does not have a D1 binding named DB."
    },503);
  }

  try{
    await DB.prepare("SELECT 1 AS ok").first();
    await ensureSchema(DB);

    const rows=await DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all();

    const tables=(rows.results||[]).map(r=>String(r.name));
    const required=[
      "visitor_profiles",
      "behavior_events",
      "interest_scores",
      "item_affinity",
      "listing_stats",
      "listing_views",
      "listing_unique_views",
      "listing_reactions"
    ];
    const missing=required.filter(name=>!tables.includes(name));

    return json({
      ok:missing.length===0,
      db_bound:true,
      db_connected:true,
      tables,
      missing,
      message:missing.length===0
        ?"D1 is connected and the required tables are available."
        :"D1 is connected, but one or more required tables are missing."
    },missing.length===0?200:500);
  }catch(error){
    return json({
      ok:false,
      db_bound:true,
      db_connected:false,
      message:"The DB binding exists, but the D1 query failed.",
      error:String(error?.message||error)
    },500);
  }
}
