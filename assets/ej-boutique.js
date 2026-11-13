/* Espace Jeunesse — Boutique peluches. Cette page emploie uniquement les blocs
 * standard de l'éditeur (titres, textes, images, boutons, colonnes).
 * Les 21 notices sont reprises de data/animals-editorial.json dans Biblaw.
 * Les images distantes sont créditées et ne sont jamais réhébergées.
 * Les choix faits par le propriétaire dans la page source ou dans D1 priment.
 */
(function(){
"use strict";
const BIBLAW={"abeille":{"summary":"Les psaumes présentent l’abeille comme un exemple de travail pour la communauté, de service de la reine et de recherche de ce qui est beau et pur. Ils lui associent le soutien mutuel et l’offrande.","refs":[{"book":8,"psalm":47,"verses":[3,5,6,7]},{"book":9,"psalm":71,"verses":[3,5,7]}]},"agneau":{"summary":"Le texte demande de donner de la force à l’agneau et de ne pas craindre le loup. Il invite aussi à reconnaître en soi le loup et l’agneau sans laisser l’un ni l’autre diriger sa vie.","refs":[{"book":8,"psalm":33,"verses":[6]},{"book":5,"psalm":32,"verses":[1,6]}]},"aigle":{"summary":"L’aigle est cité pour son vol dans les hauteurs, sa sérénité, son regard capable de voir largement et dans le détail. Le texte invite à adopter son calme, son ouverture et sa liberté.","refs":[{"book":1,"psalm":13,"verses":[1]},{"book":3,"psalm":16,"verses":[5,6]}]},"biche":{"summary":"Dans le psaume 110 de Gabriel, la Biche transmet un message sur la protection de la famille, la solidarité, le soutien mutuel et l’importance du foyer. La note associée rapporte que Gabriel s’est manifesté sous la forme d’une Biche à l’aura bleue lors d’un dialogue avec le règne animal, et insiste sur la paix familiale et la protection des enfants. Cette note est une transcription encore à vérifier.","refs":[{"book":14,"psalm":110,"verses":[1,4,5,6,9,10,13]}]},"canard":{"summary":"Le canard est donné en exemple pour la transmission vivante à ses canetons : il leur transmet ce qui vit en lui et qui est nourri par les mondes subtils.","refs":[{"book":43,"psalm":277,"verses":[25]}]},"cerf":{"summary":"Le cerf incarne la noblesse et la droiture. Les psaumes le décrivent capable de s’affirmer, de défendre son troupeau et de rester discret et subtil. L’homme est invité à lui ressembler.","refs":[{"book":1,"psalm":9,"verses":[20,21]},{"book":1,"psalm":12,"verses":[2]}]},"chouette":{"summary":"Le psaume 26 de Michaël prend la chouette en exemple pour sa capacité à voir dans l’obscurité et invite à apprendre à discerner ce qui est caché. Une note du psaume 143 de Michaël précise qu’elle est devenue son animal totem sur les terres esséniennes du Québec et lui attribue la vision des mondes visible et invisible. Cette note est une transcription encore à vérifier.","refs":[{"book":5,"psalm":26,"verses":[1,2,7,12]}]},"colombe":{"summary":"La colombe est citée parmi les animaux totems liés à la pureté et à la douceur. La colombe blanche portant un rameau d’olivier représente la paix de Dieu ; posée sur un cobra, elle illustre la maîtrise.","refs":[{"book":12,"psalm":58,"verses":[8]},{"book":29,"psalm":208,"verses":[4]}]},"cygne":{"summary":"Le cygne est nommé avec la colombe parmi les animaux totems associés à la pureté, à la douceur, à la subtilité et à la grâce.","refs":[{"book":12,"psalm":58,"verses":[8]}]},"dauphin":{"summary":"Le dauphin est présenté comme vivant en harmonie avec son environnement. Le texte cite son innocence, sa spontanéité et sa capacité à se défendre sans perdre sa bonne humeur ni son harmonie, et invite à prendre exemple sur lui.","refs":[{"book":16,"psalm":102,"verses":[2,3,4,6]}]},"escargot":{"summary":"L’escargot porte avec lui sa maison et l’essentiel de son existence. Le psaume invite à retenir cette indépendance et à se libérer des fardeaux inutiles.","refs":[{"book":15,"psalm":99,"verses":[1,2,4,5]}]},"flamant-rose":{"summary":"Le texte demande de faire comme le flamant rose, qui se tient sur une patte : l’image est associée au fait de poser un monde et d’accueillir l’esprit sur la terre.","refs":[{"book":15,"psalm":101,"verses":[3]}]},"fourmi":{"summary":"Les psaumes invitent à prendre la fourmi pour modèle pour son effort, sa persévérance, l’aide entre fourmis et le travail au service d’une œuvre commune. Un autre verset met en garde contre le fait de limiter son œuvre à de petites choses.","refs":[{"book":5,"psalm":35,"verses":[4,5,6,8]},{"book":9,"psalm":71,"verses":[3,5]}]},"huitre":{"summary":"L’huître est prise pour exemple parce qu’elle crée une perle blanche à partir d’un grain de sable. Ce travail sert de comparaison avec la capacité créatrice de l’homme.","refs":[{"book":2,"psalm":10,"verses":[2]}]},"licorne":{"summary":"La licorne est expressément présentée comme un animal mythique et magique donné en modèle à l’homme. Sa pureté, sa beauté, son harmonie avec la nature et sa corne tournée vers le haut sont décrites dans le psaume.","refs":[{"book":5,"psalm":24,"verses":[1,2,3,4]}]},"oiseau":{"summary":"L’oiseau est cité pour son envol, son point de vue large et sa capacité à se diriger vers les hauteurs. Plusieurs psaumes demandent à l’homme d’apprendre de lui à s’alléger et à élargir sa vision.","refs":[{"book":8,"psalm":30,"verses":[3]},{"book":13,"psalm":91,"verses":[2,4]}]},"papillon":{"summary":"Le papillon est décrit comme léger, fin et délicat lorsqu’il s’approche d’une fleur. Il sert de modèle pour la méditation et de figure de liberté, en lien avec la transformation de la chenille.","refs":[{"book":3,"psalm":21,"verses":[1,2,8]},{"book":8,"psalm":42,"verses":[6,7,8]}]},"serpent-de-la-sagesse":{"summary":"Les psaumes distinguent le serpent de la sagesse du serpent tentateur. Le premier est présenté comme un guide vers les mondes supérieurs, apportant le calme, la stabilité et la clarté. Le texte demande d’apprendre à le rencontrer et à le maîtriser.","refs":[{"book":14,"psalm":104,"verses":[1,2,7,9]},{"book":27,"psalm":169,"verses":[28,33]}]},"tortue":{"summary":"La tortue est donnée comme exemple de protection : le psaume dit qu’elle se préserve de certaines choses et invite l’homme à renforcer sa propre protection.","refs":[{"book":1,"psalm":8,"verses":[1]}]},"vache":{"summary":"La vache est citée pour sa constance : le psaume demande d’être comme elle, dont on peut attendre le lait, et comme le blé, dont on peut attendre la farine.","refs":[{"book":26,"psalm":181,"verses":[10]}]},"phenix":{"summary":"Le phénix est cité comme image du peuple essénien qui renaît de ses cendres par l’éveil du souvenir de l’âme et de sa patrie de Lumière.","refs":[{"book":3,"psalm":11,"verses":[3]}]}};
const OFFERS={"Abeille":{"title":"L’Abeille au crochet"},"Agneau":{"title":"Melchior le mouton (modèle proche de l’agneau)","url":"https://www.pamplemoussepeluches.com/products/nez-noir-mouton"},"Aigle":{"title":"Peluche aigle au crochet","url":"https://www.etsy.com/listing/1446972070/crochet-eagle-plush-toy-handmade","image":"https://i.etsystatic.com/28384825/r/il/40ac9d/4865470039/il_fullxfull.4865470039_imaw.jpg","maker":"Artisan sur Etsy","region":"Création au crochet · modèle aigle"},"Biche":{"title":"Biche au crochet","url":"https://douceuraucrochet.fr/products/biche"},"Canard":{"title":"Canard en chenille au crochet"},"Cerf":{"title":"Ferdinand le cerf","url":"https://www.pamplemoussepeluches.com/products/peluche-ferdinand-le-cerf"},"Chouette":{"title":"Ginette la chouette","url":"https://www.pamplemoussepeluches.com/products/peluche-ginette-la-chouette"},"Colombe":{"title":"Colombe blanche crochetée (objet décoratif)","url":"https://madeheart.com/en/product/1207868531/handmade-soft-toy-crocheted-of-acrylic-threads-white-dove-for-interior-decor.html","image":"https://madeheart.com/media/productphoto/978/34702547/1_03_05.jpg","maker":"Créateur sur Madeheart","region":"Colombe décorative au crochet"},"Cygne":{"title":"Fiona le cygne","url":"https://myecotoys.com/products/fiona-the-swan-plush"},"Dauphin":{"title":"Petite peluche dauphin au crochet"},"Escargot":{"title":"Escargot Flocky au crochet"},"Flamant rose":{"title":"Flamant rose au crochet"},"Fourmi":{"title":"Fourmi marron au crochet"},"Huître":{"title":"Huître au crochet"},"Licorne":{"title":"Doudou licorne au crochet"},"Oiseau":{"title":"Doudou lange oiseau"},"Papillon":{"title":"Papillon des îles — Amigurumi XL"},"Phénix":{"title":"Bébé phénix — peluche au crochet"},"Serpent de la sagesse":{"title":"Serpent vert au crochet"},"Tortue":{"title":"Peluche tortue au crochet"},"Vache":{"title":"Peluches vaches Margot et Scraboutch (collection de l’atelier)"}};
const BIBLAW_URL="https://ludodulac.github.io/Biblaw/";
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const block=(id,type,extra={})=>({id,type,hideOnSite:false,...extra});
function sourceItems(site){
 const items=window.EJTotems?.items||[];
 const original=(site.pages||[]).find(p=>p.id==="peluches-totem"||p.slug==="peluches-totem");
 const byId=new Map((original?.blocks||[]).filter(b=>b.type==="section").map(b=>[b.id,b]));
 const repairs=window.EJPartners?.repairs||[];
 return items.map((base,index)=>{
  const sec=byId.get("peluche-totem-"+(index+1));
  const imageBlock=(sec?.columns?.[0]||[]).find(b=>b.type==="image");
  const right=sec?.columns?.[1]||[];
  const name=right.find(b=>b.type==="heading")?.text||base.name;
  const atelier=right.find(b=>b.type==="text")?.text||base.maker+" · "+base.region;
  const button=right.find(b=>b.type==="button");
  const repair=repairs.find(r=>r.name===base.name);
  const defaultLinks=[base.url,repair?.link].filter(Boolean);
  const currentUrl=button?.url||base.url;
  const currentImage=imageBlock?.url||base.image;
  const defaultImages=[base.image,repair?.image].filter(Boolean);
  const offer=OFFERS[base.name]||{};
  const customizedUrl=button?.url&&!defaultLinks.includes(button.url);
  const customizedImage=imageBlock?.url&&!defaultImages.includes(imageBlock.url);
  const customizedMaker=right.find(b=>b.id==="peluche-totem-"+(index+1)+"-atelier")?.text;
  const displayMaker=offer.maker&&!customizedUrl?offer.maker+" · "+offer.region:
    (customizedMaker||atelier);
  return {
   name, title:offer.title||"Peluche "+base.name,
   url:customizedUrl?currentUrl:(offer.url||currentUrl),
   image:customizedImage?currentImage:(offer.image||currentImage),
   mediaId:customizedImage?imageBlock.mediaId||"":(offer.image?"":imageBlock?.mediaId||""),
   maker:displayMaker
  };
 });
}
function section(item,index){
 const id="boutique-peluche-"+(index+1);
 const key=normalize(item.name);
 const entry=BIBLAW[key];
 const citations=(entry?.refs||[]).map(r=>
  "Livre "+r.book+", psaume "+r.psalm+", verset"+(r.verses.length>1?"s ":" ")+r.verses.join(", ")
 ).join(" ; ");
 const left=[block(id+"-photo","image",{
  url:item.image,mediaId:item.mediaId||"",alt:"Peluche "+item.name+" — "+item.maker,
  widthPct:100,align:"center"
 })];
 const right=[
  block(id+"-animal","heading",{text:item.name,level:"h2"}),
  block(id+"-sens","text",{text:entry?.summary||"Retrouvez cet animal dans le répertoire Biblaw."}),
  ...(citations?[block(id+"-source","text",{text:"Dans Biblaw : "+citations+"."})]:[]),
  block(id+"-produit","heading",{text:item.title,level:"h3"}),
  block(id+"-artisan","text",{text:item.maker}),
  block(id+"-lien","button",{text:"Voir la peluche ↗",url:item.url})
 ];
 return {id,type:"section",layout:"columns",presentation:"resource",
   style:{border:"none",color:"#d7dde5",width:1,shadow:false},
   columnAlignments:["center","center"],columnButtonLayouts:["stack","stack"],
   hideOnSite:false,columns:[left,right]};
}
function page(site){
 return {id:"boutique-peluches",slug:"boutique-peluches",
  title:"Boutique peluches",placement:"menu",status:"published",
  blocks:[
   block("boutique-title","heading",{text:"Boutique peluches",level:"h1",align:"center"}),
   block("boutique-intro","text",{text:"21 animaux totems, leur enseignement dans la Bible essénienne et une sélection de peluches à découvrir chez les créateurs. Les achats sont effectués directement auprès des boutiques : aucun paiement n’a lieu sur l’Espace Jeunesse.",align:"center"}),
   ...sourceItems(site).map(section),
   block("boutique-biblaw-title","heading",{text:"D’où viennent les enseignements ?",level:"h2"}),
   block("boutique-biblaw-text","text",{text:"Les présentations des animaux et les références aux psaumes proviennent du répertoire des animaux totems de Biblaw. Dans Biblaw, choisissez « Les animaux dans la Bible », puis « Les animaux totems »."}),
   block("boutique-biblaw-link","button",{text:"Consulter les animaux totems dans Biblaw ↗",url:BIBLAW_URL}),
   block("boutique-mention","text",{text:"Les photographies appartiennent à leurs auteurs et restent hébergées sur leurs sites. Les prix, stocks, livraisons et âges recommandés sont à vérifier auprès des vendeurs. Certains modèles sont des articles décoratifs ou des animaux proches du totem, signalés dans leur intitulé."})
  ]};
}
function mergeSite(raw){
 if(!raw||!Array.isArray(raw.pages))return raw;
 if(raw.pages.some(p=>p.id==="boutique-peluches"||p.slug==="boutique-peluches"))return raw;
 return {...raw,pages:[...raw.pages,page(raw)]};
}
window.EJBoutique=Object.freeze({mergeSite,sourceItems});
})();
