/* Réutilise à la lettre les conteneurs d'édition Célébrations :
   canvas > section-insert (bleu) et content-section > section-column-actions (vert).
   Pas de nouvel éditeur en cartes. */
(function(){
"use strict";
const U=window.EJ,S=window.EJSections,B=window.EJBlockEditor,button=S.btn;
function blue(page,index,ctx){
 const wrap=U.make("div","section-insert");
 wrap.dataset.insertIndex=String(index);
 const toggle=button("＋",event=>{event.stopPropagation();S.popup(menu,toggle,"Ajouter un bloc")},"section-add-blue");
 toggle.title="Ajouter une zone";toggle.setAttribute("aria-label","Ajouter une zone");
 toggle.setAttribute("aria-expanded","false");
 const menu=U.make("div","section-insert-choices");menu.hidden=true;
 const options=[["Bloc seul","single"],["Deux colonnes","columns"],
  ["Ressource : image + document","resource"],["Vidéo : titre + lecteur","video"],
  ["Lecteur audio","audio"],["Document : titre + PDF","documents"],
  ["Trait de séparation","divider"]];
 for(const [title,kind] of options){
  menu.append(button(title,()=>{
   const item=S.preset(kind);
   page.blocks.splice(index,0,item);
   ctx.mark();ctx.refresh();
  },"btn sm"));
 }
 menu.addEventListener("click",e=>e.stopPropagation());
 wrap.append(toggle,menu);return wrap;
}
function sectionFrame(wrap,sectionValue){
 const s=sectionValue.style||{},border=["round","square"].includes(s.border)?s.border:"none";
 wrap.dataset.frame=border;
 if(border!=="none"){
  const width=Math.max(1,Math.min(5,Number(s.width)||1));
  wrap.style.border=width+"px solid "+(/^#[0-9a-f]{6}$/i.test(s.color||"")?s.color:"#d7dde5");
  wrap.style.borderRadius=border==="round"?"16px":"0";
 }
 if(s.shadow===true)wrap.style.boxShadow="0 5px 19px #16243329";
}
function column(sectionValue,index,page,ctx,canvas){
 const items=sectionValue.columns[index],cell=U.make("div","section-column");
 cell.dataset.columnIndex=String(index);
 cell.dataset.sectionId=String(sectionValue.id);
 cell.dataset.verticalAlign=sectionValue.columnAlignments?.[index]||"top";
 cell.dataset.buttonLayout=sectionValue.columnButtonLayouts?.[index]||"stack";
 items.forEach((item,i)=>cell.append(B.elementView(item,items,sectionValue,i,page,ctx,canvas)));
 const controls=U.make("div","section-column-actions");
 const menu=U.make("div","section-element-menu");menu.hidden=true;
 const toggle=button("＋",e=>{
  e.stopPropagation();
  S.popup(menu,toggle,"Ajouter un élément à "+(index===0?"gauche":"droite"));
 },"section-add-green");
 toggle.title="Ajouter un élément";
 toggle.setAttribute("aria-label","Ajouter "+(index===0?"à gauche":"à droite"));
 toggle.setAttribute("aria-expanded","false");
 for(const [kind,label] of S.types)menu.append(button(label,()=>{
   const item=S.element(kind);items.push(item);ctx.mark();ctx.refresh();
 },"btn sm"));
 menu.addEventListener("click",e=>e.stopPropagation());
 controls.append(toggle,S.columnGear(sectionValue,index,ctx));
 if(index===0)controls.append(S.gear(sectionValue,ctx));
 controls.append(menu);cell.append(controls);
 return cell;
}
function makeSection(sectionValue,page,index,ctx,canvas){
 if(!Array.isArray(sectionValue.columns))sectionValue.columns=[[],[]];
 while(sectionValue.columns.length<2)sectionValue.columns.push([]);
 const wrap=U.make("div","content-section");wrap.dataset.sectionId=String(sectionValue.id);
 wrap.dataset.layout=sectionValue.layout==="columns"?"columns":"single";
 wrap.dataset.presentation=sectionValue.presentation||"";
 if(sectionValue.hideOnSite)wrap.classList.add("hidden-on-public");
 sectionFrame(wrap,sectionValue);
 const toolbar=U.make("div","section-root-actions");
 const layout=button("▣",()=>{
  sectionValue.layout=sectionValue.layout==="columns"?"single":"columns";ctx.mark();ctx.refresh()
 },"btn sm section-layout-toggle");
 layout.title="Passer à "+(sectionValue.layout==="columns"?"un bloc seul":"deux colonnes");
 layout.setAttribute("aria-label",layout.title);
 toolbar.append(layout);
 toolbar.append(button("↑",()=>{if(index>0){
  [page.blocks[index-1],page.blocks[index]]=[page.blocks[index],page.blocks[index-1]];
  ctx.mark();ctx.refresh();
 }},"btn sm"));
 toolbar.append(button("↓",()=>{if(index<page.blocks.length-1){
  [page.blocks[index+1],page.blocks[index]]=[page.blocks[index],page.blocks[index+1]];
  ctx.mark();ctx.refresh();
 }},"btn sm"));
 toolbar.append(button("⧉",()=>{
  const copy=U.clone(sectionValue);copy.id=U.uuid();
  copy.columns.flat().forEach(x=>x.id=U.uuid());
  page.blocks.splice(index+1,0,copy);ctx.mark();ctx.refresh();
 },"btn sm"));
 toolbar.append(button("✕",()=>{
  if(!confirm("Supprimer cette zone et son contenu ?"))return;
  page.blocks.splice(index,1);ctx.mark();ctx.refresh();
 },"btn sm"));
 wrap.append(toolbar);
 const grid=U.make("div","section-columns");
 if(sectionValue.layout==="columns"){
  grid.append(column(sectionValue,0,page,ctx,canvas),column(sectionValue,1,page,ctx,canvas));
 }else{
  const left=column(sectionValue,0,page,ctx,canvas);
  sectionValue.columns[1].forEach((item,i)=>{
   const el=B.elementView(item,sectionValue.columns[1],sectionValue,i,page,ctx,canvas);
   left.insertBefore(el,left.querySelector(".section-column-actions"));
  });
  grid.append(left);
 }
 wrap.append(grid);
 wrap.append(blue(page,index+1,ctx));
 return wrap;
}
function rootLegacy(page,item,index,ctx,canvas){
 const row=B.elementView(item,page.blocks,null,index,page,ctx,canvas);
 row.classList.add("ej-legacy-root");
 const add=U.make("div","existing-block-add"),menu=U.make("div","existing-block-add-menu");
 const toggle=button("＋",e=>{
  e.stopPropagation();S.popup(menu,toggle,"Ajouter un élément dans ce bloc");
 },"section-add-green existing-block-add-button");
 toggle.title="Ajouter dans ce bloc";toggle.setAttribute("aria-label","Ajouter dans ce bloc");
 menu.hidden=true;
 for(const [kind,label] of S.types){
  menu.append(button(label,()=>{
   const sectionValue=S.section("single",[[item,S.element(kind)],[]]);
   page.blocks.splice(index,1,sectionValue);ctx.mark();ctx.refresh();
  },"btn sm"));
 }
 add.append(toggle,menu);
 row.append(add,blue(page,index+1,ctx));return row;
}
function build(page,ctx){
 const wrap=U.make("div","canvas-wrap"),canvas=U.make("div","canvas");
 wrap.append(canvas);
 canvas.append(blue(page,0,ctx));
 page.blocks.forEach((item,index)=>{
  if(item.type==="section")canvas.append(makeSection(item,page,index,ctx,canvas));
  else canvas.append(rootLegacy(page,item,index,ctx,canvas));
 });
 return wrap;
}
window.EJCanvas={build};
})();
