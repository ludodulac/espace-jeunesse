/* Nettoyage ciblé de la vitrine Espace Jeunesse, sans toucher aux pages.
 * Ne modifie que les champs éditoriaux historiques de la boutique.
 * Les images, produits, liens marchands et fiches artisans sont conservés.
 */
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const DB='espace-jeunesse-db', CONFIG='worker/wrangler-ci.toml';
const args=['--yes','wrangler@4','d1','execute',DB,'--remote','--config',CONFIG,
  '--command','SELECT version,data FROM shop_state WHERE id=1','--json'];
const raw=execFileSync('npx',args,{encoding:'utf8',maxBuffer:8*1024*1024});
let result;
try{result=JSON.parse(raw)}catch{throw Error('Lecture D1 JSON impossible (aucune donnée modifiée)')}
const batches=Array.isArray(result)?result:[result];
const rows=batches.flatMap(batch=>batch?.results||batch?.result?.results||[]);
const row=rows.find(x=>x&&x.data);
if(!row)throw Error('Catalogue D1 introuvable : nettoyage abandonné');
const version=Number(row.version);
if(!Number.isSafeInteger(version)||version<1)throw Error('Version D1 invalide');
let catalog;
try{catalog=JSON.parse(row.data)}catch{throw Error('Catalogue D1 JSON invalide')}
if(!Array.isArray(catalog.products)||!Array.isArray(catalog.collections))throw Error('Structure du catalogue inattendue');
let removed=0,edited=0;
for(const p of catalog.products){
 if(Object.hasOwn(p,'symbolism')){delete p.symbolism;removed++}
 if(Object.hasOwn(p,'biblawRef')){delete p.biblawRef;removed++}
}
for(const col of catalog.collections){
 if(col.id!=='animaux-totems')continue; // ID conservé pour les produits existants.
 if(col.name==='Peluches des animaux totems'){col.name='Peluches artisanales';edited++}
 if(col.slug==='animaux-totems'){col.slug='peluches-artisanales';edited++}
 if(/Bible|psaume|essénien|totem/i.test(col.description||'')){
   col.description='Une sélection de peluches à découvrir chez leurs créateurs.';edited++
 }
}
const destination='/tmp/espace-jeunesse-shop-cleanup.sql';
if(!removed&&!edited){
 writeFileSync(destination,'SELECT 1;'+String.fromCharCode(10),{mode:0o600});
 console.log('Boutique déjà neutre ; aucun enregistrement modifié.');
}else{
 const serialized=JSON.stringify(catalog);
 if(serialized.length>360000)throw Error('Catalogue trop volumineux ; aucune donnée modifiée');
 const sql="UPDATE shop_state SET data='"+serialized.replaceAll("'","''")+
  "',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=1 AND version="+version+";\n";
 writeFileSync(destination,sql,{mode:0o600});
 console.log('Nettoyage préparé : '+removed+' champs éditoriaux retirés, '+edited+' textes de collection adaptés, '+catalog.products.length+' fiches préservées.');
}
