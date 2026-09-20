let ebayTokenCache={token:"",expiresAt:0};
let tempCatalogCache={items:[],expiresAt:0};

function json(data,status=200,cache="no-store"){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":cache
    }
  });
}
function cleanQuery(value,fallback="popular"){
  const s=String(value||fallback).replace(/[<>]/g," ").trim().slice(0,120);
  return s||fallback;
}
function limitValue(value){
  const n=Number(value);
  return Number.isFinite(n)?Math.min(20,Math.max(1,Math.floor(n))):8;
}
async function getEbayToken(env){
  const now=Date.now();
  if(ebayTokenCache.token&&ebayTokenCache.expiresAt>now+60000)return ebayTokenCache.token;
  if(!env.EBAY_CLIENT_ID||!env.EBAY_CLIENT_SECRET)return null;
  const basic=btoa(String(env.EBAY_CLIENT_ID)+":"+String(env.EBAY_CLIENT_SECRET));
  const r=await fetch("https://api.ebay.com/identity/v1/oauth2/token",{
    method:"POST",
    headers:{
      Authorization:"Basic "+basic,
      "Content-Type":"application/x-www-form-urlencoded",
      "Content-Language":"en-US"
    },
    body:"grant_type=client_credentials&scope="+encodeURIComponent("https://api.ebay.com/oauth/api_scope")
  });
  if(!r.ok)throw new Error("eBay authentication failed");
  const data=await r.json();
  if(!data.access_token)throw new Error("eBay did not return an access token");
  ebayTokenCache={token:data.access_token,expiresAt:now+Number(data.expires_in||7200)*1000};
  return data.access_token;
}
function mapItem(x){
  const p=Number(x?.price?.value);
  return {
    id:String(x?.itemId||x?.legacyItemId||"").slice(0,160),
    title:String(x?.title||"").slice(0,220),
    price:Number.isFinite(p)?p:0,
    currency:String(x?.price?.currency||"USD").toUpperCase(),
    image:String(x?.image?.imageUrl||x?.thumbnailImages?.[0]?.imageUrl||""),
    url:String(x?.itemWebUrl||x?.itemAffiliateWebUrl||""),
    merchant:"eBay",
    condition:String(x?.condition||""),
    location:String(x?.itemLocation?.city||x?.itemLocation?.country||""),
    sourceLabel:"Live eBay Browse API"
  };
}
export async function searchEbay(env,query,limit,exclude="",country="US"){
  const token=await getEbayToken(env);
  if(!token)return {configured:false,items:[]};
  const u=new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  u.searchParams.set("q",query);
  u.searchParams.set("limit",String(Math.min(20,Math.max(4,limit))));
  u.searchParams.set("sort","price");
  u.searchParams.set("filter","buyingOptions:{FIXED_PRICE}");
  const r=await fetch(u.toString(),{
    headers:{
      Authorization:"Bearer "+token,
      "X-EBAY-C-MARKETPLACE-ID":String(env.EBAY_MARKETPLACE_ID||"EBAY_US"),
      "X-EBAY-C-ENDUSERCTX":"contextualLocation=country="+String(country||"US").slice(0,2),
      Accept:"application/json",
      "Accept-Language":"en-US"
    }
  });
  if(!r.ok)throw new Error("eBay marketplace search failed");
  const data=await r.json();
  const items=(data.itemSummaries||[]).map(mapItem).filter(x=>x.id&&x.title&&x.url);
  return {configured:true,items:items.filter(x=>x.id!==exclude).slice(0,limit),source:"eBay Browse API"};
}

const TEMP_CATEGORY_LABELS={
  beauty:"Beauty",fragrances:"Fragrances",furniture:"Furniture",groceries:"Groceries",
  "home-decoration":"Home & Decoration","kitchen-accessories":"Kitchen Accessories",
  laptops:"Laptops","mens-shirts":"Men's Shirts","mens-shoes":"Men's Shoes",
  "mens-watches":"Men's Watches","mobile-accessories":"Mobile Accessories",
  motorcycle:"Motorcycles","skin-care":"Skin Care",smartphones:"Smartphones",
  "sports-accessories":"Sports Accessories",sunglasses:"Sunglasses",tablets:"Tablets",
  tops:"Tops",vehicle:"Vehicles","womens-bags":"Women's Bags",
  "womens-dresses":"Women's Dresses","womens-jewellery":"Women's Jewellery",
  "womens-shoes":"Women's Shoes","womens-watches":"Women's Watches"
};

