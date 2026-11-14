/* Gestion du catalogue, collections et artisans dans admin.html?shop=1.
 * Utilise la session existante ej-admin-session-v1, aucun mot de passe supplémentaire.
 */
(function(){
"use strict";
if(new URLSearchParams(location.search).get("shop")!=="1")return;
document.body.classList.add("ej-shop-mode");
const root=document.createElement("div");root.id="ej-shop-admin";root.className="ej-shop-admin";
const shell=document.getElementById("ej-original-shell"),content=shell.querySelector(".content");
content.append(root);
const api=String(window.ESPACE_JEUNESSE_CONFIG?.apiBase||"").replace(/[/]$/,"");
const key="ej-admin-session-v1";
let state={version:0,catalog:{collections:[],artisans:[],products:[]}},tab="products",editing=null,loaded=false,message="";
const empty=()=>({collections:[],artisans:[],products:[]});
const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
const button=(text,cb,cl="")=>{const b=node("button",cl,text);b.type="button";b.addEventListener("click",cb);return b};
const url=v=>{try{const u=new URL(String(v||""));return u.protocol==="https:"?u.href:""}catch{return ""}};
const slug=s=>String(s||"").normalize("NFD").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,74);
const labels={products:"Produits",collections:"Collections",artisans:"Artisans"};
const statuses={published:"Publié",draft:"Brouillon",hidden:"Masqué"};
function notice(s,bad=false){message=s;const out=root.querySelector(".sh-alert");if(out){out.textContent=s;out.className="sh-alert"+(bad?" error":"");out.hidden=!s;}}
async function req(path,method="GET",body){
 const token=sessionStorage.getItem(key);if(!token)throw Error("Connectez-vous dans l'administration.");
 const response=await fetch(api+path,{method,mode:"cors",cache:"no-store",headers:{
  Authorization:"Bearer "+token,Accept:"application/json",...(body?{"Content-Type":"application/json"}:{})
 },body:body?JSON.stringify(body):undefined});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const error=Error(data.error||"Erreur "+response.status);error.status=response.status;throw error}
 return data;
}
async function load(){
 if(!api)throw Error("Cloudflare n'est pas connecté.");
 const result=await req("/api/admin/shop");
 state={version:result.version,catalog:result.catalog||empty()};loaded=true;render();
}
function nextId(name,list){
 const base=slug(name)||"creation";let id=base,i=2;
 while(list.some(x=>x.id===id)){id=base+"-"+i++}return id;
}
async function save(next){
 try{
  const r=await req("/api/admin/shop","PUT",{version:state.version,catalog:next});
  state={version:r.version,catalog:next};editing=null;message="✓ Modifications enregistrées.";
  render();
 }catch(e){notice(e.message+(e.status===409?" Rechargez l'administration pour éviter d'écraser d'autres changements.":""),true)}
}
function header(){
 const head=node("div","sh-header"),title=node("div");
 title.append(node("h1","","Boutique"),node("p","","Gérez les vitrines, les fiches produits et leurs créateurs."));
 const site=node("a","sh-link","Voir la boutique ↗");site.href="boutique.html";site.target="_blank";site.rel="noopener noreferrer";
 head.append(title,site);return head;
}
function render(){
 root.replaceChildren(header());
 const alert=node("div","sh-alert",message);alert.hidden=!message;root.append(alert);
 const tabs=node("div","sh-tabs");
 for(const [name,label] of Object.entries(labels))tabs.append(button(label,()=>{tab=name;editing=null;message="";render()},tab===name?"sh-selected":""));
 root.append(tabs);
 if(editing){form();return}
 const tools=node("div","sh-header");
 tools.append(node("h2","",labels[tab]));
 tools.append(button("+ Ajouter "+(tab==="products"?"un produit":tab==="collections"?"une collection":"un artisan"),()=>{
   editing={kind:tab,index:-1};render()
 },"sh-primary"));root.append(tools);
 if(!loaded){root.append(node("p","","Chargement…"));return}
 const items=state.catalog[tab],list=node("div","sh-cards");
 if(!items.length)list.append(node("p","sh-note","Aucune fiche pour l'instant : cliquez sur Ajouter."));
 items.forEach((x,index)=>{
  const card=node("article","sh-card");
  if(x.imageUrl){const img=node("img");img.src=x.imageUrl;img.alt=x.name;img.loading="lazy";img.onerror=()=>img.remove();card.append(img)}
  card.append(node("h3","",x.name));
  const status=node("span","sh-status",statuses[x.status]||(x.partner?"Partenaire":"Sélection"));status.dataset.status=x.status||"";card.append(status);
  if(tab==="products")card.append(node("p","",x.animal+" · "+(state.catalog.artisans.find(a=>a.id===x.artisanId)?.name||"Artisan à compléter")));
  if(tab==="collections")card.append(node("p","",x.description));
  if(tab==="artisans")card.append(node("p","",x.location||x.website||"Coordonnées à compléter"));
  const actions=node("div","sh-actions");
  actions.append(button("Modifier",()=>{editing={kind:tab,index};render()}));
  if(tab==="products"){
   actions.append(button("Dupliquer",async()=>{const next=structuredClone(state.catalog),copy=structuredClone(x);
    copy.id=nextId(x.id+"-copie",next.products);copy.slug=nextId(x.slug+"-copie",next.products.map(p=>({id:p.slug})));
    copy.name=x.name+" (copie)";copy.status="draft";next.products.splice(index+1,0,copy);await save(next)}));
  }
  actions.append(button("Supprimer",async()=>{
   const used=tab==="collections"?state.catalog.products.some(p=>p.collectionId===x.id):
    tab==="artisans"?state.catalog.products.some(p=>p.artisanId===x.id):false;
   if(used){notice("Cette fiche est utilisée par des produits. Réaffectez-les avant sa suppression.",true);return}
   if(!confirm("Supprimer définitivement « "+x.name+" » ?"))return;
   const next=structuredClone(state.catalog);next[tab].splice(index,1);await save(next);
  }));
  card.append(actions);list.append(card);
 });root.append(list);
 root.append(node("p","sh-note","Les produits en brouillon ou masqués ne sont pas visibles dans la boutique publique. Les photos restent hébergées chez leurs auteurs."));
}
function makeField(form,name,label,value,type="text",opts){
 const wrap=node("label",["description","additionalImages"].includes(name)?"sh-span":"");
 wrap.append(document.createTextNode(label));
 let input;
 if(type==="select"){
  input=node("select");for(const [v,text] of opts||[]){const o=node("option","",text);o.value=v;input.append(o)}input.value=value||"";
 }else if(type==="textarea"){input=node("textarea");input.value=value||""}
 else if(type==="checkbox"){wrap.classList.add("sh-check");input=node("input");input.type="checkbox";input.checked=Boolean(value)}
 else{input=node("input");input.type=type;input.value=value??""}
 input.name=name;input.id="sh-"+name;wrap.append(input);form.append(wrap);return input;
}
async function mediaChooser(input,container){
 try{
  const r=await req("/api/admin/media"),items=(r.media||[]).filter(m=>String(m.type||"").startsWith("image/")||m.type==="image").slice(0,80);
  container.replaceChildren();
  if(!items.length){container.append(node("p","sh-note","Aucune image dans la médiathèque."));return}
  const box=node("div","sh-media-list");
  items.forEach(m=>{const b=button("",()=>{input.value=m.url||api+"/media/"+m.id;container.replaceChildren();});
   const img=node("img");img.src=m.url||api+"/media/"+m.id;img.alt=m.name;b.append(img);box.append(b)});
  container.append(box);
 }catch(e){container.textContent=e.message}
}
function form(){
 const prev=editing.index>=0?state.catalog[tab][editing.index]:{};
 root.append(button("← Retour",()=>{editing=null;render()}));
 root.append(node("h2","",editing.index<0?"Ajouter "+(tab==="products"?"un produit":tab==="collections"?"une collection":"un artisan"):"Modifier "+prev.name));
 const form=node("form","sh-form"),fields=node("div","sh-fields");form.append(fields);
 makeField(fields,"name","Nom",prev.name||"");
 if(tab==="collections"){
  makeField(fields,"description","Présentation de la collection",prev.description||"","textarea");
  makeField(fields,"imageUrl","Image de couverture (URL publique)",prev.imageUrl||"","url");
  makeField(fields,"status","Visibilité",prev.status||"draft","select",Object.entries(statuses).map(([a,b])=>[a,b]));
  makeField(fields,"sort","Ordre d'affichage",prev.sort??state.catalog.collections.length+1,"number");
 }else if(tab==="artisans"){
  makeField(fields,"description","Présentation de l'artisan",prev.description||"","textarea");
  makeField(fields,"website","Site de l'artisan",prev.website||"","url");
  makeField(fields,"email","Adresse e-mail (privée)",prev.email||"","email");
  makeField(fields,"location","Ville / région",prev.location||"");
  makeField(fields,"partner","Partenariat effectivement conclu",prev.partner||false,"checkbox");
  makeField(fields,"approvedImages","Autorisation d'utilisation des photos obtenue",prev.approvedImages||false,"checkbox");
 }else{
  makeField(fields,"animal","Animal ou sous-titre",prev.animal||"");
  makeField(fields,"description","Description du produit",prev.description||"","textarea");
  makeField(fields,"collectionId","Collection",prev.collectionId||state.catalog.collections[0]?.id||"","select",
   state.catalog.collections.map(c=>[c.id,c.name]));
  makeField(fields,"artisanId","Artisan",prev.artisanId||state.catalog.artisans[0]?.id||"","select",
   state.catalog.artisans.map(c=>[c.id,c.name]));
  const imageInput=makeField(fields,"imageUrl","Photographie principale (URL publique)",prev.imageUrl||"","url");
  const pick=button("Choisir dans la médiathèque",()=>mediaChooser(imageInput,photos));
  fields.append(pick);const photos=node("div","sh-span");fields.append(photos);
  makeField(fields,"productUrl","Lien vers le produit chez l'artisan",prev.productUrl||"","url");
  makeField(fields,"priceLabel","Prix facultatif (ex. : 32 €)",prev.priceLabel||"");
  makeField(fields,"additionalImages","Autres images — une URL par ligne (facultatif)",(prev.additionalImages||[]).join(String.fromCharCode(10)),"textarea");
  makeField(fields,"affiliate","Lien d'affiliation rémunéré",prev.affiliate||false,"checkbox");
  makeField(fields,"featured","Mettre en avant",prev.featured||false,"checkbox");
  makeField(fields,"status","Visibilité",prev.status||"draft","select",Object.entries(statuses).map(([a,b])=>[a,b]));
  makeField(fields,"sort","Ordre d'affichage",prev.sort??state.catalog.products.length+1,"number");
 }
 const actions=node("div","sh-form-actions");
 const saveBtn=button("Enregistrer la fiche",async()=>{
  const values={};for(const input of form.querySelectorAll("[name]"))
   values[input.name]=input.type==="checkbox"?input.checked:input.value.trim();
  if(!values.name){notice("Le nom est obligatoire.",true);return}
  for(const field of ["imageUrl","productUrl","website"])
   if(values[field]&&!url(values[field])){notice("Lien invalide : utilisez une adresse https:// pour "+field,true);return}
  if(tab==="products"&&(!values.imageUrl||!values.productUrl)){
   notice("Photo et lien produit obligatoires pour publier.",true);return
  }
  const next=structuredClone(state.catalog);
  if(values.additionalImages!==undefined)values.additionalImages=values.additionalImages.split(String.fromCharCode(10)).map(s=>s.trim()).filter(Boolean);
  if(values.sort!==undefined)values.sort=Math.max(0,Number(values.sort)||0);
  const obj={...prev,...values};
  if(tab==="products"){delete obj.symbolism;delete obj.biblawRef;}
  if(editing.index===-1){obj.id=nextId(values.name,next[tab]);obj.slug=obj.id;next[tab].push(obj)}
  else next[tab][editing.index]=obj;
  saveBtn.disabled=true;await save(next);saveBtn.disabled=false;
 },"sh-primary");
 actions.append(saveBtn,button("Annuler",()=>{editing=null;render()}));form.append(actions);root.append(form);
 if(tab==="products"&&(!state.catalog.collections.length||!state.catalog.artisans.length))
  root.append(node("p","sh-alert error","Ajoutez d'abord une collection et un artisan."));
}
function start(){
 if(loaded||shell.hidden)return;
 load().catch(e=>{root.replaceChildren(header(),node("p","sh-alert error",e.message))});
}
const watcher=new MutationObserver(start);watcher.observe(shell,{attributes:true,attributeFilter:["hidden"]});
for(const x of document.querySelectorAll(".rail [data-tab]"))x.addEventListener("click",e=>{
 e.preventDefault();e.stopImmediatePropagation();location.href="admin.html";
},true);
start();
})();
