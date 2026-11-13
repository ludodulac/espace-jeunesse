/* Espace Jeunesse : survol souris du menu public.
   Les fonctions d'origine du moteur visiteurs restent maîtresses de
   l'ouverture, de la fermeture, du clic tactile et du clavier. */
(function(){
 "use strict";
 const menu=document.getElementById("menu-toggle");
 const group=menu?.closest(".site-menu-group");
 if(!menu||!group)return;
 const fine=window.matchMedia("(hover:hover) and (pointer:fine)");
 let timer=0,openedByHover=false;
 const cancel=()=>{clearTimeout(timer);timer=0;};
 // On réutilise le onclick installé par le vrai moteur Célébrations :
 // son état interne menuOpen reste donc parfaitement synchronisé.
 menu.addEventListener("pointerenter",event=>{
  if(!fine.matches||event.pointerType==="touch")return;
  cancel();
  if(menu.getAttribute("aria-expanded")==="false"&&typeof menu.onclick==="function"){
   openedByHover=true;
   menu.click();
  }
 });
 // Quand l'ouverture vient déjà du survol, un clic de souris ne doit
 // pas refermer le menu au moment où l'utilisateur veut y accéder.
 menu.addEventListener("click",event=>{
  if(!fine.matches||!openedByHover||!event.isTrusted||event.detail<=0)return;
  openedByHover=false;
  event.stopImmediatePropagation();
 },true);
 group.addEventListener("pointerenter",event=>{
  if(event.pointerType!=="touch")cancel();
 });
 group.addEventListener("pointerleave",event=>{
  if(!fine.matches||event.pointerType==="touch")return;
  cancel();
  timer=window.setTimeout(()=>{
   if(group.matches(":hover"))return;
   const nav=document.getElementById("general-navigation");
   if(nav?.contains(document.activeElement))return;
   openedByHover=false;
   if(menu.getAttribute("aria-expanded")==="true"&&typeof menu.onclick==="function")menu.click();
  },220);
 });
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"){openedByHover=false;cancel();}
 });
})();
