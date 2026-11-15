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
function paragraph(id,rich,align="left"){
  // The public renderer whitelists <strong> for emphasis. Plain text is kept
  // separately so the existing administration can edit each paragraph.
  const text=rich.replace(/<\/?strong>/g,"").replace(/<br\s*\/?\s*>/gi," ");
  return {id,type:"text",text,rich,align,hideOnSite:false};
}
function reference(id,title,book,psalm,verses){
  return {id,type:"button",text:title,displayAsButton:true,align:"left",
    url:CORPUS+"?psaume=book-"+book+"-psalm-"+psalm+"&versets="+verses,
    hideOnSite:false};
}
function card(id,title,paragraphs,refs){
  const children=[heading(id+"-titre",title),...paragraphs.map((text,i)=>
    paragraph(id+"-texte-"+(i+1),text))];
  refs.forEach(([name,book,psalm,verses],i)=>
    children.push(reference(id+"-source-"+(i+1),name,book,psalm,verses)));
  return {id,type:"section",layout:"single",presentation:"text",
    style:{border:"round",color:"#d7dde5",width:1,shadow:false},
    columnAlignments:["top","top"],columnButtonLayouts:["stack","stack"],
    hideOnSite:false,columns:[children,[]]};
}

const intro="Dans la Bible essénienne, la magie ne se réduit ni aux tours extraordinaires ni aux formules mystérieuses. Elle désigne une manière de comprendre la vie, les influences et la responsabilité de l’être humain. Son étude commence par ce qui nous est le plus proche : nos pensées, nos paroles et nos actes.";
const conclusion="La magie apparaît ainsi comme <strong>un art de vivre en conscience</strong>, où la pensée, la parole et le geste ont une portée. Elle demande de connaître les influences qui nous animent, de cultiver les vertus, de se préparer avec sérieux et de transformer sa vie par des actes justes.";
const PAGE={
  id:"page-la-magie",slug:SLUG,title:"La magie",placement:"menu",status:"published",
  blocks:[
    heading("la-magie-titre","La magie","h1","center"),
    paragraph("la-magie-intro",intro),
    card("la-magie-definition","La magie, science des influences",[
      "La magie est appelée <strong>« science des influences »</strong>. Dans cet enseignement, le monde visible n’est pas séparé de ce qui anime les êtres. Une pensée, un sentiment, une parole ou un geste ne sont pas considérés comme des événements sans conséquence : ils expriment une orientation et mettent quelque chose en mouvement.",
      "Étudier la magie, c’est donc chercher à <strong>reconnaître les influences</strong> qui se manifestent dans la vie et à comprendre où elles conduisent. La conscience occupe une place essentielle : un être qui ignore ce qui l’anime peut agir sans comprendre la portée de ses actes. La magie est aussi présentée comme un art de connaître l’être humain, la nature visible et invisible, et les lois qui les relient."
    ],[
      ["Lire les psaumes · Ouriel 26, v. 2, 4 et 5","08","026","2,4,5"],
      ["Lire les psaumes · Michaël 210, v. 10","29","210","10"],
    ]),
    card("la-magie-mage","L’être humain est un mage par sa vie",[
      "L’être humain est décrit comme un <strong>mage ou magicien inné</strong>. Il agit continuellement sur la vie : en regardant, en parlant, en pensant, en créant, en travaillant. La magie ne concerne donc pas seulement des cérémonies exceptionnelles. Elle accompagne les gestes ordinaires et les relations de chaque jour.",
      "Mais être un mage ne signifie pas pouvoir faire tout ce que l’on veut. L’essentiel est de savoir <strong>ce qui nous anime</strong> et vers quoi nous dirigeons nos forces. L’homme et la femme sont invités à devenir des êtres conscients et créateurs, capables de faire grandir ce qui est juste, beau et lumineux dans leur manière de vivre."
    ],[
      ["Lire le psaume · Michaël 20, v. 1, 3 et 4","01","020","1,3,4"],
    ]),
    card("la-magie-parole","La pensée, la parole et le geste",[
      "La pensée, la parole et le geste sont présentés comme <strong>vivants et agissants</strong>. Chaque parole révèle quelque chose de celui qui la prononce ; chaque acte exprime une intention. Le psaume parle d’une <strong>« signature magique »</strong> : ce que l’on fait et ce que l’on dit devient la marque de notre engagement.",
      "Cette vision donne une grande importance à la responsabilité personnelle. Il ne suffit pas de prononcer de belles paroles : il faut pouvoir les confirmer par son comportement. Apprendre à parler avec justesse, à observer ses sentiments et à prendre soin de ses gestes fait donc partie de l’éducation magique."
    ],[
      ["Lire le psaume · Ouriel 26, v. 7, 9, 12 et 15","08","026","7,9,12,15"],
      ["Lire le psaume · Gabriel 219, v. 5","33","219","5"],
    ]),
    card("la-magie-vertus","Mettre les vertus en action",[
      "La magie est définie comme une force qui <strong>met les vertus de la Lumière en action</strong>. Elle ne se limite pas à savoir ou à imaginer : elle doit prendre corps dans la manière de vivre. Une vertu n’est pas seulement un mot que l’on admire ; elle demande à être portée, nourrie et rendue visible par les actes.",
      "Trois vertus sont particulièrement réunies dans un psaume consacré à la Nation essénienne : <strong>la vérité, la magie et le soutien mutuel</strong>. Elles doivent grandir ensemble. La magie est ainsi associée à la vérité de ce que l’on est et à l’attention portée aux autres, plutôt qu’à la recherche d’un pouvoir personnel."
    ],[
      ["Lire le psaume · Michaël 46, v. 7 et 14","05","046","7,14"],
    ]),
    card("la-magie-nature","Voir la nature comme un monde vivant",[
      "Dans cette vision, la nature n’est pas un simple décor. L’eau, l’air, le feu et la terre participent à un ensemble vivant. La flamme d’une bougie, par exemple, invite à reconnaître le feu au-delà de son seul aspect matériel et à prendre conscience de la façon dont on l’utilise.",
      "Développer une <strong>« vision magique de la vie »</strong>, c’est apprendre à regarder les éléments avec attention et respect. Le texte précise que cette vision n’est pas censée être de la superstition : elle est présentée comme <strong>une sagesse, une sensibilité et une qualité de vie</strong>."
    ],[
      ["Lire le psaume · Gabriel 160, v. 10 et 11","22","160","10,11"],
      ["Lire le psaume · Ouriel 40, v. 7","07","040","7"],
    ]),
    card("la-magie-rites","Les bénédictions, les rites et les œuvres",[
      "La bénédiction est présentée comme un <strong>acte de haute magie</strong>. Bénir ne consiste pas seulement à adresser une parole agréable : dans le langage du corpus, c’est chercher à relier ce que l’on bénit à une vertu, à une fonction sacrée et à la Lumière.",
      "Les rites ont également une place importante, mais ils ne sont pas décrits comme des gestes à accomplir mécaniquement. Les <strong>rites méditatifs</strong> demandent une attitude intérieure, une intention pure, une position juste du corps et un travail d’étude. Ils doivent conduire à une vie plus consciente et à des <strong>œuvres concrètes</strong>, dans le service de ce qui est reconnu comme bon et juste."
    ],[
      ["Lire le psaume · Gabriel 80, v. 3 et 6","10","080","3,6"],
      ["Lire le psaume · Raphaël 120, v. 9 à 15","19","120","9,10,11,12,13,15"],
    ]),
    card("la-magie-alchimie","La transformation intérieure",[
      "La magie touche aussi au travail que l’être humain accomplit sur lui-même. Le corpus emploie le mot <strong>« alchimie »</strong> pour parler d’une transformation intérieure : apprendre à distinguer ce qui élève de ce qui abaisse et donner une place plus grande à la conscience.",
      "Cette transformation ne se produit pas dans l’inconscience. Elle demande de vivre des expériences, d’en tirer un enseignement et de ne pas nourrir sans cesse les mêmes pensées ou sentiments qui empêchent d’avancer. La magie rejoint ici l’idée d’un <strong>travail patient sur sa propre vie</strong>."
    ],[
      ["Lire le psaume · Ouriel 81, v. 1, 4, 6, 7 et 12","16","081","1,4,6,7,12"],
    ]),
    card("la-magie-discernement","La vérité, la préparation et le discernement",[
      "La magie ne se résume pas à des formules, à des symboles ni à une volonté très forte. Les psaumes enseignent que l’être humain doit être <strong>préparé, éduqué et vrai</strong>. Ce qu’il prononce doit s’accorder avec ce qu’il vit. Des paroles sans justesse ou des pratiques accomplies dans l’ignorance sont mises en garde comme dangereuses.",
      "Le <strong>discernement magique</strong> consiste à rester lucide, à observer les intentions et à ne pas croire tout ce qui est affirmé avec assurance. L’étude, la méditation, la concentration et l’objectivité sont encouragées. La précaution est indispensable : comme toute science, la magie demande du savoir-faire et ne doit pas devenir un jeu."
    ],[
      ["Lire le psaume · Michaël 210, v. 2, 5, 6, 13 et 16","29","210","2,5,6,13,16"],
      ["Lire le psaume · Ouriel 99, v. 1, 2 et 8","16","099","1,2,8"],
      ["Lire le psaume · Ouriel 19, v. 24 et 26","04","019","24,26"],
    ]),
    heading("la-magie-bilan-titre","Ce qu’il faut retenir","h2"),
    paragraph("la-magie-bilan",conclusion),
    paragraph("la-magie-sources","Cette page est une <strong>synthèse rédigée</strong> des enseignements de la Bible essénienne, et non un psaume ou une citation intégrale. Les liens placés sous chaque partie permettent de lire les passages originaux."),
  ],
};

