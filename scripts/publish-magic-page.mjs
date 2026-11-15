/**
 * Publication idempotente de la page « La magie » avec les blocs NATIFS
 * de l'administration Espace Jeunesse. Ne touche pas aux pages existantes.
 * Avec --check : validation du contenu, sans accès au réseau.
 */
const EXPECTED_REPO="ludodulac/espace-jeunesse";
const EXPECTED_ACCOUNT="60a7b17758a93fe6681ce998e72ddff0";
const DATABASE_ID="1ccf87df-2e24-48ab-88cd-3fca0560d76b";
const SLUG="la-magie", CORPUS="https://ludodulac.github.io/Biblaw/";
function heading(id,text,level="h2",align="left"){
  return {id,type:"heading",text,rich:text,level,align,hideOnSite:false};
}
function paragraph(id,text,align="left"){
  return {id,type:"text",text,rich:text,align,hideOnSite:false};
}
function reference(id,title,book,psalm,verses){
  return {id,type:"button",text:title,displayAsButton:true,align:"left",
    url:CORPUS+"?psaume=book-"+book+"-psalm-"+psalm+"&versets="+verses,
    hideOnSite:false};
}
function card(id,title,text,refs){
  const children=[heading(id+"-titre",title),paragraph(id+"-texte",text)];
  refs.forEach(([name,book,psalm,verses],i)=>
    children.push(reference(id+"-source-"+(i+1),name,book,psalm,verses)));
  return {id,type:"section",layout:"single",presentation:"text",
    style:{border:"round",color:"#d7dde5",width:1,shadow:false},
    columnAlignments:["top","top"],columnButtonLayouts:["stack","stack"],
    hideOnSite:false,columns:[children,[]]};
}
const intro="Que signifie le mot « magie » dans la Bible essénienne ? Les psaumes en parlent surtout à propos des pensées, des paroles, des gestes et de leurs influences. Voici ce qu’ils enseignent, simplement et sans ajouter d’interprétation.";
const conclusion="Dans la Bible essénienne, la magie est liée à la conscience, aux influences, à la parole, aux actes et aux vertus. Les psaumes insistent sur la responsabilité, la préparation et le discernement. Cette page présente leur enseignement spirituel sans affirmer comme prouvées les réalités invisibles qu’ils décrivent.";
const PAGE={
  id:"page-la-magie",slug:SLUG,title:"La magie",placement:"menu",status:"published",
  blocks:[
    heading("la-magie-titre","La magie","h1","center"),
    paragraph("la-magie-intro",intro,"center"),
    card("la-magie-definition","1. Qu’est-ce que la magie ?",
      "Dans le psaume 26 d’Ouriel, la magie est appelée « science des influences ». Le texte enseigne que les pensées, les paroles et les gestes sont vivants. Il invite à devenir conscient de ce que l’on pense, dit et fait.",
      [["Ouriel · Psaume 26, versets 2, 4 et 5","08","026","2,4,5"]]),
    card("la-magie-mage","2. Pourquoi l’être humain est-il appelé « mage » ?",
      "Dans le psaume 20 de Michaël, l’être humain est appelé « mage » parce qu’il agit sans cesse : en regardant, en pensant, en parlant, en créant et en travaillant. Le texte lui demande de prendre conscience de ce qui l’anime.",
      [["Michaël · Psaume 20, versets 1 et 3","01","020","1,3"]]),
    card("la-magie-parole","3. La parole et les gestes",
      "Ouriel compare les pensées et les paroles à une « signature magique ». Dans ce psaume, elles montrent ce qu’une personne porte en elle. Le texte demande donc de veiller à ce que l’on exprime.",
      [["Ouriel · Psaume 26, versets 8, 9 et 15","08","026","8,9,15"]]),
    card("la-magie-vertus","4. La magie et les vertus",
      "Ouriel présente la magie comme une force qui met les vertus de la Lumière en action. Michaël cite aussi trois vertus données à la Nation essénienne : la vérité, la magie et le soutien mutuel.",
      [["Ouriel · Psaume 26, verset 2","08","026","2"],
       ["Michaël · Psaume 46, versets 7 et 14","05","046","7,14"]]),
    card("la-magie-rites","5. Les rites et les bénédictions",
      "Les psaumes parlent de bénédictions, de gestes et de rites méditatifs. Gabriel présente la bénédiction comme un acte de magie. Raphaël demande d’accomplir les rites avec attention, méditation et intention pure.",
      [["Gabriel · Psaume 80, versets 3 et 6","10","080","3,6"],
       ["Raphaël · Psaume 120, versets 9 à 11","19","120","9,10,11"]]),
    card("la-magie-nature","6. La magie et la nature",
      "Gabriel invite à regarder la flamme d’une bougie en pensant à son lien avec le feu. Il demande de développer une « vision magique de la vie » et précise que, dans cet enseignement, il ne s’agit pas de superstition.",
      [["Gabriel · Psaume 160, versets 10 et 11","22","160","10,11"]]),
    card("la-magie-preparation","7. La préparation compte",
      "Michaël explique qu’il ne suffit pas de prononcer des paroles, de faire des gestes ou de vouloir très fort. Le psaume insiste sur la vérité, l’éducation et la préparation de la personne.",
      [["Michaël · Psaume 210, versets 2, 5 et 6","29","210","2,5,6"]]),
    card("la-magie-discernement","8. Garder son discernement",
      "Ouriel demande aux Esséniens d’être lucides, de ne pas croire tout ce qu’on leur dit et de ne pas se laisser manipuler. Il appelle cela le « discernement magique ».",
      [["Ouriel · Psaume 99, versets 1 et 2","16","099","1,2"]]),
    heading("la-magie-bilan-titre","En quelques mots","h2"),
    paragraph("la-magie-bilan",conclusion),
  ],
};
function checkPage(){
  if(PAGE.slug!==SLUG||PAGE.title!=="La magie"||PAGE.placement!=="menu"||
     PAGE.status!=="published"||PAGE.blocks.length!==12)throw Error("Page non publiable");
  const ids=new Set();let sources=0;
  const walk=item=>{
    if(!item?.id||ids.has(item.id))throw Error("Identifiant de bloc invalide : "+item?.id);
    ids.add(item.id);
    if(item.type==="section"){
      if(item.style.border!=="round"||item.columns.length!==2||
         item.columns[1].length!==0)throw Error("Bloc non natif");
      for(const child of item.columns[0])walk(child);
    }else if(item.type==="button"){
      if(!item.url.startsWith(CORPUS+"?psaume=book-")||
         !/book-\d{2}-psalm-\d{3}&versets=\d+(?:,\d+)*$/.test(item.url))
        throw Error("Référence invalide : "+item.url);
      sources++;
    }else if(!["text","heading"].includes(item.type))throw Error("Type non natif");
  };
  PAGE.blocks.forEach(walk);
  if(sources!==10||JSON.stringify(PAGE).length>=30000)throw Error("Sources ou taille invalides");
  return {slug:PAGE.slug,title:PAGE.title,blocks:PAGE.blocks.length,cards:8,sources};
}
async function query(sql,params=[]){
  const endpoint="https://api.cloudflare.com/client/v4/accounts/"+EXPECTED_ACCOUNT+
     "/d1/database/"+DATABASE_ID+"/query";
  const response=await fetch(endpoint,{method:"POST",headers:{
    Authorization:"Bearer "+process.env.CLOUDFLARE_API_TOKEN,
    "Content-Type":"application/json"},
    body:JSON.stringify({sql,params})});
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body?.success)throw Error("Cloudflare D1 HTTP "+response.status+
    " : "+JSON.stringify(body?.errors||[]).slice(0,300));
  if(!body.result?.[0]?.success)throw Error("Requête D1 échouée");
  return body.result[0];
}
async function main(){
  const validated=checkPage();
  if(process.argv.includes("--check")){
    console.log("VALIDÉE : "+JSON.stringify(validated));return;
  }
  if(process.env.GITHUB_REPOSITORY!==EXPECTED_REPO||
     process.env.CLOUDFLARE_ACCOUNT_ID!==EXPECTED_ACCOUNT||
     !process.env.CLOUDFLARE_API_TOKEN)
     throw Error("Compte, dépôt ou accès Cloudflare inattendu");
  const read=await query("SELECT version, EXISTS (SELECT 1 FROM json_each(data,'$.pages') WHERE json_extract(value,'$.slug')=?) AS exists_page FROM site_state WHERE id=1",[SLUG]);
  const row=read.results?.[0];
  if(!row)throw Error("État Espace Jeunesse introuvable");
  if(row.exists_page){console.log("La magie existe déjà : aucune modification");return;}
  if(!Number.isSafeInteger(Number(row.version)))throw Error("Version D1 invalide");
  const sql="UPDATE site_state SET data=json_insert(data,'$.pages[#]',json(?)), "+
    "version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=1 "+
    "AND version=CAST(? AS INTEGER) AND NOT EXISTS "+
    "(SELECT 1 FROM json_each(site_state.data,'$.pages') WHERE json_extract(value,'$.slug')=?)";
  const written=await query(sql,[JSON.stringify(PAGE),String(row.version),SLUG]);
  if(written.meta?.changes!==1)throw Error("Conflit de version D1 : aucune page écrasée");
  const check=await query("SELECT version,json_extract(p.value,'$.title') AS title,"+
    "json_extract(p.value,'$.status') AS status,json_array_length(p.value,'$.blocks') AS blocks "+
    "FROM site_state s,json_each(s.data,'$.pages') p WHERE s.id=1 "+
    "AND json_extract(p.value,'$.slug')=?",[SLUG]);
  const actual=check.results?.[0];
  if(actual?.title!=="La magie"||actual?.status!=="published"||
     actual?.blocks!==PAGE.blocks.length)throw Error("Page non vérifiée après publication");
  console.log("PAGE PUBLIÉE : La magie, version "+actual.version+
    ", "+actual.blocks+" blocs natifs, "+validated.sources+" références");
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
