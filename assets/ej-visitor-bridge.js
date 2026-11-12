/* Les données Espace Jeunesse se branchent sur le MOTEUR PUBLIC original
   Célébrations après projection des seules pages publiées. */
(function(){
"use strict";
const API=String(window.ESPACE_JEUNESSE_CONFIG?.apiBase||"").replace(/\/$/,"");
const remote=/^https:\/\/[a-z0-9.-]+$/i.test(API);
function toOriginalBlock(b){
 if(b.type==="section")return {...b,kind:"section",columns:(b.columns||[[],[]]).map(items=>items.map(toOriginalBlock))};
 const type=b.type==="document"?"button":b.type==="columns"?"text":b.type;
 let url=String(b.url||"");
 if(b.mediaId&&remote)url=API+"/media/"+encodeURIComponent(b.mediaId);
 return {...b,kind:type,
  src:["image","audio"].includes(b.type)?url:undefined,
  href:["document","video","button"].includes(b.type)?url:undefined,
  ...(b.type==="document"?{displayAsButton:true}:{}),
  ...(b.type==="columns"?{text:[b.left,b.right].filter(Boolean).join("\n")}:{}),
  size:b.size||b.fontSize||0
 };
}
async function init(){
 try{
  const r=await fetch((remote?API+"/api/site":"data/site.json"),{cache:"no-store"});
  if(!r.ok)throw Error("Pages indisponibles : "+r.status);
  const data=await r.json(),pages=(data.pages||[]).filter(p=>p.status==="published");
  const list=pages.map(p=>({
   id:p.slug||p.id,name:p.title,group:"page",placement:p.placement||"menu",
   visibility:"published",blocks:(p.blocks||[]).map(toOriginalBlock)
  }));
  const homePage=pages.find(p=>p.id===data.homeId),homeId=homePage?.slug||list[0]?.id||"accueil";
  window.__TRIAL_SITE_SEED__={celebrationId:"espace-jeunesse-independant",pages:list,
   celebrations:[],files:[],media:[],library:[],palettes:[]};
  window.__PUBLIC_SITE_SNAPSHOT__={shared:{pages:list,homeId},plans:[]};
  window.__PUBLIC_PAGE_IDS__=list.map(p=>p.id);
  window.__PUBLIC_LANGUAGE__={selectedLanguageId:"fr",options:[]};
  window.__PUBLIC_CELEBRATION_VISIBILITY__={};
  window.__EJ_WORKER_MEDIA_BASE__=remote?API:"";
  const title=document.getElementById("site-title");
  if(title)title.textContent=data.title||"Espace Jeunesse";
  const script=document.createElement("script");script.src="assets/celebrations-public-verbatim.js";
  script.onerror=()=>{document.getElementById("stage-main").textContent="Impossible de charger le site."};
  document.body.append(script);
 }catch(error){
  document.getElementById("stage-main").textContent="Impossible de charger les pages : "+error.message;
 }
}
init();
})();
