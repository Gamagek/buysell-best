import {searchEbay,searchTemporary} from "./deals.js";

export async function onRequestGet(context){
  const u=new URL(context.request.url);
  const query=String(u.searchParams.get("query")||"").replace(/[<>]/g," ").trim().slice(0,120);
  const exclude=String(u.searchParams.get("exclude")||"").slice(0,160);
  const country=String(context.request.cf?.country||context.request.headers.get("CF-IPCountry")||"US").toUpperCase().slice(0,2);
  if(!query){
    return new Response(JSON.stringify({ok:true,configured:false,temporary:true,items:[]}),{headers:{"content-type":"application/json"}});
  }

  try{
    const ebay=await searchEbay(context.env,query,8,exclude,country).catch(()=>({configured:false,items:[]}));
    if(ebay.items?.length){
      return new Response(JSON.stringify({ok:true,...ebay,temporary:false}),{
        status:200,
        headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=120"}
      });
    }

    const temporary=await searchTemporary(query,8,exclude);
    return new Response(JSON.stringify({ok:true,...temporary}),{
      status:200,
      headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=900"}
    });
  }catch(error){
    return new Response(JSON.stringify({
      ok:false,
      configured:Boolean(context.env.EBAY_CLIENT_ID&&context.env.EBAY_CLIENT_SECRET),
      temporary:false,
      items:[],
      message:String(error?.message||"Related marketplace search failed.")
    }),{
      status:502,
      headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
    });
  }
}
