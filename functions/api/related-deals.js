import {searchEbay} from "./deals.js";

export async function onRequestGet(context){
  const u=new URL(context.request.url);
  const query=String(u.searchParams.get("query")||"").replace(/[<>]/g," ").trim().slice(0,120);
  const exclude=String(u.searchParams.get("exclude")||"").slice(0,160);
  const country=String(context.request.cf?.country||context.request.headers.get("CF-IPCountry")||"US").toUpperCase().slice(0,2);
  if(!query)return new Response(JSON.stringify({ok:true,configured:false,items:[]}),{headers:{"content-type":"application/json"}});
  try{
    const result=await searchEbay(context.env,query,8,exclude,country);
    return new Response(JSON.stringify(result),{status:200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
  }catch(error){
    return new Response(JSON.stringify({ok:false,configured:Boolean(context.env.EBAY_CLIENT_ID&&context.env.EBAY_CLIENT_SECRET),items:[],message:String(error?.message||"Related marketplace search failed.")}),{status:502,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
  }
}
