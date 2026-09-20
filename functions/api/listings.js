import {json} from "../../lib/personalization.js";

function clean(v,fallback=""){
  const s=String(v??"").trim();
  return s&&s.toLowerCase()!=="null"&&s.toLowerCase()!=="undefined"?s:fallback;
}

export async function onRequestGet(context){
  const url=new URL(context.request.url);
  const limit=Math.min(20,Math.max(1,Number(url.searchParams.get("limit"))||12));
  const slug=clean(url.searchParams.get("slug"));
  if(!context.env.DB)return json({ok:true,items:[]});
  try{
    const base="SELECT id,slug,title,brand,category,price,currency,condition,description,image_url,status,created_at FROM listings ";
    let result;
    if(slug){
      result=await context.env.DB.prepare(base+"WHERE slug=? AND COALESCE(status,'active')='active' LIMIT 1").bind(slug).first();
      return json({ok:true,items:result?[result]:[]});
    }
    result=await context.env.DB.prepare(base+"WHERE COALESCE(status,'active')='active' ORDER BY datetime(created_at) DESC LIMIT ?").bind(limit).all();
    return json({ok:true,items:result.results||[]});
  }catch(error){
    // A missing/unmigrated listings table must not break the homepage.
    return json({ok:true,items:[],available:false});
  }
}
export async function onRequestOptions(){
  return new Response(null,{status:204,headers:{"access-control-allow-methods":"GET,OPTIONS"}});
}
