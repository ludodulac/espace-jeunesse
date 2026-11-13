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
  // Ce bandeau conserve l'éditeur Célébrations d'origine et accueille ses
  // trois VRAIS boutons d'action, déplacés par render() sans les cloner.
  const row=n('div','editor-language-row m020-settings ej-page-settings');
  row.setAttribute('aria-label','Réglages de la page et actions d’édition');
  const head=n('div','ej-page-settings-head');
  head.append(n('strong','ej-settings-heading','Réglages de la page'));
  const details=n('details','ej-page-settings-details');
  // Par défaut, les champs restent accessibles sans occuper la hauteur.
  details.open=window.__EJ_SETTINGS_EXPANDED__===true;
  details.addEventListener('toggle',()=>{window.__EJ_SETTINGS_EXPANDED__=details.open});
  const toggle=n('summary','','⚙');
  toggle.setAttribute('aria-label','Afficher ou masquer le nom, la visibilité et l’emplacement de la page');
  toggle.title='Réglages de la page';
  details.append(toggle);head.append(details);
  head.append(n('div','ej-page-toolbar-slot'));
  row.append(head);
  const fields=n('div','ej-page-settings-fields');
  const nameField=n('label','editor-language-choice m024-page-name','Nom de la page');
  const nameInput=n('input');nameInput.type='text';nameInput.maxLength=95;nameInput.value=p.name;
  nameInput.setAttribute('aria-label','Renommer cette page');
  nameInput.onchange=()=>{
   const name=nameInput.value.trim().slice(0,95);
   if(!name){nameInput.value=p.name;return}
   p.name=name;window.__EJ_SETTINGS_EXPANDED__=true;mark();render();
  };
  nameField.append(nameInput);fields.append(nameField);
  const visLabel=n('label','editor-language-choice','Visibilité');
  const vis=n('select');vis.setAttribute('aria-label','Visibilité de la page');
  for(const [value,label] of [['draft','Brouillon'],['published','Publiée'],['hidden','Masquée']]){
   const o=n('option','',label);o.value=value;vis.append(o);
  }
  vis.value=['draft','hidden','published'].includes(p.visibility)?p.visibility:'draft';
  vis.onchange=()=>{p.visibility=vis.value;window.__EJ_SETTINGS_EXPANDED__=true;mark();render()};
  visLabel.append(vis);fields.append(visLabel);
  const placeLabel=n('label','editor-language-choice','Emplacement');
  const place=n('select');place.setAttribute('aria-label','Emplacement de la page');
  for(const [value,label] of [['menu','Menu principal'],['footer','Bas de page'],['none','Hors menu']]){
   const option=n('option','',label);option.value=value;place.append(option);
  }
  place.value=['menu','footer','none'].includes(p.placement)?p.placement:'menu';
  place.onchange=()=>{p.placement=place.value;window.__EJ_SETTINGS_EXPANDED__=true;mark();render()};
  placeLabel.append(place);fields.append(placeLabel);
  details.append(fields);
  right.append(row);
 }