function mapTemporaryProduct(x,categoryOverride){
  const category=String(categoryOverride||x?.category||"other");
  const price=Number(x?.price);
  const discount=Number(x?.discountPercentage||0);
  const rating=Number(x?.rating||0);
  const hotScore=(rating*20)+(discount*0.5);
  return {
    id:"temp-"+String(x?.id||""),
    title:String(x?.title||"Product").slice(0,220),
    category,
    categoryLabel:TEMP_CATEGORY_LABELS[category]||category.replace(/-/g," "),
    merchant:"Catalog preview",
    price:Number.isFinite(price)?price:0,
    currency:"USD",
    image:String(x?.images?.[0]||x?.thumbnail||""),
    url:"https://www.google.com/search?tbm=shop&q="+encodeURIComponent(String(x?.title||"")),
    note:"Temporary product-catalog preview. Check the seller for current price, stock, shipping and authenticity.",
    shipping:String(x?.shippingInformation||""),
    sourceLabel:"Temporary catalog data",
    rating:Number.isFinite(rating)?rating:0,
    discount:Number.isFinite(discount)?discount:0,
    hotScore
  };
}

async function getTemporaryCatalog(){
  const now=Date.now();
  if(tempCatalogCache.items.length&&tempCatalogCache.expiresAt>now)return tempCatalogCache.items;
  const r=await fetch("https://dummyjson.com/products?limit=0",{headers:{Accept:"application/json"}});
  if(!r.ok)throw new Error("Temporary catalog source failed");
  const data=await r.json();
  const items=(data.products||[]).map(x=>mapTemporaryProduct(x));
  tempCatalogCache={items,expiresAt:now+30*60*1000};
  return items;
}

function lowestPerCategory(items){
  const byCategory=new Map();
  for(const item of items){
    const arr=byCategory.get(item.category)||[];
    arr.push(item);
    byCategory.set(item.category,arr);
  }
  const result=[];
  for(const [category,arr] of byCategory){
    arr.sort((a,b)=>a.price-b.price || b.hotScore-a.hotScore);
    result.push(...arr.slice(0,2));
  }
  return result.sort((a,b)=>b.hotScore-a.hotScore || a.price-b.price);
}

export async function searchTemporary(query,limit=8,exclude=""){
  const clean=cleanQuery(query,"popular");
  const all=await getTemporaryCatalog();
  let items;
  if(clean==="popular"){
    items=lowestPerCategory(all);
  }else{
    const q=clean.toLowerCase();
    items=all.filter(x=>(x.title+" "+x.category+" "+x.categoryLabel).toLowerCase().includes(q))
      .sort((a,b)=>a.price-b.price || b.hotScore-a.hotScore);
  }
  items=items.filter(x=>x.id!==exclude).slice(0,limit).map(x=>({...x,sourceLabel:"Temporary catalog preview"}));
  return {
    configured:false,
    temporary:true,
    items,
    source:"Temporary catalog preview",
    message:"Sample product data is used until approved live marketplace feeds are connected."
  };
}

const POPULAR_QUERIES=["smartphone","laptop","wireless headphones","gaming monitor","mirrorless camera","smart watch","tablet","office chair"];

export async function onRequestGet(context){
  const u=new URL(context.request.url);
  const query=cleanQuery(u.searchParams.get("query"),"popular");
  const limit=limitValue(u.searchParams.get("limit"));
  const country=String(context.request.cf?.country||context.request.headers.get("CF-IPCountry")||"US").toUpperCase().slice(0,2);

  try{
    if(query==="popular"){
      const buckets=POPULAR_QUERIES.slice(0,4);
      const results=await Promise.all(buckets.map(q=>searchEbay(context.env,q,Math.max(2,Math.ceil(limit/buckets.length)),"",country).catch(()=>({configured:false,items:[]}))));
      const ebayItems=[...new Map(results.flatMap(x=>x.items||[]).map(x=>[x.id,x])).values()].slice(0,limit);
      if(ebayItems.length){
        return json({ok:true,configured:true,temporary:false,items:ebayItems,source:"eBay Browse API"},"200","public, max-age=120");
      }
      const temp=await searchTemporary("popular",Math.max(8,limit));
      return json({ok:true,...temp},"200","public, max-age=900");
    }

    const ebay=await searchEbay(context.env,query,limit,"",country).catch(()=>({configured:false,items:[]}));
    if(ebay.items?.length){
      return json({ok:true,...ebay,temporary:false},"200","public, max-age=120");
    }
    const temp=await searchTemporary(query,limit);
    return json({ok:true,...temp},"200","public, max-age=900");
  }catch(error){
    return json({
      ok:false,
      configured:Boolean(context.env.EBAY_CLIENT_ID&&context.env.EBAY_CLIENT_SECRET),
      temporary:false,
      items:[],
      message:String(error?.message||"Marketplace search failed.")
    },502);
  }
}

export async function onRequestOptions(){
  return new Response(null,{status:204,headers:{"access-control-allow-methods":"GET,OPTIONS"}});
}
