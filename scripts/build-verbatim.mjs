/* Espace Jeunesse : construit la copie réelle du client Célébrations depuis un
 * commit IMMUTABLE. Lit uniquement le dépôt source, jamais d'écriture dedans.
 * Ne change pas le moteur des blocs : sectionMenu, sectionColumn,
 * renderSection, block, formatbar, déplacement tactile, dialogues.
 */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
const ORIGIN="f4cc58653dd68d8a4c3e0fa614a93969987d47da";
const root=resolve(".upstream-celebrations/migration/cloudflare");
const imp=async file=>import(pathToFileURL(resolve(root,file)).href);
const {DEMO_CLIENT}=await imp("editor-demo-client.mjs");
const {MEMBER_SPACES_INLINE}=await imp("app/admin/real-editor-member-spaces-inline.mjs");
const {DEMO_CSS}=await imp("editor-demo-style.mjs");
const {ADMIN_STAGE_LAYOUT}=await imp("app/styles/admin/stage-layout.mjs");
if(DEMO_CLIENT.length<170000||DEMO_CSS.length<70000||MEMBER_SPACES_INLINE.length<100000)
 throw Error("Le moteur Célébrations original n'est pas présent en entier");
let client=MEMBER_SPACES_INLINE+"\n"+DEMO_CLIENT;
const once=(from,to,label)=>{
 const count=client.split(from).length-1;
 if(count!==1)throw Error(label+": "+count+" occurrences, copie refusée");
 client=client.replace(from,to);
};
const seedStart=client.indexOf("const seed={pages:[");
const seedEnd=client.indexOf("\nconst clone=o=>",seedStart);
if(seedStart<0||seedEnd<0)throw Error("Gabarit d'accueil canonique introuvable");
const SEED={pages:[{id:"accueil",name:"Accueil",group:"page",placement:"menu",
 visibility:"published",blocks:[]}]};
client=client.slice(0,seedStart)+"const seed="+JSON.stringify(SEED)+";"+client.slice(seedEnd);
once("let tab=stageTab,id=","let tab=STAGE_SEED?stageTab:'pages',id=","onglet de démarrage");
const oldKey="'celebrations-demo-editor-v1'";
if(!client.includes(oldKey))throw Error("Clé source originale absente");
client=client.replaceAll(oldKey,"'ej-original-editor-v1'");
once("SHARED_KEY='celebrations-demo-shared-pages-v1'","SHARED_KEY='ej-original-shared-pages-v1'","pages isolées");
once("'celebrations-demo-files-v1'","'ej-original-files-v1'","fichiers isolés");

// Les deux groupes 'page' et 'footer' restent des fonctions réelles d'origine.
// Seuls les paramètres Membres/Langues/Célébrations sont désactivés.
once("function settings(){","function celebrationsSettings(){","réglages hors-sujet");
once("function userGuide(){","function celebrationsUserGuide(){","guide hors-sujet");
const insertBefore="function render(){";
if(!client.includes(insertBefore))throw Error("Cadre rendu original introuvable");
const extra=`
function settings(){
 const panel=n('section','panel');
 panel.append(n('h2','','Informations du site'));
 const title=n('label','settings-field','Nom du site');
 const t=n('input');t.value=window.EJBridge?.meta?.title||'Espace Jeunesse';
 t.onchange=()=>{window.EJBridge.meta.title=t.value.trim().slice(0,100);window.EJBridge.queueSave(clone(db));};
 title.append(t);panel.append(title);
 const caption=n('label','settings-field','Sous-titre');
 const s=n('input');s.value=window.EJBridge?.meta?.tagline||'';
 s.onchange=()=>{window.EJBridge.meta.tagline=s.value.trim().slice(0,160);window.EJBridge.queueSave(clone(db));};
 caption.append(s);panel.append(caption);
 panel.append(n('p','hint','Pages, menu et médiathèque : rien sur les membres, langues ou célébrations.'));
 w.append(panel);
}
function userGuide(){
 const panel=n('section','panel');
 panel.append(n('h2','','Mode d’emploi du site'));
 const ol=n('ol');
 for(const instruction of [
 '＋ bleu : ajouter une zone entière, simple ou à deux colonnes.',
 '＋ vert : ajouter un élément à l’intérieur d’une zone.',
 'Touchez un titre ou un texte pour le modifier directement.',
 'Choisissez les images, MP3, vidéos et documents dans la médiathèque administrative.',
 'Utilisez Pages et Pages de bas de page pour organiser le site.',
 'Aperçu : vérifier avant de publier ; Enregistrer : conserver les modifications.'
 ])ol.append(n('li','',instruction));
 panel.append(ol);w.append(panel);
}
`;
client=client.replace(insertBefore,extra+insertBefore);

