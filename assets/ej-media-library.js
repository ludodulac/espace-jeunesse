/* Médiathèque Espace Jeunesse : inventaire D1/R2 durable, usages fiables et URLs publiques.
   La sonothèque du studio Ludodio est volontairement exclue. */
(function(){
"use strict";
let items=[],ready=false,loading=null,query="",message="";
const api=()=>String(window.ESPACE_JEUNESSE_CONFIG?.apiBase||"").replace(/\/$/,"");
const make=(tag,label,cl)=>{const el=document.createElement(tag);if(cl)el.className=cl;if(label!==undefined)el.textContent=label;return el};
function button(label,action,cl=""){
 const b=make("button",label,"btn sm "+cl);b.type="button";b.onclick=action;return b;
}
function category(m){
 const type=String(m.type||"");
 return type.startsWith("image/")?"images":type.startsWith("audio/")?"audios":type==="application/pdf"?"documents":"autres";
}
async function reload(){ready=false;items=await window.EJBridge.detailedMedia();ready=true;}
function ensure(){
 if(ready)return Promise.resolve();
 if(!loading)loading=reload().finally(()=>{loading=null});
 return loading;
}
function pageLink(page){
 const base="https://ludodulac.github.io/espace-jeunesse/";
 return page.status==="published"?base+"?page="+encodeURIComponent(page.slug):
  base+"admin.html?editPage="+encodeURIComponent(page.id);
}
function mediaURL(m){return m.url||api()+"/media/"+encodeURIComponent(m.id)}
function clipURL(url){
 if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(url);
 window.prompt("Copiez le lien public :",url);return Promise.resolve();
}
async function run(action,ctx){
 try{message="";await action();await reload();draw(ctx)}catch(e){message="Erreur : "+String(e.message||e);draw(ctx)}
}
function draw(ctx){
 const host=ctx.host;if(!host?.isConnected)return;
 host.replaceChildren();
 const panel=make("section",undefined,"ej-media-library");
 const header=make("div",undefined,"ej-ml-header");
 header.append(make("h2","Médiathèque — Espace Jeunesse"));
 const upload=document.createElement("input");upload.type="file";upload.hidden=true;
 upload.multiple=true;upload.accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.mp3,.wav,.mp4,.webm";
 upload.onchange=()=>{
  const files=Array.from(upload.files||[]);upload.value="";
  if(files.length)run(()=>window.EJBridge.importFiles(files),ctx);
 };
 header.append(button("＋ Importer des fichiers",()=>upload.click(),"primary"),upload);
 panel.append(header,make("p","Les fichiers restent disponibles même si une page est masquée, mise en brouillon ou supprimée. Le lien du fichier est public pour toute personne qui le connaît.","ej-ml-note"));
 const categories=[["images","Images"],["audios","Audios"],["documents","PDF"],["autres","Autres"],["tous","Tous"]];
 const tabs=make("div",undefined,"ej-ml-tabs");
 for(const [key,label] of categories)tabs.append(button(label,()=>{
  ctx.category=key;ctx.onCategory(key);
 },ctx.category===key?"primary":""));
 panel.append(tabs);
 const search=make("input",undefined,"ej-ml-search");search.type="search";search.placeholder="Rechercher un fichier";search.value=query;
 search.oninput=()=>{query=search.value;draw(ctx);const next=host.querySelector(".ej-ml-search");next?.focus();next?.setSelectionRange(query.length,query.length)};
 panel.append(search);
 if(message)panel.append(make("p",message,"ej-ml-message"));
 const grid=make("div",undefined,"ej-ml-grid");
 const filtered=items.filter(m=>(ctx.category==="tous"||category(m)===ctx.category)&&
   (!query||m.name.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))));
 for(const m of filtered){
  const card=make("article",undefined,"ej-ml-card"),url=mediaURL(m),kind=category(m);
  const preview=make("a",undefined,"ej-ml-preview");preview.href=url;preview.target="_blank";preview.rel="noopener noreferrer";preview.title="Ouvrir le fichier";
  if(kind==="images"){const image=make("img");image.src=url;image.alt=m.name;image.loading="lazy";preview.append(image)}
  else preview.append(make("span",kind==="audios"?"🎧":kind==="documents"?"📄":"📁","ej-ml-icon"));
  card.append(preview);
  const title=make("a",m.name,"ej-ml-title");title.href=url;title.target="_blank";title.rel="noopener noreferrer";card.append(title);
  if(kind==="audios"){const player=make("audio");player.controls=true;player.preload="none";player.src=url;player.setAttribute("aria-label",m.name);card.append(player)}
  const refs=make("div",undefined,"ej-ml-refs");
  if(!Array.isArray(m.uses)||!m.uses.length)refs.append(make("span","N'apparaît nulle part","ej-ml-nowhere"));
  else for(const p of m.uses){
   const link=make("a",p.title||"Page","ej-ml-ref state-"+(p.status||"hidden"));
   link.href=pageLink(p);link.title=p.status==="published"?"Voir la page publiée":"Ouvrir cette page dans l'administration";
   if(p.status!=="published")link.target="_blank";
   link.rel="noopener noreferrer";refs.append(link);
  }
  if(m.ludodio){
   const label=make("a","Ludodio","ej-ml-ref state-ludodio");
   label.href="https://ludodulac.github.io/La-foret-enchantee/admin.html";
   label.target="_blank";label.rel="noopener noreferrer";refs.append(label);
  }
  card.append(refs);
  const actions=make("div",undefined,"ej-ml-actions");
  actions.append(button("Copier l’URL",()=>void clipURL(url)));
  if(ctx.selectAudio&&kind==="audios")actions.append(button("Insérer dans le lecteur",()=>ctx.selectAudio(m),"primary"));
  if(kind==="audios")actions.append(button(m.ludodio?"Retirer de Ludodio":"Proposer à Ludodio",
   ()=>run(()=>window.EJBridge.setLudodio(m.id,!m.ludodio),ctx)));
  actions.append(button("Supprimer",()=>{
   if(window.confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?"))
    run(()=>window.EJBridge.deleteMedia(m.id),ctx);
  },"danger"));
  card.append(actions);grid.append(card);
 }
 if(ready&&!filtered.length)grid.append(make("p","Aucun fichier dans cette catégorie.","ej-ml-note"));
 panel.append(grid);
 host.append(panel);
}
function render(ctx){
 if(!ctx.category)ctx.category="images";
 if(!ready){
  ctx.host.replaceChildren(make("p","Chargement de la médiathèque…","ej-ml-note"));
  ensure().then(()=>draw(ctx),err=>{message="Impossible de charger la médiathèque : "+String(err.message||err);draw(ctx)});
 }else draw(ctx);
}
window.EJMediaLibrary={render,refresh:()=>{ready=false;return ensure()}};
})();