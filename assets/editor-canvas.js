/* Editeur visuel de pages. Classes d'origine Célébrations :
   canvas-wrap, canvas, block, tools, ed, section-insert, section-add-blue. */
(function(){
"use strict";
const U=window.EJ;
function blockType(type){return U.typeLabel[type]||type}
function blank(type){return {id:U.uuid(),type,text:"",url:"",align:"left",left:"",right:""}}
function editable(tag,value,oninput,label){
 const el=U.make(tag,"ed",value||"");
 el.contentEditable="true";el.setAttribute("role","textbox");el.setAttribute("aria-label",label);
 el.setAttribute("spellcheck","true");
 el.addEventListener("input",()=>oninput(el.innerText.replace(/\r/g,"")));
 return el;
}
function getVideoEmbed(url){return U.youtubeEmbed(url)}
function image(block,url){
 const img=document.createElement("img");img.src=url;img.alt=block.alt||block.caption||"Illustration";img.loading="lazy";img.style.cssText="width:100%;height:auto;max-height:450px;object-fit:contain;border-radius:8px";return img;
}
function mediaBlock(block,root){
 const url=U.mediaUrl(block);
 if(!url){
   root.append(U.make("p","hint","Fichier à choisir dans « Réglages détaillés des blocs » ou dans la médiathèque."));
   return;
 }
 if(block.type==="image"){const fig=U.make("figure","trial-figure");fig.append(image(block,url));if(block.caption)fig.append(U.make("figcaption","",block.caption));root.append(fig);return}
 if(block.type==="audio"){
   if(block.text)root.append(U.make("strong","",block.text));
   const player=U.make("audio","");player.src=url;player.controls=true;player.preload="metadata";player.style.cssText="width:100%;margin-top:8px";root.append(player);return
 }
 if(block.type==="video"){
   const embedded=getVideoEmbed(url);
   if(embedded){const i=U.make("iframe","");i.src=embedded;i.title=block.text||"Vidéo";i.loading="lazy";i.allowFullscreen=true;i.style.cssText="width:100%;aspect-ratio:16/9;border:0";root.append(i)}
   else if(/\.(mp4|webm|ogg)(?:$|\?)/i.test(url)){const video=U.make("video","");video.controls=true;video.src=url;video.style.maxWidth="100%";root.append(video)}
   else{const a=U.make("a","trial-button","Voir la vidéo");a.href=url;a.rel="noopener noreferrer";a.target="_blank";root.append(a)}
   return;
 }
 const link=U.make("a","trial-button",(block.type==="document"?"📄 ":"")+String(block.text||"Ouvrir"));
 link.href=url;link.target="_blank";link.rel="noopener noreferrer";
 link.addEventListener("click",e=>e.preventDefault());
 root.append(link);
}
function insertAt(page,index,update,refresh){
 const row=U.make("div","ej-insert section-insert");
 const add=U.make("button","section-add-blue","+");add.type="button";
 add.setAttribute("aria-label","Ajouter un élément ici");add.title="Ajouter un élément";
 const options=U.make("div","ej-insert-options");options.hidden=true;
 add.addEventListener("click",()=>{options.hidden=!options.hidden;add.setAttribute("aria-expanded",String(!options.hidden))});
 for(const [type,label] of Object.entries(U.typeLabel)){
  const b=U.make("button","btn sm","＋ "+label);b.type="button";
  b.addEventListener("click",()=>{page.blocks.splice(index,0,blank(type));update();refresh()});
  options.append(b);
 }
 row.append(add,options);return row;
}
function build(page,ctx){
 const wrap=U.make("div","canvas-wrap ej-editor-wrap");
 const canvas=U.make("div","canvas");wrap.append(canvas);
 const heading=U.make("div","kicker","Espace Jeunesse");
 const rule=U.make("div","rule");canvas.append(heading,rule);
 canvas.append(insertAt(page,0,ctx.mark,ctx.refresh));
 page.blocks.forEach((block,index)=>{
  const row=U.make("section","block ej-visual-block");
  row.dataset.id=block.id;row.dataset.kind=block.type;row.draggable=false;
  row.setAttribute("aria-label",blockType(block.type));
  row.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",String(index));e.dataTransfer.effectAllowed="move";row.classList.add("is-dragging")});
  row.addEventListener("dragend",()=>row.classList.remove("is-dragging"));
  row.addEventListener("dragover",e=>{e.preventDefault();e.dataTransfer.dropEffect="move"});
  row.addEventListener("drop",e=>{
   e.preventDefault();e.stopPropagation();
   const from=Number(e.dataTransfer.getData("text/plain"));
   if(!Number.isInteger(from)||from<0||from>=page.blocks.length||from===index)return;
   const [moved]=page.blocks.splice(from,1);page.blocks.splice(index,0,moved);
   ctx.mark();ctx.refresh();
  });
  row.addEventListener("click",()=>row.classList.add("is-selected"));
  const tools=U.make("div","tools ej-canvas-tools");
  const b=(name,title,fn,danger=false)=>{
   const el=U.make("button",danger?"danger":"",name);el.type="button";el.title=title;el.setAttribute("aria-label",title);
   el.addEventListener("click",e=>{e.stopPropagation();fn()});tools.append(el);
  };
  b("↕","Glisser ou utiliser les flèches pour déplacer cet élément",()=>row.classList.add("is-selected"));
  const grip=tools.querySelector("button");if(grip){grip.draggable=true;grip.classList.add("ej-drag-handle")};
  b("↑","Monter",()=>{if(index>0){[page.blocks[index-1],page.blocks[index]]=[page.blocks[index],page.blocks[index-1]];ctx.mark();ctx.refresh()}});
  b("↓","Descendre",()=>{if(index<page.blocks.length-1){[page.blocks[index+1],page.blocks[index]]=[page.blocks[index],page.blocks[index+1]];ctx.mark();ctx.refresh()}});
  b("⧉","Dupliquer",()=>{const copy=U.clone(block);copy.id=U.uuid();page.blocks.splice(index+1,0,copy);ctx.mark();ctx.refresh()});
  b("✕","Supprimer",()=>{if(!confirm("Supprimer cet élément de la page ?"))return;page.blocks.splice(index,1);ctx.mark();ctx.refresh()},true);
  row.append(tools);
  const body=U.make("div","ej-canvas-content");
  if(block.type==="heading"){
   const h=["h1","h2","h3"].includes(block.level)?block.level:"h1";
   const el=editable(h,block.text,v=>{block.text=v;ctx.mark()},"Modifier le titre");
   el.classList.add("page-title");el.style.fontSize=h==="h1"?"30px":h==="h2"?"25px":"20px";
   body.append(el);
  }else if(block.type==="text"){
   body.append(editable("p",block.text,v=>{block.text=v;ctx.mark()},"Modifier le texte"));
  }else if(block.type==="columns"){
   const cols=U.make("div","trial-content-columns ej-two-columns");
   [["left","Colonne de gauche"],["right","Colonne de droite"]].forEach(([key,label])=>{
    const col=U.make("div","trial-content-column");
    col.append(editable("p",block[key],v=>{block[key]=v;ctx.mark()},label));cols.append(col)
   });body.append(cols);
  }else if(block.type==="divider"){
   const line=U.make("hr","trial-custom-divider");line.style.cssText="height:1px;width:60%;border:0;background:#858c94;margin:16px auto";body.append(line);
  }else mediaBlock(block,body);
  if(block.align==="center")body.style.textAlign="center";
  if(block.align==="right")body.style.textAlign="right";
  row.append(body);canvas.append(row,insertAt(page,index+1,ctx.mark,ctx.refresh));
 });
 return wrap;
}
window.EJCanvas={build};
})();
