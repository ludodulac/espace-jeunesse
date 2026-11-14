import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function load(){
 const context={window:{}};
 vm.createContext(context);
 for(const file of ["assets/ej-prenoms.js","assets/ej-prenoms-suite-a.js","assets/ej-prenoms-suite-b.js"])
  vm.runInContext(read(file),context,{filename:file});
 return context.window.EJNames;
}
const initial=()=>({title:"Espace Jeunesse",homeId:"accueil",pages:[
 {id:"accueil",slug:"accueil",title:"Accueil",status:"published",placement:"menu",blocks:[]}
]});
const expected=["Anna","Melchior","Billie","Jeanne","Frédéric","Paloma","Geneviève","Paul","Lisa",
 "Catherine","Sandra","Patrick","Éléonore","Lucien","Alain","Lucie","Loreleï","Sidonie","Clément","Athénaïs"];
test("La page Prénoms conserve Ludovic et ajoute les 20 nouvelles fiches dans l’ordre souhaité",()=>{
 const names=load(),site=names.mergeSite(initial());
 const page=site.pages.find(p=>p.slug==="prenoms");
 assert.ok(page);
 assert.equal(page.status,"published");
 assert.equal(page.placement,"menu");
 const fiches=page.blocks.filter(b=>b.type==="section");
 assert.equal(fiches.length,21);
 assert.deepEqual(Array.from(fiches.slice(1),f=>f.columns[0][0].text),expected);
 assert.ok(fiches.every(f=>f.style.border==="round"));
 assert.ok(fiches.every(f=>f.columns[0].some(b=>b.type==="image")));
 assert.ok(fiches.every(f=>f.columns[0].some(b=>b.type==="button")));
 assert.ok(fiches.every(f=>f.columns[0].length<=100));
 const ids=page.blocks.flatMap(b=>[b.id,...(b.columns||[]).flatMap(c=>c.map?.(e=>e.id)||[])]); 
 assert.equal(ids.length,new Set(ids).size);
 assert.equal(names.mergeSite(site).pages.find(p=>p.slug==="prenoms").blocks.length,page.blocks.length);
});
test("Une fiche personnalisée dans l'administration n'est pas écrasée",()=>{
 const names=load(),site=names.mergeSite(initial());
 const page=site.pages.find(p=>p.slug==="prenoms");
 const anna=page.blocks.find(b=>b.id==="prenoms-fiche-anna");
 anna.columns[0].find(b=>b.id==="prenoms-fiche-anna-chapô").text="Mon texte personnalisé";
 const after=names.mergeSite(site).pages.find(p=>p.slug==="prenoms");
 assert.equal(after.blocks.find(b=>b.id==="prenoms-fiche-anna").columns[0].find(b=>b.id==="prenoms-fiche-anna-chapô").text,"Mon texte personnalisé");
});