// Charger les pages du nouveau Worker AVANT l'initialisation de l'état local.
// En mode démo sans Cloudflare, ne modifier aucun stockage d'autre projet.
once("const localEditorState=createEditorState({STAGE_SEED,KEY,seed,clone,storage:localStorage,search:location.search});",
"await window.EJBridge?.prepare?.(KEY,seed);\nconst localEditorState=createEditorState({STAGE_SEED,KEY,seed,clone,storage:localStorage,search:location.search});",
"chargement préalable");
once("localStorage.setItem(KEY,JSON.stringify(db));saveShared();saveLocalizationLocal();dirty=false;",
"localStorage.setItem(KEY,JSON.stringify(db));saveShared();saveLocalizationLocal();dirty=false;\n  window.EJBridge?.queueSave?.(clone(db));",
"persistance native");
once("async function refreshGlobalMedia(){",
"async function refreshGlobalMedia(){\n if(window.EJBridge?.remote){globalMedia=await window.EJBridge.listMedia();globalMediaLoaded=true;remoteMediaLoading=false;if(tab==='media')render();return;}",
"médiathèque R2");
once("async function importFiles(files){",
"async function importFiles(files){\n if(window.EJBridge?.remote){await window.EJBridge.importFiles(files);globalMedia=await window.EJBridge.listMedia();globalMediaLoaded=true;render();return;}",
"import des médias");
once("if(IS_STAGE&&!globalMediaLoaded)void refreshGlobalMedia().then(()=>{if(dialog.open)draw()});",
"if((IS_STAGE||window.EJBridge?.remote)&&!globalMediaLoaded)void refreshGlobalMedia().then(()=>{if(dialog.open)draw()});",
"fichiers du sélecteur");
once("if(IS_STAGE&&!remoteMediaLoading&&!globalMediaLoaded)void refreshGlobalMedia();",
"if((IS_STAGE||window.EJBridge?.remote)&&!remoteMediaLoading&&!globalMediaLoaded)void refreshGlobalMedia();",
"médias dans l'administration");
once("const src=key&&/^editor-trials\\/audio\\/[0-9a-f-]{36}\\.mp3$/.test(key)",
"const src=key&&/^editor-trials\\/audio\\/[0-9a-f-]{36}\\.mp3$/.test(key)",
"intégrité du lecteur MP3"); // No-op assertion on official code.
const originalAudio=":/^\\/media\\/(?!.*\\.\\.)[^?#]+\\.mp3$/i.test(String(x.src||''))?x.src:'';";
if(!client.includes(originalAudio))throw Error("La source audio Célébrations a changé");
client=client.replace(originalAudio,":window.EJBridge?.remote&&/^https:\\/\\//.test(String(x.src||''))?x.src:(/^\\/media\\/(?!.*\\.\\.)[^?#]+\\.mp3$/i.test(String(x.src||''))?x.src:'');");
// Original client source, unchanged except these explicit isolation adaptations.
client+="\n//# sourceURL=ej-verbatim-compiled-celebrations.js\n";
mkdirSync("assets",{recursive:true});
writeFileSync("assets/celebrations-editor-verbatim.js",client);
writeFileSync("assets/celebrations-editor-verbatim.css",DEMO_CSS+"\n"+ADMIN_STAGE_LAYOUT);
const html=`<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#293746"><title>Administration — Espace Jeunesse</title>
<link rel="stylesheet" href="assets/celebrations-editor-verbatim.css">
<link rel="stylesheet" href="assets/ej-auth.css">
<link rel="stylesheet" href="assets/ej-admin-layout.css">
<script src="config.js" defer></script>
<script src="assets/ej-original-bridge.js" defer></script>
</head><body>
<div id="ej-auth-screen" hidden></div>
<div class="shell stage-editor" id="ej-original-shell" hidden>
<aside class="rail"><div class="brand"><div class="mark">✦</div><div><strong>Administration</strong></div></div>
<nav aria-label="Navigation">
<button class="navbtn" data-tab="pages">▤ Pages</button>
<button class="navbtn" data-tab="footer">▤ Pages de bas de page</button>
<button class="navbtn" data-tab="media">▧ Médiathèque (administration)</button>
<button class="navbtn" data-tab="settings">⚙ Paramètres</button>
<button class="navbtn" data-tab="guide">ⓘ Mode d’emploi</button>
<a id="view-site-btn" class="navbtn ej-site-link" href="index.html" target="_blank" rel="noopener noreferrer" aria-label="Voir le site public dans un nouvel onglet">↗ Voir le site</a>
</nav></aside>
<div class="content"><div class="topbar" role="region" aria-label="Commandes permanentes d'édition"><div class="actions" role="toolbar" aria-label="Modifier et enregistrer">
<button id="preview-btn" class="btn sm" title="Prévisualiser la page sans la publier">Aperçu du brouillon</button>
<button id="save-btn" class="btn primary">Enregistrer</button>
</div></div>
<main class="main"><div id="ej-storage-notice" role="status"></div><div id="workspace"></div>
<p class="status" id="status" role="status" aria-live="polite"></p></main></div></div>
<div id="editor-save-toast" class="editor-save-toast" role="status" aria-live="polite" hidden></div>
<input id="image-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>
</body></html>`;
writeFileSync("admin.html",html);
writeFileSync("assets/ej-source-provenance.json",JSON.stringify({
 source:"ludodulac/Celebrations",sha:ORIGIN,
 files:["migration/cloudflare/editor-demo-client.mjs",
 "migration/cloudflare/app/admin/real-editor-member-spaces-inline.mjs",
 "migration/cloudflare/editor-demo-style.mjs",
 "migration/cloudflare/app/styles/admin/stage-layout.mjs"],
 approach:"Exécution du véritable client canonique après isolation pages-only et stockage nouveau site.",
 generatedAt:new Date().toISOString()
},null,2));
console.log("Original admin compiled",client.length,"CSS",DEMO_CSS.length);


