import {json,getCountry,getCurrency,cleanId,ensureSchema} from "../../lib/personalization.js";

function normalizeCandidates(input){
  if(!Array.isArray(input)) return [];
  return input.slice(0,60).map(x=>({
    id:String(x.id||"").slice(0,160),
    category:String(x.category||"").toLowerCase().slice(0,60),
    brand:String(x.brand||"").toLowerCase().slice(0,80),
    title:String(x.title||"").slice(0,180),
    price:Number.isFinite(Number(x.price))?Number(x.price):0,
    currency:String(x.currency||"USD").toUpperCase().slice(0,3),
    location:String(x.location||"").slice(0,100)
  })).filter(x=>x.id);
}

export async function onRequestPost(context){
  const body=await context.request.json().catch(()=>null);
  if(!body||typeof body!=="object") return json({error:"Invalid JSON."},400);
  const visitor_id=cleanId(body.visitor_id);
  const candidates=normalizeCandidates(body.candidates);
  const seed=body.seed||{};
  if(!visitor_id) return json({error:"Invalid visitor id."},400);

  const country=getCountry(context.request),currency=getCurrency(country);
  let interests=[], affinities=[], personalization=true;

  if(context.env.DB){
    try{
      await ensureSchema(context.env.DB);
      const profile=await context.env.DB.prepare("SELECT personalization_enabled FROM visitor_profiles WHERE visitor_id=? LIMIT 1").bind(visitor_id).first();
      personalization=profile?.personalization_enabled!==0;
      if(personalization){
        const ir=await context.env.DB.prepare("SELECT category,score FROM interest_scores WHERE visitor_id=? AND score>0 ORDER BY score DESC LIMIT 12").bind(visitor_id).all();
        interests=ir.results||[];
        const ar=await context.env.DB.prepare("SELECT listing_id,score FROM item_affinity WHERE visitor_id=? AND score>0 ORDER BY score DESC LIMIT 20").bind(visitor_id).all();
        affinities=ar.results||[];
      }
    }catch(_){/* graceful fallback */}
  }

  const interestMap=new Map(interests.map(x=>[String(x.category),Number(x.score)]));
  const affinityMap=new Map(affinities.map(x=>[String(x.listing_id),Number(x.score)]));
  const topCats=new Set(interests.slice(0,4).map(x=>String(x.category)));
  const seedCategory=String(seed.category||"").toLowerCase();
  const seedBrand=String(seed.brand||"").toLowerCase();
  const ranked=candidates.map((x,index)=>{
    let score=0;
    score+=(interestMap.get(x.category)||0)*3;
    score+=(affinityMap.get(x.id)||0)*1.5;
    if(topCats.has(x.category)) score+=18;
    if(seedCategory&&x.category===seedCategory) score+=50;
    if(seedBrand&&x.brand&&x.brand===seedBrand) score+=25;
    if(seed.id&&x.id===String(seed.id)) score-=1000;
    if(seedCategory&&x.category!==seedCategory&&seedCategory) score+=0;
    score+=Math.max(0,12-index*0.1);
    return {...x,score};
  }).sort((a,b)=>b.score-a.score).slice(0,12);

  return json({ok:true,country,currency,personalization,interests, recommendations:ranked});
}

export async function onRequestGet(context){
  return json({ok:true,country:getCountry(context.request),currency:getCurrency(getCountry(context.request)),personalization:true,interests:[],recommendations:[]});
}
