/* Les données Espace Jeunesse se branchent sur le MOTEUR PUBLIC original
   Célébrations après projection des seules pages publiées. */
(function(){
"use strict";
const API=String(window.ESPACE_JEUNESSE_CONFIG?.apiBase||"").replace(/\/$/,"");
const remote=/^https:\/\/[a-z0-9.-]+$/i.test(API);
// Une connexion/déconnexion dans un autre onglet met à jour la vue visiteur.
window.addEventListener("storage",event=>{
 if(event.key==="ej-admin-session-v1")location.reload();
});

/* Entrée Boutique distincte des pages classiques : l'éditeur ne la pilote pas. */
const nav=document.getElementById("general-navigation");
function shopEntry(){
 if(!nav||nav.querySelector("[data-ej-shop-link]"))return;
 const a=document.createElement("a");
 a.className="general-tab";a.href="boutique.html";
 a.textContent="🛍 Boutique";a.dataset.ejShopLink="1";
 nav.append(a);
}
if(nav){new MutationObserver(shopEntry).observe(nav,{childList:true});shopEntry()}
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
  // Une session administrateur vérifiée par le Worker autorise la visite des
  // pages privées ; aucun contenu privé ne vient de l'API publique.
  let fetched=null,privateAuthorized=false;
  const sessionToken=localStorage.getItem("ej-admin-session-v1")||sessionStorage.getItem("ej-admin-session-v1")||"";
  if(remote&&sessionToken){
   try{
    const authorized=await fetch(API+"/api/admin/visitor-site",{
     headers:{Authorization:"Bearer "+sessionToken},cache:"no-store"
    });
    if(authorized.ok){fetched=await authorized.json();privateAuthorized=true}
    else if(authorized.status===401){
     localStorage.removeItem("ej-admin-session-v1");
     sessionStorage.removeItem("ej-admin-session-v1");
    }
   }catch{/* La consultation publique doit rester possible hors connexion. */}
  }
  if(!fetched){
   const r=await fetch((remote?API+"/api/site":"data/site.json"),{cache:"no-store"});
   if(!r.ok)throw Error("Pages indisponibles : "+r.status);
   fetched=await r.json();
  }
  const withTotems=window.EJTotems?.mergeSite(fetched)||fetched;
  const withPartners=window.EJPartners?.mergeSite(withTotems)||withTotems;
  const withBoutique=window.EJBoutique?.mergeSite(withPartners)||withPartners;
  const withExercises=window.EJExercises?.mergeSite(withBoutique)||withBoutique;
  const withMichael=window.EJMichael2026?.mergeSite(withExercises)||withExercises;
  const withLiterature=window.EJLiterature?.mergeSite(withMichael)||withMichael;
  const data=window.EJNames?.mergeSite(withLiterature)||withLiterature;
  // Les anciennes présentations des peluches contiennent encore des liens vers
  // le corpus éditorial. Elles restent conservées dans l’admin, mais ne sont
  // plus publiées : seule la boutique autonome présente ces produits.
  const archived=new Set(["boutique-peluches","peluches-totem"]);
  const pages=(data.pages||[]).filter(p=>(p.status==="published"||(remote&&privateAuthorized&&p.status==="private"))&&!archived.has(p.slug||p.id));
  const list=pages.map(p=>({
   id:p.slug||p.id,name:p.title+(p.status==="private"?" 🔒":""),group:"page",placement:(p.slug==="boutique-peluches"&&p.title==="Boutique peluches")?"none":p.placement||"menu",
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
