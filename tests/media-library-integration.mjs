import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import worker from '../worker/src/index.js';

const code=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const uuid='11111111-1111-4111-8111-111111111111';

test('Bibliothèque EJ indépendante des sons du studio',()=>{
 const source=code('assets/ej-media-library.js');
 assert.match(source,/N'apparaît nulle part/);
 assert.match(source,/state-published|state-/);
 assert.match(source,/Copier l’URL/);
 assert.doesNotMatch(source,/studio-sounds|foret-enchantee-contes/);
 assert.match(code('worker/schema.sql'),/CREATE TABLE IF NOT EXISTS ludodio_links/);
 assert.match(code('admin.html'),/ej-media-library\.js/);
});

test('Catalogue Ludodio ne renvoie que les audios autorisés',async()=>{
 const env={
  DB:{prepare(sql){
    assert.match(sql,/JOIN ludodio_links/);
    return {all:async()=>({results:[{id:uuid,name:'Conte test.mp3',size:16000}]})};
  }},
  MEDIA:{}
 };
 const response=await worker.fetch(new Request('https://espace-jeunesse-api.example/api/ludodio/catalog'),env);
 assert.equal(response.status,200);
 const data=await response.json();
 assert.deepEqual(data.audios.map(a=>a.id),[uuid]);
 assert.equal(data.audios[0].url,'https://espace-jeunesse-api.example/media/'+uuid);
});

test('Une URL directe de media reste publique, même sans session administrateur',async()=>{
 const env={
  DB:{prepare:()=>({bind:()=>({first:async()=>({id:uuid,r2_key:'media/'+uuid,mime:'audio/mpeg',name:'Conte.mp3'})})})},
  MEDIA:{get:async()=>({body:new Blob(['test']).stream(),size:4,httpEtag:'"etag"'})}
 };
 const response=await worker.fetch(new Request('https://espace-jeunesse-api.example/media/'+uuid,{method:'HEAD'}),env);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Content-Type'),'audio/mpeg');
 assert.equal(response.headers.get('Accept-Ranges'),'bytes');
});
