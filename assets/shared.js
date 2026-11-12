/* Utilitaires partagés : aucune dépendance aux données ou services Célébrations. */
(function(){
 "use strict";
 const api=()=>String(window.ESPACE_JEUNESSE_CONFIG?.apiBase||"").replace(/\/+$/,"");
 const clone=v=>JSON.parse(JSON.stringify(v));
 const make=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined&&txt!==null)el.textContent=String(txt);return el};
 const safeUrl=(input,allowData=false)=>{
   try{
     const raw=String(input||"").trim();
     if(!raw)return "";
     if(allowData&&/^blob:/i.test(raw))return raw;
     const u=new URL(raw,location.href);
     if(u.protocol==="https:"||u.protocol==="http:"&&u.origin===location.origin||u.protocol==="mailto:"||u.protocol==="tel:")return u.href;
   }catch{}
   return "";
 };
 const mediaUrl=(item)=>{
   if(item.mediaId&&api())return api()+"/media/"+encodeURIComponent(item.mediaId);
   return safeUrl(item.url||item.src, true);
 };
 const isMediaReference=(state,id)=>JSON.stringify(state||{}).includes(String(id));
 const typeLabel={heading:"Titre",text:"Texte",image:"Image",audio:"Audio MP3",video:"Vidéo",document:"PDF / document",button:"Bouton / lien",columns:"Deux colonnes",divider:"Séparateur"};
 const uuid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now())+"-"+Math.random().toString(36).slice(2);
 const cleanSite=(state)=>{
   if(!state||!Array.isArray(state.pages))throw new Error("Structure des pages invalide");
   return {title:String(state.title||"Espace Jeunesse").slice(0,100),tagline:String(state.tagline||"").slice(0,160),homeId:String(state.homeId||"accueil"),pages:state.pages.map(page=>({
     id:String(page.id||uuid()),slug:String(page.slug||"page"),title:String(page.title||"Sans titre"),
     placement:["menu","footer","none"].includes(page.placement)?page.placement:"menu",
     status:["published","draft","hidden"].includes(page.status)?page.status:"draft",
     blocks:Array.isArray(page.blocks)?page.blocks:[]
   }))};
 };
 const youtubeEmbed=(raw)=>{
   try{const u=new URL(raw);let id="";
   if(u.hostname==="youtu.be")id=u.pathname.split("/")[1]||"";
   if(["youtube.com","www.youtube.com","m.youtube.com"].includes(u.hostname))id=u.searchParams.get("v")||(/^\/shorts\/([\w-]+)/.exec(u.pathname)||[])[1]||"";
   if(!/^[\w-]{11}$/.test(id))return "";
   return "https://www.youtube-nocookie.com/embed/"+id;
   }catch{return ""}
 };
 window.EJ={api,clone,make,safeUrl,mediaUrl,isMediaReference,typeLabel,uuid,cleanSite,youtubeEmbed};
})();
