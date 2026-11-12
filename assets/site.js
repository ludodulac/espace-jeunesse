(function(){
 "use strict";
 const U=window.EJ;
 let state=null,current="";
 const status=document.getElementById("load-status");
 const paper=document.getElementById("paper"),body=document.getElementById("page-content");
 const nav=document.getElementById("main-menu"),foot=document.getElementById("footer-menu");
 const brand=document.querySelector(".identity");
 const toggle=document.getElementById("menu-toggle");
 document.getElementById("copyright-year").textContent=String(new Date().getFullYear());
 const linkHref=p=>p.id===state.homeId?"./":"?page="+encodeURIComponent(p.slug);
 const resolvePage=()=>{
   const id=new URLSearchParams(location.search).get("page");
   return state.pages.find(p=>p.status==="published"&&p.slug===id)||
     state.pages.find(p=>p.id===state.homeId&&p.status==="published")||
     state.pages.find(p=>p.status==="published")||null;
 };
 function addLink(target,page){
   const a=U.make("a","",page.title);
   a.href=linkHref(page);
   a.dataset.slug=page.slug;
   a.addEventListener("click",e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
     e.preventDefault();history.pushState({},"",a.href);render();nav.classList.remove("open");toggle.setAttribute("aria-expanded","false");window.scrollTo(0,0)});
   target.append(a);
 }
 function loadNavigation(){
   nav.replaceChildren();foot.replaceChildren();
   state.pages.filter(p=>p.placement==="menu"&&p.status==="published").forEach(p=>addLink(nav,p));
   state.pages.filter(p=>p.placement==="footer"&&p.status==="published").forEach(p=>addLink(foot,p));
 }
 function appendMediaCaption(block,target){
   if(block.caption){target.append(U.make("figcaption","",block.caption))}
 }
 function drawBlock(block){
   const type=String(block.type||"text");
   const div=U.make("section","block "+type+" "+(["center","right"].includes(block.align)?block.align:""));
   const source=U.mediaUrl(block);
   if(type==="heading"){
     const h=U.make(block.level==="h2"?"h2":block.level==="h3"?"h3":"h1","",block.text||"");
     div.append(h);
   } else if(type==="text"){div.append(U.make("p","",block.text||""))}
   else if(type==="divider"){div.append(document.createElement("hr"))}
   else if(type==="columns"){
     const cols=U.make("div","columns");
     [block.left||"",block.right||""].forEach(text=>{const col=U.make("div","column");col.append(U.make("p","",text));cols.append(col)});
     div.append(cols);
   } else if(type==="image"&&source){
     const f=document.createElement("figure"),img=document.createElement("img");
     img.src=source;img.alt=String(block.alt||"");img.loading="lazy";f.append(img);appendMediaCaption(block,f);div.append(f);
   }else if(type==="audio"&&source){
     if(block.text)div.append(U.make("p","",block.text));
     const a=document.createElement("audio");a.controls=true;a.preload="metadata";a.src=source;div.append(a);
   }else if(type==="video"&&source){
     const embed=U.youtubeEmbed(source);
     if(embed){const frame=document.createElement("iframe");frame.src=embed;frame.title=block.text||"Vidéo";frame.loading="lazy";frame.allowFullscreen=true;frame.setAttribute("referrerpolicy","strict-origin-when-cross-origin");frame.style.cssText="width:100%;max-width:800px;aspect-ratio:16/9;border:0;border-radius:10px";div.append(frame)}
     else{const v=document.createElement("video");v.src=source;v.controls=true;v.preload="metadata";div.append(v)}
   }else if(type==="document"&&source){
     const a=U.make("a","document","📄 "+(block.text||"Ouvrir le document"));a.href=source;a.target="_blank";a.rel="noopener noreferrer";div.append(a);
   }else if(type==="button"&&source){
     const a=U.make("a","link-button",block.text||"En savoir plus");a.href=source;
     if(new URL(a.href).origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}
     div.append(a);
   }
   return div;
 }
 function render(){
   if(!state)return;
   document.getElementById("site-title").textContent=state.title;
   document.getElementById("site-tagline").textContent=state.tagline;
   brand.setAttribute("aria-label","Retour à l'accueil");
   loadNavigation();
   const page=resolvePage();
   body.replaceChildren();
   if(!page){body.append(U.make("h1","","Aucune page publiée"));body.append(U.make("p","","Ouvrez l'administration pour créer et publier l'accueil."))}
   else {
      document.title=page.title+" — "+state.title;
      for(const block of page.blocks)body.append(drawBlock(block));
   }
   for(const a of nav.querySelectorAll("a")){
      const active=page&&a.dataset.slug===page.slug;a.classList.toggle("active",!!active);
      if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
   }
   status.hidden=true;paper.hidden=false;
 }
 window.addEventListener("popstate",render);
 toggle.addEventListener("click",()=>{const opened=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",String(opened))});
 brand.addEventListener("click",e=>{e.preventDefault();history.pushState({},"","./");render();window.scrollTo(0,0)});
 (async()=>{
   try{
     const url=U.api()?U.api()+"/api/site":"data/site.json";
     const res=await fetch(url,{cache:"no-store"});
     if(!res.ok)throw new Error("Réponse "+res.status);
     state=U.cleanSite(await res.json());render();
   }catch(err){
     status.textContent="Les pages ne sont pas disponibles actuellement. "+String(err.message||err);
   }
 })();
})();
