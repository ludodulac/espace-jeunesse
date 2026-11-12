(function(){
"use strict";
const U=window.EJ,KEY="ej-local-preview-v1",TOKEN_KEY="ej-admin-session-v1";
let state,version=0,token=sessionStorage.getItem(TOKEN_KEY)||"",media=[],selected="accueil",tab="pages",mediaTab="images",dirty=false,preview=false;
let undoHistory=[],lastSnapshot="",lastEditAt=0;
const remote=!!U.api();
const $=(id)=>document.getElementById(id);
const html=(s)=>{const t=document.createElement("template");t.innerHTML=s;return t.content};
const button=(label,fn,cls="btn small")=>{const b=U.make("button",cls,label);b.type="button";b.addEventListener("click",fn);return b};
const field=(title,val,onchange,kind="input",options=null)=>{
 const wrap=U.make("div","form-field"),label=U.make("label","",title);let el;
 if(options){el=document.createElement("select");options.forEach(([v,n])=>{const o=new Option(n,v);el.append(o)});el.value=val??""}
 else if(kind==="textarea"){el=document.createElement("textarea");el.value=val??""}
 else{el=document.createElement("input");el.type=kind==="url"?"url":"text";el.value=val??""}
 label.append(el);wrap.append(label);
 el.addEventListener("input",()=>{onchange(el.value);touch()});
 el.addEventListener("change",()=>{onchange(el.value);touch();refresh()});
 return wrap;
};
const badge=(status)=>U.make("span","pill "+status,({published:"Publiée",draft:"Brouillon",hidden:"Masquée"})[status]||status);
function notice(message,error=false){const n=$("global-notice");if(!n)return;n.textContent=message;n.className="notice "+(error?"error":"ok");n.hidden=false;}
function touch(){
 const next=JSON.stringify(state);
 if(lastSnapshot&&next!==lastSnapshot){
  const now=Date.now();
  if(now-lastEditAt>750||!undoHistory.length)undoHistory.push(lastSnapshot);
  if(undoHistory.length>60)undoHistory.shift();
  lastEditAt=now;lastSnapshot=next;
 }
 dirty=true;const label=$("save-state");if(label)label.textContent="Modifications non enregistrées";
 const back=$("undo-btn");if(back)back.disabled=!undoHistory.length;
}
function undo(){
 if(!undoHistory.length)return;
 state=U.cleanSite(JSON.parse(undoHistory.pop()));lastSnapshot=JSON.stringify(state);lastEditAt=0;dirty=true;refresh();
}
async function request(path,opts={}){
 const headers={"Accept":"application/json",...(opts.body&&! (opts.body instanceof Blob)?{"Content-Type":"application/json"}:{}),...(token?{"Authorization":"Bearer "+token}:{}),...opts.headers};
 const res=await fetch(U.api()+path,{...opts,headers,mode:"cors"});
 let data={};try{data=await res.json()}catch{}
 if(res.status===401){token="";sessionStorage.removeItem(TOKEN_KEY);showLogin();throw new Error("Session expirée. Reconnectez-vous.")}
 if(!res.ok)throw new Error(data.error||"Erreur serveur "+res.status);
 return data;
}
function showLogin(){
 const app=$("app");app.replaceChildren();
 const box=U.make("div","panel login-card");
 box.append(U.make("h1","","🌿 Administration"),U.make("p","muted","Espace Jeunesse — accès réservé"));
 const form=document.createElement("form"),input=document.createElement("input");input.type="password";input.required=true;input.autocomplete="current-password";input.placeholder="Mot de passe administrateur";input.className="input";input.setAttribute("aria-label","Mot de passe administrateur");
 const row=U.make("div","row");row.style.marginTop="12px";const submit=U.make("button","btn primary","Se connecter");submit.type="submit";row.append(submit);
 form.append(input,row);box.append(form);app.append(box);
 form.addEventListener("submit",async e=>{e.preventDefault();submit.disabled=true;
   try{const d=await request("/api/auth/login",{method:"POST",body:JSON.stringify({password:input.value})});token=d.token;sessionStorage.setItem(TOKEN_KEY,token);await load();}
   catch(err){const p=U.make("p","notice error",err.message);box.append(p)}
   finally{submit.disabled=false;input.value=""}
 });
}
function shell(){
 $("app").innerHTML=`<div class="shell stage-editor">
 <aside class="rail"><div class="brand"><div class="mark">✦</div><div><strong>Administration</strong></div></div>
 <nav aria-label="Navigation">
 <button class="navbtn" data-tab="pages">▤ Pages</button>
 <button class="navbtn" data-tab="footer">▤ Pages de bas de page</button>
 <button class="navbtn" data-tab="menu">☰ Menu</button>
 <button class="navbtn" data-tab="media">▧ Médiathèque (administration)</button>
 <button class="navbtn" data-tab="settings">⚙ Paramètres</button>
 <button class="navbtn" data-tab="guide">ⓘ Mode d'emploi</button>
 </nav></aside>
 <div class="content"><header class="topbar"><div class="topbar-title"><h1 id="screen-title">Pages</h1><p id="screen-subtitle">Éditeur de pages</p></div>
 <div class="actions">
 <span class="badge" id="save-state">Tout est enregistré</span>
 <button class="editor-undo-button" id="undo-btn" type="button" title="Annuler" aria-label="Annuler la dernière modification" disabled>↶</button>
 <button class="btn sm" id="preview-btn" type="button" title="Voir la page en brouillon">Aperçu du brouillon</button>
 <button class="btn primary" id="save-btn" type="button">Enregistrer</button>
 <a class="btn view-site-btn" id="view-site-btn" href="index.html" target="_blank" rel="noopener noreferrer">Voir le site</a>
 </div></header>
 <main class="main">
 <div class="notice" id="local-banner" hidden>⚠ Mode d'essai local : les changements restent sur ce navigateur et ne sont pas publiés. L'administration en ligne nécessitera l'activation du nouveau stockage Cloudflare Espace Jeunesse.</div>
 <div class="notice" id="global-notice" hidden role="status"></div>
 <div id="tab-content"></div>
 <p class="status" id="status" role="status"></p></main></div></div>`;
 for(const btn of document.querySelectorAll("[data-tab]"))btn.addEventListener("click",()=>{tab=btn.dataset.tab;preview=false;refresh()});
 $("save-btn").addEventListener("click",save);
 $("preview-btn").addEventListener("click",()=>{preview=!preview;refresh()});
 $("undo-btn").addEventListener("click",undo);
 $("local-banner").hidden=remote;
}
function refresh(){
 if(!$("tab-content"))return;
 for(const b of document.querySelectorAll("[data-tab]"))b.classList.toggle("active",b.dataset.tab===tab);
 const titles={pages:["Pages","Ajouter et modifier les pages du site"],footer:["Pages de bas de page","Modifier les pages du pied de site"],menu:["Menu","Organiser les pages du menu"],media:["Médiathèque (administration)","Images, audios, vidéos et documents — privée"],settings:["Paramètres","Nom et présentation du site"],guide:["Mode d'emploi","Les commandes essentielles"]};
 $("screen-title").textContent=preview?"Aperçu":titles[tab][0];$("screen-subtitle").textContent=preview?"Prévisualisation de la page sélectionnée":titles[tab][1];
 $("preview-btn").classList.toggle("active",preview);$("save-state").textContent=dirty?"Modifications non enregistrées":"Tout est enregistré";
 const root=$("tab-content");root.replaceChildren();
 if(preview)return showPreview(root);
 if(tab==="pages"||tab==="footer")showPages(root);
 if(tab==="menu")showMenu(root);
 if(tab==="media")showMedia(root);
 if(tab==="settings")showSettings(root);
 if(tab==="guide")showGuide(root);
 const back=$("undo-btn");if(back)back.disabled=!undoHistory.length;
}
function current(){return state.pages.find(p=>p.id===selected)||state.pages[0]}
function newPage(){
 const id=U.uuid(),slug="page-"+id.slice(0,8);
 const footer=tab==="footer";
 state.pages.push({id,slug,title:footer?"Nouvelle page de bas de page":"Nouvelle page",placement:footer?"footer":"menu",status:"draft",blocks:[]});
 selected=id;preview=false;touch();refresh();
}
function duplicatePage(p){
 const id=U.uuid(),copy=U.clone(p);copy.id=id;copy.slug=p.slug+"-copie-"+id.slice(0,5);copy.title=p.title+" (copie)";copy.status="draft";copy.blocks.forEach(b=>b.id=U.uuid());state.pages.push(copy);selected=id;touch();refresh();
}
function deletePage(p){
 if(p.id===state.homeId){notice("Impossible de supprimer la page d'accueil.",true);return}
 if(!confirm("Supprimer la page « "+p.title+" » ?"))return;
 state.pages=state.pages.filter(x=>x.id!==p.id);selected=state.homeId;touch();refresh();
}
function move(arr,item,direction){
 const pos=arr.findIndex(p=>p.id===item.id),next=arr[pos+direction];if(!next)return;
 const a=state.pages.findIndex(p=>p.id===item.id),b=state.pages.findIndex(p=>p.id===next.id);
 [state.pages[a],state.pages[b]]=[state.pages[b],state.pages[a]];touch();refresh();
}
function showPages(root){
 const title=U.make("div","row space"),footerMode=tab==="footer",h=U.make("h2","",footerMode?"Pages de bas de page":"Pages du site");title.append(h,button(footerMode?"＋ Nouvelle page de bas de page":"＋ Nouvelle page",newPage,"btn primary"));root.append(title);
 const layout=U.make("div","layout page-layout"),side=U.make("div","panel page-list list"),area=U.make("div","");
 const listPages=state.pages.filter(p=>footerMode?p.placement==="footer":p.placement!=="footer");
 if(!listPages.some(p=>p.id===selected)&&listPages.length)selected=listPages[0].id;
 listPages.forEach(p=>{const b=U.make("button","item "+(p.id===selected?"active":""),p.title);
 b.append(U.make("small","",p.placement==="footer"?"Bas de page":p.placement==="none"?"Hors menu":"Menu principal"));
 b.append(badge(p.status));b.addEventListener("click",()=>{selected=p.id;refresh()});side.append(b)});
 layout.append(side,area);root.append(layout);
 const p=listPages.find(p=>p.id===selected);if(!p){area.append(U.make("div","panel","Aucune page dans cette rubrique."));return}
 const settings=U.make("section","panel");
 settings.append(U.make("h2","","Réglages de la page"));
 const grid=U.make("div","form-grid");grid.append(
 field("Nom de la page",p.title,v=>{p.title=v.slice(0,120)}),
 field("Adresse de la page (slug)",p.slug,v=>{p.slug=v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9-]/g,"-").replace(/--+/g,"-").slice(0,80)}),
 field("Emplacement",p.placement,v=>p.placement=v,"select",[["menu","Menu principal"],["footer","Bas de page"],["none","Aucun menu"]]),
 field("Visibilité",p.status,v=>p.status=v,"select",[["draft","Brouillon"],["published","Publiée"],["hidden","Masquée"]])
 );settings.append(grid);
 const actions=U.make("div","row");actions.append(button("Dupliquer",()=>duplicatePage(p)),button("Supprimer",()=>deletePage(p),"btn small danger"));
 if(p.id!==state.homeId)actions.append(button("Définir comme accueil",()=>{state.homeId=p.id;touch();refresh()}));
 else actions.append(U.make("span","pill published","Page d'accueil"));
 settings.append(actions);area.append(settings);
 const canvas=window.EJCanvas?.build(p,{mark:touch,refresh,getMedia:()=>media});
 if(canvas)area.append(canvas);
}
function blockEditor(page,b,i){
 const container=U.make("div","block-card"),head=U.make("div","block-head"),label=U.make("strong","",U.typeLabel[b.type]||b.type),controls=U.make("div","block-controls");
 const reorder=(step)=>{const target=i+step;if(target<0||target>=page.blocks.length)return;[page.blocks[i],page.blocks[target]]=[page.blocks[target],page.blocks[i]];touch();refresh()};
 controls.append(button("↑",()=>reorder(-1)),button("↓",()=>reorder(1)),button("Copier",()=>{const cp=U.clone(b);cp.id=U.uuid();page.blocks.splice(i+1,0,cp);touch();refresh()}),button("✕",()=>{page.blocks.splice(i,1);touch();refresh()},"btn small danger"));
 head.append(label,controls);container.append(head);
 const type=b.type;
 if(["heading","text","audio","video","document","button"].includes(type))
  container.append(field(type==="heading"?"Texte du titre":type==="text"?"Texte":type==="audio"?"Titre de l'audio":type==="video"?"Titre de la vidéo":type==="document"?"Nom du document":"Texte du bouton",b.text||"",v=>b.text=v,type==="text"?"textarea":"input"));
 if(type==="columns"){container.append(field("Colonne de gauche",b.left||"",v=>b.left=v,"textarea"),field("Colonne de droite",b.right||"",v=>b.right=v,"textarea"))}
 if(type==="heading")container.append(field("Niveau de titre",b.level||"h1",v=>b.level=v,"select",[["h1","Grand titre"],["h2","Sous-titre"],["h3","Petit titre"]]));
 if(["heading","text","image","button"].includes(type))container.append(field("Alignement",b.align||"left",v=>b.align=v,"select",[["left","Gauche"],["center","Centre"],["right","Droite"]]));
 if(["image","audio","video","document","button"].includes(type)){
  if(["image","audio","document","video"].includes(type)){
    const choices=media.filter(m=>type==="image"?m.type.startsWith("image/"):type==="audio"?m.type.startsWith("audio/"):type==="video"?m.type.startsWith("video/"):m.type==="application/pdf");
    container.append(field("Choisir dans ma médiathèque",b.mediaId||"",v=>{b.mediaId=v;b.url="";},"select",[["","— Aucun fichier sélectionné —"],...choices.map(m=>[m.id,m.name])]));
  }
  if(!b.mediaId||type==="button")container.append(field(type==="video"?"URL vidéo (YouTube ou MP4)":"URL du fichier ou du lien",b.url||"",v=>b.url=v,"url"));
  if(type==="image"){container.append(field("Description de l'image (accessibilité)",b.alt||"",v=>b.alt=v),field("Légende (facultative)",b.caption||"",v=>b.caption=v))}
 }
 return container;
}
function showMenu(root){
 const panel=U.make("section","panel");panel.append(U.make("h2","","Menu principal"),U.make("p","muted","Les pages publiées placées dans le menu sont visibles par les visiteurs. Réorganisez-les avec les flèches."));
 const main=state.pages.filter(p=>p.placement==="menu");main.forEach(p=>addMenuRow(panel,p,main));root.append(panel);
 const foot=U.make("section","panel");foot.append(U.make("h2","","Liens de bas de page"),U.make("p","muted","Ces pages se modifient avec le même éditeur que les autres."));const list=state.pages.filter(p=>p.placement==="footer");list.forEach(p=>addMenuRow(foot,p,list));root.append(foot);
 const hidden=U.make("section","panel");hidden.append(U.make("h2","","Hors menu"));state.pages.filter(p=>p.placement==="none").forEach(p=>addMenuRow(hidden,p,state.pages.filter(x=>x.placement==="none")));root.append(hidden);
}
function addMenuRow(host,p,list){
 const div=U.make("div","row space");div.style.cssText="border-top:1px solid #eee7df;padding:10px 0";const name=U.make("div","",p.title+" ");name.append(badge(p.status));
 const right=U.make("div","row");right.append(button("↑",()=>move(list,p,-1)),button("↓",()=>move(list,p,1)),button("Modifier",()=>{selected=p.id;tab="pages";refresh()}));
 const sel=document.createElement("select");sel.className="input";sel.style.width="auto";[["menu","Menu"],["footer","Bas de page"],["none","Hors menu"]].forEach(([v,n])=>sel.append(new Option(n,v)));sel.value=p.placement;
 sel.addEventListener("change",()=>{p.placement=sel.value;touch();refresh()});right.append(sel);div.append(name,right);host.append(div);
}
function showSettings(root){
 const panel=U.make("section","panel");panel.append(U.make("h2","","Informations du site"),field("Nom du site",state.title,v=>state.title=v.slice(0,100)),field("Petite phrase sous le nom",state.tagline,v=>state.tagline=v.slice(0,160)));
 panel.append(U.make("p","muted","Aucun membre, aucune célébration, aucune catégorie ni langue à gérer."));root.append(panel);
 const sessions=U.make("section","panel");sessions.append(U.make("h3","","Accès à l'administration"),U.make("p","muted",remote?"L'accès est protégé par le Worker Cloudflare indépendant.":"Mode local : aucun accès privé aux fichiers du serveur n'est disponible."));
 if(remote)sessions.append(button("Se déconnecter",()=>{token="";sessionStorage.removeItem(TOKEN_KEY);showLogin()}));root.append(sessions);
}
function showMedia(root){
 const panel=U.make("section","panel"),heading=U.make("div","row space");heading.append(U.make("h2","","Médiathèque privée"));
 if(remote){const input=document.createElement("input");input.type="file";input.accept="image/*,audio/mpeg,audio/wav,application/pdf,video/mp4";input.multiple=true;input.hidden=true;input.id="upload-files";
 const label=button("＋ Importer des fichiers",()=>input.click(),"btn primary");input.addEventListener("change",async()=>{for(const f of input.files){try{await upload(f)}catch(e){notice("Import échoué : "+e.message,true);break}}input.value=""});
 heading.append(label,input)}
 panel.append(heading);
 const help=U.make("p","muted",remote?"Médias stockés dans le R2 d'Espace Jeunesse uniquement. Les fichiers non utilisés sont ceux qui ne figurent sur aucune page, y compris en brouillon.":"La médiathèque Cloudflare sera active après connexion du nouveau Worker. Aucun fichier Célébrations n'est importé.");panel.append(help);
 const prog=U.make("div","",null);prog.id="upload-status";panel.append(prog);
 const tabs=U.make("div","tabs"),options=[["images","Images"],["audios","Audios"],["videos","Vidéos"],["documents","Documents"],["unused","Inutilisés"]];
 options.forEach(([id,title])=>tabs.append(button(title,()=>{mediaTab=id;refresh()},mediaTab===id?"btn small active":"btn small")));panel.append(tabs);
 const list=U.make("div","media-grid");const filter={
 images:m=>m.type.startsWith("image/"),audios:m=>m.type.startsWith("audio/"),videos:m=>m.type.startsWith("video/"),documents:m=>!m.type.startsWith("image/")&&!m.type.startsWith("audio/")&&!m.type.startsWith("video/"),
 unused:m=>!U.isMediaReference(state,m.id)
 };
 const items=media.filter(filter[mediaTab]);
 if(!items.length)panel.append(U.make("p","box-empty","Aucun fichier dans cette rubrique."));
 items.forEach(m=>{
  const c=U.make("div","media-card"),url=U.mediaUrl({mediaId:m.id});
  if(m.type.startsWith("image/")){const img=document.createElement("img");img.alt=m.name;img.src=url;c.append(img)}
  else if(m.type.startsWith("audio/")){const a=document.createElement("audio");a.controls=true;a.preload="metadata";a.src=url;c.append(a)}
  else if(m.type.startsWith("video/")){const v=document.createElement("video");v.controls=true;v.preload="metadata";v.src=url;c.append(v)}
  c.append(U.make("strong","",m.name),U.make("small","muted",(m.size/1048576).toFixed(2)+" Mo"));
  const used=U.isMediaReference(state,m.id);c.append(U.make("div","",used?"Utilisé dans une page":"Inutilisé"));
  const row=U.make("div","row");
  if(url){const a=U.make("a","btn small","Ouvrir");a.href=url;a.target="_blank";a.rel="noopener noreferrer";row.append(a)}
  if(!used&&remote)row.append(button("Supprimer",async()=>{if(!confirm("Supprimer définitivement "+m.name+" ?"))return;try{await request("/api/admin/media/"+encodeURIComponent(m.id),{method:"DELETE"});await loadMedia();refresh()}catch(err){notice(err.message,true)}},"btn small danger"));
  c.append(row);list.append(c);
 });panel.append(list);root.append(panel);
}
async function upload(file){
 if(file.size>200*1024*1024)throw new Error("Limite : 200 Mo par fichier");
 const init=await request("/api/admin/uploads/init",{method:"POST",body:JSON.stringify({name:file.name,type:file.type||"application/octet-stream",size:file.size})});
 const parts=[],chunkSize=8*1024*1024;let uploaded=0;
 for(let start=0,number=1;start<file.size;start+=chunkSize,number++){
   const chunk=file.slice(start,Math.min(file.size,start+chunkSize));
   const result=await request("/api/admin/uploads/"+encodeURIComponent(init.id)+"/part?number="+number,{method:"PUT",body:chunk,headers:{"Content-Type":"application/octet-stream"}});
   parts.push({partNumber:number,etag:result.etag});uploaded+=chunk.size;
   const c=$("upload-status");if(c){c.replaceChildren(U.make("p","","Envoi de "+file.name+" — "+Math.min(99,Math.floor(uploaded/file.size*99))+" %"));const outer=U.make("div","progress-wrap"),bar=U.make("div","progress-bar");bar.style.width=Math.min(99,Math.floor(uploaded/file.size*99))+"%";outer.append(bar);c.append(outer)}
 }
 await request("/api/admin/uploads/"+encodeURIComponent(init.id)+"/complete",{method:"POST",body:JSON.stringify({parts})});
 await loadMedia();refresh();notice("Import de « "+file.name+" » terminé et confirmé par le serveur.");
}
async function loadMedia(){if(!remote){media=[];return}const resp=await request("/api/admin/media");media=resp.media||[]}
async function save(){
 if(!state.pages.length){notice("Créez au moins une page.",true);return}
 if(state.pages.some(p=>!p.title.trim()||!p.slug.trim())){notice("Chaque page doit avoir un nom et une adresse.",true);return}
 if(new Set(state.pages.map(p=>p.slug)).size!==state.pages.length){notice("Deux pages ont la même adresse.",true);return}
 const btn=$("save-btn");btn.disabled=true;
 try{
  if(remote){const resp=await request("/api/admin/state",{method:"PUT",body:JSON.stringify({state,version})});version=resp.version}
  else localStorage.setItem(KEY,JSON.stringify(state));
  dirty=false;lastSnapshot=JSON.stringify(state);lastEditAt=0;refresh();notice(remote?"Pages enregistrées dans le nouveau Cloudflare Espace Jeunesse.":"Aperçu enregistré uniquement sur cet appareil (non publié).");
 }catch(err){notice("Enregistrement impossible : "+err.message,true)}finally{btn.disabled=false}
}
function showGuide(root){
 const panel=U.make("section","panel");
 panel.append(U.make("h2","","Mode d'emploi — Espace Jeunesse"));
 const steps=[
  "Pages : sélectionnez « ＋ Nouvelle page » pour créer une page.",
  "Le bouton ＋ BLEU ajoute une zone entière dans la page : bloc simple, deux colonnes, image et document, vidéo, audio ou PDF.",
  "Le bouton ＋ VERT, situé dans chaque zone ou colonne, ajoute un élément : titre, texte, image, bouton, vidéo, audio ou séparateur.",
  "Touchez un élément pour le modifier, le déplacer, le dupliquer ou le masquer. Avec un bouton, vous pouvez joindre un PDF depuis la médiathèque.",
  "Médiathèque (administration) : importez des fichiers, puis choisissez-les dans les blocs. La rubrique « Inutilisés » regroupe ceux qui ne sont employés dans aucune page, y compris dans les brouillons.",
  "Menu : les pages peuvent figurer dans le menu, dans le pied de page ou hors menu. Modifiez leur ordre dans la rubrique Menu.",
  "Visibilité : Brouillon et Masquée ne sont pas visibles des visiteurs. Publiée rend la page accessible sur le site.",
  "Aperçu du brouillon permet de vérifier votre travail. Enregistrer sauvegarde le contenu. Voir le site ouvre la version publique.",
  "L'enregistrement en ligne dépend des nouvelles ressources Cloudflare indépendantes d'Espace Jeunesse."
 ];
 const list=U.make("ol","",null);
 for(const step of steps)list.append(U.make("li","",step));
 list.style.cssText="padding:12px 32px;line-height:1.9";panel.append(list);root.append(panel);
}
function showPreview(root){
 const p=current(),panel=U.make("section","panel");
 panel.append(U.make("h2","","Aperçu du brouillon : "+(p?.title||"")));
 panel.append(U.make("p","muted","Cet aperçu ne publie rien. Le bouton Enregistrer conserve vos modifications."));
 if(!p){root.append(panel);return}
 const article=U.make("article","preview-box site-paper-preview");
 for(const block of p.blocks||[]){
  const element=window.EJPageRender?.drawBlock(block);
  if(element)article.append(element);
 }
 if(!article.childNodes.length)article.append(U.make("p","muted","La page est vide."));
 panel.append(article);root.append(panel);
}
async function load(){
 try{
  if(remote){const resp=await request("/api/admin/state");state=U.cleanSite(resp.state);version=resp.version;await loadMedia()}
  else{const saved=localStorage.getItem(KEY);state=U.cleanSite(saved?JSON.parse(saved):await(await fetch("data/site.json")).json())}
  selected=state.pages.some(p=>p.id===selected)?selected:state.homeId;
  dirty=false;preview=false;undoHistory=[];lastSnapshot=JSON.stringify(state);lastEditAt=0;shell();refresh();
 }catch(err){if(remote&& !token)return;if(remote){showLogin();return} $("app").textContent="Impossible d'ouvrir l'éditeur : "+err.message}
}
if(remote){if(token)load();else showLogin()}else load();
})();