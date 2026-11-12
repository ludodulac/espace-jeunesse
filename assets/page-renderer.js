/* Rendu de page partagé entre visiteurs et aperçu administrateur.
   Structure visuelle publique identique au moteur de blocs de Célébrations. */
(function(){
"use strict";
const U=window.EJ;
function videoInfo(raw){
 const yt=U.youtubeEmbed(raw);
 if(yt){const id=yt.split("/").pop();return {embed:yt,thumb:"https://i.ytimg.com/vi/"+id+"/hqdefault.jpg"}}
 try{
  const url=new URL(raw),vimeo=/^\/(\d+)(?:\/|$)/.exec(url.pathname);
  if(["vimeo.com","www.vimeo.com"].includes(url.hostname)&&vimeo)
   return {embed:"https://player.vimeo.com/video/"+vimeo[1]};
 }catch{}
 return null;
}
function applyText(el,block){
 if(block.align==="center"||block.align==="right")el.style.textAlign=block.align;
 if(block.bold)el.style.fontWeight="700";
 if(block.italic)el.style.fontStyle="italic";
 if(/^#[a-f0-9]{6}$/i.test(block.color||""))el.style.color=block.color;
 const n=Number(block.fontSize);
 if(Number.isInteger(n)&&n>=10&&n<=72)el.style.fontSize=n+"px";
}
function section(block){
 const outer=U.make("section","trial-content-section");
 const frame=block.style||{},kind=["none","round","square"].includes(frame.border)?frame.border:"none";
 outer.dataset.layout=block.layout==="columns"?"columns":"single";
 outer.dataset.presentation=["resource","video","documents","intro","text"].includes(block.presentation)?block.presentation:"";
 if(kind!=="none"){
  outer.style.border=Math.max(1,Math.min(5,Number(frame.width)||1))+"px solid "+(/^#[a-f0-9]{6}$/i.test(frame.color||"")?frame.color:"#d7dde5");
  outer.style.borderRadius=kind==="round"?"16px":"0";
 }
 if(frame.shadow===true)outer.style.boxShadow="0 5px 19px #16243329";
 const cols=Array.isArray(block.columns)?block.columns:[[],[]];
 if(block.presentation==="documents"){
  const list=U.make("div","trial-document-list");
  for(const item of cols.flat()){
   const child=drawBlock(item);if(child)list.append(child);
  }
  outer.append(list);return outer;
 }
 const grid=U.make("div","trial-content-columns");
 if(block.layout==="columns"){
  for(let index=0;index<2;index++){
   const col=U.make("div","trial-content-column");
   col.dataset.parentPresentation=outer.dataset.presentation;
   col.dataset.verticalAlign=["top","center","bottom"].includes(block.columnAlignments?.[index])?block.columnAlignments[index]:"top";
   col.dataset.buttonLayout=block.columnButtonLayouts?.[index]==="row"?"row":"stack";
   for(const item of cols[index]||[]){const child=drawBlock(item);if(child)col.append(child)}
   grid.append(col);
  }
 }else{
  const col=U.make("div","trial-content-column");
  col.dataset.parentPresentation=outer.dataset.presentation;
  col.dataset.verticalAlign="top";
  col.dataset.buttonLayout=block.columnButtonLayouts?.[0]==="row"?"row":"stack";
  for(const items of cols.slice(0,2))for(const item of items||[]){
   const child=drawBlock(item);if(child)col.append(child);
  }
  grid.append(col);
 }
 outer.append(grid);return outer;
}
function drawBlock(b){
 if(!b||b.hideOnSite===true)return null;
 if(b.type==="section")return section(b);
 const type=b.type||"text",url=U.mediaUrl(b);
 const wrap=U.make("div","site-block "+(b.align==="center"?"center":b.align==="right"?"right":""));
 if(type==="heading"||type==="event"){
  const h=type==="event"?"h2":(["h1","h2","h3"].includes(b.level)?b.level:"h2");
  const el=U.make(h,"trial-heading "+(h==="h1"?"heading-primary":"heading-secondary"),b.text||"");
  applyText(el,b);wrap.append(el);
 }else if(type==="text"){
  const p=U.make("p","trial-paragraph",b.text||"");applyText(p,b);wrap.append(p);
 }else if(type==="columns"){
  const fake={type:"section",layout:"columns",columns:[
   [{type:"text",text:b.left||""}],[{type:"text",text:b.right||""}]]};
  wrap.append(section(fake));
 }else if(type==="image"&&url){
  const figure=U.make("figure","trial-figure"),image=document.createElement("img");
  image.src=url;image.alt=String(b.alt||b.caption||"");image.loading="lazy";
  figure.append(image);
  if(b.caption)figure.append(U.make("figcaption","trial-image-caption",b.caption));
  wrap.append(figure);
 }else if(type==="audio"&&url){
  const box=U.make("div","trial-audio");
  if(b.text)box.append(U.make("strong","",b.text));
  const player=U.make("audio","trial-audio-player");player.src=url;player.preload="metadata";player.controls=true;
  box.append(player);wrap.append(box);
 }else if(type==="video"&&url){
  const box=U.make("div","trial-video"),info=videoInfo(url);
  if(info){
   const play=U.make("button","trial-video-trigger");
   play.type="button";play.setAttribute("aria-label","Lire la vidéo");
   if(info.thumb){
    const image=U.make("img","trial-video-thumb");image.src=info.thumb;image.alt=b.text||"Vidéo";image.loading="lazy";
    play.append(image);
   }
   play.append(U.make("span","trial-video-play","▶"));
   play.addEventListener("click",()=>{
    const frame=U.make("iframe","trial-video-iframe");frame.src=info.embed;
    frame.title=b.text||"Vidéo";frame.loading="lazy";frame.allowFullscreen=true;
    frame.allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    frame.referrerPolicy="strict-origin-when-cross-origin";play.replaceWith(frame);
   });
   box.append(play);
  }else if(/\.(mp4|webm|ogg)(?:$|\?)/i.test(url)){
   const player=U.make("video","trial-video-player");player.src=url;player.preload="metadata";player.controls=true;box.append(player);
  }else{
   const link=U.make("a","trial-site-link","Voir la vidéo");link.href=url;link.rel="noopener noreferrer";link.target="_blank";box.append(link);
  }
  if(b.text)box.append(U.make("div","trial-video-title",b.text));wrap.append(box);
 }else if(type==="document"&&url){
  const a=U.make("a","trial-document","📄 "+(b.text||"Ouvrir le PDF"));
  a.href=url;a.target="_blank";a.rel="noopener noreferrer";wrap.append(a);
 }else if(type==="button"&&url){
  const a=U.make("a","trial-button",b.text||"En savoir plus");a.href=url;
  try{if(new URL(a.href).origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}}catch{}
  wrap.append(a);
 }else if(type==="divider"){
  const hr=U.make("hr","trial-custom-divider");
  hr.style.cssText="height:1px;width:60%;border:0;background:#858c94;margin:18px auto";
  wrap.append(hr);
 }
 return wrap;
}
window.EJPageRender={drawBlock,section};
})();