`;
source=source.replace(old,ui+old);

const pageRowsAnchor="   list.append(row);\n  }\n  attachPagePublicationControls(list,'page');side.append(list);";
if(source.split(pageRowsAnchor).length!==2)throw Error("Le moteur original a changé dans la liste des pages.");
source=source.replace(pageRowsAnchor,"   // Espace Jeunesse : statuts visibles pour TOUTES les pages, même hors\n   // de l'environnement de préproduction Célébrations.\n   if(window.__EJ_PAGES_ONLY__&&!preview){\n    row.classList.add('ej-page-status-row');\n    const state=['published','draft','hidden'].includes(q.visibility)?q.visibility:'draft';\n    const labels={published:'Publiée sur le site',draft:'Brouillon, non publié',hidden:'Masquée aux visiteurs'};\n    const badge=n('span','inline-page-state state-'+state);\n    badge.setAttribute('role','img');badge.setAttribute('aria-label',labels[state]);\n    badge.title=labels[state];row.append(badge);\n    const actions=n('details','page-options'),summary=n('summary','','⋯');\n    summary.setAttribute('aria-label','Gérer la page '+q.name);\n    const menu=n('div','page-options-menu');\n    const statusField=n('label','editor-language-choice','Visibilité');\n    const visibility=n('select');\n    visibility.setAttribute('aria-label','Visibilité de '+q.name);\n    for(const [value,label] of [['published','Publiée'],['draft','Brouillon'],['hidden','Masquée']]){\n     const option=n('option','',label);option.value=value;visibility.append(option);\n    }\n    visibility.value=state;\n    visibility.onchange=()=>{q.visibility=visibility.value;mark();render()};\n    statusField.append(visibility);menu.append(statusField);\n    const same=()=>editorPageModel.groupPages(db.pages,group),at=same().findIndex(x=>x.id===q.id);\n    const up=b('↑ Monter',()=>{\n     const current=same(),i=current.findIndex(x=>x.id===q.id);\n     if(i>0){const before=db.pages.indexOf(current[i-1]),pos=db.pages.indexOf(q);\n      db.pages.splice(pos,1);db.pages.splice(before,0,q);mark();render();}\n    },'sm');\n    up.disabled=at===0;menu.append(up);\n    const down=b('↓ Descendre',()=>{\n     const current=same(),i=current.findIndex(x=>x.id===q.id);\n     if(i>=0&&i<current.length-1){const next=db.pages.indexOf(current[i+1]),pos=db.pages.indexOf(q);\n      db.pages.splice(pos,1);db.pages.splice(next,0,q);mark();render();}\n    },'sm');\n    down.disabled=at===same().length-1;menu.append(down);\n    if(q.id!==db.siteHomeId){\n     menu.append(b('Définir comme accueil',()=>{db.siteHomeId=q.id;mark();render()},'sm'));\n    }\n    menu.append(b('Dupliquer',()=>{\n     const copy=clone(q);copy.id='neutral-'+crypto.randomUUID();\n     copy.name=q.name+' (copie)';copy.visibility='draft';\n     copy.blocks=clone(q.blocks||[]);\n     db.pages.splice(db.pages.indexOf(q)+1,0,copy);\n     id=copy.id;mark();render();\n    },'sm'));\n    if(q.id!==db.siteHomeId){\n     menu.append(b('Supprimer la page',async()=>{\n      if(!(await siteConfirm('Supprimer la page « '+q.name+' » ?')))return;\n      db.pages.splice(db.pages.indexOf(q),1);\n      id=db.pages.find(x=>x.group==='page')?.id||'accueil';\n      mark();render();\n     },'sm danger'));\n    }\n    actions.append(summary,menu);row.append(actions);\n   }\n"+pageRowsAnchor);
const listAppend="attachPagePublicationControls(list,'page');side.append(list);";
if(source.split(listAppend).length!==2)throw Error("La liste des pages a changé.");
const legend=`if(window.__EJ_PAGES_ONLY__&&!preview){
 const legend=n('div','ej-page-status-legend');
 for(const [name,colour] of [['Publiée','published'],['Brouillon','draft'],['Masquée','hidden']]){
  const entry=n('span'),dot=n('i','ej-legend-dot state-'+colour);
  dot.setAttribute('aria-hidden','true');entry.append(dot,document.createTextNode(name));legend.append(entry);
 }
 side.append(legend);
}`;
source=source.replace(listAppend,listAppend+"\n  "+legend);


const desktopFlyoutAnchor="    actions.append(summary,menu);row.append(actions);";
if(source.split(desktopFlyoutAnchor).length!==2)throw Error("Menu des pages d'origine modifié : impossible d'ouvrir le panneau flottant.");
source=source.replace(desktopFlyoutAnchor,"\n    // Sur ordinateur, la liste peut défiler sans jamais couper le menu.\n    // L'API Popover affiche les actions au premier plan, hors du panneau.\n    if(window.matchMedia('(min-width:1051px)').matches&&typeof menu.showPopover==='function'){\n     menu.classList.add('ej-page-flyout');\n     menu.setAttribute('popover','auto');\n     menu.setAttribute('role','group');\n     menu.setAttribute('aria-label','Actions pour la page '+q.name);\n     actions.addEventListener('toggle',()=>{\n      if(!actions.open){\n       if(menu.matches(':popover-open'))menu.hidePopover();\n       return;\n      }\n      document.querySelectorAll('.ej-page-flyout:popover-open').forEach(open=>{\n       if(open!==menu)open.hidePopover();\n      });\n      menu.showPopover();\n      const anchor=summary.getBoundingClientRect();\n      const bounds=menu.getBoundingClientRect();\n      const left=Math.max(12,Math.min(anchor.right+12,innerWidth-bounds.width-12));\n      const top=Math.max(12,Math.min(anchor.top-14,innerHeight-bounds.height-12));\n      menu.style.setProperty('left',left+'px','important');\n      menu.style.setProperty('top',top+'px','important');\n     });\n     menu.addEventListener('toggle',event=>{\n      if(event.newState==='closed'&&actions.open)actions.open=false;\n     });\n    }\n"+desktopFlyoutAnchor);

// La barre d'outils d'origine doit survivre à chaque render() : le composant
// réglages de page est reconstruit à chaque changement de page.
const ejRenderAnchor="function render(){\n if(!adminMembersEnabled";
if(source.split(ejRenderAnchor).length!==2)throw Error("Le moteur source a changé dans render().");
source=source.replace(ejRenderAnchor,"function render(){\n const ejToolbar=document.querySelector('#ej-original-shell .topbar');\n const ejContent=document.querySelector('#ej-original-shell .content');\n // Sauver la barre du DOM avant que le moteur ne remplace #workspace :\n // conserver les boutons, leurs onclick et la pile Undo du client original.\n if(ejToolbar&&ejContent&&ejToolbar.parentElement!==ejContent)ejContent.prepend(ejToolbar);\n if(!adminMembersEnabled");
const ejRenderTail=" for(const key of ['save-btn','preview-btn','undo-btn','status']){";
if(source.split(ejRenderTail).length!==2)throw Error("La fin de render() a changé.");
source=source.replace(ejRenderTail," if(window.__EJ_PAGES_ONLY__&&!preview&&['pages','footer'].includes(tab)){\n  const slot=document.querySelector('#workspace .ej-page-settings .ej-page-toolbar-slot');\n  if(slot&&ejToolbar)slot.append(ejToolbar);\n }\n for(const key of ['save-btn','preview-btn','undo-btn','status']){");

// L'extension de survol est ajoutée à la liste des pages côté éditeur
// sans modifier les interactions tactile/clavier du moteur original.
const ejHoverAnchor="    actions.append(summary,menu);row.append(actions);";
if(source.split(ejHoverAnchor).length!==2)throw Error("Le menu des pages a changé.");
source=source.replace(ejHoverAnchor,"    // Souris : survol des trois points = ouverture immédiate.\n    // Clic/tap et navigation clavier continuent à fonctionner.\n    if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){\n     let closeTimer=0;\n     const cancelClose=()=>clearTimeout(closeTimer);\n     const closeLater=()=>{\n      cancelClose();\n      closeTimer=window.setTimeout(()=>{\n       if(!summary.matches(':hover')&&!menu.matches(':hover')&&!actions.matches(':focus-within'))\n        actions.open=false;\n      },260);\n     };\n     summary.addEventListener('pointerenter',event=>{\n      if(event.pointerType==='touch')return;\n      cancelClose();\n      if(!actions.open)actions.open=true;\n     });\n     actions.addEventListener('pointerenter',cancelClose);\n     actions.addEventListener('pointerleave',closeLater);\n     menu.addEventListener('pointerenter',cancelClose);\n     menu.addEventListener('pointerleave',closeLater);\n    }\n"+ejHoverAnchor);

writeFileSync(path,source);
console.log("Extension pages seules appliquée au véritable pageWorkspace.");
