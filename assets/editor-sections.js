/* Modèle de composition du site source : zone (bleu), éléments dans zone (vert). */
(function(){
"use strict";
const U=window.EJ;
const types=[["heading","Titre"],["image","Image"],["text","Texte"],["event","Titre événement"],["button","Bouton"],["video","Vidéo"],["audio","Lecteur audio"],["divider","Trait de séparation"]];
const btn=(label,fn,css="btn sm")=>{const b=U.make("button",css,label);b.type="button";b.addEventListener("click",fn);return b};
const element=(kind)=>({id:U.uuid(),type:kind,text:kind==="heading"?"Nouveau titre":kind==="event"?"Titre événement":kind==="text"?"Votre paragraphe":kind==="button"?"Mon bouton":"",align:"left",level:kind==="heading"?"h2":"h2",url:"",mediaId:"",left:"",right:"",hideOnSite:false});
const section=(layout="single",columns=[[],[]],presentation="")=>({
 id:U.uuid(),type:"section",layout:layout==="columns"?"columns":"single",
 columns,style:{border:"none",color:"#d7dde5",width:1,shadow:false},presentation,
 columnAlignments:["top","top"],columnButtonLayouts:["stack","stack"],hideOnSite:false
});
function preset(kind){
 if(kind==="resource"){const s=section("columns",[[element("image")],[element("heading"),element("text"),element("button")]],"resource");s.columnAlignments=["center","center"];return s}
 if(kind==="video")return section("single",[[element("heading"),element("video")],[]],"video");
 if(kind==="documents")return section("single",[[element("heading"),element("button")],[]],"documents");
 if(kind==="audio")return section("single",[[element("audio")],[]],"");
 if(kind==="divider")return element("divider");
 return section(kind==="columns"?"columns":"single");
}
const isTouch=()=>window.matchMedia("(max-width:650px), (hover:none), (pointer:coarse)").matches;
function popup(menu,trigger,title){
 if(!isTouch()){
  menu.hidden=!menu.hidden;trigger.setAttribute("aria-expanded",String(!menu.hidden));
  return;
 }
 const previous=document.querySelector("dialog.editor-insert-dialog[open]");
 if(previous)previous.close();
 const dialog=U.make("dialog","editor-insert-dialog");
 dialog.setAttribute("aria-label",title);
 const header=U.make("div","editor-insert-dialog-header");
 header.append(U.make("h3","",title),btn("Fermer",()=>dialog.close(),"editor-insert-dialog-close"));
 const opts=U.make("div","editor-insert-dialog-options");
 const original=menu.parentNode,next=menu.nextSibling;
 menu.hidden=false;opts.append(menu);dialog.append(header,opts);document.body.append(dialog);
 trigger.setAttribute("aria-expanded","true");
 function chosen(event){if(event.target.closest("button"))queueMicrotask(()=>{if(dialog.open)dialog.close()})}
 menu.addEventListener("click",chosen,true);
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
 dialog.addEventListener("close",()=>{
  menu.removeEventListener("click",chosen,true);menu.hidden=true;
  if(original.isConnected)original.insertBefore(menu,next?.parentNode===original?next:null);
  trigger.setAttribute("aria-expanded","false");dialog.remove();
 },{once:true});
 dialog.showModal();
}
function label(name,input){
 const row=U.make("label","",name);row.append(input);return row;
}
function select(choices,current,onchange,aria){
 const s=document.createElement("select");s.setAttribute("aria-label",aria);
 for(const [value,text] of choices)s.append(new Option(text,value));
 s.value=String(current??choices[0]?.[0]??"");
 s.addEventListener("change",()=>onchange(s.value));return s;
}
function gear(sectionValue,ctx){
 const details=U.make("details","section-settings");
 const summary=U.make("summary","","⚙");summary.setAttribute("aria-label","Présentation du bloc");summary.title="Présentation du bloc";
 details.append(summary);
 const fields=U.make("div","section-settings-fields"),st=sectionValue.style||{};
 const edit=()=>{ctx.mark();ctx.refresh()};
 fields.append(label("Présentation",select([
  ["","Classique"],["resource","Ressource : image et texte"],["video","Vidéo"],["documents","Liste de documents"],["intro","Introduction"],["text","Section de texte"]],
  sectionValue.presentation||"",v=>{sectionValue.presentation=v;edit()},"Présentation du bloc")));
 fields.append(label("Cadre",select([["none","Sans cadre"],["round","Cadre arrondi"],["square","Cadre carré"]],
  st.border||"none",v=>{sectionValue.style={...sectionValue.style,border:v};edit()},"Forme du cadre")));
 const color=document.createElement("input");color.type="color";color.value=/^#[a-f0-9]{6}$/i.test(st.color||"")?st.color:"#d7dde5";color.setAttribute("aria-label","Couleur du cadre");
 color.addEventListener("change",()=>{sectionValue.style={...sectionValue.style,color:color.value};edit()});
 fields.append(label("Couleur",color));
 fields.append(label("Épaisseur",select([1,2,3,4,5].map(x=>[String(x),x+" px"]),String(st.width||1),
  v=>{sectionValue.style={...sectionValue.style,width:Number(v)};edit()},"Épaisseur du trait")));
 const shadow=document.createElement("input");shadow.type="checkbox";shadow.checked=st.shadow===true;
 shadow.addEventListener("change",()=>{sectionValue.style={...sectionValue.style,shadow:shadow.checked};edit()});
 fields.append(label("Ombre",shadow));
 fields.append(btn(sectionValue.hideOnSite?"Afficher ce bloc entier":"Masquer ce bloc entier",
  ()=>{sectionValue.hideOnSite=!sectionValue.hideOnSite;edit()},"section-visibility-toggle"));
 details.append(fields);return details;
}
function columnGear(sectionValue,index,ctx){
 const details=U.make("details","section-column-presentation");
 const summary=U.make("summary","","↕");
 summary.title="Disposition de la colonne "+(index===0?"gauche":"droite");details.append(summary);
 const fields=U.make("div","section-column-presentation-fields");
 function setting(name,list,now,fieldName){
  const onChange=v=>{
    sectionValue[fieldName]=Array.isArray(sectionValue[fieldName])?sectionValue[fieldName]:["top","top"];
    sectionValue[fieldName][index]=v;ctx.mark();ctx.refresh();
  };
  fields.append(label(name,select(list,now,onChange,name)));
 }
 if(sectionValue.layout==="columns")setting("Alignement vertical",[["top","Haut"],["center","Centre"],["bottom","Bas"]],
   sectionValue.columnAlignments?.[index]||"top","columnAlignments");
 setting("Disposition des boutons",[["stack","Les uns sous les autres"],["row","Côte à côte"]],
   sectionValue.columnButtonLayouts?.[index]||"stack","columnButtonLayouts");
 details.append(fields);return details;
}
function mediaPicker(kind,ctx,chosen){
 const dialog=U.make("dialog","file-picker-dialog");
 dialog.setAttribute("aria-label","Choisir un fichier");
 const head=U.make("div","image-picker-header");
 head.append(U.make("h2","","Choisir un fichier"),btn("Fermer",()=>dialog.close()));
 dialog.append(head);
 const search=document.createElement("input");search.type="search";search.className="file-picker-search";
 search.placeholder="Rechercher un fichier";search.setAttribute("aria-label","Rechercher un fichier");
 dialog.append(search);
 const tabs=U.make("div","file-picker-tabs"),list=U.make("div","ej-file-picker-results");
 dialog.append(tabs,list);
 let filter=kind==="image"?"images":kind==="audio"?"audios":kind==="video"?"videos":kind==="document"?"documents":"all";
 const filters=[["images","Images"],["audios","Audios"],["videos","Vidéos"],["documents","Documents"],["all","Tous"]];
 const media=ctx.getMedia?.()||[];
 function matchType(m,name){
  const type=String(m.type||m.mime||"");
  return name==="images"?type.startsWith("image/"):name==="audios"?type.startsWith("audio/"):name==="videos"?type.startsWith("video/"):name==="documents"?type==="application/pdf":true;
 }
 function render(){
  tabs.replaceChildren();list.replaceChildren();
  for(const [value,name] of filters){
   const b=btn(name,()=>{filter=value;render()});
   b.setAttribute("aria-pressed",String(value===filter));tabs.append(b);
  }
  const match=media.filter(m=>matchType(m,filter)&&String(m.name||"").toLowerCase().includes(search.value.toLowerCase()));
  if(!match.length)list.append(U.make("p","muted","Aucun fichier correspondant dans la médiathèque d'Espace Jeunesse."));
  for(const m of match){
   const row=btn(String(m.name||"Fichier"),()=>{chosen(m);dialog.close()},"ej-file-picker-row");
   if(m.type?.startsWith("image/")){const image=document.createElement("img");image.src=U.mediaUrl({mediaId:m.id});image.alt="";image.loading="lazy";row.prepend(image)}
   row.append(U.make("small","",((Number(m.size)||0)/1048576).toFixed(2)+" Mo"));
   list.append(row);
  }
 }
 search.addEventListener("input",render);
 render();dialog.addEventListener("close",()=>dialog.remove(),{once:true});
 document.body.append(dialog);dialog.showModal();search.focus();
}
window.EJSections={btn,element,section,preset,popup,label,select,gear,columnGear,mediaPicker,types};
})();