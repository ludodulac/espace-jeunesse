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
 const box=el("div","shop-picture"),img=el("img");if(!p.imageUrl){box.append(el("span","shop-cover-placeholder","✦\n"+p.name));return box;}img.src=url(p.imageUrl);img.alt="Couverture ou photographie de "+p.name;
 img.loading="lazy";img.onerror=()=>box.replaceChildren(el("span","","Image indisponible"));box.append(img);return box;
}
const collections=()=>data.collections.filter(x=>x.status==="published").sort((a,b)=>a.sort-b.sort);
const products=()=>data.products.filter(x=>x.status==="published").sort((a,b)=>a.sort-b.sort);
const artisan=p=>data.artisans.find(x=>x.id===p.artisanId);
function card(p){
 const n=a("","boutique.html?produit="+encodeURIComponent(p.slug),"shop-card");
 n.append(image(p));
 const body=el("div","shop-card-body");
 body.append(el("h2","shop-product-title",p.name));
 const maker=artisan(p);
 if(maker)body.append(el("p","shop-maker",maker.name));
 n.append(body);return n;
}

function home(){
 const params=new URLSearchParams(location.search),chosen=params.get("collection")||"";
 const visibleCollections=collections(),col=visibleCollections.find(x=>x.slug===chosen);
 const heading=el("header","shop-intro");
 heading.append(el("p","shop-eyebrow","✧ UN CABINET DE CURIOSITÉS ✧"),el("h1","","La boutique des mondes merveilleux"),
  el("p","","Ouvrez les portes des mythes, des légendes et de l’imaginaire. Livres, contes et créations choisies avec soin."));
 root.append(heading);
 if(visibleCollections.length>1){
  const filters=el("nav","shop-filters");filters.setAttribute("aria-label","Collections");
  filters.append(a("Tout voir","boutique.html","shop-pill"+(!col?" active":"")));
  for(const c of visibleCollections)filters.append(a(c.name,"boutique.html?collection="+encodeURIComponent(c.slug),"shop-pill"+(col?.id===c.id?" active":"")));
  root.append(filters);
 }
 const bar=el("div","shop-toolbar"),counter=el("span","shop-count","");
 const search=el("input","shop-search");
 search.type="search";search.placeholder="Rechercher dans la boutique";
 search.setAttribute("aria-label","Rechercher dans la boutique");
 bar.append(search,counter);root.append(bar);
 const results=el("div","shop-results");root.append(results);
 function update(){
  const q=clean(search.value),arr=products().filter(p=>(!col||p.collectionId===col.id)&&
   (!q||clean([p.name,p.animal,p.description,artisan(p)?.name].join(" ")).includes(q)));
  counter.textContent=arr.length+" référence"+(arr.length>1?"s":"");
  results.replaceChildren();
  if(!arr.length){results.append(el("p","shop-empty","Aucune référence trouvée."));return}
  // Une vraie rubrique par famille, plutôt qu'un mélange de peluches et de livres.
  for(const collection of (col?[col]:visibleCollections)){
   const group=arr.filter(p=>p.collectionId===collection.id);
   if(!group.length)continue;
   const section=el("section","shop-section");
   const head=el("div","shop-section-header");
   head.append(el("h2","shop-section-title",collection.name));
   if(collection.description)head.append(el("p","shop-section-intro",collection.description));
   section.append(head);
   const grid=el("div","shop-grid");
   for(const p of group)grid.append(card(p));
   section.append(grid);results.append(section);
  }
 }
 search.addEventListener("input",update);update();
}

function detail(p){
 const isBook=p.collectionId!=="animaux-totems" && (p.collectionId==="livres-et-contes" || p.collectionId.startsWith("glenat-"));
 const parent=collections().find(c=>c.id===p.collectionId);
 root.append(a("← "+(parent?.name||"Boutique"),parent?"boutique.html?collection="+encodeURIComponent(parent.slug):"boutique.html","shop-back"));
 const article=el("article","shop-detail");article.append(image(p));
 const right=el("div","shop-detail-info");
 const maker=artisan(p);
 if(maker)right.append(el("p","shop-detail-maker",maker.name));
 right.append(el("h1","",p.name));
 if(p.description)right.append(el("p","shop-description",p.description));
 if(p.priceLabel)right.append(el("p","shop-price",p.priceLabel));
 const cta=a(isBook?"Voir le livre ↗":"Voir chez le créateur ↗",p.productUrl,"shop-button",true);
 if(p.affiliate)cta.rel="sponsored noopener noreferrer";
 right.append(cta);
 right.append(el("p","shop-availability",isBook?"Prix et disponibilité sur le site de la librairie ou de l'éditeur.":"Prix et disponibilité chez le créateur."));
 if(p.affiliate)right.append(el("p","shop-affiliation","Lien affilié : une commission peut être perçue."));
 article.append(right);root.append(article);
}

/* Vitrine : cinq artisans récemment contactés en tête, sans déclarer d'affiliation.
 * La source officielle reste D1 ; ceci maintient une vitrine cohérente
 * pendant la mise à jour du catalogue distant.
 */

