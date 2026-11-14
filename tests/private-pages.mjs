import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Vérification du cloisonnement de la réponse publique / réponse administrateur.
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const worker=read("worker/src/index.js");
const start=worker.indexOf("function visibleBlock(");
const end=worker.indexOf("function cleanBlock(",start);
assert.ok(start>=0&&end>start,"Fonctions de projection présentes");
const {publicProjection,visitorProjection}=new Function(
 worker.slice(start,end)+"\nreturn {publicProjection,visitorProjection}"
)();
const page=status=>({id:status,slug:status,title:status,status,placement:"menu",blocks:[
 {id:"public",type:"text",text:"TEST"},
 {id:"hidden",type:"text",text:"NON",hideOnSite:true}
]});
const state={title:"Test",tagline:"Test",homeId:"published",
 pages:["published","private","draft","hidden"].map(page)};
assert.deepEqual(publicProjection(state).pages.map(p=>p.id),["published"],
 "L'API publique ne doit révéler ni page privée ni brouillon");
assert.deepEqual(visitorProjection(state,true).pages.map(p=>p.id),["published","private"],
 "La réponse autorisée contient seulement les pages visibles à l'administrateur");
assert.equal(publicProjection(state).pages[0].blocks.length,1,
 "Les blocs cachés ne doivent pas être livrés");
assert.match(worker,/if\(!await isAdmin\(env,req\)\)return fail\(env,req,"Authentification requise",401\)/);
assert.ok(worker.indexOf('path==="/api/admin/visitor-site"')>
 worker.indexOf('if(!await isAdmin(env,req))'),
 "La route privée doit être placée après le garde d'authentification");
assert.match(worker,/\["published","draft","hidden","private"\]\.includes\(p\.status\)/);
const admin=read("assets/ej-original-bridge.js");
const visitor=read("assets/ej-visitor-bridge.js");
const editor=read("assets/celebrations-editor-verbatim.js");
assert.match(admin,/localStorage\.setItem\(TOKEN_KEY,token\)/);
assert.match(admin,/localStorage\.removeItem\(TOKEN_KEY\)/);
assert.match(visitor,/privateAuthorized&&p\.status==="private"/);
assert.match(visitor,/API\+"\/api\/admin\/visitor-site"/);
assert.match(editor,/\['private','Privée — moi seul'\]/);
console.log("Tests de cloisonnement des pages privées : OK");
