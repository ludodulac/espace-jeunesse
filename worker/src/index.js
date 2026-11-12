/**
 * API autonome Espace Jeunesse : D1 et R2 entièrement nouveaux.
 * Ne référence jamais les Workers / bases / buckets de Célébrations.
 */
const TE=new TextEncoder(),TD=new TextDecoder();
const MAX_MEDIA=200*1024*1024;
const DEFAULT_STATE={"title":"Espace Jeunesse","tagline":"Un lieu pour découvrir, créer et partager","homeId":"accueil","pages":[{"id":"accueil","slug":"accueil","title":"Accueil","placement":"menu","status":"published","blocks":[{"id":"home-zone","type":"section","layout":"single","presentation":"intro","style":{"border":"none","color":"#d7dde5","width":1,"shadow":false},"columnAlignments":["top","top"],"columnButtonLayouts":["stack","stack"],"hideOnSite":false,"columns":[[{"id":"titre-accueil","type":"heading","text":"Bienvenue dans l'Espace Jeunesse","align":"center","level":"h1","hideOnSite":false},{"id":"texte-accueil","type":"text","text":"Cet espace est en préparation. Les prochaines pages pourront accueillir des textes, des images, des vidéos, des documents et des sons.","align":"center","level":"h2","hideOnSite":false}],[]]}]},{"id":"page-decouvrir","slug":"decouvrir","title":"Découvrir","placement":"menu","status":"draft","blocks":[]},{"id":"page-contact","slug":"contact","title":"Contact","placement":"footer","status":"draft","blocks":[]}]};
const allowedTypes=new Set(["heading","event","text","image","audio","video","document","button","columns","divider","section"]);
const mimeMap={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",
 mp3:"audio/mpeg",wav:"audio/wav",pdf:"application/pdf",mp4:"video/mp4",webm:"video/webm"};
