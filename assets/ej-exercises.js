/* Exercices magiques — uniquement des blocs déjà éditables dans Espace Jeunesse.
 * Sources : psaumes canoniques de Biblaw, section Chiffres et nombres.
 * Si cette page existe déjà dans Cloudflare, aucune personnalisation n'est remplacée.
 */
(function(){
"use strict";
const EXERCISES=[
 ["21 jours pour retrouver le calme","Chaque jour, assieds-toi dans le calme. Observe tes pensées et tes sentiments, puis distingue ce qui t’aide à te rapprocher de ton âme. Recommence pendant 21 jours.","Gabriel",17,"02",17,[5,6]],
 ["Consulter son âme","Après une prière, une méditation ou une promenade, prends un instant de silence. Tourne ton attention vers l’intérieur et demande à ton âme son point de vue.","Gabriel",17,"02",17,[7]],
 ["Le petit lac intérieur","Avant de dormir, imagine en toi un petit lac paisible. Demande à recevoir au réveil un message de ton âme. Le psaume présente ce lac comme une image symbolique.","Gabriel",17,"02",17,[8,9]],
 ["Le premier pas du matin","Au lever, pose d’abord le pied droit au sol avec une intention de lumière. Par ce premier pas, bénis en pensée ton chemin et ta journée.","Ouriel",34,"08",34,[1,2]],
 ["Saluer la lumière du jour","Tiens-toi droit dans la lumière du matin, sans regarder directement le soleil. Oriente ta première pensée vers le Père et accueille ce nouveau jour avec calme.","Ouriel",34,"08",34,[3]],
 ["Regarder ses difficultés sans se juger","Chaque jour, repère une difficulté et une qualité en toi. Demande-toi quel geste concret pourrait améliorer la situation, sans rester fixé sur tes défauts.","Ouriel",34,"08",34,[9,10,11]],
 ["La préparation en trois étapes","Commence par élever ta pensée et ton cœur vers la lumière. Imagine ensuite ton atmosphère intérieure nettoyée par l’eau. Termine en retrouvant une présence attentive dans ton corps.","Gabriel",1,"02",1,[3,4,5,6]],
 ["Respirer dans les trois centres","Respire naturellement et porte successivement attention à ta pensée, à ce que tu ressens et à ta volonté. Observe les influences que tu accueilles dans ces trois centres.","Raphaël",19,"03",19,[5,6]],
 ["Retrouver les quatre éléments","Dans la nature, prends conscience de la terre, de l’eau, de l’air et du feu ou de la chaleur. Réfléchis à la manière de cultiver l’équilibre dans tes pensées et tes actes.","Michaël",28,"05",28,[1,2,6,7]],
 ["Les cinq sens au service du beau","Choisis un sens et utilise-le consciemment pour remarquer, protéger ou partager quelque chose de beau. Répète avec les autres sens au fil de la journée.","Michaël",44,"05",44,[2,3,7]],
 ["Une petite action équilibrée","Choisis une action simple que tu peux réellement accomplir. Vérifie qu’elle respecte à la fois ce que tu penses juste, les autres et la terre, puis réalise-la.","Michaël",33,"05",33,[3,4]],
 ["Respirer au rythme du jour","Au lever ou au coucher du soleil, prends un moment pour respirer tranquillement et observer le rythme de la nature. Choisis consciemment l’orientation de ta journée.","Raphaël",115,"19",115,[26]],
 ["De la pensée au geste","Choisis une intention lumineuse. Fais-la passer de ta pensée à ton cœur, puis à ta volonté, avant de la traduire par un geste concret.","Ouriel",68,"12",68,[3]],
 ["Les quatre fondements de la méditation","Réserve un temps à l’étude, au recueillement, à un rite que tu connais ou à une œuvre utile. Ce sont les quatre fondements de la sagesse essénienne cités dans le psaume.","Raphaël",131,"23",131,[23]],
 ["Méditer sur les douze perles","Prends un instant pour méditer sur l’image du collier aux douze perles de Gabriel. Réfléchis à l’ordre, à l’harmonie et à la place de l’être humain dans le grand ensemble.","Gabriel",200,"30",200,[9,10]]
];
const textBlock=(id,type,text,extra={})=>({id,type,text,align:"left",hideOnSite:false,...extra});
function createPage(){
 const blocks=[
   textBlock("magique-page-titre","heading","Exercices magiques",{level:"h1",align:"center"}),
   textBlock("magique-page-intro","text","Des pratiques proposées ou inspirées par les psaumes de la Bible essénienne. Les petits liens permettent de retrouver les textes d’origine.",{size:16,align:"center"})
 ];
 EXERCISES.forEach(([title,description,archangel,psalm,bookNumber,psalmNumber,verses],i)=>{
   const id=String(i+1).padStart(2,"0");
   const recordId="book-"+bookNumber+"-psalm-"+String(psalmNumber).padStart(3,"0");
   const url="https://ludodulac.github.io/Biblaw/?psaume="+recordId+"&versets="+verses.join(",");
   const source="Lire : "+archangel+", psaume "+psalm+" · v. "+verses.join(", ");
   blocks.push({
     id:"magique-encadre-"+id,type:"section",layout:"single",presentation:"text",
     style:{border:"round",color:"#d7dde5",width:1,shadow:false},
     columnAlignments:["top","top"],columnButtonLayouts:["stack","stack"],hideOnSite:false,
     columns:[[
       textBlock("magique-exercice-"+id,"heading",title,{level:"h3",size:19}),
       textBlock("magique-explication-"+id,"text",description,{size:15}),
       textBlock("magique-reference-"+id,"button",source,{url,displayAsButton:true,size:12})
     ],[]]
   });
 });
 return {id:"exercices-magiques",slug:"exercices-magiques",title:"Exercices magiques",
   placement:"menu",status:"published",blocks};
}
function mergeSite(raw){
 if(!raw||!Array.isArray(raw.pages))return raw;
 if(raw.pages.some(p=>p.id==="exercices-magiques"||p.slug==="exercices-magiques"))return raw;
 return {...raw,pages:[...raw.pages,createPage()]};
}
window.EJExercises=Object.freeze({mergeSite});
})();