// Sélection éditoriale : fiches sans lien commercial inventé ni affiliation déclarée.
// Les références restent séparées des produits D1, sans modifier les données administrateur.
function addGlenatSelection(){
 const groups=[
  ["glenat-mythes","Mythologies du monde","Déesses, dieux et récits fondateurs des civilisations anciennes."],
  ["glenat-magie","Magie et merveilleux","Licornes, créatures fantastiques et portes de l'imaginaire."],
  ["glenat-contes","Contes et traditions","Histoires transmises, nature et univers enchanteurs."],
  ["glenat-bd","BD mythologiques","Les grandes légendes racontées en images."]
 ];
 for(const [id,name,description] of groups){
  if(!data.collections.some(c=>c.id===id))data.collections.push({id,slug:id,name,description,status:"published",sort:10+groups.findIndex(g=>g[0]===id)});
 }
 const entries=[
  ["femmes-asgard","Femmes d’Asgard","glenat-mythes","Déesses, géantes et Valkyries de la mythologie nordique.","https://www.glenat.com/glenat-jeunesse/femmes-dasgard-9782344062036/"],
  ["dieux-nordiques","Les dieux de la mythologie nordique","glenat-mythes","Odin, Thor, Loki et les grandes figures des légendes nordiques.","https://www.glenat.com/glenat-livres/les-dieux-de-la-mythologie-nordique-9782344073926/"],
  ["dieux-egyptiens","Les dieux de la mythologie égyptienne","glenat-mythes","Découvrir les divinités et les récits de l’Égypte ancienne.",""],
  ["legende-licornes","La légende des licornes","glenat-magie","Un voyage dans l’univers des créatures merveilleuses.",""],
  ["creatures-pop-up","Créatures – Pop-up","glenat-magie","Un livre animé consacré aux êtres fantastiques.",""],
  ["grande-ronde-renards","La Grande ronde des renards","glenat-contes","Un conte illustré autour du monde animal.",""],
  ["magicienne","La magicienne","glenat-contes","Une histoire à explorer dans l’univers merveilleux.",""],
  ["loki","Loki – Tome 01","glenat-bd","Les légendes nordiques en bande dessinée.",""],
  ["lancelot","Lancelot – Tome 01","glenat-bd","La légende arthurienne en bande dessinée.",""],
  ["gilgamesh","Gilgamesh","glenat-bd","L’épopée antique racontée en images.",""]
 ];
 const known=data.products.find(p=>p.id==="livre-nordique-asgard");
 if(known){known.collectionId="glenat-mythes";known.sort=1;}
 for(const [id,name,collectionId,description,productUrl] of entries){
  if(id==="femmes-asgard" && known)continue;
  if(data.products.some(p=>p.id==="selection-"+id))continue;
  data.products.push({id:"selection-"+id,slug:"selection-"+id,name,collectionId,description,productUrl,imageUrl:"",affiliate:false,status:"published",sort:entries.findIndex(e=>e[0]===id)+1,artisanId:"editeur-glenat"});
 }
 // Évite de présenter deux fois la même référence dans les deux collections.
}

function spotlightFiveArtisans(){
 const bird={"id":"peluche-persephone-oiseau","slug":"oiseau-hell-of-persephone","name":"Peluche oiseau au crochet — modèle au choix","animal":"Oiseau","description":"L'oiseau inspire liberté et imagination. Objet de collection : ne convient pas aux moins de 14 ans.","collectionId":"animaux-totems","artisanId":"atelier-hell-of-persephone","imageUrl":"https://www.hellofpersephone-crochet.com/cdn/shop/files/IMG_9947.jpg?v=1718797731&width=1200","additionalImages":[],"productUrl":"https://www.hellofpersephone-crochet.com/products/peluche-oiseau-au-crochet","priceLabel":"","affiliate":false,"status":"published","featured":true,"sort":3};
 const maker={"id":"atelier-hell-of-persephone","name":"Hell of Persephone","description":"Atelier breton de peluches et créations au crochet. Aucun partenariat commercial conclu à ce jour.","website":"https://www.hellofpersephone-crochet.com/","email":"hellofpersephone@gmail.com","location":"Bretagne, France","partner":false,"approvedImages":false};
 const priority=[{"id":"peluche-20","sort":1,"description":"La tortue évoque patience et persévérance."},{"id":"peluche-04","sort":2,"description":"La biche nous inspire douceur et délicatesse."},{"id":"peluche-persephone-oiseau","sort":3,"description":"L'oiseau inspire liberté et imagination. Objet de collection : ne convient pas aux moins de 14 ans."},{"id":"peluche-21","sort":4,"description":"Ces petites vaches évoquent tendresse et curiosité."},{"id":"peluche-07","sort":5,"description":"La chouette rappelle l'observation et la sagesse."}];
 if(!data.artisans.some(a=>a.id===maker.id))data.artisans.push(maker);
 if(!data.products.some(p=>p.id===bird.id))data.products.push(bird);
 for(const p of data.products){
  const hit=priority.find(x=>x.id===p.id);
  if(hit){p.sort=hit.sort;if(!p.description)p.description=hit.description}
  else p.sort=100+Math.max(0,Number(p.sort)||0);
 }
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
  spotlightFiveArtisans();
  addGlenatSelection();
  root.replaceChildren();const slug=new URLSearchParams(location.search).get("produit");
  if(slug){const p=products().find(x=>x.slug===slug);if(p)detail(p);else root.append(el("p","shop-empty","Ce produit n'est plus publié."))}
  else home();
  if(fallback)root.prepend(el("p","shop-note","Sélection de démonstration : la synchronisation du catalogue est momentanément indisponible."));
 }catch(e){root.replaceChildren(el("p","shop-empty","Impossible de charger la boutique. "+e.message))}
})();
})();
