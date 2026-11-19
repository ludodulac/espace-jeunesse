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
 if(p.description)body.append(el("p","shop-card-description",p.description));
 n.append(body);return n;
}

function home(){
 const params=new URLSearchParams(location.search),chosen=params.get("collection")||"";
 const visibleCollections=collections(),col=visibleCollections.find(x=>x.slug===chosen);
 const heading=el("header","shop-intro");
 heading.append(el("h1","","Boutique des découvertes"),el("p","","Livres illustrés, mythologies, contes et créations à découvrir."));
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
  ["glenat-magie","Magie et créatures fantastiques","Licornes, créatures fantastiques et portes de l'imaginaire."],
  ["glenat-contes","Contes et traditions","Histoires transmises, nature et univers enchanteurs."],
  ["glenat-bd","BD mythologiques","Les grandes légendes racontées en images."]
 ];
 for(const [id,name,description] of groups){
  if(!data.collections.some(c=>c.id===id))data.collections.push({id,slug:id,name,description,status:"published",sort:10+groups.findIndex(g=>g[0]===id)});
 }
 const coverImages={"dieux-nordiques":"https://apostrophe-epernay.fr/cache/images/product/5f33669afb4bbcc27ed8584ea2ab4473-0338826-couverture1-xcgzbqmbjstc-dxlz46pu9rnrktzrm1t6qe3wzfgxebekote889h7g-cover-full.jpg","legende-licornes":"https://servimg.eyrolles.com/static/media/5153/9791026405153_internet_h1400.jpg","creatures-pop-up":"https://static.fnac-static.com/multimedia/PE/Images/FR/NR/72/a5/22/19047794/1507-1/tsp20260408085439/Creatures-Pop-up.jpg","grande-ronde-renards":"https://media.hachette.fr/imgArticle/GLENATJEUNESSE/2022/9782344052426-001-X.jpeg?source=web&v=b5cf94492ea2bd46b8bce11291aada84","magicienne":"https://www.planetebd.com/dynamicImages/album/cover/large/46/66/album-cover-large-46669.jpg","lancelot":"https://media.hachette.fr/imgArticle/GLENAT/2023/9782344048849-001-X.jpeg?source=web&v=fdc2f892913181589406d07d6264f9f9","gilgamesh":"https://www.bd-tek.com/images/album/66/66981%2Cgilgamesh-tome-1-3-les-freres-ennemis.jpg","loki":"https://covers.openlibrary.org/b/isbn/9782344069950-L.jpg","dieux-egyptiens":"https://covers.openlibrary.org/b/isbn/9782344049358-L.jpg"};
 const entries=[
  ["femmes-asgard","Femmes d’Asgard","glenat-mythes","Déesses, géantes et Valkyries de la mythologie nordique.","https://www.glenat.com/glenat-jeunesse/femmes-dasgard-9782344062036/"],
  ["dieux-nordiques","Les dieux de la mythologie nordique","glenat-mythes","Odin, Thor, Loki et les grandes figures des légendes nordiques.","https://www.glenat.com/glenat-livres/les-dieux-de-la-mythologie-nordique-9782344073926/"],
  ["dieux-egyptiens","Les dieux de la mythologie égyptienne","glenat-mythes","Un atlas illustré pour découvrir Isis, Osiris, Horus, les symboles et les récits de l’Égypte ancienne.","https://www.glenat.com/glenat-livres/les-dieux-de-la-mythologie-egyptienne-9782344049358/"],
  ["legende-licornes","La légende des licornes","glenat-magie","Un livre pop-up en carrousel pour découvrir un monde peuplé de licornes et d'animaux fantastiques.","https://www.glenat.com/glenat-jeunesse/la-legende-des-licornes-9791026405153/"],
  ["creatures-pop-up","Créatures – Pop-up","glenat-magie","Kraken, Yéti et créatures mystérieuses surgissent des pages de ce spectaculaire livre animé.","https://www.glenat.com/glenat-jeunesse/creatures-pop-9791026405122/"],
  ["grande-ronde-renards","La Grande ronde des renards","glenat-contes","Sept contes venus du monde entier mettent en scène le renard, malicieux et fascinant.","https://www.glenat.com/glenat-jeunesse/la-grande-ronde-des-renards-9782344052426/"],
  ["magicienne","La magicienne","glenat-contes","Une jeune fille rencontre un esprit de la forêt, dans un conte sur la magie et la nature.",""],
  ["loki","Loki – Tome 01","glenat-bd","Loki doit sauver les dieux d'un pacte dangereux avec un bâtisseur de forteresse.","https://www.glenat.com/glenat-bd/loki-tome-01-9782344069950/"],
  ["lancelot","Lancelot – Tome 01","glenat-bd","Le chevalier de la Charrette : une aventure arthurienne de courage, d'amour et de légendes.","https://www.glenat.com/glenat-bd/lancelot-tome-01-9782344048849/"],
  ["gilgamesh","Gilgamesh – Tome 01","glenat-bd","Premier tome de l’épopée du roi d’Uruk, entre rivalité, amitié et quête héroïque.","https://www.bd-tek.com/Album-66981-gilgamesh-tome-1-3-les-freres-ennemis.html"]
 ];
 const known=data.products.find(p=>p.id==="livre-nordique-asgard");
 if(known){known.collectionId="glenat-mythes";known.sort=1;}
 for(const [id,name,collectionId,description,productUrl] of entries){
  if(id==="femmes-asgard" && known)continue;
  if(data.products.some(p=>p.id==="selection-"+id))continue;
  data.products.push({id:"selection-"+id,slug:"selection-"+id,name,collectionId,description,productUrl,imageUrl:(coverImages[id]||""),affiliate:false,status:"published",sort:entries.findIndex(e=>e[0]===id)+1,artisanId:"editeur-glenat"});
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
  if(!Array.isArray(data.collections))data.collections=[];
  if(!Array.isArray(data.artisans))data.artisans=[];
  spotlightFiveArtisans();
  addGlenatSelection();
  root.replaceChildren();const slug=new URLSearchParams(location.search).get("produit");
  if(slug){const p=products().find(x=>x.slug===slug);if(p)detail(p);else root.append(el("p","shop-empty","Ce produit n'est plus publié."))}
  else home();
  if(fallback)root.prepend(el("p","shop-note","Sélection de démonstration : la synchronisation du catalogue est momentanément indisponible."));
 }catch(e){root.replaceChildren(el("p","shop-empty","Impossible de charger la boutique. "+e.message))}
})();
})();
