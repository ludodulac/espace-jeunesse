/* Sommaire cliquable de la page Prénoms.
 * Ajout purement côté visiteurs : ne modifie ni les fiches ni les outils de l'éditeur.
 * Les liens sont des ancres HTML standard. Les noms proviennent des titres
 * réellement affichés : le sommaire suit donc les personnalisations.
 */
(function(){
"use strict";
const main=document.getElementById("stage-main");
if(!main)return;
const slug=text=>String(text).normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
let deepLinkHandled="";
function onNamesPage(){
 return new URLSearchParams(window.location.search).get("page")==="prenoms";
}
function updateIndex(){
 if(!onNamesPage()||main.querySelector(".ej-prenoms-index"))return;
 // Le moteur de pages place chaque fiche native directement dans #stage-main.
 const cards=Array.from(main.children).filter(el=>
  el.matches("section.trial-content-section")&&el.querySelector(".trial-heading"));
 if(!cards.length)return;
 const rows=[],used=new Set();
 for(const card of cards){
  const heading=card.querySelector(".trial-heading");
  const name=String(heading?.textContent||"").trim().split(/\s*[:—–]\s*/)[0].trim();
  if(!name)continue;
  const base="prenom-"+slug(name);
  if(base==="prenom-")continue;
  let id=base,n=2;
  while(used.has(id)||document.getElementById(id))id=base+"-"+n++;
  used.add(id);
  card.id=id;
  rows.push({id,name});
 }
 if(!rows.length)return;
 const nav=document.createElement("nav");
 nav.className="ej-prenoms-index";
 nav.setAttribute("aria-label","Sommaire des prénoms");
 const heading=document.createElement("h2");
 heading.textContent="Choisir un prénom";
 const hint=document.createElement("p");
 hint.textContent="Touchez un prénom pour aller directement à sa fiche.";
 const links=document.createElement("div");
 links.className="ej-prenoms-index-links";
 for(const {id,name} of rows){
  const a=document.createElement("a");
  a.href="#"+id;
  a.textContent=name;
  links.append(a);
 }
 nav.append(heading,hint,links);
 // Après le titre et son introduction, avant la première fiche.
 cards[0].before(nav);
 // Un lien partagé vers un prénom fonctionne même après le rendu asynchrone.
 if(location.hash&&location.hash!==deepLinkHandled){
  let requested="";
  try{requested=decodeURIComponent(location.hash.slice(1))}catch{}
  if(rows.some(r=>r.id===requested)){
   deepLinkHandled=location.hash;
   requestAnimationFrame(()=>document.getElementById(requested)?.scrollIntoView({block:"start"}));
  }
 }
}
const observer=new MutationObserver(updateIndex);
observer.observe(main,{childList:true});
updateIndex();
})();