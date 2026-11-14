/* Psaumes de Michaël 2026 — uniquement des blocs natifs de l'éditeur Espace Jeunesse.
 * Sources : programme Célébrations Michaël 2026, courriels « Vivifier l’Oracle de Dieu »
 * et textes canoniques des psaumes dans Biblaw (consultation documentaire).
 * Si la page est enregistrée dans Cloudflare, ses modifications priment.
 */
(function(){
"use strict";
const PSAUMES=[
  [
    286,
    "Respecter les lois de Dieu",
    "Jeudi 17 septembre · 8 h 30",
    "20 au 26 septembre 2026 (mail rectificatif)",
    "Ce psaume invite à choisir consciemment son chemin et à respecter les lois de la Lumière. Il rappelle que les pensées et les actes ont des conséquences : se rapprocher du divin demande un véritable engagement, de la clarté et un travail sur soi."
  ],
  [
    102,
    "La pensée claire est la garante d’une vie heureuse",
    "Jeudi 17 septembre · 11 h 30",
    "11 au 17 octobre 2026",
    "Pour penser juste, il faut d’abord apprendre à clarifier son esprit. L’enseignement encourage à reconnaître les influences, les préjugés et les habitudes qui troublent la pensée, puis à cultiver une intelligence plus libre et ouverte à la sagesse."
  ],
  [
    13,
    "Apprendre à regarder",
    "Jeudi 17 septembre · 16 h 30",
    "18 au 24 octobre 2026",
    "Le regard que nous portons sur les autres peut faire grandir le beau ou renforcer leurs défauts. Le psaume propose de nourrir les qualités, l’amitié et la fraternité tout en restant lucide face aux apparences et aux paroles séduisantes."
  ],
  [
    62,
    "Les 4 sceaux de la Nation essénienne, incarnation du monde divin sur la terre",
    "Vendredi 18 septembre · 8 h 30",
    "25 au 31 octobre 2026",
    "Les quatre Sceaux sont présentés comme un chemin concret pour enraciner l’Alliance dans la vie terrestre. Le texte appelle à honorer la Mère, à garder une intention pure et à faire vivre l’engagement spirituel dans les paroles, les gestes et les actes."
  ],
  [
    28,
    "Construis en toi la pyramide de lumière avec les 4 éléments magiques",
    "Vendredi 18 septembre · 11 h 30",
    "1er au 7 novembre 2026",
    "Le texte invite à se relier aux quatre éléments de la nature afin d’harmoniser pensées, sentiments et volonté. L’image de la pyramide montre comment une base intérieure stable et équilibrée peut soutenir l’élévation de la conscience."
  ],
  [
    39,
    "Tes souhaits t’enferment ou te libèrent, conduis-les vers l’éternité",
    "Vendredi 18 septembre · 16 h 30",
    "8 au 15 novembre 2026",
    "Nos souhaits et nos pensées construisent peu à peu le monde dans lequel nous vivons. S’ils restent limités aux seules apparences, ils peuvent nous enfermer ; orientés vers quelque chose de plus grand et durable, ils ouvrent un chemin de renouvellement intérieur."
  ],
  [
    154,
    "Le premier pas vers la vérité",
    "Samedi 19 septembre · 8 h 30",
    "À venir — date non annoncée",
    "Le premier pas vers la vérité consiste à apprendre à se regarder avec lucidité. Le psaume invite à observer ses actes de façon objective, à reconnaître ses erreurs sans se justifier et à cultiver l’humilité pour avancer."
  ],
  [
    125,
    "Le monde divin envoie son Fils",
    "Samedi 19 septembre · 11 h 30",
    "À venir — date non annoncée",
    "Ce psaume distingue le monde matériel et les mondes spirituels. Il enseigne à reconnaître les lois propres à chacun, à ne pas les confondre et à rechercher un équilibre conscient pour accueillir le sacré tout en assumant ses responsabilités sur terre."
  ],
  [
    106,
    "Comment discerner le vrai du faux",
    "Dimanche 20 septembre · 11 h 30",
    "À venir — date non annoncée",
    "Comment reconnaître l’authenticité derrière les apparences ? Le texte invite à se connaître soi-même, à ne pas se laisser tromper par les illusions et à rechercher la sincérité, la droiture et l’accord entre les paroles et les actes."
  ]
];
const item=(id,type,text,extra={})=>({id,type,text,align:"left",hideOnSite:false,...extra});
function createPage(){
 const blocks=[
  item("michael-26-titre","heading","Psaumes de Michaël 2026",{level:"h1",align:"center",size:28}),
  item("michael-26-intro","text","Neuf psaumes présentés pendant la célébration de Michaël 2026, dans l’ordre du programme. Pour chacun : un court résumé et, lorsqu’elle a été annoncée, la semaine proposée pour son étude.",{align:"center",size:16}),
  item("michael-26-precision","text","Semaines retrouvées dans les courriels jusqu’au 14 novembre 2026. Les dates des trois derniers psaumes ne sont pas encore annoncées.",{align:"center",italic:true,size:14})
 ];
 PSAUMES.forEach(([n,title,day,week,summary],index)=>{
  const id="michael-26-"+n;
  if(index===6)blocks.push(item("michael-26-a-venir","heading","Les trois prochains psaumes",{level:"h2",size:24}));
  blocks.push({
    id:id+"-cadre",type:"section",layout:"single",presentation:"text",
    style:{border:"round",color:"#d7dde5",width:1,shadow:false},
    columnAlignments:["top","top"],columnButtonLayouts:["stack","stack"],hideOnSite:false,
    columns:[[
      item(id+"-titre","heading","Michaël "+n+" — "+title,{level:"h3",size:20}),
      item(id+"-dates","text","Célébration : "+day+"\nSemaine d’étude : "+week,{size:14,bold:true}),
      item(id+"-resume","text",summary,{size:16})
    ],[]]
  });
 });
 return {id:"page-psaumes-de-michael-2026",slug:"psaumes-de-michael-2026",
  title:"Psaumes de Michaël 2026",placement:"menu",status:"published",blocks};
}
function mergeSite(raw){
 if(!raw||!Array.isArray(raw.pages))return raw;
 if(raw.pages.some(p=>p.id==="page-psaumes-de-michael-2026"||p.slug==="psaumes-de-michael-2026"))return raw;
 return {...raw,pages:[...raw.pages,createPage()]};
}
window.EJMichael2026=Object.freeze({mergeSite});
})();
