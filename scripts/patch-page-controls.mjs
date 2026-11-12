/* Espace Jeunesse : seule extension autorisée au véritable éditeur.
   Préserve tous les composants Célébrations ; remplace la gestion complexe
   des publics par les 3 statuts simples des pages publiques. */
import {readFileSync,writeFileSync} from "node:fs";
const path="assets/celebrations-editor-verbatim.js";
let source=readFileSync(path,"utf8");
const old="if(IS_STAGE&&!privateEdit&&!preview&&['page','celebration'].includes(p.group)){";
if(source.split(old).length!==2)throw Error("Les réglages de pages du moteur source ont changé.");
const ui=`
 if(window.__EJ_PAGES_ONLY__&&!preview&&p.group==='page'){
  const row=n('div','editor-language-row m020-settings');
  row.append(n('strong','','Réglages de la page'));
  const nameField=n('label','editor-language-choice m024-page-name','Nom de la page');
  const nameInput=n('input');nameInput.type='text';nameInput.maxLength=95;nameInput.value=p.name;
  nameInput.setAttribute('aria-label','Renommer cette page');
  nameInput.onchange=()=>{
   const name=nameInput.value.trim().slice(0,95);
   if(!name){nameInput.value=p.name;return}
   p.name=name;mark();render();
  };
  nameField.append(nameInput);row.append(nameField);
  const visLabel=n('label','editor-language-choice','Visibilité');
  const vis=n('select');vis.setAttribute('aria-label','Visibilité de la page');
  for(const [value,label] of [['draft','Brouillon'],['published','Publiée'],['hidden','Masquée']]){
   const o=n('option','',label);o.value=value;vis.append(o);
  }
  vis.value=['draft','hidden','published'].includes(p.visibility)?p.visibility:'published';
  vis.onchange=()=>{p.visibility=vis.value;mark();render()};
  visLabel.append(vis);row.append(visLabel);
  const placeLabel=n('label','editor-language-choice','Emplacement');
  const place=n('select');place.setAttribute('aria-label','Emplacement de la page');
  for(const [value,label] of [['menu','Menu principal'],['footer','Bas de page'],['none','Hors menu']]){
   const option=n('option','',label);option.value=value;place.append(option);
  }
  place.value=['menu','footer','none'].includes(p.placement)?p.placement:'menu';
  place.onchange=()=>{p.placement=place.value;mark();render()};
  placeLabel.append(place);row.append(placeLabel);
  row.append(b('↑',()=>{const position=db.pages.indexOf(p);if(position>0){db.pages.splice(position,1);db.pages.splice(position-1,0,p);mark();render()}},'sm'));
  row.append(b('↓',()=>{const position=db.pages.indexOf(p);if(position<db.pages.length-1){db.pages.splice(position,1);db.pages.splice(position+1,0,p);mark();render()}},'sm'));
  if(p.id!==db.siteHomeId)row.append(b('Définir comme accueil',()=>{db.siteHomeId=p.id;mark();render()},'sm'));
  row.append(b('Dupliquer',()=>{
   const copy=clone(p);copy.id='neutral-'+crypto.randomUUID();
   copy.name=p.name+' (copie)';copy.visibility='draft';copy.blocks=clone(p.blocks||[]);
   db.pages.splice(db.pages.indexOf(p)+1,0,copy);id=copy.id;mark();render();
  },'sm'));
  if(p.id!==db.siteHomeId)row.append(b('Supprimer',async ()=>{
   if(!(await siteConfirm('Supprimer cette page ?')))return;
   const position=db.pages.indexOf(p);
   if(position>=0)db.pages.splice(position,1);
   id=db.pages.find(q=>q.group==='page')?.id||'accueil';mark();render();
  },'sm danger'));
  right.append(row);
 }
`;
source=source.replace(old,ui+old);
writeFileSync(path,source);
console.log("Extension pages seules appliquée au véritable pageWorkspace.");
