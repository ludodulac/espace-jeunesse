/* Espace Jeunesse — sélections de BD et de livres de mythologies.
   Cartes faites exclusivement de blocs natifs de l'éditeur.
   Aucun style sur mesure, aucune création de médiathèque, aucune
   altération des autres pages. Les modifications de l'administrateur priment.
*/
(function(){
"use strict";
const BD=[["elfie","Le Grimoire d’Elfie","Elfie découvre qu’elle a hérité de sa mère des dons de sorcière et d’un grimoire magique qu’elle nourrit de ses histoires. Avec ses sœurs, elle sillonne la France dans un bus transformé en librairie ambulante.","https://assets.bubblebd.com/img/00cttmb5iu/c3ka0yhphu.jpg","https://www.audreyalwett.com/le-grimoire-d-elfie"],["royaumes-de-feu","Les Royaumes de Feu · La BD","Cinq jeunes dragons grandissent avec l’espoir de mettre fin à une guerre qui déchire leur monde. Une grande aventure de prophétie, d’amitié et de liberté, adaptée des romans de Tui T. Sutherland.","https://assets.bubblebd.com/img/fzur8r7hwb/dsqt3qsafn.jpg","https://www.mollat.com/livres/2340870/tui-sutherland-les-royaumes-de-feu-la-bande-dessinee-vol-1-la-prophetie"],["blaireau-renarde","Monsieur Blaireau et Madame Renarde","Monsieur Blaireau accueille Madame Renarde et sa fille dans son terrier. Leurs familles apprennent à vivre ensemble malgré leurs différences : une histoire douce sur l’entraide et la famille.","https://bdi.dlpdomain.com/album/9782205056785-couv.jpg","https://www.dargaud.com/bd/monsieur-blaireau-et-madame-renarde/monsieur-blaireau-et-madame-renarde"],["chihuahua","Chihuahua","Paul, un garçon ordinaire, entre dans une école de monstres et rencontre notamment Gilbert, un croque-mitaine ! Une bande dessinée pleine d’humour imaginée, entre autres, par Lewis Trondheim.","https://imagine.bayard.io/unsafe/1024x0/bayard-static/edition/couvertures/9791036325397/9791036325397.jpg","https://www.bd-kids.com/bd-kids/6-8-ans/une-rentree-presque-normale/"],["lightfall","Lightfall · La Dernière Flamme","Béa part à la recherche de son grand-père disparu avec Cad, une créature aussi drôle que courageuse. Leur voyage à travers un monde merveilleux révèle un danger qui menace la dernière lumière.","https://www.bdfugue.com/media/catalog/product/cache/1f6f2b21905e2338a7ddd5f5557a2426/9/7/9782075152594_1_75_1.jpg","https://www.bdfugue.com/lightfall-tome-1"]];
const LIVRES=[["nordique-dieux","Les dieux et déesses nordiques","Mythologie nordique — Une première rencontre avec Odin, Thor, Loki et les grandes divinités scandinaves. Un livre illustré pour découvrir leurs pouvoirs et leurs aventures.","https://images.leslibraires.ca/books/9782408047405/front/9782408047405_large.jpg","https://www.editionsmilan.com/livres/79501-les-dieux-et-deesses-nordiques/"],["nordique-asgard","Femmes d’Asgard","Mythologie nordique — Déesses, géantes et Valkyries occupent le devant de la scène. Un beau livre illustré consacré aux grandes figures féminines des légendes du Nord.","https://www.planetebd.com/dynamicImages/album/cover/large/57/80/album-cover-large-57804.jpg","https://www.glenat.com/glenat-jeunesse/femmes-dasgard-9782344062036/"],["egypte-imagerie","La mythologie égyptienne","Mythologie égyptienne — Un documentaire illustré pour rencontrer Rê, Osiris, Isis, Anubis et les dieux de l’Égypte ancienne, à travers leurs histoires et leurs symboles.","https://products-images.di-static.com/image/sabine-boccador-la-mythologie-egyptienne/9782215182887-475x500-1.jpg","https://www.fleuruseditions.com/9782215182887-la-mythologie-egyptienne.html"],["egypte-enfants","La mythologie égyptienne racontée aux enfants","Mythologie égyptienne — Viviane Koenig raconte les récits d’Isis, Osiris, Horus et les mystères d’un monde où la nature et le sacré se répondent.","https://www.ricochet-jeunes.org/sites/default/files/2020-09/la%20mythologie%20e%CC%81gyptienne%20raconte%CC%81e%20aux%20enfants.jpg","https://www.editionsdelamartiniere.fr/livres/la-mythologie-egyptienne-racontee-aux-enfants/"],["celtes-fabuleux","Fabuleux mythes celtes","Mythologie celtique — Dieux, guerriers, créatures et lieux enchantés prennent vie dans une sélection de légendes celtiques magnifiquement illustrées.","https://media.hachette.fr/imgArticle/LAROUSSE/2025/9782036056688-001-X.jpeg?source=web&v=22c1d8f4f72034807f061ff474d4c488","https://www.editions-larousse.fr/livre/fabuleux-mythes-celtes-9782036056688/"],["celtes-legendes","Mythes et légendes celtiques","Mythologie celtique — Un voyage parmi les héros, les êtres merveilleux et les traditions des terres celtiques, à travers des récits et de grandes illustrations.","https://ynnis-editions.fr/cdn/shop/files/mythes-et-legendes-celtiques_800x.jpg?v=1721291350","https://ynnis-editions.fr/products/mythes-et-legendes-celtiques"],["grece-hermes","Le Feuilleton d’Hermès","Mythologie grecque — En cent épisodes, Murielle Szac suit le jeune Hermès et fait découvrir les dieux de l’Olympe, les héros et les origines du monde grec.","https://static.bayard.io/edition/couvertures/9791036390487/9791036390487.jpg","https://www.bayard-jeunesse.com/p/livre-feuilleton-hermes-collector-20-ans"],["grece-ulysse","Le Feuilleton d’Ulysse","Mythologie grecque — L’incroyable voyage d’Ulysse, du cheval de Troie aux rencontres avec le Cyclope et les Sirènes, raconté en épisodes à lire à son rythme.","https://is1-ssl.mzstatic.com/image/thumb/Publication82/v4/39/28/76/39287609-d395-4225-28b0-1da69f60e9a3/9782747077880-001-X.jpeg/1200x1200wz.jpg","https://www.bayard-jeunesse.com/p/livre-feuilleton-ulysse"],["afrique-senegal","Génies · Créatures & mythologies du Sénégal","Mythologies d’Afrique de l’Ouest — Meïssa Mbaye fait vivre les génies et les récits transmis au Sénégal. Une invitation à découvrir la richesse de la tradition orale.","https://www.presenceafricaine.com/2019-large_default/genies-creatures-mythologies-du-senegal.jpg","https://www.presenceafricaine.com/jeunesse-autres-editeurs/1787-genies-creatures-mythologies-du-senegal-9782494527195.html"],["japon-kami","Mythes et légendes du Japon","Mythologie japonaise — Des récits illustrés peuplés de kami, d’esprits et de yōkai. Une porte ouverte sur les êtres mystérieux et les contes traditionnels du Japon.","https://cdn.shopify.com/s/files/1/0539/4848/1725/files/Progettosenzatitolo-2025-08-29T112110.408.jpg?v=1756459279","https://nuinui.ch/products/mythes-et-legendes-du-japon-nouvelle-edition"]];
const bloc=(id,type,props={})=>({id,type,hideOnSite:false,...props});
function carte(prefix,entry,label){
 const [key,title,description,image,url]=entry;
 const id=prefix+key;
 return {id,type:"section",layout:"columns",presentation:"resource",
  style:{border:"round",color:"#d7dde5",width:1,shadow:false},
  columnAlignments:["center","center"],columnButtonLayouts:["stack","stack"],
  hideOnSite:false,columns:[
   [bloc(id+"-image","image",{url:image,alt:"Couverture de "+title,align:"left",widthPct:100})],
   [bloc(id+"-titre","heading",{text:title,rich:title,level:"h2",align:"left"}),
    bloc(id+"-texte","text",{text:description,rich:description,align:"left"}),
    bloc(id+"-lien","button",{text:label,url,displayAsButton:true,align:"left"})]
  ]};
}
function mergeSite(raw){
 if(!raw||!Array.isArray(raw.pages))return raw;
 const pages=raw.pages.slice();
 const index=pages.findIndex(p=>p.title==="Nos BD préférées"||p.id==="neutral-3d1f0861-563d-47be-86bc-65f3a5ccfeae");
 if(index!==-1){
  const existing=pages[index];
  const prior=existing.blocks||[];
  // Si la sélection existe, ne pas regénérer les cartes effacées ou modifiées.
  if(!prior.some(b=>String(b.id||"").startsWith("selection-bd-"))){
   pages[index]={...existing,blocks:[...prior,...BD.map(e=>carte("selection-bd-",e,"Voir la BD ↗"))]};
  }
 }
 const mythIndex=pages.findIndex(p=>p.slug==="livres-mythologies"||p.id==="page-livres-mythologies");
 if(mythIndex===-1){
  pages.push({id:"page-livres-mythologies",slug:"livres-mythologies",
   title:"Livres mythologies",placement:"menu",status:"published",blocks:[
    bloc("livres-mythologies-titre","heading",{text:"Livres mythologies",level:"h1",align:"center"}),
    bloc("livres-mythologies-intro","text",{text:"Dix beaux livres pour découvrir les dieux, les héros, les esprits et les légendes de différentes cultures du monde.",align:"center"}),
    ...LIVRES.map(e=>carte("selection-mythe-",e,"Découvrir le livre ↗"))
   ]});
 }
 return {...raw,pages};
}
window.EJLiterature=Object.freeze({mergeSite});
})();
