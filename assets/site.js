/* Rendu visiteur avec la structure HTML et les classes d'origine Célébrations.
   Seul le modèle de pages est simplifié. Aucun média ou endpoint du projet source. */
(function(){
"use strict";
const U=window.EJ, status=document.getElementById("load-status");
const content=document.getElementById("stage-main");
const menu=document.getElementById("general-navigation"),footer=document.getElementById("footer-pages");
const toggle=document.getElementById("menu-toggle"),banner=document.getElementById("site-identity");
let state=null;
function pageHref(page){return page.id===state.homeId?"./":"?page="+encodeURIComponent(page.slug)}
function closeMenu(){menu.hidden=true;toggle.setAttribute("aria-expanded","false")}
function selectedPage(){
 const slug=new URLSearchParams(location.search).get("page");
 if(slug)return state.pages.find(p=>p.slug===slug&&p.status==="published")||null;
 return state.pages.find(p=>p.id===state.homeId&&p.status==="published")||state.pages.find(p=>p.status==="published")||null;
}
function navLink(page,forFooter=false){
 const a=U.make("a",forFooter?"":"general-tab",page.title);
 a.href=pageHref(page);a.dataset.slug=page.slug;
 a.addEventListener("click",e=>{
   if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
   e.preventDefault();history.pushState({},"",a.href);render();closeMenu();window.scrollTo(0,0);
 });
 return a;
}
function renderNavigation(page){
 menu.replaceChildren();footer.replaceChildren();
 for(const p of state.pages){
   if(p.status!=="published")continue;
   if(p.placement==="menu"){
     const a=navLink(p);if(page?.id===p.id){a.classList.add("current");a.setAttribute("aria-current","page")}
     menu.append(a);
   }
   if(p.placement==="footer"){
     const a=navLink(p,true);
     if(page?.id===p.id)a.setAttribute("aria-current","page");
     footer.append(a);
   }
 }
}
function mediaUrl(block){return U.mediaUrl(block)}
function styleAlign(element,block){
 if(block.align==="center")element.style.textAlign="center";
 if(block.align==="right")element.style.textAlign="right";
}
function videoInfo(url){
 let yt=U.youtubeEmbed(url);
 if(yt){const id=yt.split("/").pop();return {embed:yt,thumb:"https://i.ytimg.com/vi/"+id+"/hqdefault.jpg"}}
 try{
   const u=new URL(url),m=/^\/(\d+)(?:\/|$)/.exec(u.pathname);
   if(["vimeo.com","www.vimeo.com"].includes(u.hostname)&&m)return {embed:"https://player.vimeo.com/video/"+m[1]};
 }catch{}
 return null;
}
function drawBlock(block){
 const type=block.type||"text",source=mediaUrl(block);
 const wrap=U.make("div","site-block "+(block.align==="center"?"center":block.align==="right"?"right":""));
 if(type==="heading"){
  const level=["h1","h2","h3"].includes(block.level)?block.level:"h1";
  const h=U.make(level,"trial-heading "+(level==="h1"?"heading-primary":"heading-secondary"),block.text||"");
  styleAlign(h,block);wrap.append(h);
 } else if(type==="text"){
  const p=U.make("p","trial-paragraph",block.text||"");styleAlign(p,block);wrap.append(p);
 } else if(type==="columns"){
  const section=U.make("section","trial-content-section");
  section.dataset.layout="columns";
  const cols=U.make("div","trial-content-columns");
  for(const text of [block.left||"",block.right||""]){
    const column=U.make("div","trial-content-column");
    column.dataset.verticalAlign="top";
    column.append(U.make("p","trial-paragraph",text));
    cols.append(column);
  }
  section.append(cols);wrap.append(section);
 } else if(type==="image"&&source){
  const fig=U.make("figure","trial-figure");
  const img=document.createElement("img");img.src=source;img.alt=String(block.alt||block.caption||"");img.loading="lazy";fig.append(img);
  if(block.caption)fig.append(U.make("figcaption","trial-image-caption",block.caption));wrap.append(fig);
 } else if(type==="audio"&&source){
  const box=U.make("div","trial-audio");
  if(block.text)box.append(U.make("strong","",block.text));
  const player=U.make("audio","trial-audio-player");player.src=source;player.controls=true;player.preload="metadata";box.append(player);wrap.append(box);
 } else if(type==="video"&&source){
  const box=U.make("div","trial-video");const vi=videoInfo(source);
  if(vi){
   const launch=U.make("button","trial-video-trigger");launch.type="button";launch.setAttribute("aria-label","Lire la vidéo");
   if(vi.thumb){const img=U.make("img","trial-video-thumb");img.src=vi.thumb;img.alt=block.text||"Vidéo";img.loading="lazy";launch.append(img)}
   launch.append(U.make("span","trial-video-play","▶"));
   launch.addEventListener("click",()=>{
    const frame=U.make("iframe","trial-video-iframe");frame.src=vi.embed;frame.title=block.text||"Vidéo";frame.allowFullscreen=true;frame.loading="lazy";frame.referrerPolicy="strict-origin-when-cross-origin";
    frame.allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";launch.replaceWith(frame);
   });
   box.append(launch);
  } else if(/\.(mp4|webm|ogg)(?:$|\?)/i.test(source)){
   const player=U.make("video","trial-video-player");player.controls=true;player.preload="metadata";player.src=source;box.append(player);
  }else{
   const link=U.make("a","trial-site-link","Voir la vidéo");link.href=source;link.target="_blank";link.rel="noopener noreferrer";box.append(link);
  }
  if(block.text)box.append(U.make("div","trial-video-title",block.text));wrap.append(box);
 } else if(type==="document"&&source){
  const a=U.make("a","trial-document","📄 "+(block.text||"Ouvrir le PDF"));
  a.href=source;a.target="_blank";a.rel="noopener noreferrer";wrap.append(a);
 } else if(type==="button"&&source){
  const a=U.make("a","trial-button",block.text||"En savoir plus");a.href=source;
  if(new URL(a.href).origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}wrap.append(a);
 } else if(type==="divider"){
  const line=U.make("hr","trial-custom-divider");line.style.cssText="height:1px;width:60%;border:0;background:#858c94;margin:18px auto";wrap.append(line);
 }
 return wrap;
}
function render(){
 if(!state)return;
 const page=selectedPage(),unknown=!!new URLSearchParams(location.search).get("page")&&!page;
 const home=page?.id===state.homeId||!new URLSearchParams(location.search).has("page");
 const bannerTitle=document.getElementById("site-title");bannerTitle.textContent=state.title;
 banner.classList.toggle("is-home",!!home);
 renderNavigation(page);content.replaceChildren();
 if(!page){
  content.append(U.make("h1","trial-heading","Page indisponible"));
  content.append(U.make("p","trial-paragraph",unknown?"Cette page n'est pas publiée.":"Aucune page n'est publiée."));
 }else{
  document.title=page.title+" — "+state.title;
  if(page.blocks.length){
   for(const block of page.blocks){const node=window.EJPageRender.drawBlock(block);if(node)content.append(node)}
  }else content.append(U.make("h2","trial-heading",page.title));
 }
 status.hidden=true;closeMenu();
}
toggle.addEventListener("click",()=>{const opening=menu.hidden;menu.hidden=!opening;toggle.setAttribute("aria-expanded",String(opening))});
document.addEventListener("click",e=>{if(!e.target.closest(".site-menu-group"))closeMenu()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
window.addEventListener("popstate",render);
(async()=>{
 try{
  const url=U.api()?U.api()+"/api/site":"data/site.json";
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw new Error("Réponse serveur "+response.status);
  state=U.cleanSite(await response.json());render();
 }catch(error){status.textContent="Impossible de charger les pages. "+String(error.message||error)}
})();
})();