function checkPage(){
  if(PAGE.slug!==SLUG||PAGE.title!=="La magie"||PAGE.placement!=="menu"||
     PAGE.status!=="published"||PAGE.blocks.length!==13)throw Error("Page non publiable");
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
  if(sources!==15||JSON.stringify(PAGE).length>=40000)throw Error("Sources ou taille invalides");
  return {slug:PAGE.slug,title:PAGE.title,blocks:PAGE.blocks.length,cards:8,sources,rich:PAGE.blocks.filter(x=>x.type==="section").flatMap(x=>x.columns[0]).filter(x=>x.type==="text"&&x.rich.includes("<strong>")).length};
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
  const read=await query(
    "SELECT s.version,p.key AS page_index,json_extract(p.value,'$.id') AS page_id,"+
    "json_extract(p.value,'$.title') AS title,json_extract(p.value,'$.status') AS status,"+
    "json_extract(p.value,'$.blocks[1].text') AS intro "+
    "FROM site_state s,json_each(s.data,'$.pages') p WHERE s.id=1 "+
    "AND json_extract(p.value,'$.slug')=?",[SLUG]);
  const row=read.results?.[0];
  if(!row||row.page_id!=="page-la-magie"||row.title!=="La magie")
    throw Error("Page d'origine non trouvée ; aucune autre page ne sera modifiée");
  if(!Number.isSafeInteger(Number(row.version))||!Number.isSafeInteger(Number(row.page_index)))
    throw Error("Version ou indice D1 invalide");
  // Do not overwrite a page that an administrator has independently rewritten.
  const originalIntro="Que signifie le mot « magie » dans la Bible essénienne ?";
  if(row.intro===intro){console.log("La dissertation est déjà publiée : aucune modification");return;}
  if(!row.intro?.startsWith(originalIntro))
    throw Error("La page a changé dans l’administration : révision manuelle à préserver");
  const pagePath="$.pages["+row.page_index+"].blocks";
  const sql="UPDATE site_state SET data=json_set(data,?,json(?)),"+
    "version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=1 "+
    "AND version=CAST(? AS INTEGER) "+
    "AND json_extract(data,?)=? "+
    "AND json_extract(data,?)=?";
  const written=await query(sql,[pagePath,JSON.stringify(PAGE.blocks),
    String(row.version),"$.pages["+row.page_index+"].id","page-la-magie",
    "$.pages["+row.page_index+"].blocks[1].text",row.intro]);
  if(written.meta?.changes!==1)throw Error("Conflit D1 : aucun contenu n’a été écrasé");
  const check=await query("SELECT version,json_extract(p.value,'$.title') AS title,"+
    "json_extract(p.value,'$.status') AS status,json_array_length(p.value,'$.blocks') AS blocks "+
    "FROM site_state s,json_each(s.data,'$.pages') p WHERE s.id=1 "+
    "AND json_extract(p.value,'$.slug')=?",[SLUG]);
  const actual=check.results?.[0];
  if(actual?.title!=="La magie"||actual?.status!=="published"||
     actual?.blocks!==PAGE.blocks.length)throw Error("Page non vérifiée après publication");
  console.log("PAGE RÉÉCRITE : La magie, version "+actual.version+
    ", "+actual.blocks+" blocs natifs, "+validated.sources+" références");
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
