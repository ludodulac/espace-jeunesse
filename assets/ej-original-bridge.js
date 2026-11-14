/* Liaison limitée aux ressources Espace Jeunesse : aucune référence à Célébrations.
 * L'éditeur visuel chargé ensuite est le vrai client source, pas un clone UI.
 */
(function(){
"use strict";
const API=String(window.ESPACE_JEUNESSE_CONFIG?.apiBase||"").replace(/\/$/,"");
const remote=/^https:\/\/[a-z0-9.-]+$/i.test(API);
const TOKEN_KEY="ej-admin-session-v1";
let token=sessionStorage.getItem(TOKEN_KEY)||"",version=0,selected="",queued=null,sending=false,halted=false,alertMode=false;
const meta={title:"Espace Jeunesse",tagline:"Découvrir, créer et partager"};
const make=(tag,text,css)=>{const el=document.createElement(tag);if(css)el.className=css;if(text!==undefined)el.textContent=text;return el};
const notice=(message,error=false)=>{
 const area=document.getElementById("ej-storage-notice");if(!area)return;
 area.textContent=message;area.className=error?"notice error":"notice";area.hidden=!message;
};
const idFromURL=value=>{
 try{const u=new URL(String(value||""),location.href);if(u.origin!==API)return "";
 const m=/^\/media\/([0-9a-f-]{36})$/.exec(u.pathname);return m?.[1]||"";
 }catch{return ""}
};
const mediaSrc=b=>b.mediaId&&API?API+"/media/"+b.mediaId:String(b.url||"");
function toOriginalBlock(b){
 if(b.type==="section")return {
  ...b,kind:"section",columns:(b.columns||[[],[]]).map(items=>(items||[]).map(toOriginalBlock))
 };
 const kind=b.type==="document"?"button":b.type==="columns"?"text":b.type;
 const url=mediaSrc(b);
 return {...b,kind,
  src:["image","audio"].includes(b.type)?url:String(b.src||""),
  href:["button","document","video"].includes(b.type)?url:String(b.href||""),
  ...(b.type==="document"?{displayAsButton:true}:{}),
  ...(b.type==="columns"?{text:[b.left,b.right].filter(Boolean).join("\n")}: {})
 };
}
const normalizeSlug=(raw,fallback)=>{
 const s=String(raw||fallback||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
 return s||"page";
};
function toOriginal(state){
 const pages=(state.pages||[]).map(p=>({
  id:p.id,name:p.title,group:"page",
  placement:p.placement||"menu",visibility:p.status||"draft",
  slug:p.slug,blocks:(p.blocks||[]).map(toOriginalBlock)
 }));
 return {pages,siteHomeId:state.homeId||pages[0]?.id||"accueil"};
}
function toSiteBlock(b){
 if(b.kind==="section"||b.type==="section")return {
  type:"section",id:String(b.id),layout:b.layout==="columns"?"columns":"single",
  presentation:b.presentation||"",style:b.style||{},
  columnAlignments:b.columnAlignments||["top","top"],
  columnButtonLayouts:b.columnButtonLayouts||["stack","stack"],
  hideOnSite:b.hideOnSite===true,
  columns:(b.columns||[[],[]]).map(col=>(col||[]).map(toSiteBlock))
 };
 const type=b.kind==="button"?"button":b.kind||b.type||"text";
 const url=String(["image","audio"].includes(type)?b.src||b.url||"":b.href||b.url||b.src||"");
 const mediaId=idFromURL(url)||String(b.mediaId||"");
 return {id:String(b.id||crypto.randomUUID()),type,text:String(b.text||""),
  url,mediaId,align:b.align||"left",level:b.level||"h2",
  alt:b.alt||"",caption:b.caption||"",left:b.left||"",right:b.right||"",
  hideOnSite:b.hideOnSite===true,rich:b.rich||"",bold:b.bold===true,
  italic:b.italic===true,color:b.color||"",fontSize:b.fontSize||0,
  size:b.size||0,rich:String(b.rich||"").slice(0,18000),
  widthPct:b.widthPct||100,thickness:b.thickness||1,
  displayAsButton:b.displayAsButton===true,atTime:b.atTime||""};
}
function toSite(db){
 const pages=(db.pages||[]).filter(p=>p.group==="page").map(p=>({
  id:String(p.id),slug:normalizeSlug(p.slug,p.id),
  title:String(p.name||"Sans titre"),
  placement:["menu","footer","none"].includes(p.placement)?p.placement:"menu",
  status:["published","draft","hidden"].includes(p.visibility)?p.visibility:"draft",
  blocks:(p.blocks||[]).map(toSiteBlock)
 }));
 const used=new Set();
 for(const p of pages){let slug=p.slug,i=2;while(used.has(slug)){slug=(p.slug.slice(0,70)+"-"+i++).slice(0,80)}p.slug=slug;used.add(slug)}
 return {title:meta.title,tagline:meta.tagline,
  homeId:pages.some(p=>p.id===db.siteHomeId)?db.siteHomeId:pages[0]?.id||"accueil",pages};
}
async function request(path,init={}){
 if(!remote)throw Error("Cloudflare Espace Jeunesse n'est pas encore connecté.");
 const binary=init.body&&(init.body instanceof Blob||init.body instanceof ArrayBuffer);
 const headers={Accept:"application/json",...(token?{Authorization:"Bearer "+token}:{}),
   ...(init.body&&!binary?{"Content-Type":"application/json"}:{}),...init.headers};
 const response=await fetch(API+path,{...init,headers,mode:"cors",cache:"no-store"});
 let payload={};try{payload=await response.json()}catch{}
 if(response.status===401){token="";sessionStorage.removeItem(TOKEN_KEY);halted=true;
  throw Error("Session expirée. Rechargez pour vous reconnecter.")}
 if(!response.ok)throw Error(payload.error||"Erreur serveur "+response.status);
 return payload;
}
async function prepare(key,seed){
 if(!remote)return;
 const data=await request("/api/admin/state");
 version=Number(data.version||0);
 const original=data.state||seed;
 const withTotems=window.EJTotems?.mergeSite(original)||original;
 const withPartners=window.EJPartners?.mergeSite(withTotems)||withTotems;
 const withBoutique=window.EJBoutique?.mergeSite(withPartners)||withPartners;
 const withExercises=window.EJExercises?.mergeSite(withBoutique)||withBoutique;
 const st=window.EJLiterature?.mergeSite(withExercises)||withExercises;
 meta.title=String(st.title||meta.title);meta.tagline=String(st.tagline||meta.tagline);
 const local=localStorage.getItem(key);
 if(local&&local!==JSON.stringify(toOriginal(st))){
  localStorage.setItem("ej-original-secours-"+Date.now(),local);
 }
 const converted=toOriginal(st);
 localStorage.setItem(key,JSON.stringify(converted));
}
async function flush(){
 if(sending||halted||!remote)return;
 sending=true;
 try{
  while(queued){
   const snapshot=queued;queued=null;
   const state=toSite(snapshot);
   const data=await request("/api/admin/state",{method:"PUT",body:JSON.stringify({state,version})});
   version=Number(data.version);
   notice("✓ Pages enregistrées dans Cloudflare Espace Jeunesse.");
  }
 }catch(error){
  halted=true;notice("❌ Enregistrement en ligne interrompu : "+error.message+
   ". Votre travail local est conservé. Rechargez pour résoudre le conflit.",true);
 }finally{sending=false}
}
let timer=null;
function queueSave(snapshot){
 if(!remote||halted||!snapshot)return;
 queued=snapshot;
 clearTimeout(timer);timer=setTimeout(flush,250);
}
async function listMedia(){
 if(!remote)return [];
 const data=await request("/api/admin/media");
 return (data.media||[]).map(m=>({
  id:m.id,name:m.name,type:m.type.startsWith("image/")?"image":m.type.startsWith("audio/")?"audio":
    m.type.startsWith("video/")?"video":m.type==="application/pdf"?"pdf":"file",
  src:API+"/media/"+m.id,size:m.size,created_at:m.createdAt
 }));
}
async function importFiles(files){
 for(const file of files){
  if(file.size>200*1024*1024)throw Error("Fichier supérieur à 200 Mo : "+file.name);
  const init=await request("/api/admin/uploads/init",{method:"POST",body:JSON.stringify({name:file.name,type:file.type||"",size:file.size})});
  const parts=[];let done=0,chunkSize=8*1024*1024;
  for(let i=0;i<file.size;i+=chunkSize){
   const piece=file.slice(i,Math.min(i+chunkSize,file.size));
   const result=await request("/api/admin/uploads/"+init.id+"/part?number="+(parts.length+1),
     {method:"PUT",body:piece,headers:{"Content-Type":"application/octet-stream"}});
   parts.push({partNumber:parts.length+1,etag:result.etag});done+=piece.size;
   notice("Import de "+file.name+" : "+Math.round(done/file.size*100)+" %");
  }
  await request("/api/admin/uploads/"+init.id+"/complete",{method:"POST",body:JSON.stringify({parts})});
  notice("✓ Import de "+file.name+" terminé.");
 }
}
function mount(){
 document.getElementById("ej-original-shell").hidden=false;
 const head=document.getElementById("ej-auth-screen");head.hidden=true;head.replaceChildren();
 if(!remote)notice("⚠ Mode d'essai local : ce navigateur ne publie pas sur le site. Activez le NOUVEAU Cloudflare Espace Jeunesse.");
 const src=document.createElement("script");src.src="assets/celebrations-editor-verbatim.js?v=ej-20261113-navigation2";
 src.onerror=()=>notice("Impossible de charger la copie de l'éditeur Célébrations.",true);
 document.body.append(src);
}
async function boot(){
 window.__PREPARATION_SEED__=null;window.__EJ_PAGES_ONLY__=true;
 if(!remote){mount();return}
 const login=document.getElementById("ej-auth-screen");
 const launch=async()=>{
  try{await request("/api/admin/state");login.hidden=true;mount()}
  catch(error){notice(error.message,true);login.hidden=false}
 };
 if(token){await launch();return}
 login.hidden=false;login.className="ej-login";
 const form=document.createElement("form");form.className="panel";form.style.maxWidth="440px";
 form.append(make("h1","Administration — Espace Jeunesse"));
 form.append(make("p","Même éditeur que Célébrations, sans comptes membres ni célébrations."));
 const input=document.createElement("input");input.type="password";input.required=true;
 input.autocomplete="current-password";input.setAttribute("aria-label","Mot de passe administrateur");
 input.placeholder="Mot de passe administrateur";input.id="ej-admin-password";
 const inputWrap=make("div",undefined,"ej-password-wrap");
 const eye=make("button","👁","ej-password-eye");
 eye.type="button";eye.setAttribute("aria-label","Afficher le mot de passe");
 eye.setAttribute("aria-pressed","false");eye.title="Afficher le mot de passe";
 eye.setAttribute("aria-controls",input.id);
 eye.addEventListener("click",()=>{
  const show=input.type==="password";
  input.type=show?"text":"password";
  eye.textContent=show?"🙈":"👁";
  eye.setAttribute("aria-label",show?"Masquer le mot de passe":"Afficher le mot de passe");
  eye.setAttribute("aria-pressed",String(show));
  eye.title=show?"Masquer le mot de passe":"Afficher le mot de passe";
 });
 inputWrap.append(input,eye);
 const button=make("button","Se connecter","btn primary");button.type="submit";
 const status=make("p","","status");status.setAttribute("role","status");
 form.append(inputWrap,button,status);login.append(form);
 form.addEventListener("submit",async e=>{
  e.preventDefault();button.disabled=true;
  try{const result=await request("/api/auth/login",{method:"POST",body:JSON.stringify({password:input.value})});
   token=result.token;sessionStorage.setItem(TOKEN_KEY,token);await launch();
  }catch(error){status.textContent="❌ "+error.message}
  finally{button.disabled=false;input.value=""}
 });
}
async function detailedMedia(){
 if(!remote)return [];
 const data=await request("/api/admin/media");
 return data.media||[];
}
async function deleteMedia(id){
 return request("/api/admin/media/"+encodeURIComponent(id),{method:"DELETE"});
}
async function setLudodio(id,enabled){
 return request("/api/admin/ludodio/"+encodeURIComponent(id),{method:enabled?"PUT":"DELETE"});
}
window.EJBridge={remote,meta,prepare,queueSave,listMedia,importFiles,detailedMedia,deleteMedia,setLudodio};
boot().catch(error=>notice("Impossible de démarrer l'administration : "+error.message,true));
})();
