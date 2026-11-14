/* Prénoms — fiches historiques faites uniquement avec les blocs natifs de l'éditeur.
 * L'article Ludovic apparaît dans le menu sans toucher aux autres pages de D1.
 * Si la page est enregistrée dans l'administration, sa version personnelle prime.
 * Images : reproductions d'œuvres du domaine public (Wikimedia Commons).
 */
(function(){
"use strict";
const blocks=[];
const item=(id,type,text,extra={})=>{
 const b={id:"prenom-ludovic-"+id,type,text,align:"left",hideOnSite:false,...extra};
 blocks.push(b);return b;
};
const title=(id,text)=>item(id,"heading",text,{level:"h3",size:20});
const para=(id,text,extra={})=>item(id,"text",text,{size:16,...extra});
const image=(id,name,alt,widthPct=65)=>{
 blocks.push({id:"prenom-ludovic-"+id,type:"image",
  url:"https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(name).replace(/%20/g,"_")+"?width=750",
  alt,widthPct,align:"center",hideOnSite:false});
};
const source=(id,text,url)=>item(id,"button",text,{url,displayAsButton:true,size:14});

item("titre","heading","Ludovic : quinze siècles d’histoire dans un prénom",{level:"h2",align:"center",size:28});
para("chapô","Des guerriers francs aux rois de France, d’un parchemin médiéval jusqu’à Beethoven : les aventures étonnantes d’un prénom que l’on croit connaître.",{align:"center",size:18});
para("identite","ORIGINE : germanique  •  SENS : « illustre au combat »  •  MÊME FAMILLE : Clovis, Louis, Ludwig, Ludovico.",{align:"center",bold:true});

title("racines","1. Deux mots cachés dans Ludovic");
para("racines-1","Ludovic remonte à un ancien nom germanique, souvent transcrit Hlodowig ou Hludwig, formé de deux éléments : hlod (« gloire, renommée, célébrité ») et wig (« combat, bataille »). La traduction traditionnelle est donc « illustre au combat » ou « glorieux combattant ».");
para("racines-2","Ces mots appartenaient au monde des noms guerriers des peuples germaniques. Ils indiquent une idée de renommée acquise dans le combat, et non un caractère que posséderaient automatiquement les personnes prénommées Ludovic.");

title("clovis","2. Clovis : le prénom d’un roi franc");
para("clovis-1","Clovis Ier, roi des Francs mort en 511, portait une forme de ce même nom. Les chroniqueurs écrivant en latin ont employé plusieurs graphies, comme Chlodovechus. Notre « Clovis » vient de cette famille de formes anciennes.");
para("clovis-2","LE SAVIEZ-VOUS ? Clovis et Louis sont de proches parents étymologiques. Mais « Louis » ne s’est pas créé en retirant simplement le C et le V de « Clovis » : les deux formes ont suivi des évolutions linguistiques différentes.");
image("clovis-img","Baptême de Clovis.jpg","Enluminure du baptême de Clovis, Grandes Chroniques de France, vers 1375-1380",66);
para("clovis-credit","Baptême de Clovis, enluminure des Grandes Chroniques de France (BnF, vers 1375-1380). Cette scène a été peinte près de neuf siècles après le roi.",{align:"center",italic:true,size:14});

title("latin","3. Quand les scribes écrivaient « Ludovicus »");
para("latin-1","Avec l’expansion du latin écrit, les formes germaniques du nom ont été adaptées : on rencontre notamment Hludovicus et Ludovicus. Louis le Pieux (778-840), fils de Charlemagne et empereur à partir de 814, appartient à cette histoire du prénom.");
image("pieux-img","Louis the Pious and envoys.jpg","Miniature représentant Louis le Pieux avec des envoyés, XIVe siècle",62);
para("pieux-credit","Louis le Pieux dans les Grandes Chroniques de France, miniature du XIVe siècle (BnF / Wikimedia Commons).",{align:"center",italic:true,size:14});

title("charte","4. Une véritable surprise sur un parchemin de 1178");
para("charte-1","Les Archives départementales du Loiret présentent une donation de Louis VII datant de 1178. La formule latine de l’acte commence par « Ludovicus dei gratia francorum Rex », autrement dit « Louis, par la grâce de Dieu, roi des Francs ».");
para("charte-2","Ainsi, « Ludovicus » n’était pas seulement un vieux nom oublié : il pouvait être employé officiellement en latin pour désigner un roi que nous appelons aujourd’hui « Louis VII ». On peut le vérifier dans la transcription du document.");
source("charte-lien","Découvrir la charte de Louis VII (1178) ↗","https://www.archives-loiret.fr/image/6164/220167?crop=centre&download=1&force-inline=&format=pdf&realHeight=1752&realWidth=1240&region=full&size=%21800%2C700");

title("evolution","5. Pourquoi « Louis » a-t-il raccourci le nom ?");
para("evolution-1","La langue parlée transforme peu à peu les sons. Des formes médiévales telles que Loïs ou Looïs ont conduit au prénom français « Louis », devenu très courant à la cour des rois. La forme française est donc bien plus courte que l’ancien nom germanique.");
para("evolution-2","« Ludovic » a, lui, conservé beaucoup plus directement l’allure de Ludovicus. C’est ce qu’on appelle souvent un doublet : deux formes issues d’une même origine, dont l’une est passée par l’évolution populaire et l’autre par un emprunt au latin.");
para("evolution-3","L’HISTOIRE EN RACCOURCI : Hlodowig / Hludwig → formes latines dont Ludovicus → Louis ou Ludovic. Cette flèche aide à comprendre, mais masque les multiples variantes qui ont coexisté selon les siècles et les régions.");
image("louis14-img","Rigaud Louis XIV 1701.jpg","Portrait de Louis XIV en costume de sacre par Hyacinthe Rigaud, 1701",52);
para("louis14-credit","Louis XIV peint par Hyacinthe Rigaud en 1701 : encore un « Louis » de la grande famille de « Ludovic ». Œuvre du domaine public.",{align:"center",italic:true,size:14});

title("europe","6. La famille de Ludovic à travers l’Europe");
para("europe-1","France : Ludovic, Louis, Clovis.\nAllemagne : Ludwig.\nItalie : Ludovico, Luigi.\nEspagne : Luis.\nPortugal : Luís.\nPays-Bas : Lodewijk.\nBretagne : Loïc, une forme apparentée.");
para("europe-2","Même histoire lointaine, accents très différents : un prénom peut voyager pendant des siècles sans garder exactement le même son.");

title("beethoven","7. Beethoven s’appelait… Ludwig !");
para("beethoven-1","Le compositeur Ludwig van Beethoven (1770-1827) portait la forme allemande de cette famille de prénoms. En quelque sorte, Ludwig est un cousin linguistique de Ludovic. La parenté est celle des mots, bien sûr, pas celle des personnes !");
image("beethoven-img","Beethoven 1820.jpg","Portrait de Ludwig van Beethoven par Joseph Karl Stieler, 1820",51);
para("beethoven-credit","Ludwig van Beethoven, portrait peint par Joseph Karl Stieler en 1820 (domaine public).",{align:"center",italic:true,size:14});

title("popularite","8. Un prénom vedette des années 1970");
para("popularite-1","En France, Ludovic a été particulièrement donné dans les années 1970 et 1980. Le sommet se situe en 1977 : environ 6 730 enfants ont reçu ce prénom cette année-là. En 2025, ils ne sont plus qu’une dizaine, d’après les données de naissances.");
para("popularite-2","Ces chiffres comptent les prénoms attribués à la naissance, pas les personnes qui s’appellent encore Ludovic aujourd’hui. Les statistiques de l’Insee comportent désormais des effectifs arrondis.",{size:14});

title("fetes","9. Deux fêtes possibles");
para("fetes-1","La fête des Ludovic est le plus souvent fixée au 25 août, en souvenir de saint Louis (Louis IX, roi de France). Le 1er avril est également associé à saint Ludovic Pavoni, prêtre italien du XIXe siècle, appelé Lodovico dans sa langue.");

title("symboles","10. La petite touche symbolique");
para("symboles-1","On peut offrir cette lecture poétique du prénom : « Celui qui traverse les épreuves avec courage ». Elle s’inspire de l’idée de combat et de renommée, mais reste une interprétation moderne, et non la traduction exacte du mot ni une description du caractère.");
para("souvenir","À RETENIR  —  De Hlodowig à Ludovic, de Clovis à Louis : un seul prénom ancestral, plusieurs routes à travers les siècles.",{align:"center",bold:true,size:18});

title("bibliographie","Sources et crédits des illustrations");
para("sources-intro","Pour approfondir : références étymologiques, étude historique, manuscrit et statistiques. Les images sont hébergées par Wikimedia Commons et reproduisent des œuvres du domaine public.",{size:14});
source("src-nominis","Origine, variantes et fêtes — Nominis ↗","https://nominis.cef.fr/contenus/prenom/625/Ludovic.html");
source("src-persee","Le nom de Clovis — étude sur Persée ↗","https://www.persee.fr/doc/onoma_0755-7752_1997_num_29_1_1278");
source("src-insee","Fichier des prénoms — Insee ↗","https://www.insee.fr/fr/statistiques/8595130");
source("img-clovis","Illustration du baptême de Clovis — BnF / Commons ↗","https://commons.wikimedia.org/wiki/File:Bapt%C3%AAme_de_Clovis.jpg");
source("img-pieux","Miniature de Louis le Pieux — BnF / Commons ↗","https://commons.wikimedia.org/wiki/File:Louis_the_Pious_and_envoys.jpg");
source("img-louis","Portrait de Louis XIV — Rigaud / Commons ↗","https://commons.wikimedia.org/wiki/File:Rigaud_Louis_XIV_1701.jpg");
source("img-beethoven","Portrait de Beethoven — Stieler / Commons ↗","https://commons.wikimedia.org/wiki/File:Beethoven_1820.jpg");

function makePage(){
 return {
  id:"prenoms",slug:"prenoms",title:"Prénoms",placement:"menu",status:"published",
  blocks:[
   {id:"prenoms-title",type:"heading",level:"h1",text:"Prénoms",align:"center",hideOnSite:false},
   {id:"prenoms-lead",type:"text",text:"Chaque prénom est une petite histoire. Découvrez ses racines, son parcours et les anecdotes qui l’accompagnent.",align:"center",hideOnSite:false},
   {id:"prenoms-fiche-ludovic",type:"section",layout:"single",presentation:"text",
    style:{border:"round",color:"#d7dde5",width:1,shadow:false},
    columnAlignments:["top","top"],columnButtonLayouts:["stack","stack"],
    hideOnSite:false,columns:[blocks,[]]}
  ]
 };
}
function mergeSite(site){
 if(!site||!Array.isArray(site.pages))return site;
 // Conserver intégralement la page personnalisée dans l'administration.
 if(site.pages.some(p=>p.id==="prenoms"||p.slug==="prenoms"))return site;
 return {...site,pages:[...site.pages,makePage()]};
}
window.EJNames=Object.freeze({mergeSite,makePage});
})();