const corsOrigin=env=>String(env.SITE_ORIGIN||"https://ludodulac.github.io").replace(/\/$/,"");
function cors(env,request){const o=request.headers.get("Origin");return o===corsOrigin(env)?o:null}
function baseHeaders(env,req){
 const h=new Headers({"X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Cache-Control":"no-store","Vary":"Origin"});
 const o=cors(env,req);if(o){h.set("Access-Control-Allow-Origin",o);h.set("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");h.set("Access-Control-Allow-Headers","Authorization,Content-Type");h.set("Access-Control-Max-Age","7200")}
 return h;
}
function json(env,req,body,status=200){const h=baseHeaders(env,req);h.set("Content-Type","application/json; charset=utf-8");return new Response(JSON.stringify(body),{status,headers:h})}
function fail(env,req,error,status=400){return json(env,req,{error},status)}
function bufferToBase64url(bytes){
 let binary="";for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function base64urlToBytes(s){const chars=String(s).replace(/-/g,"+").replace(/_/g,"/");const raw=atob(chars+"=".repeat((4-chars.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function signingKey(env){
 if(!env.SESSION_SECRET||!env.ADMIN_PASSWORD)throw Error("Secrets d'administration non configurés");
 return crypto.subtle.importKey("raw",TE.encode(env.SESSION_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
async function signature(env,bytes){
 const key=await signingKey(env);return new Uint8Array(await crypto.subtle.sign("HMAC",key,bytes));
}
function equalBytes(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0}
async function signToken(env){
 const data=bufferToBase64url(TE.encode(JSON.stringify({exp:Date.now()+12*3600*1000,nonce:crypto.randomUUID()})));
 const sig=bufferToBase64url(await signature(env,TE.encode(data)));
 return data+"."+sig;
}
async function isAdmin(env,req){
 const raw=(req.headers.get("Authorization")||"").match(/^Bearer ([A-Za-z0-9_.-]+)$/);
 if(!raw)return false;
 const [payload,sig,extra]=raw[1].split(".");if(!payload||!sig||extra)return false;
 try{
  const actual=base64urlToBytes(sig),wanted=await signature(env,TE.encode(payload));
  if(!equalBytes(actual,wanted))return false;
  const value=JSON.parse(TD.decode(base64urlToBytes(payload)));
  return Number.isSafeInteger(value.exp)&&value.exp>Date.now()&&value.exp<Date.now()+13*3600*1000;
 }catch{return false}
}
async function bodyJson(req,max=1600000){
 const text=await req.text();if(text.length>max)throw Error("Requête trop volumineuse");
 return JSON.parse(text);
}
async function currentState(env){
 const row=await env.DB.prepare("SELECT version,data FROM site_state WHERE id=1").first();
 if(!row)return {version:0,state:DEFAULT_STATE};
 return {version:Number(row.version),state:JSON.parse(row.data)};
}
function visibleBlock(b){
 if(!b||b.hideOnSite===true)return null;
 if(b.type!=="section")return b;
 return {...b,columns:(b.columns||[[],[]]).map(items=>(items||[]).map(visibleBlock).filter(Boolean))};
}
function publicProjection(s){
 const pages=(s.pages||[]).filter(p=>p.status==="published").map(p=>({
  id:p.id,slug:p.slug,title:p.title,placement:p.placement,status:p.status,
  blocks:(p.blocks||[]).map(visibleBlock).filter(Boolean)
 }));
 return {title:s.title,tagline:s.tagline,homeId:s.homeId,pages};
}
function cleanBlock(b,i,depth){
 if(!b||typeof b!=="object"||!allowedTypes.has(b.type))throw Error("Type de bloc inconnu");
 const id=String(b.id||i).slice(0,100);
 if(b.type==="section"){
  if(depth!==0)throw Error("Les blocs ne peuvent pas être imbriqués dans un élément");
  if(!Array.isArray(b.columns)||b.columns.length!==2||b.columns.some(c=>!Array.isArray(c)||c.length>100))
   throw Error("Colonnes du bloc invalides");
  const frame=b.style&&typeof b.style==="object"?b.style:{};
  const border=["none","round","square"].includes(frame.border)?frame.border:"none";
  const color=/^#[0-9a-f]{6}$/i.test(frame.color||"")?frame.color:"#d7dde5";
  const width=Math.max(1,Math.min(5,Number(frame.width)||1));
  const cols=b.columns.map((items,j)=>items.map((item,k)=>cleanBlock(item,j+"-"+k,depth+1)));
  return {id,type:"section",layout:b.layout==="columns"?"columns":"single",columns:cols,
   style:{border,color,width,shadow:frame.shadow===true},
   presentation:["resource","video","documents","intro","text"].includes(b.presentation)?b.presentation:"",
   columnAlignments:[0,1].map(j=>["top","center","bottom"].includes(b.columnAlignments?.[j])?b.columnAlignments[j]:"top"),
   columnButtonLayouts:[0,1].map(j=>b.columnButtonLayouts?.[j]==="row"?"row":"stack"),
   hideOnSite:b.hideOnSite===true};
 }
 const out={id,type:b.type};
 for(const f of ["text","left","right","caption","alt","url","mediaId"]){
  out[f]=String(b[f]||"").slice(0,["text","left","right"].includes(f)?40000:500);
 }
 out.align=["left","center","right"].includes(b.align)?b.align:"left";
 out.level=["h1","h2","h3"].includes(b.level)?b.level:"h2";
 out.hideOnSite=b.hideOnSite===true;
 out.bold=b.bold===true;out.italic=b.italic===true;
 const n=Number(b.fontSize);
 out.fontSize=Number.isSafeInteger(n)&&n>=10&&n<=72?n:0;
 out.color=/^#[0-9a-f]{6}$/i.test(b.color||"")?b.color:"";
 return out;
}
function cleanState(raw){
 if(!raw||typeof raw!=="object"||!Array.isArray(raw.pages)||!raw.pages.length||raw.pages.length>300)throw Error("Nombre de pages invalide");
 const title=String(raw.title||"Espace Jeunesse").slice(0,100),tagline=String(raw.tagline||"").slice(0,160);
 const ids=new Set(),slugs=new Set(),pages=raw.pages.map(p=>{
  if(!p||typeof p!=="object")throw Error("Page invalide");
  const id=String(p.id||"").slice(0,100),slug=String(p.slug||""),name=String(p.title||"").trim().slice(0,120);
  if(!id||!name||!/^[a-z0-9-]{1,80}$/.test(slug)||ids.has(id)||slugs.has(slug))throw Error("Identifiant ou URL de page invalide / doublon");
  ids.add(id);slugs.add(slug);
  if(!["published","draft","hidden"].includes(p.status)||!["menu","footer","none"].includes(p.placement))throw Error("Visibilité ou emplacement invalide");
  if(!Array.isArray(p.blocks)||p.blocks.length>300)throw Error("Nombre de blocs invalide");
  const blocks=p.blocks.map((b,i)=>cleanBlock(b,i,0));
  return {id,slug,title:name,placement:p.placement,status:p.status,blocks};
 });
 if(!ids.has(String(raw.homeId)))throw Error("La page d'accueil n'existe pas");
 return {title,tagline,homeId:String(raw.homeId),pages};
}
async function login(req,env){
 const idRaw=req.headers.get("CF-Connecting-IP")||"unknown";
 const hash=new Uint8Array(await crypto.subtle.digest("SHA-256",TE.encode(env.SESSION_SECRET+":"+idRaw)));
 const id=bufferToBase64url(hash);const bucket=Math.floor(Date.now()/900000);
 const recent=await env.DB.prepare("SELECT attempts,bucket FROM login_limits WHERE identifier=?").bind(id).first();
 if(recent&&Number(recent.bucket)===bucket&&Number(recent.attempts)>=10)return fail(env,req,"Trop d'essais. Réessayez dans 15 minutes.",429);
 let password="";
 try{password=String((await bodyJson(req,20000)).password||"")}catch{return fail(env,req,"Mot de passe invalide")}
 const expected=await signature(env,TE.encode(env.ADMIN_PASSWORD)),actual=await signature(env,TE.encode(password));
 const valid=equalBytes(expected,actual);
 const attempts=valid?0:(recent&&Number(recent.bucket)===bucket?Number(recent.attempts)+1:1);
 await env.DB.prepare("INSERT INTO login_limits(identifier,attempts,bucket) VALUES(?,?,?) ON CONFLICT(identifier) DO UPDATE SET attempts=excluded.attempts,bucket=excluded.bucket").bind(id,attempts,bucket).run();
 if(!valid)return fail(env,req,"Mot de passe incorrect.",401);
 return json(env,req,{token:await signToken(env),expiresInSeconds:43200});
}
async function saveState(req,env){
 let input;try{input=await bodyJson(req)}catch{return fail(env,req,"Document JSON invalide")}
 let clean;try{clean=cleanState(input.state)}catch(e){return fail(env,req,e.message)}
 const version=Number(input.version);if(!Number.isSafeInteger(version)||version<0)return fail(env,req,"Version manquante");
 const serialized=JSON.stringify(clean);
 if(serialized.length>1200000)return fail(env,req,"Pages trop volumineuses");
 if(version===0){
  const created=await env.DB.prepare("INSERT OR IGNORE INTO site_state(id,version,data) VALUES(1,1,?)").bind(serialized).run();
  if(!created.meta?.changes)return fail(env,req,"Les pages ont changé depuis leur ouverture. Rechargez l'administration.",409);
  return json(env,req,{ok:true,version:1});
 }
 const updated=await env.DB.prepare("UPDATE site_state SET version=version+1,data=?,updated_at=CURRENT_TIMESTAMP WHERE id=1 AND version=?").bind(serialized,version).run();
 if(!updated.meta?.changes)return fail(env,req,"Les pages ont changé depuis leur ouverture. Rechargez l'administration.",409);
 return json(env,req,{ok:true,version:version+1});
}
function getMime(name){
 const ext=String(name).toLowerCase().split(".").pop();return mimeMap[ext]||"";
}
async function listMedia(env,req){
 const rows=await env.DB.prepare("SELECT id,name,mime,size,created_at FROM media ORDER BY created_at DESC").all();
 return json(env,req,{media:(rows.results||[]).map(x=>({id:x.id,name:x.name,type:x.mime,size:x.size,createdAt:x.created_at}))});
}
async function deleteMedia(env,req,id){
 const row=await env.DB.prepare("SELECT id,r2_key FROM media WHERE id=?").bind(id).first();
 if(!row)return fail(env,req,"Fichier introuvable",404);
 const site=await currentState(env);
 if(JSON.stringify(site.state).includes(id))return fail(env,req,"Fichier encore utilisé dans une page, y compris en brouillon.",409);
 await env.MEDIA.delete(row.r2_key);
 await env.DB.prepare("DELETE FROM media WHERE id=?").bind(id).run();
 return json(env,req,{ok:true});
}
async function uploadInit(env,req){
 let input;try{input=await bodyJson(req,5000)}catch{return fail(env,req,"Métadonnées manquantes")}
 const name=String(input.name||"").replace(/[\\/\r\n]/g,"_").trim().slice(0,160);
 const size=Number(input.size),mime=getMime(name);
 if(!name||!mime||!Number.isSafeInteger(size)||size<1||size>MAX_MEDIA)return fail(env,req,"Format ou taille refusé (maximum 200 Mio).");
 const id=crypto.randomUUID(),key="media/"+id;
 const upload=await env.MEDIA.createMultipartUpload(key,{httpMetadata:{contentType:mime}});
 try{await env.DB.prepare("INSERT INTO media_uploads(id,upload_id,r2_key,name,mime,size) VALUES(?,?,?,?,?,?)").bind(id,upload.uploadId,key,name,mime,size).run()}
 catch(err){await upload.abort();throw err}
 return json(env,req,{id,chunkSize:8*1024*1024});
}
async function partUpload(env,req,id,number){
 const row=await env.DB.prepare("SELECT * FROM media_uploads WHERE id=?").bind(id).first();
 if(!row)return fail(env,req,"Import introuvable",404);
 if(!Number.isInteger(number)||number<1||number>26)return fail(env,req,"Numéro de morceau invalide");
 const data=await req.arrayBuffer();if(!data.byteLength||data.byteLength>8*1024*1024)return fail(env,req,"Morceau trop volumineux");
 const up=env.MEDIA.resumeMultipartUpload(row.r2_key,row.upload_id);
 const part=await up.uploadPart(number,data);
 return json(env,req,{partNumber:part.partNumber,etag:part.etag});
}
async function uploadComplete(env,req,id){
 const row=await env.DB.prepare("SELECT * FROM media_uploads WHERE id=?").bind(id).first();
 if(!row)return fail(env,req,"Import introuvable",404);
 let input;try{input=await bodyJson(req,10000)}catch{return fail(env,req,"Morceaux manquants")}
 const parts=input.parts;
 if(!Array.isArray(parts)||!parts.length||parts.length>26||parts.some((p,i)=>p.partNumber!==i+1||!/^[-A-Za-z0-9"']{3,150}$/.test(String(p.etag))))return fail(env,req,"Liste de morceaux invalide");
 const up=env.MEDIA.resumeMultipartUpload(row.r2_key,row.upload_id);
 const object=await up.complete(parts.map(p=>({partNumber:p.partNumber,etag:p.etag})));
 if(Number(object.size)!==Number(row.size)){
  await env.MEDIA.delete(row.r2_key);
  await env.DB.prepare("DELETE FROM media_uploads WHERE id=?").bind(id).run();
  return fail(env,req,"Taille reçue différente de la taille annoncée",422);
 }
 await env.DB.prepare("INSERT INTO media(id,r2_key,name,mime,size) VALUES(?,?,?,?,?)").bind(id,row.r2_key,row.name,row.mime,row.size).run();
 await env.DB.prepare("DELETE FROM media_uploads WHERE id=?").bind(id).run();
 return json(env,req,{ok:true,id});
}
async function serveMedia(env,req,id){
 const row=await env.DB.prepare("SELECT * FROM media WHERE id=?").bind(id).first();
 if(!row)return fail(env,req,"Média introuvable",404);
 const range=req.headers.get("Range");let options={};
 if(range)options={range:req.headers};
 const object=await env.MEDIA.get(row.r2_key,options);
 if(!object)return fail(env,req,"Média indisponible",404);
 const headers=baseHeaders(env,req);
 headers.set("Content-Type",row.mime);
 headers.set("Accept-Ranges","bytes");
 headers.set("Content-Disposition","inline; filename*=UTF-8''"+encodeURIComponent(row.name));
 headers.set("Cache-Control","public, max-age=600");
 headers.set("ETag",object.httpEtag);
 let status=200;
 if(range&&object.range){
  const start=object.range.offset||0,length=object.range.length||object.size;
  headers.set("Content-Range","bytes "+start+"-"+(start+length-1)+"/"+object.size);
  headers.set("Content-Length",String(length));status=206;
 }else headers.set("Content-Length",String(object.size));
 return new Response(req.method==="HEAD"?null:object.body,{status,headers});
}
export default {
 async fetch(req,env){
  try{
   const url=new URL(req.url),path=url.pathname;
   if(req.method==="OPTIONS"){
    if(!cors(env,req))return fail(env,req,"Origine non autorisée",403);
    return new Response(null,{status:204,headers:baseHeaders(env,req)});
   }
   if(!env.DB||!env.MEDIA)return fail(env,req,"Bindings D1/R2 manquants",503);
   if(req.method!=="GET"&&req.method!=="HEAD"&&req.headers.has("Origin")&&!cors(env,req))return fail(env,req,"Origine non autorisée",403);
   if(req.method==="GET"&&path==="/api/site"){const s=await currentState(env);return json(env,req,publicProjection(s.state))}
   if((req.method==="GET"||req.method==="HEAD")&&/^\/media\/[0-9a-f-]{36}$/.test(path))return serveMedia(env,req,path.slice(7));
   if(req.method==="POST"&&path==="/api/auth/login"){
     if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return fail(env,req,"Administration non configurée",503);
     return login(req,env);
   }
   if(!path.startsWith("/api/admin/"))return fail(env,req,"Chemin introuvable",404);
   if(!await isAdmin(env,req))return fail(env,req,"Authentification requise",401);
   if(req.method==="GET"&&path==="/api/admin/state"){return json(env,req,await currentState(env))}
   if(req.method==="PUT"&&path==="/api/admin/state")return saveState(req,env);
   if(req.method==="GET"&&path==="/api/admin/media")return listMedia(env,req);
   if(req.method==="DELETE"&&/^\/api\/admin\/media\/[0-9a-f-]{36}$/.test(path))return deleteMedia(env,req,path.slice("/api/admin/media/".length));
   if(req.method==="POST"&&path==="/api/admin/uploads/init")return uploadInit(env,req);
   const partPath=path.match(/^\/api\/admin\/uploads\/([0-9a-f-]{36})\/part$/);
   if(req.method==="PUT"&&partPath)return partUpload(env,req,partPath[1],Number(url.searchParams.get("number")));
   const completePath=path.match(/^\/api\/admin\/uploads\/([0-9a-f-]{36})\/complete$/);
   if(req.method==="POST"&&completePath)return uploadComplete(env,req,completePath[1]);
   return fail(env,req,"Chemin introuvable",404);
  }catch(err){
   console.error("Erreur Espace Jeunesse API",String(err?.message||err));
   return fail(env,req,"Erreur interne. Vérifiez les ressources Cloudflare de ce site.",500);
  }
 }
};
