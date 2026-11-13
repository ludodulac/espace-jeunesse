/* Fermeture des réglages quand on clique ailleurs.
 * Pas de modification du moteur d'édition ni des données Cloudflare. */
(() => {
 "use strict";
 const closeSettings = () => {
  const panel=document.querySelector("#ej-original-shell .ej-page-settings-details[open]");
  if(!panel)return;
  window.__EJ_SETTINGS_EXPANDED__=false;
  panel.open=false;
 };
 document.addEventListener("pointerdown",event=>{
  const panel=document.querySelector("#ej-original-shell .ej-page-settings-details[open]");
  if(panel && !panel.contains(event.target))closeSettings();
 },true);
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape")closeSettings();
 });
})();