/* Le moteur VISITEURS est, lui aussi, le vrai composant Célébrations, pas
 * une imitation maison. Toutes les navigations membres/célébrations sont
 * supprimées du menu ; les fonctions de rendu sont conservées telles quelles.
 */
const {TRIAL_SITE_CLIENT,TRIAL_SITE_STYLE}=await imp("editor-trial-site-client.mjs");
const {PUBLIC_LANGUAGE_STYLE}=await imp("editor-trial-site-page.mjs");
const {SERVER_PREVIEW_PREFETCH}=await imp("editor-server-sync-client.mjs");
let visitor=TRIAL_SITE_CLIENT;
if(visitor.length<50000)throw Error("Le vrai moteur visiteur est incomplet.");
function publicOnce(from,to,label){
 const count=visitor.split(from).length-1;
 if(count!==1)throw Error(label+": "+count+" occurrences; arrêt pour éviter une imitation.");
 visitor=visitor.replace(from,to);
}
if(visitor.includes(SERVER_PREVIEW_PREFETCH))visitor=visitor.replace(SERVER_PREVIEW_PREFETCH,"");
// Le nouveau site a des IDs simples ; l'ancien filtre de pages historiques
// est donc remplacé par un filtre de pages publiées, mais pas leur affichage.
publicOnce("(p.id==='neutral-accueil-general'||/^neutral-[0-9a-f-]{30,45}$/.test(p.id))","true","filtre des pages historiques");
publicOnce("const all=make('button',listing?'general-tab current':'general-tab',t('✧ Célébrations'));",
 "const all=null;","menu célébrations masqué");
publicOnce("all.type='button';all.onclick=()=>go('celebrations');general.append(all);",
 "/* Pas de célébrations sur Espace Jeunesse. */","action menu célébrations");
publicOnce("const library=make('button',active==='mediatheque-generale'?'general-tab current':'general-tab',t('▧ Médiathèque générale'));",
 "const library=null;","menu médiathèque publique masqué");
publicOnce("library.type='button';library.onclick=()=>go('mediatheque-generale');general.append(library);",
 "/* La médiathèque reste UNIQUEMENT dans l'administration. */","action médiathèque publique");
publicOnce("el('back-admin').href='/__editor/demo-preparation?celebration='+encodeURIComponent(celebration)+'&page='+encodeURIComponent(active);",
 "el('back-admin').href='admin.html';","lien admin indépendant");
publicOnce("next.searchParams.set('celebration',celebration);","next.searchParams.delete('celebration');","pas de célébration dans les URLs");
// Autoriser uniquement les MP3 provenant du NOUVEAU Worker d'Espace Jeunesse.
const publicAudioCheck="/^\\/media\\/(?!.*\\.\\.)[^?#]+\\.mp3$/i.test(String(b.src||''))?b.src:''";
publicOnce(publicAudioCheck,
 "(window.__EJ_WORKER_MEDIA_BASE__ && String(b.src||'').startsWith(window.__EJ_WORKER_MEDIA_BASE__+'/media/'))?b.src:("+publicAudioCheck+")",
 "lecture MP3 depuis le nouveau R2");
// Pas de langues ni de membres à activer côté visiteur, et jamais d'appel à l'API Célébrations.
visitor+="\n//# sourceURL=ej-original-celebrations-public.js\n";
writeFileSync("assets/celebrations-public-verbatim.js",visitor);
writeFileSync("assets/celebrations-public-verbatim.css",TRIAL_SITE_STYLE+"\n"+PUBLIC_LANGUAGE_STYLE);
console.log("Original public compiled",visitor.length,"CSS",TRIAL_SITE_STYLE.length+PUBLIC_LANGUAGE_STYLE.length);
