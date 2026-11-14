/* Amorçage non destructif de la boutique D1.
 * N'écrase JAMAIS les données d'un catalogue déjà personnalisé.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const input=JSON.parse(readFileSync('data/shop-starter.json','utf8'));
if(!Array.isArray(input.products)||input.products.length!==21||
   !Array.isArray(input.collections)||!Array.isArray(input.artisans)){
 throw Error('Catalogue initial inattendu : arrêt.');
}
const serialized=JSON.stringify(input);
if(serialized.length>360000)throw Error('Catalogue initial trop volumineux.');
const sql="INSERT OR IGNORE INTO shop_state(id,version,data) VALUES(1,1,'"+
 serialized.replaceAll("'","''")+"');\n";
writeFileSync('/tmp/espace-jeunesse-seed-shop.sql',sql,{mode:0o600});
console.log('Amorçage préparé : 21 fiches (INSERT OR IGNORE uniquement).');
