/* Vitrine autonome et sans paiement : boutique avec fiches, catégories et recherche. */
(function(){
"use strict";
const root=document.getElementById("shop-main");
const api=String(window.ESPACE_JEUNESSE_CONFIG?.apiBase||"").replace(/[/]$/,"");
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
let data=null;
const clean=s=>String(s||"").normalize("NFD").toLowerCase();
function url(v){try{const u=new URL(v,location.href);return u.protocol==="https:"||u.origin===location.origin?u.href:""}catch{return ""}}
function a(text,href,cls,external=false){
 const n=el("a",cls,text);n.href=url(href)||"#";
 if(external){n.target="_blank";n.rel="noopener noreferrer"}return n;
}
function image(p){
 const box=el("div","shop-picture"),img=el("img");img.src=url(p.imageUrl);img.alt="Peluche "+(p.animal||p.name);
 img.loading="lazy";img.onerror=()=>box.replaceChildren(el("span","","Image indisponible"));box.append(img);return box;
}
const collections=()=>data.collections.filter(x=>x.status==="published").sort((a,b)=>a.sort-b.sort);
const products=()=>data.products.filter(x=>x.status==="published").sort((a,b)=>a.sort-b.sort);
const artisan=p=>data.artisans.find(x=>x.id===p.artisanId);
function card(p){
 const n=a("","boutique.html?produit="+encodeURIComponent(p.slug),"shop-card");n.append(image(p));
 const body=el("div","shop-card-body");body.append(el("span","shop-animal",p.animal||"Création"));
 body.append(el("h2","",p.name));if(p.symbolism)body.append(el("p","shop-symbol",p.symbolism));
 const who=artisan(p);if(who)body.append(el("p","shop-maker","Par "+who.name));
 body.append(el("span","shop-button","Découvrir la fiche →"));n.append(body);return n;
}
function home(){
 const params=new URLSearchParams(location.search),chosen=params.get("collection")||"";
 const col=collections().find(x=>x.slug===chosen);
 const hero=el("section","shop-hero");
 hero.append(el("span","shop-kicker","La boutique des découvertes"),el("h1","","Des créations qui racontent des histoires"),
  el("p","","Peluches, contes et merveilles artisanales : une sélection de créations à découvrir directement auprès des artisans."));
 root.append(hero,el("h2","shop-title",col?.name||"Explorer nos collections"));
 const filters=el("nav","shop-filters");filters.setAttribute("aria-label","Collections");
 filters.append(a("Toute la boutique","boutique.html","shop-pill"+(!col?" active":"")));
 for(const c of collections())filters.append(a(c.name,"boutique.html?collection="+encodeURIComponent(c.slug),"shop-pill"+(col?.id===c.id?" active":"")));
 root.append(filters);
 const bar=el("div","shop-toolbar"),counter=el("span","","");
 const search=el("input","shop-search");search.type="search";search.placeholder="Rechercher une peluche…";search.setAttribute("aria-label","Rechercher un produit");
 bar.append(counter,search);root.append(bar);
 const grid=el("div","shop-grid");root.append(grid);
 function update(){
  const q=clean(search.value),arr=products().filter(p=>(!col||p.collectionId===col.id)&&
   (!q||clean([p.name,p.animal,p.symbolism,artisan(p)?.name].join(" ")).includes(q)));
  counter.textContent=arr.length+" création"+(arr.length>1?"s":"")+" à découvrir";
  grid.replaceChildren();if(!arr.length)grid.append(el("p","shop-empty","Aucun produit trouvé."));
  else for(const p of arr)grid.append(card(p));
 }
 search.addEventListener("input",update);update();root.append(el("p","shop-note","Les produits sont vendus par leurs créateurs, jamais par l'Espace Jeunesse. Les prix et disponibilités sont à vérifier chez eux."));
}
function detail(p){
 root.append(a("← Retour à la boutique","boutique.html","shop-back"));
 const article=el("article","shop-detail");article.append(image(p));
 const right=el("div","");
 right.append(el("span","shop-kicker","Sélection Espace Jeunesse"),el("h1","",p.name));
 if(p.animal)right.append(el("h3","shop-animal","Animal totem : "+p.animal));
 if(p.symbolism)right.append(el("p","shop-symbol",p.symbolism));
 if(p.description)right.append(el("p","",p.description));
 if(p.biblawRef)right.append(el("p","shop-note",p.biblawRef));
 const by=artisan(p);if(by){
  right.append(el("p","","Création proposée par "+by.name));
  if(by.location)right.append(el("p","shop-note",by.location));
 }
 if(p.priceLabel)right.append(el("p","",p.priceLabel));
 const cta=a("Voir le produit chez le créateur ↗",p.productUrl,"shop-button",true);
 if(p.affiliate)cta.rel="sponsored noopener noreferrer";right.append(cta);
 right.append(el("p","shop-note",p.affiliate?"Lien d'affiliation : l'Espace Jeunesse peut recevoir une commission sur une vente.":"Le bouton ouvre le site de l'artisan. Aucun paiement n'est effectué ici."));
 article.append(right);root.append(article);
 if(p.symbolism||p.biblawRef){const note=el("aside","shop-note-box");
 note.append(el("h2","","Le symbole de "+(p.animal||"cet animal")));
 if(p.symbolism)note.append(el("p","",p.symbolism));
 if(p.biblawRef)note.append(el("p","",p.biblawRef));
 note.append(a("Consulter Biblaw ↗","https://ludodulac.github.io/Biblaw/","shop-button",true));root.append(note)}
}
(async()=>{
 try{
  let fallback=false;
  let r=await fetch(api?api+"/api/shop":"data/shop-starter.json",{cache:"no-store"}).catch(()=>null);
  if(!r||!r.ok){
   fallback=true;
   r=await fetch("data/shop-starter.json",{cache:"no-store"});
  }
  if(!r.ok)throw Error("Catalogue indisponible ("+r.status+")");
  data=await r.json();if(!Array.isArray(data.products))throw Error("Catalogue invalide");
  root.replaceChildren();const slug=new URLSearchParams(location.search).get("produit");
  if(slug){const p=products().find(x=>x.slug===slug);if(p)detail(p);else root.append(el("p","shop-empty","Ce produit n'est plus publié."))}
  else home();
  if(fallback)root.prepend(el("p","shop-note","Sélection de démonstration : la synchronisation du catalogue est momentanément indisponible."));
 }catch(e){root.replaceChildren(el("p","shop-empty","Impossible de charger la boutique. "+e.message))}
})();
})();
