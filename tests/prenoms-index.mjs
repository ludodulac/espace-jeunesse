import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

test("La page Prénoms affiche une liste alphabétique de liens vers les fiches réellement présentes",()=>{
 const names=["Ludovic : quinze siècles d’histoire dans un prénom","Anna","Éléonore","Athénaïs"];
 const headings=names.map(textContent=>({textContent}));
 const cards=headings.map(heading=>({
  id:"",matches:sel=>sel==="section.trial-content-section",
  querySelector:sel=>sel===".trial-heading"?heading:null,
  before(el){inserted=el},
  scrollIntoView(){scrolled=this.id}
 }));
 let inserted=null,scrolled=null;
 const main={
  children:cards,
  querySelector:()=>null
 };
 function createElement(tag){
  return {tag,children:[],append(...nodes){this.children.push(...nodes)},
   setAttribute(key,value){(this.attrs??={})[key]=value}};
 }
 const document={getElementById(id){
  if(id==="stage-main")return main;
  return cards.find(x=>x.id===id)||null;
 },createElement};
 const context={
  document,
  window:{location:{search:"?page=prenoms"}},
  location:{hash:"#prenom-athenais"},
  URLSearchParams,
  MutationObserver:class{observe(){}},
  requestAnimationFrame(fn){fn()}
 };
 vm.createContext(context);
 vm.runInContext(readFileSync(new URL("../assets/ej-prenoms-index.js",import.meta.url),"utf8"),context);
 assert.equal(inserted?.tag,"nav");
 assert.equal(inserted.attrs["aria-label"],"Sommaire des prénoms");
 const links=inserted.children[2].children;
 assert.deepEqual(Array.from(links,x=>x.textContent),["Anna","Athénaïs","Éléonore","Ludovic"]);
 assert.deepEqual(Array.from(links,x=>x.href),["#prenom-anna","#prenom-athenais","#prenom-eleonore","#prenom-ludovic"]);
 assert.equal(scrolled,"prenom-athenais");
});

test("Le sommaire n'apparaît pas sur les autres pages",()=>{
 let calls=0;
 const context={
  document:{
   getElementById:()=>({querySelector(){calls++},children:[]})
  },
  window:{location:{search:"?page=accueil"}},
  URLSearchParams,
  MutationObserver:class{observe(){}}
 };
 vm.createContext(context);
 vm.runInContext(readFileSync(new URL("../assets/ej-prenoms-index.js",import.meta.url),"utf8"),context);
 assert.equal(calls,0);
});
