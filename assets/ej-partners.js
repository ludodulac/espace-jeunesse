/* Dossier de recherche Espace Jeunesse — artisans pour peluches totem.
 * Page volontairement hors menu, mais accessible directement (PAS protégée par mot de passe).
 * Illustrations référencées sur les boutiques sources ; ne pas réhéberger sans accord.
 * Les pages déjà personnalisées dans D1 conservent la priorité.
 */
(function(){
"use strict";
const REPAIRS=[
  {
    "name": "Chouette",
    "old": "https://www.pamplemoussepeluches.com/cdn/shop/files/Sans_titre_1536_x_1920_px_1536_x_1920_px_1536_x_1920_px_046828a5-c2d1-4fef-8050-f0fa1e86c8dc.jpg?crop=center&height=1200&v=1773676179&width=1200",
    "image": "https://calisson.toys/cdn/shop/files/chouette_beige.jpg?v=1745539090",
    "maker": "Pamplemousse Peluches",
    "region": "France · Picardie (photo chez un revendeur)",
    "link": "https://www.pamplemoussepeluches.com/collections/peluche-chouette-hibou"
  },
  {
    "name": "Cygne",
    "old": "https://nelya-creations.com/cdn/shop/files/image00003_1.jpg?v=1742318263",
    "image": "https://myecotoys.com/cdn/shop/files/fiona-the-swan-handmade-organic-cotton-stuffed-animal-38096510681308_5000x_776abc0d-79fb-408f-9437-05eaa730e771.jpg?v=1716490919&width=1200",
    "maker": "My Eco Toys",
    "region": "Crochet artisanal · Turquie (alternative, image Nélya inaccessible)",
    "link": "https://myecotoys.com/products/fiona-the-swan-plush"
  },
  {
    "name": "Oiseau",
    "old": "https://www.soplushie.com/cdn/shop/files/bbc5caa5-il_fullxfull.6402515562_kdb7.jpg?v=1773585846&width=1024",
    "image": "https://www.pamplemoussepeluches.com/cdn/shop/files/Oiseau_lavande_bleu_2.jpg?v=1730898525&width=1200",
    "maker": "Pamplemousse Peluches",
    "region": "France · Picardie · oiseau en tissu",
    "link": "https://www.pamplemoussepeluches.com/products/doudou-lange-oiseau-copie-1"
  }
];
const PROFILES=[
  {
    "id": "persephone",
    "title": "Hell of Persephone",
    "loc": "BRETAGNE • À DÉCOUVRIR À BREST",
    "cover": "https://www.hellofpersephone-crochet.com/cdn/shop/files/IMG_9947.jpg?v=1718797731&width=1200",
    "alt": "Peluche oiseau au crochet par Hell of Persephone, avec fil chenille turquoise",
    "desc": "Petite créatrice bretonne. Peluches réalisées à la main au crochet, modèles classiques et fantastiques, commandes personnalisées acceptées.",
    "animals": "Modèles repérés dans la sélection : oiseau et flamant rose. Possibilité de demander la fabrication d'autres animaux, sans engagement confirmé à ce stade.",
    "contact": "E-mail : hellofpersephone@gmail.com. Boutique partenaire : Les Ovnis, 148 rue Jean-Jaurès, 29200 Brest. SIRET affiché : 953 962 263 00018.",
    "note": "Priorité de proximité. Un premier échange en personne est possible à Brest via la boutique, mais vérifier que les créations sont actuellement disponibles. La fiche « oiseau » indique « objet de collection, ne convient pas aux moins de 14 ans » : demander les conditions de sécurité par modèle avant toute proposition jeunesse.",
    "web": "https://www.hellofpersephone-crochet.com/",
    "contactUrl": "mailto:hellofpersephone@gmail.com",
    "product": "https://www.hellofpersephone-crochet.com/products/peluche-oiseau-au-crochet"
  },
  {
    "id": "gurumi",
    "title": "Le Monde de Gurumi — Julie",
    "loc": "RENNES • BRETAGNE • SUR MESURE",
    "cover": "https://lemondedegurumi.com/cdn/shop/files/Peluches_tortues_dessus_635d8fd3-1623-4dd4-8eb3-6c1becab3f56.jpg?v=1759156047&width=1200",
    "alt": "Peluches tortues en crochet du Monde de Gurumi",
    "desc": "Julie crée des peluches et doudous au crochet à Rennes. Confection en fil chenille, choix des couleurs et personnalisation sur demande. Activité lancée en octobre 2025.",
    "animals": "Modèles repérés : licorne et tortue ; un doudou phénix figure au catalogue mais était signalé épuisé lors du contrôle. D'autres animaux seraient à étudier en commande spéciale.",
    "contact": "E-mail : contact@lemondedegurumi.com. Téléphone : 06 08 37 38 28. Région : Rennes / Chartres-de-Bretagne.",
    "note": "Premier choix pour un projet de collection personnalisée. La créatrice évoque l'utilisation de matériaux certifiés OEKO-TEX et de tests CE sur ses produits : vérifier les attestations adaptées à chaque nouvelle création et tranche d'âge.",
    "web": "https://lemondedegurumi.com/",
    "contactUrl": "mailto:contact@lemondedegurumi.com",
    "product": "https://lemondedegurumi.com/products/peluche-tortue-crochet"
  },
  {
    "id": "pamplemousse",
    "title": "Pamplemousse Peluches",
    "loc": "PICARDIE • ATELIER FRANÇAIS • GAMME ÉTENDUE",
    "cover": "https://calisson.toys/cdn/shop/files/chouette_beige.jpg?v=1745539090",
    "alt": "Ginette la chouette, peluche Pamplemousse photographiée par le revendeur Calisson Toys",
    "desc": "Maison familiale avec atelier de confection artisanal à la ferme de Puisieux, entre Saint-Quentin et Laon. Huit couturières, studio de conception et de prototypage, fabrication française.",
    "animals": "Parmi les 21 animaux recherchés, catégories repérées : mouton (proche de l'agneau), cerf/faon, chouette, canard et oiseau. Ce sont des familles de produits, pas nécessairement cinq références exactes immédiatement en stock.",
    "contact": "Téléphone atelier : 03 23 04 26 07. Contact par formulaire sur le site. L'atelier reçoit sur rendez-vous.",
    "note": "Le plus grand nombre de catégories correspondantes repérées, avec une structure capable de prototypage. À contacter pour une série spécifique, mais il est impossible de présumer l'acceptation, les minimums de commande ou les tarifs.",
    "web": "https://www.pamplemoussepeluches.com/",
    "contactUrl": "https://www.pamplemoussepeluches.com/pages/nous-contacter",
    "product": "https://www.pamplemoussepeluches.com/collections/peluche-chouette-hibou"
  },
  {
    "id": "nelya",
    "title": "Nélya Créations",
    "loc": "FRANCE • PISTE À RECONFIRMER",
    "cover": "",
    "alt": "",
    "desc": "Boutique de créations au crochet en coton. Une fiche « Animal crochet fait main 100 % coton » mentionne notamment plusieurs variantes d'animaux.",
    "animals": "Deux variantes repérées dans notre liste : « Cigne Beige » (orthographe affichée sur la boutique) et « Biche ». Aucun stock ni fabrication sur mesure confirmés.",
    "contact": "La fiche produit publique est la seule voie identifiée avec certitude. Coordonnées directes et localisation précise non confirmées lors de cette recherche.",
    "note": "À recontrôler avant de prendre contact : la boutique et surtout son serveur d'images ont renvoyé une erreur pendant le contrôle. Aucune photographie Nélya n'est affichée ici tant que sa provenance et son accès ne sont pas vérifiés.",
    "web": "https://nelya-creations.com/",
    "contactUrl": "https://nelya-creations.com/products/animal-fait-main-100-coton",
    "product": "https://nelya-creations.com/products/animal-fait-main-100-coton"
  }
];
function textBlock(id,t,size){return {id,type:"text",text:t,...(size?{fontSize:size}:{}),hideOnSite:false}}
function heading(id,t,level="h2"){return {id,type:"heading",text:t,level,hideOnSite:false}}
function button(id,t,url){return {id,type:"button",text:t,url,hideOnSite:false}}
function section(id,left,right,style={border:"round",color:"#dedad1",width:1,shadow:false}){
 return {id,type:"section",layout:"columns",presentation:"resource",hideOnSite:false,
 style,columnAlignments:["center","center"],columnButtonLayouts:["stack","row"],columns:[left,right]};
}
function artisanSection(p,i){
 const l=p.cover?[{id:"artisan-"+p.id+"-image",type:"image",url:p.cover,
  alt:p.alt,widthPct:100,hideOnSite:false}]:
 [heading("artisan-"+p.id+"-icon","🦢","h1"),textBlock("artisan-"+p.id+"-photo","Photographie non reprise : image d'origine indisponible.")];
 const right=[
 heading("artisan-"+p.id+"-head",(i+1)+". "+p.title),
 textBlock("artisan-"+p.id+"-location",p.loc),
 textBlock("artisan-"+p.id+"-about",p.desc),
 heading("artisan-"+p.id+"-animals","Animaux concernés","h3"),
 textBlock("artisan-"+p.id+"-models",p.animals),
 heading("artisan-"+p.id+"-contacthead","Coordonnées et contact","h3"),
 textBlock("artisan-"+p.id+"-contact",p.contact),
 heading("artisan-"+p.id+"-notehead","Mon avis pour le partenariat","h3"),
 textBlock("artisan-"+p.id+"-note",p.note),
 button("artisan-"+p.id+"-web","Découvrir l'atelier",p.web),
 button("artisan-"+p.id+"-write","Contacter",p.contactUrl),
 button("artisan-"+p.id+"-prod","Voir une peluche",p.product)
 ];
 return section("artisan-"+p.id,l,right);
}
function dossier(){
 const sections=[
  heading("artisans-main-title","Artisans & partenariats — Peluches totem","h1"),
  textBlock("artisans-main-lead","DOSSIER DE REPÉRAGE · 13 NOVEMBRE 2026 · 4 PISTES FRANÇAISES\nUn carnet de recherche pour préparer une éventuelle collection des 21 animaux totem de l'Espace Jeunesse. Aucun partenariat n'est conclu à ce jour."),
  section("artisans-intro",[
   heading("artisans-goal","Le projet","h2"),
   textBlock("artisans-goal-text","Créer une collection cohérente de 21 peluches, avec des artisans français en priorité et des modèles personnalisés pour les animaux difficiles à trouver.")
  ],[
   heading("artisans-first","Où commencer ?","h2"),
   textBlock("artisans-first-text","Pour la proximité : Hell of Persephone (accessible à Brest). Pour une collection sur mesure : Le Monde de Gurumi à Rennes. Pour un catalogue déjà varié et du prototypage : Pamplemousse Peluches.")
  ],{border:"round",color:"#bdac91",width:2,shadow:true}),
  heading("artisans-profiles-title","Les quatre ateliers à étudier","h2"),
  ...PROFILES.map(artisanSection),
  heading("artisans-compare-title","Comparaison rapide","h2"),
  section("artisan-comparison-left",[
   heading("artisans-where","Proximité et sur-mesure","h3"),
   textBlock("artisans-scores","1 — Hell of Persephone : Bretagne, vente à Brest ; commandes personnalisées.\n2 — Le Monde de Gurumi : Rennes ; personnalisation confirmée.\n3 — Nélya Créations : deux variantes repérées, détails à confirmer.")
  ],[
   heading("artisans-range","Catalogue et production","h3"),
   textBlock("artisans-scores-2","1 — Pamplemousse Peluches : 5 catégories correspondant aux totems, atelier de confection et prototypage.\n2 — Le Monde de Gurumi : licorne, tortue et phénix (ce dernier épuisé lors du contrôle).\n3 — Hell of Persephone : oiseau / flamant rose, autres modèles sur devis.")
  ]),
  heading("artisans-plan-title","Conseils pour créer un partenariat","h2"),
  textBlock("artisans-plan-1","ÉTAPE 1 — Prendre contact. Présenter l'Espace Jeunesse et les 21 animaux totem ; demander si l'artisan souhaite envisager une collection, ou seulement une sélection de produits existants."),
  textBlock("artisans-plan-2","ÉTAPE 2 — Tester 2 à 4 modèles. Demander des photos, dimensions, matières, tranches d'âge, conformité jouet (CE / EN 71 pour les modèles destinés aux enfants), prix unitaires, délais et capacités de réassort."),
  textBlock("artisans-plan-3","ÉTAPE 3 — Définir le modèle commercial. Liens vers la boutique, code partenaire ou commission d'apport d'affaires, vente directe par l'artisan, dépôt-vente, ou création exclusive. Ne pas annoncer d'accord avant signature."),
  textBlock("artisans-plan-4","ÉTAPE 4 — Évaluer une collection complète. Comparer le coût des prototypes, la cohérence du style, les quantités minimales, le lieu réel de fabrication et la facilité d'expédition. Éviter d'afficher les 21 animaux comme disponibles avant validation."),
  heading("artisans-images-title","Photographies : éviter les images manquantes","h2"),
  section("artisans-images-tip",[
   heading("artisans-images-before","À faire maintenant","h3"),
   textBlock("artisans-images-before-t","• Chouette : nouvelle photo de la peluche Pamplemousse retrouvée chez un revendeur.\n• Oiseau : remplacé par un doudou oiseau Pamplemousse français.\n• Cygne : image Nélya inaccessible ; un cygne crocheté par My Eco Toys (Turquie) sert d'alternative provisoire dans le catalogue.")
  ],[
   heading("artisans-images-after","Pour une version stable","h3"),
   textBlock("artisans-images-after-t","1. Demander l'autorisation écrite d'utiliser les photos commerciales sur l'Espace Jeunesse.\n2. Une fois accordée, importer les images dans la médiathèque Cloudflare du site ; éviter les URL externes susceptibles d'être déplacées ou bloquées.\n3. Mentionner l'artisan et lier chaque fiche au produit.\n4. Tester l'affichage sur ordinateur et téléphone ; si une image échoue, proposer une vignette de remplacement.")
  ]),
  heading("artisans-questions-title","Questions à poser à chaque créateur","h2"),
  textBlock("artisans-questions-text","Pouvez-vous créer tout ou partie de nos 21 animaux ?\nAcceptez-vous les petites séries et les prototypes ?\nQuels sont vos tarifs et délais pour 1, 10 ou 30 unités ?\nQuels matériaux et quelles certifications pour chaque âge ?\nPeut-on reproduire vos photographies avec crédit sur notre site ?\nUn partenariat avec code promotionnel ou commission est-il envisageable ?"),
  textBlock("artisans-end","Notes de recherche uniquement · Les références, stocks, tarifs, contacts et conditions doivent être confirmés directement avec les artisans. Cette page est hors menu, mais son lien reste accessible publiquement à toute personne qui le connaît.")
 ];
 return {id:"artisans-peluches-totem",slug:"artisans-peluches-totem",
  title:"Artisans & partenariats — Peluches totem",placement:"menu",
  status:"published",blocks:sections};
}
function restoreImages(page){
 if(!page||page.slug!=="peluches-totem")return page;
 let changed=false;
 const blocks=(page.blocks||[]).map(b=>{
  const repairs=REPAIRS.find(x=>b.id&&b.id==="peluche-totem-"+(x.name==="Chouette"?7:x.name==="Cygne"?9:16));
  if(!repairs||!Array.isArray(b.columns)||!Array.isArray(b.columns[0]))return b;
  const image=b.columns[0].find(x=>x.type==="image");
  if(image?.url!==repairs.old)return b; // N'écrase jamais une modification manuelle.
  const copy=JSON.parse(JSON.stringify(b));
  const img=copy.columns[0].find(x=>x.type==="image");
  img.url=repairs.image;img.alt="Peluche "+repairs.name+" — photo : "+repairs.maker;
  for(const item of copy.columns[1]||[]){
    if(item.id===b.id+"-atelier")item.text=repairs.maker+" · "+repairs.region;
    if(item.id===b.id+"-bouton"&&item.url) item.url=repairs.link;
  }
  changed=true;return copy;
 });
 return changed?{...page,blocks}:page;
}
function mergeSite(raw){
 if(!raw||!Array.isArray(raw.pages))return raw;
 const pages=raw.pages.map(p=>{
  const restored=restoreImages(p);
  // Le propriétaire souhaite afficher ce dossier dans le menu visiteurs.
  if(restored.id==="artisans-peluches-totem"||restored.slug==="artisans-peluches-totem")
   return {...restored,placement:"menu",status:"published"};
  return restored;
 });
 if(!pages.some(p=>p.id==="artisans-peluches-totem"||p.slug==="artisans-peluches-totem"))
  pages.push(dossier());
 return {...raw,pages};
}
window.EJPartners=Object.freeze({mergeSite,profiles:PROFILES,repairs:REPAIRS});
})();
