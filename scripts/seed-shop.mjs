/* Amorçage non destructif de la boutique D1.
 * N'écrase JAMAIS les données d'un catalogue déjà personnalisé.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const input=JSON.parse(readFileSync('data/shop-starter.json','utf8'));
if(!Array.isArray(input.products)||input.products.length<21||
   !Array.isArray(input.collections)||!Array.isArray(input.artisans)){
 throw Error('Catalogue initial inattendu : arrêt.');
}
const serialized=JSON.stringify(input);
if(serialized.length>360000)throw Error('Catalogue initial trop volumineux.');
const sql="INSERT OR IGNORE INTO shop_state(id,version,data) VALUES(1,1,'"+
 serialized.replaceAll("'","''")+"');\n";
writeFileSync('/tmp/espace-jeunesse-seed-shop.sql',sql,{mode:0o600});
console.log('Amorçage préparé : '+input.products.length+' fiches (INSERT OR IGNORE uniquement).');

/* Migration idempotente : ne modifie jamais les autres produits et ne s'exécute que si l'oiseau manque. */
const spotlightSql="UPDATE shop_state SET data=json_set(data,'$.products',json_insert((SELECT json_group_array(json(json_set(p.value,'$.sort',CASE json_extract(p.value,'$.id') WHEN 'peluche-20' THEN 1 WHEN 'peluche-04' THEN 2 WHEN 'peluche-persephone-oiseau' THEN 3 WHEN 'peluche-21' THEN 4 WHEN 'peluche-07' THEN 5 ELSE 100 + CAST(json_extract(p.value,'$.sort') AS INTEGER) END,'$.description',CASE json_extract(p.value,'$.id') WHEN 'peluche-20' THEN 'La tortue évoque patience et persévérance.' WHEN 'peluche-04' THEN 'La biche nous inspire douceur et délicatesse.' WHEN 'peluche-persephone-oiseau' THEN 'L''oiseau inspire liberté et imagination. Objet de collection : ne convient pas aux moins de 14 ans.' WHEN 'peluche-21' THEN 'Ces petites vaches évoquent tendresse et curiosité.' WHEN 'peluche-07' THEN 'La chouette rappelle l''observation et la sagesse.' ELSE COALESCE(json_extract(p.value,'$.description'),'') END))) FROM json_each(shop_state.data,'$.products') AS p),'$[#]',json('{\"id\":\"peluche-persephone-oiseau\",\"slug\":\"oiseau-hell-of-persephone\",\"name\":\"Peluche oiseau au crochet — modèle au choix\",\"animal\":\"Oiseau\",\"description\":\"L''oiseau inspire liberté et imagination. Objet de collection : ne convient pas aux moins de 14 ans.\",\"collectionId\":\"animaux-totems\",\"artisanId\":\"atelier-hell-of-persephone\",\"imageUrl\":\"https://www.hellofpersephone-crochet.com/cdn/shop/files/IMG_9947.jpg?v=1718797731&width=1200\",\"additionalImages\":[],\"productUrl\":\"https://www.hellofpersephone-crochet.com/products/peluche-oiseau-au-crochet\",\"priceLabel\":\"\",\"affiliate\":false,\"status\":\"published\",\"featured\":true,\"sort\":3}')),'$.artisans',CASE WHEN EXISTS(SELECT 1 FROM json_each(shop_state.data,'$.artisans') AS a WHERE json_extract(a.value,'$.id')='atelier-hell-of-persephone') THEN json_extract(shop_state.data,'$.artisans') ELSE json_insert(json_extract(shop_state.data,'$.artisans'),'$[#]',json('{\"id\":\"atelier-hell-of-persephone\",\"name\":\"Hell of Persephone\",\"description\":\"Atelier breton de peluches et créations au crochet. Aucun partenariat commercial conclu à ce jour.\",\"website\":\"https://www.hellofpersephone-crochet.com/\",\"email\":\"hellofpersephone@gmail.com\",\"location\":\"Bretagne, France\",\"partner\":false,\"approvedImages\":false}')) END),version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=1 AND NOT EXISTS(SELECT 1 FROM json_each(data,'$.products') AS p WHERE json_extract(p.value,'$.id')='peluche-persephone-oiseau');\n";
writeFileSync('/tmp/espace-jeunesse-feature-five.sql',spotlightSql,{mode:0o600});
console.log('Priorité des cinq artisans préparée.');
