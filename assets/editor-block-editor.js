/* Composition fidèle : + bleu = bloc/zone ; + vert = élément dans la zone.
   DOM, classes, disposition et menus issus de l'éditeur Célébrations. */
(function(){
"use strict";
const U=window.EJ,S=window.EJSections;
let selectedId=null;
const btn=S.btn;
function update(ctx){ctx.mark();ctx.refresh()}
function addZone(page,index,kind,ctx){
 page.blocks.splice(index,0,S.preset(kind));
 selectedId=null;update(ctx);
}
function blue(page,index,ctx){
 const wrap=U.make("div","section-insert"),menu=U.make("div","section-insert-choices");
 wrap.dataset.insertIndex=String(index);menu.hidden=true;
 const toggle=btn("＋",e=>{e.stopPropagation();S.popup(menu,toggle,"Ajouter un bloc")},"section-add-blue");
 toggle.setAttribute("aria-expanded","false");toggle.title="Ajouter une zone";
 toggle.setAttribute("aria-label","Ajouter une zone");
 for(const [label,kind] of [
  ["Bloc seul","single"],["Deux colonnes","columns"],["Ressource : image + document","resource"],
  ["Vidéo : titre + lecteur","video"],["Lecteur audio","audio"],["Document : titre + PDF","documents"],
  ["Trait de séparation","divider"]
 ])menu.append(btn(label,()=>addZone(page,index,kind,ctx),"btn sm"));
 menu.addEventListener("click",e=>e.stopPropagation());wrap.append(toggle,menu);return wrap;
}
function chooseTitle(element,ctx){
 const input=U.make("span","ed",element.text||"");
 input.contentEditable="true";input.setAttribute("role","textbox");
 input.setAttribute("aria-label","Modifier le contenu");
 input.setAttribute("spellcheck","true");
 input.addEventListener("input",()=>{
  element.text=input.innerText.replace(/\r/g,"");ctx.mark();
 });
 return input;
}
function mediaInput(element,ctx){
 const mount=U.make("div","block-edit-actions ej-element-properties");
 const text=element.type==="document"?"PDF":element.type==="image"?"Image":element.type==="audio"?"Audio":element.type==="video"?"Vidéo":"Lien";
 const choose=btn("▧ Choisir dans la médiathèque",()=>{
  S.mediaPicker(element.type,ctx,m=>{
   element.mediaId=m.id;element.url="";update(ctx);
  });
 },"btn sm");
 if(["image","audio","video","document"].includes(element.type))mount.append(choose);
 const label=S.label(text+" — URL",(()=>{const input=document.createElement("input");
  input.type="url";input.className="link-input";input.value=String(element.url||"");
  input.placeholder="https://…";
  input.addEventListener("change",()=>{element.url=input.value;element.mediaId="";update(ctx)});
  return input;
 })());
 mount.append(label);
 if(element.type==="image"){
  const alt=document.createElement("input");alt.type="text";alt.value=element.alt||"";alt.placeholder="Description de l'image";
  alt.addEventListener("change",()=>{element.alt=alt.value;ctx.mark()});mount.append(S.label("Description",alt));
  const caption=document.createElement("input");caption.type="text";caption.value=element.caption||"";caption.placeholder="Légende";
  caption.addEventListener("change",()=>{element.caption=caption.value;ctx.mark()});
  mount.append(S.label("Légende",caption));
 }
 if(["audio","video","document","button"].includes(element.type)){
  const name=document.createElement("input");name.type="text";name.value=element.text||"";
  name.placeholder=element.type==="audio"?"Nom de l'audio":"Texte affiché";
  name.addEventListener("change",()=>{element.text=name.value;update(ctx)});
  mount.append(S.label("Titre / texte affiché",name));
 }
 const url=U.mediaUrl(element);
 if(element.mediaId)mount.append(U.make("span","muted",url?"Fichier sélectionné dans la médiathèque":"Média à choisir"));
 return mount;
}
function formatter(element,ctx,host){
 const bar=U.make("div","formatbar");
 const edit=()=>{ctx.mark();host.style.fontWeight=element.bold?"700":"normal";host.style.fontStyle=element.italic?"italic":"normal";host.style.color=element.color||"";host.style.fontSize=element.fontSize?element.fontSize+"px":""};
 const bold=btn("G",()=>{element.bold=!element.bold;edit()},"btn sm format-button");
 bold.title="Gras";bold.setAttribute("aria-label","Gras");bold.setAttribute("aria-pressed",String(!!element.bold));
 const italic=btn("I",()=>{element.italic=!element.italic;edit()},"btn sm format-button");
 italic.title="Italique";italic.setAttribute("aria-label","Italique");italic.setAttribute("aria-pressed",String(!!element.italic));
 const size=S.select([["","Taille d'origine"],...([12,14,16,18,20,24,28,32,36,42].map(n=>[String(n),n+" px"]))],
  String(element.fontSize||""),v=>{element.fontSize=v?Number(v):0;edit()},"Taille du texte");
 size.className="format-select";
 const color=document.createElement("input");color.type="color";
 color.value=/^#[0-9a-f]{6}$/i.test(element.color||"")?element.color:"#293746";
 color.addEventListener("input",()=>{element.color=color.value;edit()});color.setAttribute("aria-label","Couleur du texte");
 const colored=U.make("label","color-picker","Couleur ");colored.append(color);
 bar.append(bold,italic,size,colored);
 return bar;
}
function showElement(element){
 const type=element.type||"text",url=U.mediaUrl(element),content=U.make("div","ej-content");
 if(["text","heading","event"].includes(type)){
  const tag=type==="heading"?(["h1","h2","h3"].includes(element.level)?element.level:"h2"):type==="event"?"h2":"p";
  const el=chooseTitle(element,showElement.ctx);
  if(type!=="text")el.classList.add("heading");
  if(tag!=="span"){const h=U.make(tag,"",null);h.append(el);content.append(h)}
  else content.append(el);
  el.style.fontWeight=element.bold?"700":"normal";el.style.fontStyle=element.italic?"italic":"normal";
  if(/^#[0-9a-f]{6}$/i.test(element.color||""))el.style.color=element.color;
  if(element.fontSize)el.style.fontSize=element.fontSize+"px";
  content._editor=el;
 }else if(type==="divider"){
  const hr=U.make("hr","trial-custom-divider");hr.style.cssText="border:0;height:1px;width:60%;background:#858c94;margin:14px auto";content.append(hr);
 }else if(type==="image"){
  const photo=U.make("div","picture image-choose");photo.style.cursor="pointer";
  if(url){const img=document.createElement("img");img.src=url;img.alt=element.alt||"";img.loading="lazy";img.style.maxWidth="100%";photo.append(img)}
  else photo.append(U.make("span","muted","Choisir une image dans la médiathèque"));
  photo.addEventListener("click",()=>S.mediaPicker("image",showElement.ctx,m=>{element.mediaId=m.id;element.url="";update(showElement.ctx)}));
  content.append(photo);
  if(element.caption)content.append(U.make("small","",element.caption));
 }else if(type==="audio"){
  const box=U.make("div","trial-audio");
  if(element.text)box.append(U.make("strong","",element.text));
  if(url){const player=U.make("audio","trial-audio-player");player.src=url;player.controls=true;player.preload="metadata";box.append(player)}
  else box.append(U.make("p","muted","Lecteur audio — choisir un MP3"));
  content.append(box);
 }else if(type==="video"){
  const box=U.make("div","editor-video-preview");
  if(url){
   const embedded=U.youtubeEmbed(url);
   if(embedded){const iframe=U.make("iframe","");iframe.src=embedded;iframe.title=element.text||"Vidéo";
     iframe.loading="lazy";iframe.allowFullscreen=true;iframe.style.cssText="width:100%;height:auto;aspect-ratio:16/9;border:0";box.append(iframe)}
   else if(/\.(mp4|webm|ogg)(?:$|\?)/i.test(url)){const video=U.make("video","");video.src=url;video.controls=true;video.preload="metadata";video.style.maxWidth="100%";box.append(video)}
   else box.append(U.make("span","",element.text||"Vidéo liée"));
  }else box.append(U.make("span","","Vidéo à ajouter"));
  content.append(box);
 }else if(type==="document"||type==="button"){
  const link=U.make("span","trial-button",(type==="document"?"📄 ":"")+(element.text||"Ajouter un lien"));
  content.append(link);
 }else if(type==="columns"){
  const c=U.make("div","section-columns");
  for(const key of ["left","right"]){const input=document.createElement("textarea");input.value=element[key]||"";
   input.setAttribute("aria-label",key==="left"?"Colonne gauche":"Colonne droite");
   input.addEventListener("input",()=>{element[key]=input.value;showElement.ctx.mark()});c.append(input)}
  content.append(c);
 }
 return content;
}
function selectElement(row,canvas,id){
 selectedId=id;
 for(const b of canvas.querySelectorAll(".block.is-selected"))b.classList.remove("is-selected");
 row.classList.add("is-selected");
 const parent=row.closest(".content-section");if(parent)parent.classList.add("is-selected");
}
function elementView(element,items,sectionValue,index,page,ctx,canvas){
 const row=U.make("div","block ej-visual-block");row.dataset.id=String(element.id);row.dataset.kind=element.type||"text";
 if(element.hideOnSite)row.classList.add("hidden-on-public");
 if(String(element.id)===selectedId)row.classList.add("is-selected");
 row.style.textAlign=["left","center","right"].includes(element.align)?element.align:"left";
 const tools=U.make("div","tools"),move=(a,b)=>{[items[a],items[b]]=[items[b],items[a]];update(ctx)};
 const tool=(sym,title,fn)=>{const b=btn(sym,e=>{e.stopPropagation();fn()},"");b.title=title;b.setAttribute("aria-label",title);tools.append(b)};
 tool("↑","Monter",()=>{if(index>0)move(index-1,index)});
 tool("↓","Descendre",()=>{if(index<items.length-1)move(index,index+1)});
 if(sectionValue?.layout==="columns"){
  const other=sectionValue.columns[0]===items?1:0;
  tool(other===0?"←":"→","Déplacer dans l'autre colonne",()=>{items.splice(index,1);sectionValue.columns[other].push(element);update(ctx)});
 }
 tool("◉",element.hideOnSite?"Afficher aux visiteurs":"Masquer aux visiteurs",()=>{element.hideOnSite=!element.hideOnSite;update(ctx)});
 tool("⧉","Dupliquer",()=>{const copy=U.clone(element);copy.id=U.uuid();items.splice(index+1,0,copy);selectedId=copy.id;update(ctx)});
 tool("✕","Supprimer",()=>{if(confirm("Supprimer cet élément ?")){items.splice(index,1);selectedId=null;update(ctx)}});
 row.append(tools);
 showElement.ctx=ctx;
 const display=showElement(element);row.append(display);
 if(["heading","text","event"].includes(element.type))row.append(formatter(element,ctx,display._editor));
 if(["image","audio","video","document","button"].includes(element.type))row.append(mediaInput(element,ctx));
 if(["text","heading","event","image","button"].includes(element.type)){
  const bar=U.make("div","block-edit-actions ej-align-actions");
  bar.append(S.label("Alignement",S.select([["left","Gauche"],["center","Centre"],["right","Droite"]],
   element.align||"left",v=>{element.align=v;update(ctx)},"Alignement")));
  if(element.type==="heading")bar.append(S.label("Taille du titre",S.select([["h1","Grand titre"],["h2","Sous-titre"],["h3","Petit titre"]],
    element.level||"h2",v=>{element.level=v;update(ctx)},"Taille du titre")));
  row.append(bar);
 }
 row.addEventListener("click",e=>{
   if(e.target.closest("button,a,input,textarea,select,audio,video"))return;
   selectElement(row,canvas,element.id);
 });
 row.addEventListener("focusin",()=>selectElement(row,canvas,element.id));
 return row;
}
window.EJBlockEditor={elementView,btn};
})();
