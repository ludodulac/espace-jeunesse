/* Publication idempotente des livres de la boutique dans la D1 indépendante Espace Jeunesse.
 * Source de vérité : data/shop-starter.json (livres-*).
 * Préserve les fiches existantes, les modifications de l'éditeur et les autres collections.
 */
import {readFileSync,writeFileSync} from 'node:fs';

const catalog=JSON.parse(readFileSync('data/shop-starter.json','utf8'));
const collection=catalog.collections.find(c=>c.id==='livres-et-contes');
const books=catalog.products.filter(p=>p.id.startsWith('livre-')&&p.collectionId==='livres-et-contes');
if(!collection||books.length!==18||collection.status!=='published')
 throw Error('Lot de 18 livres ou collection publique absent : migration arrêtée.');
const required=new Set(books.map(p=>p.artisanId));
const publishers=catalog.artisans.filter(p=>required.has(p.id));
if(publishers.length!==required.size||new Set(books.map(p=>p.id)).size!==books.length)
 throw Error('Editeurs ou identifiants de livres incohérents.');
const q=v=>"'"+String(v).replaceAll("'","''")+"'";
const j=v=>"json("+q(JSON.stringify(v))+")";
const missing=(section,id)=>"NOT EXISTS (SELECT 1 FROM json_each(data,'$."+section+"') AS x WHERE json_extract(x.value,'$.id')="+q(id)+")";
const add=(section,row)=>{
 const sql="UPDATE shop_state SET data=json_insert(data,'$."+section+"[#]',"+j(row)+"),"+
 "version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=1 AND "+missing(section,row.id)+";";
 return sql;
};
const sql=[
 "-- Uniquement la D1 espace-jeunesse-db : changements additifs et reproductibles.",
 add('collections',collection)
];
// Dans une collection historique encore en brouillon, modifier seulement le statut et
// le texte de présentation ; aucune autre collection n'est touchée.
sql.push(
 "UPDATE shop_state SET data=json_set(data,'$.collections',"+
 "(SELECT json_group_array(json(CASE WHEN json_extract(c.value,'$.id')='livres-et-contes'"+
 " THEN json_set(c.value,'$.status','published','$.description',"+q(collection.description)+",'$.name',"+q(collection.name)+")"+
 " ELSE c.value END)) FROM json_each(data,'$.collections') c)),version=version+1,updated_at=CURRENT_TIMESTAMP"+
 " WHERE id=1 AND EXISTS (SELECT 1 FROM json_each(data,'$.collections') c"+
 " WHERE json_extract(c.value,'$.id')='livres-et-contes'"+
 " AND json_extract(c.value,'$.status')!='published');"
);
for(const publisher of publishers)sql.push(add('artisans',publisher));
for(const book of books)sql.push(add('products',book));
const destination='/tmp/espace-jeunesse-books.sql';
writeFileSync(destination,sql.join('\n')+'\n',{mode:0o600});
console.log('Migration additive préparée : '+books.length+' livres et '+publishers.length+' maisons d’édition, sans liens affiliés.');
