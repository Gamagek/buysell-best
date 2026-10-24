// The Cloudflare REST API supplies its workflow params as a JSON-encoded string;
// Worker binding calls may supply a decoded payload object instead.
export function isAuthorizedOneShotEvent(event){
 let data=event?.payload;
 if(typeof data==="string"){
  if(data.length>1000)return false;
  try{data=JSON.parse(data);}catch{return false;}
 }
 return !!data&&typeof data==="object"&&!Array.isArray(data)&&
  data.mode==="one-shot-approved-feed"&&
  Object.keys(data).length===1;
}
