/* Espace Jeunesse : catalogue de liens vers les peluches des animaux totem.
 * Les photographies restent hébergées et créditées par les boutiques d'origine.
 * L'injection est idempotente : un exemplaire déjà enregistré dans D1 prime
 * pour respecter les modifications de la page réalisées dans l'administration.
 */
(function(){
"use strict";
const ITEMS=[
  {
    "name": "Abeille",
    "maker": "Crochet by Eva",
    "region": "Création artisanale",
    "image": "https://static.wixstatic.com/media/72c3e2_37e16d2f34d044baa303af25bc4bb073~mv2.png/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_90%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/72c3e2_37e16d2f34d044baa303af25bc4bb073~mv2.png",
    "url": "https://www.crochetbyeva.com/product-page/l-abeille"
  },
  {
    "name": "Agneau",
    "maker": "Pamplemousse Peluches",
    "region": "France · Picardie (modèle mouton)",
    "image": "https://www.pamplemoussepeluches.com/cdn/shop/files/mouton_face.jpg?v=1762934167&width=1536",
    "url": "https://www.pamplemoussepeluches.com/collections/doudou-peluche-mouton"
  },
  {
    "name": "Aigle",
    "maker": "MiniDiabolo Créations",
    "region": "France · Un Grand Marché (oiseau au crochet)",
    "image": "https://storage.gra.cloud.ovh.net/v1/AUTH_ca60d77ddd5e42749d7c4c17f753540d/ugm-data/pictures/minidiabolo-creations/4130859-oiseau-decoratif-au-crochet-1.jpeg",
    "url": "https://www.ungrandmarche.fr/boutiques/p/objets-de-decoration/oiseau-decoratif-au-crochet/4130859"
  },
  {
    "name": "Biche",
    "maker": "Douceur au Crochet",
    "region": "France · création au crochet",
    "image": "https://douceuraucrochet.fr/cdn/shop/files/image_123650291_2_ff.jpg?v=1728827609&width=1066",
    "url": "https://douceuraucrochet.fr/"
  },
  {
    "name": "Canard",
    "maker": "Créatrice indépendante sur Etsy",
    "region": "International · peluche en chenille faite main",
    "image": "https://i.etsystatic.com/44414563/r/il/84a816/6763524184/il_fullxfull.6763524184_mxyq.jpg",
    "url": "https://www.etsy.com/listing/1883324028/handmade-chenille-crochet-duck-plush-toy"
  },
  {
    "name": "Cerf",
    "maker": "Pamplemousse Peluches",
    "region": "France · Picardie",
    "image": "https://cdn.shopify.com/s/files/1/0565/1395/3979/products/peluche-cerf-beige-caracteristique-nom-pamplemousse-peluches-vue-00001_1536x.jpg?v=1634810032",
    "url": "https://www.pamplemoussepeluches.com/"
  },
  {
    "name": "Chouette",
    "maker": "Pamplemousse Peluches",
    "region": "France · Picardie",
    "image": "https://www.pamplemoussepeluches.com/cdn/shop/files/Sans_titre_1536_x_1920_px_1536_x_1920_px_1536_x_1920_px_046828a5-c2d1-4fef-8050-f0fa1e86c8dc.jpg?crop=center&height=1200&v=1773676179&width=1200",
    "url": "https://www.pamplemoussepeluches.com/en/products/ginette-the-owl-rose"
  },
  {
    "name": "Colombe",
    "maker": "Créateurs sur Etsy",
    "region": "Sélection internationale · colombe en tissu ou au crochet",
    "image": "https://i.etsystatic.com/39366294/r/il/094ae6/5261895559/il_600x600.5261895559_1w1u.jpg",
    "url": "https://www.etsy.com/market/dove_stuffed_animal"
  },
  {
    "name": "Cygne",
    "maker": "Nélya Créations",
    "region": "France · crochet artisanal",
    "image": "https://nelya-creations.com/cdn/shop/files/image00003_1.jpg?v=1742318263",
    "url": "https://nelya-creations.com/products/animal-fait-main-100-coton"
  },
  {
    "name": "Dauphin",
    "maker": "Rose Crochet l’Artisane",
    "region": "Canada · crochet artisanal",
    "image": "https://images.squarespace-cdn.com/content/v1/684c253c9233181100b7b28e/76ad0d61-c2c3-482e-b04b-f53e527997f0/1000015352.jpg",
    "url": "https://www.rosecrochetlartisane.com/shop/p/petite-peluche-dauphin-crochet"
  },
  {
    "name": "Escargot",
    "maker": "Le Jardin Secret d’Angèle",
    "region": "France · Fait Maison",
    "image": "https://www.fait-maison.com/img/662_1497533305_61.jpg",
    "url": "https://www.fait-maison.com/accessoires/accessoires-enfant/33274-lejardinsecretdangele_escargot-flocky-au-croch-.html"
  },
  {
    "name": "Flamant rose",
    "maker": "Ma Bulle Artisanale",
    "region": "France · Seine-et-Marne",
    "image": "https://static.wixstatic.com/media/c4f868_fd4949eba62247fe9c4eb85cfad672f5~mv2.jpg/v1/fill/w_3000%2Ch_4000%2Cal_c%2Cq_90%2Cenc_avif%2Cquality_auto/c4f868_fd4949eba62247fe9c4eb85cfad672f5~mv2.jpg",
    "url": "https://www.mabulleartisanale.com/product-page/flamant-rose"
  },
  {
    "name": "Fourmi",
    "maker": "HandmadeAliny",
    "region": "Autriche · création faite main sur Etsy",
    "image": "https://i.etsystatic.com/40720585/r/il/b798eb/5661988780/il_794xN.5661988780_f0jh.jpg",
    "url": "https://www.etsy.com/listing/1451343194/crochet-ant-plush-toy-brown-amigurumi"
  },
  {
    "name": "Huître",
    "maker": "sunbeamkissedthesea",
    "region": "États-Unis · peluche au crochet sur Etsy",
    "image": "https://i.etsystatic.com/39877797/r/il/431fe1/4740478087/il_794xN.4740478087_lyef.jpg",
    "url": "https://www.etsy.com/listing/1417713516/soft-crochet-amigurumi-oyster-plush"
  },
  {
    "name": "Licorne",
    "maker": "Le Monde de Gurumi",
    "region": "France · Rennes (Bretagne)",
    "image": "https://lemondedegurumi.com/cdn/shop/files/Doudouslicornesgarcons.jpg?v=1757522781&width=1946",
    "url": "https://lemondedegurumi.com/products/doudou-licorne-crochet"
  },
  {
    "name": "Oiseau",
    "maker": "So Plushie",
    "region": "International · oiseau fait main",
    "image": "https://www.soplushie.com/cdn/shop/files/bbc5caa5-il_fullxfull.6402515562_kdb7.jpg?v=1773585846&width=1024",
    "url": "https://www.soplushie.com/products/fluffy-crochet-bird-plushie-handmade-fuzzy-small-parrot-toy-white-and-blue-with-fluffy-tail-gift-for-a-bird-lover"
  },
  {
    "name": "Papillon",
    "maker": "Cours de Crochet Paris",
    "region": "France · Paris",
    "image": "https://coursdecrochetparis.com/cdn/shop/files/PapillondesIles_AmigurumiXL-1.png?v=1707310488",
    "url": "https://coursdecrochetparis.com/products/papillon-des-iles-amigurumi-xl"
  },
  {
    "name": "Phénix",
    "maker": "Créatrice indépendante sur Etsy",
    "region": "International · oiseau de feu fait main",
    "image": "https://i.etsystatic.com/6478010/r/il/a558c1/8774848089/il_794xN.8774848089_mqp3.jpg",
    "url": "https://www.etsy.com/listing/4407336744/handmade-phoenix-baby-snuggler-firebird"
  },
  {
    "name": "Serpent de la sagesse",
    "maker": "Créateur sur DailyDoll",
    "region": "International · serpent au crochet",
    "image": "https://dailydoll.shop/wp-content/uploads/2022/03/IMG_20220110_122238-01.jpeg",
    "url": "https://dailydoll.shop/shop/crochet-snake-green-snake-snake-plushie-collectible-snake/"
  },
  {
    "name": "Tortue",
    "maker": "Le Monde de Gurumi",
    "region": "France · Rennes (Bretagne)",
    "image": "https://lemondedegurumi.com/cdn/shop/files/Peluches_tortues_dessus_635d8fd3-1623-4dd4-8eb3-6c1becab3f56.jpg?v=1759156047&width=1946",
    "url": "https://lemondedegurumi.com/products/peluche-tortue-crochet"
  },
  {
    "name": "Vache",
    "maker": "Atelier Nequidia",
    "region": "France · Hautes-Alpes",
    "image": "https://assets.zyrosite.com/cdn-cgi/image/format%3Dauto%2Cw%3D768%2Ch%3D510%2Cfit%3Dcrop/YBgyPZq0xntl42NX/peluches-vaches-margot-et-scraboutch-TPUT4wuwofT0lBMA.jpg",
    "url": "https://ateliernequidia.fr/boutique-peluches-artisanales"
  }
];
function itemBlock(item,index){
 const prefix="peluche-totem-"+(index+1);
 return {
   id:prefix,type:"section",layout:"columns",presentation:"resource",
   style:{border:"round",color:"#e6dfd2",width:1,shadow:false},
   columnAlignments:["center","center"],columnButtonLayouts:["stack","stack"],
   hideOnSite:false,
   columns:[
    [{id:prefix+"-image",type:"image",url:item.image,
      alt:"Peluche représentant "+item.name+" — photo : "+item.maker,
      widthPct:100,align:"center",hideOnSite:false}],
    [
      {id:prefix+"-nom",type:"heading",text:item.name,level:"h2",align:"left",hideOnSite:false},
      {id:prefix+"-atelier",type:"text",text:item.maker+" · "+item.region,hideOnSite:false},
      {id:prefix+"-bouton",type:"button",text:"Voir le site",url:item.url,hideOnSite:false}
    ]
   ]
 };
}
function page(){
 return {
  id:"peluches-totem",slug:"peluches-totem",title:"Peluches totem",
  placement:"menu",status:"published",
  blocks:[
   {id:"peluches-totem-intro",type:"text",text:"Découvrez des peluches inspirées des animaux totem. Nous avons privilégié les petites créations françaises lorsque nous en avons trouvé, notamment en Bretagne, puis les artisans d'autres régions et pays.",hideOnSite:false},
   ...ITEMS.map(itemBlock),
   {id:"peluches-totem-precautions",type:"text",text:"Les photos sont présentées à titre de découverte et restent la propriété de leurs créateurs. Les modèles, les stocks, les délais et les conditions de livraison peuvent changer : vérifiez-les sur le site de chaque artisan. Pour un enfant, contrôlez également l’âge recommandé et la conformité du jouet.",hideOnSite:false}
  ]
 };
}
function mergeSite(site){
 if(!site||typeof site!=="object")return site;
 const pages=Array.isArray(site.pages)?site.pages:[];
 if(pages.some(p=>p.id==="peluches-totem"||p.slug==="peluches-totem"))return site;
 return {...site,pages:[...pages,page()]};
}
window.EJTotems=Object.freeze({mergeSite,items:ITEMS});
})();
