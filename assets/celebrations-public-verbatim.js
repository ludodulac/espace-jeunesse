
(async()=>{'use strict';
const seed=window.__TRIAL_SITE_SEED__;
const qs=new URLSearchParams(location.search);
// Read this only AFTER async published-page prefetch has hydrated the browser.
const publicOnly=p=>publicVisitorModel.published(p,window.__PUBLIC_PAGE_IDS__);
const celebration=String(seed.celebrationId);
const __name=(fn,name)=>{Object.defineProperty(fn,'name',{value:name,configurable:true});return fn};
function createPublicVisitorModel(){
 function published(page,ids){
  return !!page&&page.visibility!=='draft'&&page.visibility!=='hidden'&&
   Array.isArray(ids)&&ids.some(id=>String(id)===String(page.id));
 }
 function assetIds(pages){
  const found=new Set();
  function walk(items){
   for(const item of items||[]){
    if(!item||typeof item!=='object')continue;
    for(const field of ['assetId','coverAssetId'])
     if(typeof item[field]==='string'&&item[field])found.add(item[field]);
    if(item.kind==='section')for(const col of item.columns||[])
     if(Array.isArray(col))walk(col);
   }
  }
  for(const page of pages||[])walk(page.blocks);
  return found;
 }
 function publicSnapshot(result){
  if(result?.ok!==true||!Array.isArray(result.shared?.pages))return null;
  // Defence in depth: exclude any hidden/draft page even if an upstream
  // public endpoint accidentally includes it. Never modify R2 data objects.
  const visible=p=>p&&p.visibility!=='draft'&&p.visibility!=='hidden';
  const shared={...result.shared,pages:result.shared.pages.filter(visible)};
  const managedId=(id,kind)=>typeof id==='string'&&new RegExp('^'+kind+':[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$').test(id);
  const spaces=(Array.isArray(result.record?.spaces)?result.record.spaces:[]).flatMap(s=>{
   if(!s||!managedId(s.id,'space')||s.visibility!=='PUBLIC'||s.publicationStatus!=='published'||typeof s.name!=='string')return [];
   const pages=(Array.isArray(s.pages)?s.pages:[]).filter(p=>visible(p)&&p.visibility==='published'&&
    managedId(p.id,'page')&&p.group==='celebration'&&Array.isArray(p.blocks)&&!Object.hasOwn(p,'accessPolicy')&&!Object.hasOwn(p,'spaceId'));
   return pages.length?[{id:s.id,name:s.name,pages}]:[];
  });
  const {spaces:ignoredSpaces,...recordFields}=result.record||{};
  const record=result.record?{...recordFields,
   pages:(Array.isArray(result.record.pages)?result.record.pages:[]).filter(visible),...(spaces.length?{spaces}:{})}:null;
  return {
   record,shared,
   plans:Array.isArray(result.plans)?result.plans:[],
   // Title-only entries are already sanitized by the server. Never hydrate
   // private pages through the anonymous public snapshot.
   titleOnlyCelebrations:(Array.isArray(result.titleOnlyCelebrations)?
     result.titleOnlyCelebrations:[]).filter(p=>p?.titleOnly===true&&
     typeof p.id==='string'&&/^plan-[a-z0-9-]{5,90}$/.test(p.id))
    .map(p=>({id:p.id,title:typeof p.title==='string'?p.title.slice(0,160):'',
     archangel:typeof p.archangel==='string'?p.archangel.slice(0,80):'',
     year:typeof p.year==='string'?p.year.slice(0,30):'',titleOnly:true})),
   ids:[...(record?.pages||[]),...shared.pages,...spaces.flatMap(s=>s.pages)].map(page=>page.id),
   visible:result.celebrationVisible===true,
   visibility:result.celebrationVisibility||{},
   media:Array.isArray(result.media)?result.media:[]
  };
 }
 return {published,assetIds,publicSnapshot};
}
function projectAuthorizedMemberPages(response,languageId){
 if(!response||!Array.isArray(response.pages))throw new TypeError('Liste invalide');
 const seen=new Set(),menu=[];
 for(const page of response.pages){
  if(!page||typeof page.id!=='string'||!/^page:[0-9a-f-]{36}$/.test(page.id)||
     typeof page.name!=='string'||typeof page.celebrationId!=='string'||
     !page.celebrationId||(page.languageId!==languageId&&!(page.languageId==='fr'&&page.requestedLanguageId===languageId&&page.usedFallback===true))||seen.has(page.id))continue;
  seen.add(page.id);
  // Copy only fields required for labels and navigation, never returned ACLs,
  // draft translations, media paths or credentials.
  const item={id:page.id,name:page.name,celebrationId:page.celebrationId,
   languageId:page.languageId,requestedLanguageId:page.requestedLanguageId,usedFallback:page.usedFallback===true};
  for(const field of ['celebrationLabel','spaceName'])
   if(typeof page[field]==='string')item[field]=page[field];
  menu.push(item);
 }
 return menu;
}
const flagImage=/^(?:\/)?(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:svg|png|webp|gif)$/i;
function appendFlag(parent,flag,doc) {
 const value=typeof flag==='string'?flag:'';
 if(value&&!value.includes('..')&&flagImage.test(value)) {
  const image=doc.createElement('img');
  image.className='public-language-flag';
  image.setAttribute('alt','');
  image.setAttribute('loading','lazy');
  image.setAttribute('src',value.startsWith('/')?value:'/'+value);
  parent.append(image);
 }else{
  const span=doc.createElement('span');
  span.className='public-language-flag';
  span.textContent=value||'🌐';
  parent.append(span);
 }
}
function addLanguageLabel(parent,option,doc) {
 appendFlag(parent,option.flag,doc);
 const name=doc.createElement('span');
 name.textContent=option.name;
 name.className='public-language-name';
 parent.append(name);
}
function renderPublicLanguageSelector(container,options,{label='Choisir la langue'}={}) {
 if(!container||!container.ownerDocument||
    !Array.isArray(options)||!options.length)
  throw new TypeError('Conteneur DOM et langues publiques requises.');
 const doc=container.ownerDocument;
 const details=doc.createElement('details');
 details.className='public-language-selector';
 const summary=doc.createElement('summary');
 summary.setAttribute('aria-label',label);
 const selected=options.find(option=>option.selected)||options[0];
 addLanguageLabel(summary,selected,doc);
 details.append(summary);
 const list=doc.createElement('ul');
 list.className='public-language-options';
 for(const option of options){
  const row=doc.createElement('li'),link=doc.createElement('a');
  // href has already been built by the pure M006 same-origin router.
  link.setAttribute('href',option.href);
  link.setAttribute('hreflang',option.id);
  link.setAttribute('lang',option.id);
  if(option.selected)link.setAttribute('aria-current','true');
  addLanguageLabel(link,option,doc);
  row.append(link);list.append(row);
 }
 details.append(list);
 container.replaceChildren(details);
 return details;
}
const LANGUAGE_QUERY_PARAMETER="lang";
const mediaOrAdmin=/^\/(?:api|media|letter|__editor|admin)(?:\/|$)/i;
const fileExtension=/\.(?:pdf|mp3|wav|mp4|webm|mov|jpe?g|png|gif|webp|svg|avif|zip|docx?|xlsx?)(?:$)/i;
const publicVisitorRoute=path=>path==='/__editor/voir-le-site';
function withLanguageInInternalLink(href, languageId, currentUrl) {
 if(typeof href!=='string'||!href) return href;
 try {
  const base=new URL(currentUrl),target=new URL(href,base);
  if(!['http:','https:'].includes(target.protocol)||target.origin!==base.origin||
     (mediaOrAdmin.test(target.pathname)&&!publicVisitorRoute(target.pathname))||fileExtension.test(target.pathname))
   return href;
  target.searchParams.set(LANGUAGE_QUERY_PARAMETER,languageId);
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(href)
   ?target.href:target.pathname+target.search+target.hash;
 } catch { return href; }
}
const VISITOR_UI={"fr":{"Choisir la langue":"Choisir la langue","⌂ Accueil":"⌂ Accueil","✧ Célébrations":"✧ Célébrations","▧ Médiathèque générale":"▧ Médiathèque générale","Programme":"Programme","Médiathèque":"Médiathèque","Célébrations":"Célébrations","Mes célébrations":"Mes célébrations","Connexion membre":"Connexion membre","Mes espaces autorisés":"Mes espaces autorisés","Mes espaces":"Mes espaces","Se connecter":"Se connecter","Se déconnecter":"Se déconnecter","Actualiser mes accès":"Actualiser mes accès","E-mail":"E-mail","Adresse e-mail membre":"Adresse e-mail membre","Mot de passe":"Mot de passe","Mot de passe membre":"Mot de passe membre","Pages autorisées":"Pages autorisées","Aucune page autorisée.":"Aucune page autorisée.","Vérification des droits…":"Vérification des droits…","Session expirée":"Session expirée","Accès refusé ou révoqué":"Accès refusé ou révoqué","Connexion refusée":"Connexion refusée","Connexion impossible":"Connexion impossible","Cette page n’est pas publiée.":"Cette page n’est pas publiée.","Privée — connexion nécessaire":"Privée — connexion nécessaire","En préparation (test)":"En préparation (test)","Voir les pages de la célébration":"Voir les pages de la célébration","Images":"Images","Audios":"Audios","Vidéos":"Vidéos","Documents":"Documents","Tous":"Tous","Chants":"Chants","Audios parlés":"Audios parlés"," En boucle":" En boucle","Fermer la vidéo":"Fermer la vidéo","Lire la vidéo":"Lire la vidéo","Séparation":"Séparation","Illustration":"Illustration","Enregistrement MP3":"Enregistrement MP3","MP3 indisponible dans cet aperçu.":"MP3 indisponible dans cet aperçu.","Vidéo":"Vidéo","Vidéo à ajouter":"Vidéo à ajouter","Ouvrir":"Ouvrir","📄 Ouvrir le PDF":"📄 Ouvrir le PDF","Ouvrir le document":"Ouvrir le document","Document indisponible":"Document indisponible","Célébration":"Célébration","Site":"Site","Média":"Média"," — Célébrations des Archanges":" — Célébrations des Archanges"," — Site d’essai":" — Site d’essai","missing":"Cette page n’est pas encore disponible en français. La version française est affichée.","☰ Menu":"☰ Menu","Aucun contenu":"Aucun contenu","Pages hors célébration":"Pages hors célébration","Langues du site":"Langues du site","Pages de la célébration":"Pages de la célébration","Pages de bas de page":"Pages de bas de page","Administration":"Administration","Compte indisponible":"Compte indisponible","Session invalide":"Session invalide","Publication temporairement indisponible":"Publication temporairement indisponible","Célébration introuvable":"Célébration introuvable"},"en":{"Choisir la langue":"Choose language","⌂ Accueil":"⌂ Home","✧ Célébrations":"✧ Celebrations","▧ Médiathèque générale":"▧ General media library","Programme":"Programme","Médiathèque":"Media library","Célébrations":"Celebrations","Mes célébrations":"My celebrations","Connexion membre":"Member sign in","Mes espaces autorisés":"My available spaces","Mes espaces":"My spaces","Se connecter":"Sign in","Se déconnecter":"Sign out","Actualiser mes accès":"Refresh my access","E-mail":"Email","Adresse e-mail membre":"Member email address","Mot de passe":"Password","Mot de passe membre":"Member password","Pages autorisées":"Available pages","Aucune page autorisée.":"No pages available.","Vérification des droits…":"Checking access…","Session expirée":"Session expired","Accès refusé ou révoqué":"Access denied or revoked","Connexion refusée":"Sign-in failed","Connexion impossible":"Unable to sign in","Cette page n’est pas publiée.":"This page is not published.","Privée — connexion nécessaire":"Private — sign in required","En préparation (test)":"In preparation (test)","Voir les pages de la célébration":"View celebration pages","Images":"Images","Audios":"Audio","Vidéos":"Videos","Documents":"Documents","Tous":"All","Chants":"Songs","Audios parlés":"Spoken audio"," En boucle":" Loop","Fermer la vidéo":"Close video","Lire la vidéo":"Play video","Séparation":"Divider","Illustration":"Illustration","Enregistrement MP3":"MP3 recording","MP3 indisponible dans cet aperçu.":"MP3 unavailable in this preview.","Vidéo":"Video","Vidéo à ajouter":"Video to be added","Ouvrir":"Open","📄 Ouvrir le PDF":"📄 Open PDF","Ouvrir le document":"Open document","Document indisponible":"Document unavailable","Célébration":"Celebration","Site":"Website","Média":"Media"," — Célébrations des Archanges":" — Archangel celebrations"," — Site d’essai":" — Test site","missing":"This page is not yet available in English. Showing the French version.","☰ Menu":"☰ Menu","Aucun contenu":"No content","Pages hors célébration":"General pages","Langues du site":"Site languages","Pages de la célébration":"Celebration pages","Pages de bas de page":"Footer pages","Administration":"Administration","Compte indisponible":"Account unavailable","Session invalide":"Invalid session","Publication temporairement indisponible":"Published site temporarily unavailable","Célébration introuvable":"Celebration not found"},"es":{"Choisir la langue":"Elegir idioma","⌂ Accueil":"⌂ Inicio","✧ Célébrations":"✧ Celebraciones","▧ Médiathèque générale":"▧ Mediateca general","Programme":"Programa","Médiathèque":"Mediateca","Célébrations":"Celebraciones","Mes célébrations":"Mis celebraciones","Connexion membre":"Acceso de miembros","Mes espaces autorisés":"Mis espacios autorizados","Mes espaces":"Mis espacios","Se connecter":"Iniciar sesión","Se déconnecter":"Cerrar sesión","Actualiser mes accès":"Actualizar mis accesos","E-mail":"Correo electrónico","Adresse e-mail membre":"Correo electrónico del miembro","Mot de passe":"Contraseña","Mot de passe membre":"Contraseña del miembro","Pages autorisées":"Páginas autorizadas","Aucune page autorisée.":"No hay páginas autorizadas.","Vérification des droits…":"Comprobando permisos…","Session expirée":"Sesión caducada","Accès refusé ou révoqué":"Acceso denegado o revocado","Connexion refusée":"Acceso denegado","Connexion impossible":"No se puede iniciar sesión","Cette page n’est pas publiée.":"Esta página no está publicada.","Privée — connexion nécessaire":"Privada — debes iniciar sesión","En préparation (test)":"En preparación (prueba)","Voir les pages de la célébration":"Ver las páginas de la celebración","Images":"Imágenes","Audios":"Audios","Vidéos":"Vídeos","Documents":"Documentos","Tous":"Todos","Chants":"Cantos","Audios parlés":"Audios hablados"," En boucle":" Repetir","Fermer la vidéo":"Cerrar vídeo","Lire la vidéo":"Reproducir vídeo","Séparation":"Separador","Illustration":"Ilustración","Enregistrement MP3":"Grabación MP3","MP3 indisponible dans cet aperçu.":"MP3 no disponible en esta vista previa.","Vidéo":"Vídeo","Vidéo à ajouter":"Vídeo pendiente","Ouvrir":"Abrir","📄 Ouvrir le PDF":"📄 Abrir PDF","Ouvrir le document":"Abrir documento","Document indisponible":"Documento no disponible","Célébration":"Celebración","Site":"Sitio web","Média":"Contenido multimedia"," — Célébrations des Archanges":" — Celebraciones de los Arcángeles"," — Site d’essai":" — Sitio de prueba","missing":"Esta página aún no está disponible en español. Se muestra la versión en francés.","☰ Menu":"☰ Menú","Aucun contenu":"Sin contenido","Pages hors célébration":"Páginas generales","Langues du site":"Idiomas del sitio","Pages de la célébration":"Páginas de la celebración","Pages de bas de page":"Páginas del pie","Administration":"Administración","Compte indisponible":"Cuenta no disponible","Session invalide":"Sesión no válida","Publication temporairement indisponible":"El sitio publicado no está disponible temporalmente","Célébration introuvable":"Celebración no encontrada"},"de":{"Choisir la langue":"Sprache wählen","⌂ Accueil":"⌂ Startseite","✧ Célébrations":"✧ Feiern","▧ Médiathèque générale":"▧ Allgemeine Mediathek","Programme":"Programm","Médiathèque":"Mediathek","Célébrations":"Feiern","Mes célébrations":"Meine Feiern","Connexion membre":"Mitgliederanmeldung","Mes espaces autorisés":"Meine freigegebenen Bereiche","Mes espaces":"Meine Bereiche","Se connecter":"Anmelden","Se déconnecter":"Abmelden","Actualiser mes accès":"Zugänge aktualisieren","E-mail":"E-Mail","Adresse e-mail membre":"E-Mail-Adresse des Mitglieds","Mot de passe":"Passwort","Mot de passe membre":"Mitgliederpasswort","Pages autorisées":"Freigegebene Seiten","Aucune page autorisée.":"Keine freigegebenen Seiten.","Vérification des droits…":"Zugriff wird geprüft…","Session expirée":"Sitzung abgelaufen","Accès refusé ou révoqué":"Zugriff verweigert oder widerrufen","Connexion refusée":"Anmeldung fehlgeschlagen","Connexion impossible":"Anmeldung nicht möglich","Cette page n’est pas publiée.":"Diese Seite ist nicht veröffentlicht.","Privée — connexion nécessaire":"Privat — Anmeldung erforderlich","En préparation (test)":"In Vorbereitung (Test)","Voir les pages de la célébration":"Seiten der Feier ansehen","Images":"Bilder","Audios":"Audios","Vidéos":"Videos","Documents":"Dokumente","Tous":"Alle","Chants":"Lieder","Audios parlés":"Sprachaufnahmen"," En boucle":" Wiederholen","Fermer la vidéo":"Video schließen","Lire la vidéo":"Video abspielen","Séparation":"Trennlinie","Illustration":"Abbildung","Enregistrement MP3":"MP3-Aufnahme","MP3 indisponible dans cet aperçu.":"MP3 in dieser Vorschau nicht verfügbar.","Vidéo":"Video","Vidéo à ajouter":"Video folgt","Ouvrir":"Öffnen","📄 Ouvrir le PDF":"📄 PDF öffnen","Ouvrir le document":"Dokument öffnen","Document indisponible":"Dokument nicht verfügbar","Célébration":"Feier","Site":"Website","Média":"Medium"," — Célébrations des Archanges":" — Erzengelfeiern"," — Site d’essai":" — Testseite","missing":"Diese Seite ist noch nicht auf Deutsch verfügbar. Die französische Version wird angezeigt.","☰ Menu":"☰ Menü","Aucun contenu":"Keine Inhalte","Pages hors célébration":"Allgemeine Seiten","Langues du site":"Sprachen der Website","Pages de la célébration":"Seiten der Feier","Pages de bas de page":"Fußzeilenseiten","Administration":"Verwaltung","Compte indisponible":"Konto nicht verfügbar","Session invalide":"Ungültige Sitzung","Publication temporairement indisponible":"Die veröffentlichte Website ist vorübergehend nicht verfügbar","Célébration introuvable":"Feier nicht gefunden"},"pt":{"Choisir la langue":"Escolher idioma","⌂ Accueil":"⌂ Início","✧ Célébrations":"✧ Celebrações","▧ Médiathèque générale":"▧ Mediateca geral","Programme":"Programa","Médiathèque":"Mediateca","Célébrations":"Celebrações","Mes célébrations":"As minhas celebrações","Connexion membre":"Acesso de membros","Mes espaces autorisés":"Os meus espaços autorizados","Mes espaces":"Os meus espaços","Se connecter":"Iniciar sessão","Se déconnecter":"Terminar sessão","Actualiser mes accès":"Atualizar os meus acessos","E-mail":"E-mail","Adresse e-mail membre":"E-mail do membro","Mot de passe":"Palavra-passe","Mot de passe membre":"Palavra-passe do membro","Pages autorisées":"Páginas autorizadas","Aucune page autorisée.":"Não há páginas autorizadas.","Vérification des droits…":"A verificar permissões…","Session expirée":"Sessão expirada","Accès refusé ou révoqué":"Acesso negado ou revogado","Connexion refusée":"Acesso recusado","Connexion impossible":"Não foi possível iniciar sessão","Cette page n’est pas publiée.":"Esta página não está publicada.","Privée — connexion nécessaire":"Privada — inicie sessão","En préparation (test)":"Em preparação (teste)","Voir les pages de la célébration":"Ver páginas da celebração","Images":"Imagens","Audios":"Áudios","Vidéos":"Vídeos","Documents":"Documentos","Tous":"Todos","Chants":"Cantos","Audios parlés":"Áudios falados"," En boucle":" Repetir","Fermer la vidéo":"Fechar vídeo","Lire la vidéo":"Reproduzir vídeo","Séparation":"Separador","Illustration":"Ilustração","Enregistrement MP3":"Gravação MP3","MP3 indisponible dans cet aperçu.":"MP3 indisponível nesta pré-visualização.","Vidéo":"Vídeo","Vidéo à ajouter":"Vídeo por adicionar","Ouvrir":"Abrir","📄 Ouvrir le PDF":"📄 Abrir PDF","Ouvrir le document":"Abrir documento","Document indisponible":"Documento indisponível","Célébration":"Celebração","Site":"Site","Média":"Conteúdo multimédia"," — Célébrations des Archanges":" — Celebrações dos Arcanjos"," — Site d’essai":" — Site de teste","missing":"Esta página ainda não está disponível em português. É apresentada a versão francesa.","☰ Menu":"☰ Menu","Aucun contenu":"Sem conteúdo","Pages hors célébration":"Páginas gerais","Langues du site":"Idiomas do site","Pages de la célébration":"Páginas da celebração","Pages de bas de page":"Páginas do rodapé","Administration":"Administração","Compte indisponible":"Conta indisponível","Session invalide":"Sessão inválida","Publication temporairement indisponible":"Site publicado temporariamente indisponível","Célébration introuvable":"Celebração não encontrada"},"it":{"Choisir la langue":"Scegli la lingua","⌂ Accueil":"⌂ Home","✧ Célébrations":"✧ Celebrazioni","▧ Médiathèque générale":"▧ Mediateca generale","Programme":"Programma","Médiathèque":"Mediateca","Célébrations":"Celebrazioni","Mes célébrations":"Le mie celebrazioni","Connexion membre":"Accesso membri","Mes espaces autorisés":"I miei spazi autorizzati","Mes espaces":"I miei spazi","Se connecter":"Accedi","Se déconnecter":"Esci","Actualiser mes accès":"Aggiorna i miei accessi","E-mail":"Email","Adresse e-mail membre":"Email del membro","Mot de passe":"Password","Mot de passe membre":"Password del membro","Pages autorisées":"Pagine autorizzate","Aucune page autorisée.":"Nessuna pagina autorizzata.","Vérification des droits…":"Verifica dei permessi…","Session expirée":"Sessione scaduta","Accès refusé ou révoqué":"Accesso negato o revocato","Connexion refusée":"Accesso negato","Connexion impossible":"Impossibile accedere","Cette page n’est pas publiée.":"Questa pagina non è pubblicata.","Privée — connexion nécessaire":"Privata — accesso richiesto","En préparation (test)":"In preparazione (test)","Voir les pages de la célébration":"Vedi le pagine della celebrazione","Images":"Immagini","Audios":"Audio","Vidéos":"Video","Documents":"Documenti","Tous":"Tutti","Chants":"Canti","Audios parlés":"Audio parlati"," En boucle":" Ripeti","Fermer la vidéo":"Chiudi video","Lire la vidéo":"Riproduci video","Séparation":"Separatore","Illustration":"Illustrazione","Enregistrement MP3":"Registrazione MP3","MP3 indisponible dans cet aperçu.":"MP3 non disponibile in questa anteprima.","Vidéo":"Video","Vidéo à ajouter":"Video da aggiungere","Ouvrir":"Apri","📄 Ouvrir le PDF":"📄 Apri PDF","Ouvrir le document":"Apri documento","Document indisponible":"Documento non disponibile","Célébration":"Celebrazione","Site":"Sito","Média":"Contenuto multimediale"," — Célébrations des Archanges":" — Celebrazioni degli Arcangeli"," — Site d’essai":" — Sito di prova","missing":"Questa pagina non è ancora disponibile in italiano. Viene mostrata la versione francese.","☰ Menu":"☰ Menu","Aucun contenu":"Nessun contenuto","Pages hors célébration":"Pagine generali","Langues du site":"Lingue del sito","Pages de la célébration":"Pagine della celebrazione","Pages de bas de page":"Pagine del piè di pagina","Administration":"Amministrazione","Compte indisponible":"Account non disponibile","Session invalide":"Sessione non valida","Publication temporairement indisponible":"Sito pubblicato temporaneamente non disponibile","Célébration introuvable":"Celebrazione non trovata"},"ar":{"Choisir la langue":"اختيار اللغة","⌂ Accueil":"⌂ الرئيسية","✧ Célébrations":"✧ الاحتفالات","▧ Médiathèque générale":"▧ مكتبة الوسائط العامة","Programme":"البرنامج","Médiathèque":"مكتبة الوسائط","Célébrations":"الاحتفالات","Mes célébrations":"احتفالاتي","Connexion membre":"تسجيل دخول الأعضاء","Mes espaces autorisés":"مساحاتي المتاحة","Mes espaces":"مساحاتي","Se connecter":"تسجيل الدخول","Se déconnecter":"تسجيل الخروج","Actualiser mes accès":"تحديث صلاحيات الوصول","E-mail":"البريد الإلكتروني","Adresse e-mail membre":"البريد الإلكتروني للعضو","Mot de passe":"كلمة المرور","Mot de passe membre":"كلمة مرور العضو","Pages autorisées":"الصفحات المتاحة","Aucune page autorisée.":"لا توجد صفحات متاحة.","Vérification des droits…":"جارٍ التحقق من الصلاحيات…","Session expirée":"انتهت الجلسة","Accès refusé ou révoqué":"تم رفض الوصول أو إلغاؤه","Connexion refusée":"تعذر تسجيل الدخول","Connexion impossible":"تعذر تسجيل الدخول","Cette page n’est pas publiée.":"هذه الصفحة غير منشورة.","Privée — connexion nécessaire":"خاص — يلزم تسجيل الدخول","En préparation (test)":"قيد الإعداد (اختبار)","Voir les pages de la célébration":"عرض صفحات الاحتفال","Images":"صور","Audios":"صوتيات","Vidéos":"فيديوهات","Documents":"مستندات","Tous":"الكل","Chants":"أناشيد","Audios parlés":"تسجيلات كلامية"," En boucle":" تكرار","Fermer la vidéo":"إغلاق الفيديو","Lire la vidéo":"تشغيل الفيديو","Séparation":"فاصل","Illustration":"صورة توضيحية","Enregistrement MP3":"تسجيل MP3","MP3 indisponible dans cet aperçu.":"تسجيل MP3 غير متاح في هذه المعاينة.","Vidéo":"فيديو","Vidéo à ajouter":"سيُضاف الفيديو لاحقًا","Ouvrir":"فتح","📄 Ouvrir le PDF":"📄 فتح PDF","Ouvrir le document":"فتح المستند","Document indisponible":"المستند غير متاح","Célébration":"احتفال","Site":"موقع","Média":"وسائط"," — Célébrations des Archanges":" — احتفالات رؤساء الملائكة"," — Site d’essai":" — موقع تجريبي","missing":"هذه الصفحة غير متاحة بالعربية بعد. تُعرض النسخة الفرنسية.","☰ Menu":"☰ القائمة","Aucun contenu":"لا يوجد محتوى","Pages hors célébration":"الصفحات العامة","Langues du site":"لغات الموقع","Pages de la célébration":"صفحات الاحتفال","Pages de bas de page":"صفحات التذييل","Administration":"الإدارة","Compte indisponible":"الحساب غير متاح","Session invalide":"جلسة غير صالحة","Publication temporairement indisponible":"الموقع المنشور غير متاح مؤقتًا","Célébration introuvable":"الاحتفال غير موجود"},"zh-Hans":{"Choisir la langue":"选择语言","⌂ Accueil":"⌂ 首页","✧ Célébrations":"✧ 庆典","▧ Médiathèque générale":"▧ 公共媒体库","Programme":"活动安排","Médiathèque":"媒体库","Célébrations":"庆典","Mes célébrations":"我的庆典","Connexion membre":"会员登录","Mes espaces autorisés":"我有权访问的空间","Mes espaces":"我的空间","Se connecter":"登录","Se déconnecter":"退出登录","Actualiser mes accès":"刷新访问权限","E-mail":"电子邮箱","Adresse e-mail membre":"会员电子邮箱","Mot de passe":"密码","Mot de passe membre":"会员密码","Pages autorisées":"有权访问的页面","Aucune page autorisée.":"暂无可访问的页面。","Vérification des droits…":"正在检查访问权限…","Session expirée":"会话已过期","Accès refusé ou révoqué":"访问被拒绝或权限已撤销","Connexion refusée":"登录失败","Connexion impossible":"无法登录","Cette page n’est pas publiée.":"此页面尚未发布。","Privée — connexion nécessaire":"私密 — 请先登录","En préparation (test)":"筹备中（测试）","Voir les pages de la célébration":"查看庆典页面","Images":"图片","Audios":"音频","Vidéos":"视频","Documents":"文档","Tous":"全部","Chants":"歌曲","Audios parlés":"语音录音"," En boucle":" 循环播放","Fermer la vidéo":"关闭视频","Lire la vidéo":"播放视频","Séparation":"分隔线","Illustration":"插图","Enregistrement MP3":"MP3 录音","MP3 indisponible dans cet aperçu.":"此预览中无法播放 MP3。","Vidéo":"视频","Vidéo à ajouter":"视频待添加","Ouvrir":"打开","📄 Ouvrir le PDF":"📄 打开 PDF","Ouvrir le document":"打开文档","Document indisponible":"文档不可用","Célébration":"庆典","Site":"网站","Média":"媒体"," — Célébrations des Archanges":" — 大天使庆典"," — Site d’essai":" — 测试网站","missing":"此页面暂无简体中文版，现显示法语版本。","☰ Menu":"☰ 菜单","Aucun contenu":"暂无内容","Pages hors célébration":"通用页面","Langues du site":"网站语言","Pages de la célébration":"庆典页面","Pages de bas de page":"页脚页面","Administration":"管理","Compte indisponible":"账户不可用","Session invalide":"会话无效","Publication temporairement indisponible":"已发布的网站暂时无法访问","Célébration introuvable":"未找到庆典"}};
function visitorText(languageId,key){return VISITOR_UI[languageId]?.[key]??VISITOR_UI.fr[key]??key;}

const publicVisitorModel=createPublicVisitorModel();
const publicLanguage=window.__PUBLIC_LANGUAGE__||{selectedLanguageId:qs.get('lang')||'fr',options:[]};
const anonymousLanguageOptions=[...(publicLanguage.options||[])];
const uiLanguage=publicLanguage?.selectedLanguageId||'fr';
const t=key=>visitorText(uiLanguage,key);
document.documentElement.lang=uiLanguage;
document.documentElement.dir=uiLanguage==='ar'?'rtl':'ltr';
function translationNotice(page,parent){
 const lang=page?.languageId||'fr';parent.lang=lang;parent.dir=lang==='ar'?'rtl':'ltr';
 if(uiLanguage!=='fr'&&lang==='fr'){const note=make('p','translation-missing',t('missing'));note.lang=uiLanguage;note.dir=uiLanguage==='ar'?'rtl':'ltr';let heading=parent.querySelector('h1,h2');if(!heading&&page.name){heading=make('h1','trial-heading heading-primary',page.name);parent.prepend(heading)}if(heading)heading.after(note);else parent.prepend(note);}
}

function renderLanguagePicker(){
 const host=document.getElementById('public-language-control');
 if(!host||!Array.isArray(publicLanguage?.options)||publicLanguage.options.length<2){host?.replaceChildren();return;}
 // Rebuild same-origin links from the CURRENT page, preserving celebration,
 // page, other query parameters and fragments through in-page navigation.
 const options=publicLanguage.options.map(option=>{
  const url=new URL(location.href);
  url.searchParams.set('lang',option.id);
  return {...option,href:url.pathname+url.search+url.hash};
 });
 renderPublicLanguageSelector(host,options,{label:t('Choisir la langue')});
 document.documentElement.lang=publicLanguage.selectedLanguageId||'fr';
}
function generalPages(){
 try{
  const saved=window.__PUBLIC_SITE_SNAPSHOT__?.shared||null;
  const rows=Array.isArray(saved?.pages)?saved.pages.filter(p=>p&&p.group==='page'&&publicOnly(p)&&Array.isArray(p.blocks)&&
   true):[];
  const photo=seed.pages.find(p=>p.id==='neutral-accueil-general')?.blocks.find(b=>b.kind==='image')?.src;
  for(const p of rows){
   if(p.id==='neutral-accueil-general'&&photo&&
    p.blocks.some(b=>b.kind==='heading'&&['Accueil général','Ronde des Archanges Universelle','Bienvenue sur le site de la Ronde des Archanges Universelle'].includes(b.text))&&
    !p.blocks.some(b=>b.kind==='image'))p.blocks.push({id:99991,kind:'image',src:photo,text:'Ronde des Archanges Universelle',align:'center'});
  }
  return {pages:rows,homeId:rows.some(p=>p.id===saved.homeId)?saved.homeId:rows[0]?.id};
 }catch{return {pages:[],homeId:null}}
}
function celebrations(){
 let drafts=window.__PUBLIC_SITE_SNAPSHOT__?.plans||[];
 if(!window.__PUBLIC_SITE_SNAPSHOT__)return [];
 drafts=Array.isArray(drafts)?drafts.filter(x=>/^plan-(michael|gabriel|raphael|ouriel)-\d{4}-\d{2}-\d{2}$/.test(x.id)):[];
 for(let i=0;i<drafts.length;i++){
  const cur=drafts[i],prev=drafts[i-1];
  if(cur.customTitle&&cur.title)continue;
  let year=Number(String(cur.date||cur.year||'').slice(0,4))||2027;
  const priorStart=String(prev?.title||prev?.year||'').match(/20\d{2}/)?.[0];
  const priorEnd=[...String(prev?.title||prev?.year||'').matchAll(/20\d{2}/g)].at(-1)?.[0];
  if(prev&&(prev.archangel==='Raphaël'&&cur.archangel==='Ouriel'||
    prev.archangel==='Ouriel'&&cur.archangel==='Michaël'||
    prev.archangel==='Michaël'&&cur.archangel==='Gabriel'))year=Number(priorStart)||year;
  if(prev&&prev.archangel==='Gabriel'&&cur.archangel==='Raphaël')year=Number(priorEnd)||year;
  cur.title=cur.archangel+' '+(cur.archangel==='Gabriel'?year+'-'+(year+1):year);
 }
 return [...(seed.celebrations||[]).map(p=>({id:String(p.id),archangel:p.archangel,year:p.year,title:p.archangel+' '+p.year,titleOnly:p.titleOnly===true})),...drafts,
 ...(window.__PUBLIC_SITE_SNAPSHOT__?.titleOnlyCelebrations||[])].filter(p=>
 window.__PUBLIC_CELEBRATION_VISIBILITY__?.[p.id]!=='draft'&&
 window.__PUBLIC_CELEBRATION_VISIBILITY__?.[p.id]!=='hidden'&&p.visibility!=='draft'&&p.visibility!=='hidden');
}
// The Worker internally rewrites /mediatheque-generale (and /programme,
// /mercredi, etc.) without changing the browser address. Read the actual
// public pathname as well as ?page, or the visitor always sees Accueil.
const routePages={'/mediatheque':'mediatheque','/bibliotheque':'mediatheque',
 '/mediatheque-generale':'mediatheque-generale',
 '/programme':'preparation','/preparation':'preparation',
 '/mercredi':'mercredi','/jeudi':'jeudi','/vendredi':'vendredi',
 '/samedi':'samedi','/dimanche':'dimanche','/apres-celebration':'apres-celebration'};
const routeSlug=routePages[location.pathname.replace(/\/$/,'')]||'';
let pages=seed.pages,active=qs.get('page')||routeSlug||generalPages().homeId||'neutral-accueil-general',
 menuOpen=false,libraryFamily='image',audioFilter='all';
const memberEnabled=document.body?.dataset.memberSite==='1';
const memberLoginVisible=memberEnabled&&document.body?.dataset.memberLoginVisible==='1';
let memberToken=null,memberExpires=0,memberPages=[],memberPage=null,memberBusy=false,memberMessage='';
let memberPanel='login',memberFlow=null;
const memberLabels={
 fr:{login:'Se connecter',activation:'Première connexion',forgot:'Mot de passe oublié ?',email:'Adresse e-mail',password:'Mot de passe',newPassword:'Nouveau mot de passe',confirm:'Confirmer le mot de passe',send:'Demander le lien',save:'Enregistrer mon mot de passe',back:'Retour à la connexion',sent:'Demande enregistrée. Si cette adresse est autorisée, un courriel peut lui parvenir.',changed:'Mot de passe enregistré. Vous pouvez vous connecter.',mismatch:'Les deux mots de passe sont différents.'},
 en:{login:'Sign in',activation:'First login',forgot:'Forgot password?',email:'Email address',password:'Password',newPassword:'New password',confirm:'Confirm password',send:'Request link',save:'Save password',back:'Back to sign in',sent:'Request received. If your address is eligible, you may receive an email.',changed:'Password saved. You can sign in.',mismatch:'The passwords do not match.'},
 es:{login:'Conectarse',activation:'Primer acceso',forgot:'¿Olvidó su contraseña?',email:'Correo electrónico',password:'Contraseña',newPassword:'Nueva contraseña',confirm:'Confirmar contraseña',send:'Solicitar enlace',save:'Guardar contraseña',back:'Volver',sent:'Solicitud recibida. Si está autorizado, puede recibir un correo.',changed:'Contraseña guardada. Ya puede conectarse.',mismatch:'Las contraseñas no coinciden.'},
 de:{login:'Anmelden',activation:'Erste Anmeldung',forgot:'Passwort vergessen?',email:'E-Mail',password:'Passwort',newPassword:'Neues Passwort',confirm:'Passwort bestätigen',send:'Link anfordern',save:'Passwort speichern',back:'Zurück zur Anmeldung',sent:'Anfrage erhalten. Falls berechtigt, erhalten Sie möglicherweise eine E-Mail.',changed:'Passwort gespeichert. Sie können sich anmelden.',mismatch:'Die Passwörter stimmen nicht überein.'},
 pt:{login:'Entrar',activation:'Primeiro acesso',forgot:'Esqueceu sua senha?',email:'E-mail',password:'Senha',newPassword:'Nova senha',confirm:'Confirmar senha',send:'Solicitar link',save:'Salvar senha',back:'Voltar',sent:'Pedido recebido. Se estiver autorizado, poderá receber um e-mail.',changed:'Senha salva. Pode entrar.',mismatch:'As senhas não coincidem.'},
 it:{login:'Accedi',activation:'Primo accesso',forgot:'Password dimenticata?',email:'E-mail',password:'Password',newPassword:'Nuova password',confirm:'Conferma password',send:'Richiedi link',save:'Salva password',back:'Torna al login',sent:'Richiesta ricevuta. Se autorizzato, potresti ricevere una e-mail.',changed:'Password salvata. Ora puoi accedere.',mismatch:'Le password non coincidono.'},
 ar:{login:'تسجيل الدخول',activation:'الدخول لأول مرة',forgot:'هل نسيت كلمة المرور؟',email:'البريد الإلكتروني',password:'كلمة المرور',newPassword:'كلمة مرور جديدة',confirm:'تأكيد كلمة المرور',send:'طلب الرابط',save:'حفظ كلمة المرور',back:'العودة',sent:'تم استلام الطلب. إذا كان العنوان مخولاً فقد تصلك رسالة.',changed:'تم حفظ كلمة المرور. يمكنك تسجيل الدخول.',mismatch:'كلمتا المرور غير متطابقتين.'},
 zh:{login:'登录',activation:'首次登录',forgot:'忘记密码？',email:'电子邮箱',password:'密码',newPassword:'新密码',confirm:'确认密码',send:'获取链接',save:'保存密码',back:'返回登录',sent:'请求已收到。如果邮箱已获授权，您可能会收到邮件。',changed:'密码已保存，现在可以登录。',mismatch:'两次密码不一致。'}
};
const memberText=key=>(memberLabels[String(publicLanguage?.selectedLanguageId||'fr').toLowerCase().split('-')[0]]||memberLabels.fr)[key]||memberLabels.fr[key];
{
 const fragment=new URLSearchParams(location.hash.slice(1));
 const kind=fragment.has('activate')?'activate':fragment.has('reset')?'reset':null;
 const value=kind&&fragment.get(kind),e=fragment.get('email')||'';
 if(kind){if(/^[a-f0-9]{64}$/.test(value||'')&&e.length<255)memberFlow={kind,token:value,email:e};history.replaceState(null,'',location.pathname+location.search);}
}

// The general library is a public route, not the celebration-specific gallery.
const slugOf=p=>p.spaceId?p.id:p.group==='page'?p.id:String(p.id).endsWith('-'+celebration)?
 String(p.id).slice(0,-celebration.length-1):p.id.slice(0,p.id.lastIndexOf('-'));

const DAYS=['mercredi','jeudi','vendredi','samedi','dimanche'];
function validIso(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return false;
 const [y,m,d]=value.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;
}
function validWednesday(value){
 if(!validIso(value))return false;
 const [y,m,d]=value.split('-').map(Number);
 return new Date(Date.UTC(y,m-1,d)).getUTCDay()===3;
}
function formattedDate(iso){
 if(!validIso(iso))return '';
 const [y,m,d]=iso.split('-');return new Intl.DateTimeFormat(uiLanguage,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(Number(y),Number(m)-1,Number(d))));
}
function dayIso(offset){
 if(!validWednesday(celebrationDates.wednesday)||offset<0||offset>4)return '';
 const [y,m,d]=celebrationDates.wednesday.split('-').map(Number);
 return new Date(Date.UTC(y,m-1,d+offset)).toISOString().slice(0,10);
}
function dateForPage(page){
 if(!page||page.group!=='celebration')return '';
 const slug=slugOf(page),n=DAYS.indexOf(slug);
 if(n!==-1)return formattedDate(dayIso(n));
 if(slug==='preparation')return celebrationDates.preparationDates.filter(validIso).map(formattedDate).join(' · ');
 return '';
}
function loadDates(saved){
 const data=saved?.celebrationDates&&typeof saved.celebrationDates==='object'?saved.celebrationDates:{};
 const defaultWednesday=validWednesday(seed.start_date)?seed.start_date:'';
 const get=(key,fallback='')=>Object.hasOwn(data,key)&&validIso(data[key])?data[key]:Object.hasOwn(data,key)?'':fallback;
 return {
  wednesday:get('wednesday',defaultWednesday),
  preparationDates:Array.isArray(data.preparationDates)?
   data.preparationDates.filter(validIso).slice(0,30):
   [get('preparationStart'),get('preparationEnd')].filter(validIso)
 };
}
let celebrationDates=loadDates(null);
function validClock(v){return typeof v==='string'&&/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(v)}
function loadTimes(saved){
 const raw=saved?.celebrationTimes;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 return Object.fromEntries(DAYS.filter(d=>validClock(raw[d])).map(d=>[d,raw[d]]));
}
let celebrationTimes=loadTimes(null);
function timeForPage(page){
 const slug=slugOf(page);
 return page?.group==='celebration'&&DAYS.includes(slug)?celebrationTimes[slug]||'':'';
}
function skipLegacyDateLines(rows){
 if(!celebration.startsWith('plan-'))return rows;
 for(const page of rows){
  const original=seed.pages.find(x=>x.id===page.id)?.blocks.find(x=>x.id===2);
  if(!original||!/^Date : \d{4}-\d{2}-\d{2}$/.test(original.text||''))continue;
  page.blocks=page.blocks.filter(x=>!(x.id===2&&x.kind==='text'&&x.text===original.text&&!x.rich&&!x.bold&&!x.italic&&!x.color&&!x.size));
 }
 return rows;
}

function mergePages(saved){
 if(!saved||!Array.isArray(saved.pages))return seed.pages.filter(publicOnly);
 const byId=new Map(saved.pages.filter(p=>p&&typeof p.id==='string'&&Array.isArray(p.blocks)&&['page','celebration'].includes(p.group)).map(p=>[p.id,p]));
 const original=seed.pages.map(p=>{
  const old=byId.get(p.id);if(!old)return p;
  if(p.id==='apres-celebration-'+celebration&&old.name==='Après préparation')old.name='Après célébration';
  if(p.id==='accueil-celebration-'+celebration){
   for(const block of p.blocks.filter(x=>Number(x.id)>100000)){
    if(!old.blocks.some(x=>x.id===block.id))old.blocks.push(block);
   }
  }
  return old;
 });
 const known=new Set(seed.pages.map(p=>p.id));
 const extra=saved.pages.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.length<105&&Array.isArray(p.blocks)&&p.blocks.length<300&&!known.has(p.id)&&(
  (p.group==='page'&&/^neutral-[0-9a-f-]{30,45}$/.test(p.id))||(p.group==='celebration'&&p.id.startsWith('extra-')&&p.id.endsWith('-'+celebration))
 ));
 const spacePages=(saved.spaces||[]).flatMap(s=>s.pages.map(p=>({...p,spaceId:s.id,spaceName:s.name})));
 const result=original.concat(extra.slice(0,30),spacePages).filter(publicOnly);
 const shared=generalPages();
 return shared.pages.length?result.filter(p=>p.group!=='page').concat(shared.pages):result;
}
// A single colourway per archangel; the palette controls are gone.
let themeIndex=0;
function isBoilerplateTitle(page,block){
 return page?.group==='celebration'&&block?.id===1&&block.kind==='heading'&&
 String(block.text||'').trim()===String(page.name||'').trim()&&
 !block.rich&&!block.bold&&!block.italic&&!block.color&&!block.size&&
 (!block.align||block.align==='center');
}
function omitBoilerplateTitles(rows){
 for(const page of rows)if(isBoilerplateTitle(page,page.blocks?.[0]))page.blocks.shift();
 return rows;
}
try{
 const saved=window.__PUBLIC_SITE_SNAPSHOT__?.record||null;
 if(saved&&Array.isArray(saved.pages)){
  pages=skipLegacyDateLines(omitBoilerplateTitles(mergePages(saved)));
  celebrationDates=loadDates(saved);
  celebrationTimes=loadTimes(saved);

 }
}catch{}
pages=skipLegacyDateLines(omitBoilerplateTitles(mergePages({pages,spaces:window.__PUBLIC_SITE_SNAPSHOT__?.record?.spaces||[]})));
if(!pages.some(p=>slugOf(p)===active)&&!active.startsWith('page:')&&!['celebrations','mediatheque','mediatheque-generale',...(memberEnabled?['member-area']:[])].includes(active))active=generalPages().homeId||'neutral-accueil-general';
const el=id=>document.getElementById(id);
const make=(tag,className,text)=>{const x=document.createElement(tag);if(className)x.className=className;if(text!==undefined)x.textContent=String(text);return x};
function urlOk(v){
 if(typeof v==='string'&&v.length<1000000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v))return v;
 const s=String(v||'').trim();
 if(!s||s.length>2500||/[\\\u0000-\u001f]/.test(s))return '';
 if(s.startsWith('/')&&!s.startsWith('//'))return s;
 try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.toString():''}catch{return ''}
}
const colors=/^#[0-9a-f]{6}$/i;

function applyCelebrationPalette(){
 const set=Array.isArray(seed.palettes)?seed.palettes:[];
 const variant=set[0];
 if(!variant||!Array.isArray(variant.shades)||variant.shades.length!==5)return;
 const root=document.documentElement;
 if(/^#[0-9a-f]{6}$/i.test(variant.shades[3]))root.style.setProperty('--frame-color',variant.shades[3]);
 const label=el('palette-label');
 if(label)label.textContent=variant.name;
}

// Strict allowlist: preview renders only inline bold, italic and hexadecimal RGB colours.
function inlineTextColor(value){
 const v=String(value||'').trim().toLowerCase();
 if(/^#[0-9a-f]{6}$/.test(v))return v;
 const match=v.match(/^rgb\(([^)]+)\)$/);
 if(!match)return '';
 const values=match[1].split(/[\s,]+/).filter(Boolean);
 if(values.length!==3||values.some(n=>!/^\d{1,3}$/.test(n)||Number(n)>255))return '';
 return '#'+values.map(n=>Number(n).toString(16).padStart(2,'0')).join('');
}
function formattedText(host,b){
 if(typeof b.rich!=='string'||!b.rich){
  host.textContent=String(b.text||'');
  return;
 }
 const temp=document.createElement('template');
 temp.innerHTML=b.rich.slice(0,18000);
 let count=0;
 const allowed=new Map([['B','strong'],['STRONG','strong'],['I','em'],['EM','em'],['BR','br']]);
 function copy(node,target){
  if(count++>12000)return;
  if(node.nodeType===3){target.append(document.createTextNode(node.textContent||''));return}
  if(node.nodeType!==1&&node.nodeType!==11)return;
  const tag=node.nodeType===1?node.tagName:'';
  if(['SCRIPT','STYLE','SVG','IFRAME','OBJECT','TEMPLATE'].includes(tag))return;
  if(tag==='BR'){target.append(make('br'));return}
  let wrapper=allowed.get(tag)?make(allowed.get(tag)):target;
  if(tag==='SPAN'||tag==='FONT'){
   const raw=node.getAttribute('style')||'';
   const specified=raw.match(/(?:^|;)\s*color\s*:\s*([^;]+)(?:;|$)/i);
   const color=inlineTextColor(tag==='FONT'?node.getAttribute('color')||node.style.color:(specified?.[1]||node.style.color));
   if(color){wrapper=make('span');wrapper.style.color=color}
  }
  for(const child of node.childNodes)copy(child,wrapper);
  if(wrapper!==target)target.append(wrapper);
 }
 copy(temp.content,host);
}
function applyStyle(node,b){
 node.style.textAlign=['left','center','right'].includes(b.align)?b.align:'left';
 if(b.bold)node.style.fontWeight='700';
 if(b.italic)node.style.fontStyle='italic';
 if(colors.test(b.color||''))node.style.color=b.color;
 const size=Number(b.size);
 if([14,16,18,20,24,28,32,40].includes(size))node.style.fontSize=size+'px';
}
const blobUrls=new Map();
function openStore(){return new Promise((ok,no)=>{if(!indexedDB){no(Error('IndexedDB'));return}const q=indexedDB.open('celebrations-demo-files-v1',1);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('files'))q.result.createObjectStore('files',{keyPath:'id'})}})}
async function loadAssets(){
 const ids=publicVisitorModel.assetIds(pages);
 if(ids.size===0)return;
 let db;
 try{db=await openStore()}catch{return}
 try{await Promise.all([...ids].map(id=>new Promise(resolve=>{
  const tx=db.transaction('files','readonly'),r=tx.objectStore('files').get(id);
  r.onsuccess=()=>{if(r.result&&r.result.blob)blobUrls.set(id,URL.createObjectURL(r.result.blob));resolve()};
  r.onerror=()=>resolve();
 })))}catch{}finally{db.close()}
}
function collectMedia(blocks,items,page){
 for(const block of blocks||[]){
  if(!block||block.hideOnSite===true)continue;
  if(block.kind==='section'){for(const col of block.columns||[])collectMedia(col,items,page);continue}
  // Navigation links are not media; only actual file links are indexed.
  const href=String(block.href||'');
  const extension=href.split(/[?#]/)[0].toLowerCase();
  const fileKind=/\.pdf$/.test(extension)?'pdf':
   /\.(?:mp3|wav|ogg|m4a|flac)$/.test(extension)?'audio':
   /\.(?:jpe?g|png|gif|webp|avif|svg)$/.test(extension)?'image':
   /\.(?:mp4|webm|mov)$/.test(extension)?'video':
   /\.(?:txt|csv|docx?|odt|rtf|zip|epub)$/.test(extension)?'file':null;
  const type=block.kind==='image'?'image':block.kind==='video'?'video':
   block.kind==='audio'?'audio':block.kind==='button'?fileKind:null;
  const src=block.kind==='video'||block.kind==='button'?block.href:block.src;
  if(!type||!urlOk(src))continue;
  const id=type+'|'+src;
  if(!items.has(id))items.set(id,{id,name:String(block.text||t('Média')).slice(0,120),
   type,src,external:type==='video'?src:undefined,pages:[page]});
  else if(!items.get(id).pages.includes(page))items.get(id).pages.push(page);
 }
}
function galleryEntries(){
 // The public library belongs only to the active celebration.
 // Only content actually published in its visible pages is indexed.
 if(!window.__PUBLIC_CELEBRATION_VISIBLE__)return [];
 const celebrationPages=pages.filter(p=>p.group==='celebration');
 const visibleNames=new Set(celebrationPages.map(p=>p.name));
 // Historical public resources from this very celebration may be linked
 // to a day without being stored as a modern editable media block.
 const historical=(Array.isArray(seed.library)?seed.library:[]).filter(item=>item&&
  ['audio','video','pdf','image','file'].includes(item.type)&&
  Array.isArray(item.pages)&&item.pages.some(name=>visibleNames.has(name))&&
  urlOk(item.src||item.external));
 const items=new Map(historical.map(item=>[item.type+'|'+(item.src||item.external),item]));
 for(const page of celebrationPages)collectMedia(page.blocks,items,page.name);
 return [...items.values()];
}
function youtubeEmbed(url){
 try{
  const u=new URL(url),h=u.hostname.toLowerCase();
  const id=h==='youtu.be'?u.pathname.slice(1):['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(h)
   ?u.searchParams.get('v')||(u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)||[])[1]:'';
  return /^[\w-]{11}$/.test(id||'')?'https://www.youtube-nocookie.com/embed/'+id:'';
 }catch{return ''}
}
// Each media item is a genuine link: right-click can open the original file
// in a new tab. A normal click on audio/video expands the player in-place.
function galleryCard(item,general=false){
 const card=make('article','media-card compact-media');
 const location=make('small','media-location',(item.pages||[]).join(' · '));location.hidden=general;
 const url=urlOk(item.src||item.external);
 if(item.type==='image'){
  const imageUrl=urlOk(item.src||item.cover);
  if(imageUrl){
   const link=make('a','media-image-link');link.href=imageUrl;link.target='_blank';link.rel='noopener noreferrer';
   const image=make('img','media-image');image.src=imageUrl;image.alt=item.name;image.loading='lazy';link.append(image);card.append(link);
  }
  card.append(make('div','media-image-name',item.name),location);return card;
 }
 if(item.type==='text'){
  const details=make('details','media-text'),label=make('summary','media-item-link',item.name),body=make('p','',item.text||item.description||'');
  details.append(label,body);card.append(details,location);return card;
 }
 const link=make('a','media-item-link',item.name);
 if(url){link.href=url;link.target='_blank';link.rel='noopener noreferrer'}
 else link.removeAttribute('href');
 card.append(link,location);
 if(item.type==='pdf')return card;
 if(item.type==='audio'||item.type==='video'){
  const panel=make('div','media-inline-player');panel.hidden=true;
  if(item.type==='audio'&&url){
   const audio=make('audio','media-player');audio.controls=true;audio.preload='none';audio.src=url;panel.append(audio);
   const controls=make('div','media-seek');
   for(const [text,seconds] of [['−10 s',-10],['+10 s',10]]){
    const button=make('button','media-small-button',text);button.type='button';
    button.onclick=()=>{try{audio.currentTime=Math.max(0,Math.min(Number.isFinite(audio.duration)?audio.duration:Infinity,audio.currentTime+seconds))}catch{}};
    controls.append(button);
   }
   const repeat=make('label','media-repeat'),check=make('input');check.type='checkbox';
   check.onchange=()=>audio.loop=check.checked;repeat.append(check,document.createTextNode(t(' En boucle')));
   panel.append(controls,repeat);
  }else if(item.type==='video'){
   const embed=youtubeEmbed(item.external);
   if(url&&/\.(?:mp4|webm|ogg)$/i.test(url)){
    const video=make('video','media-video');video.controls=true;video.preload='none';video.src=url;panel.append(video);
   }else if(embed){
    const wrap=make('div','video-container'),frame=make('iframe','media-video');
    frame.src=embed;frame.title=item.name;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;wrap.append(frame);panel.append(wrap);
   }
  }
  if(panel.childElementCount){
   // Close opened videos without leaving a dark player on the page.
   if(item.type==='video'){
    const close=make('button','media-video-close','×');close.type='button';
    close.title=t('Fermer la vidéo');close.setAttribute('aria-label',t('Fermer la vidéo'));
    close.onclick=()=>{
     const frame=panel.querySelector('iframe');
     if(frame){frame.dataset.originalSrc=frame.dataset.originalSrc||frame.getAttribute('src')||'';frame.removeAttribute('src')}
     const player=panel.querySelector('video');if(player)player.pause();
     panel.hidden=true;link.setAttribute('aria-expanded','false');
    };
    panel.prepend(close);
   }
   link.onclick=event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();panel.hidden=!panel.hidden;
    if(!panel.hidden){
     const frame=panel.querySelector('iframe');
     if(frame&&!frame.getAttribute('src')&&frame.dataset.originalSrc)frame.src=frame.dataset.originalSrc;
    }
    link.setAttribute('aria-expanded',String(!panel.hidden));
    if(panel.hidden){const player=panel.querySelector('audio,video');if(player)player.pause()}
   };
   link.setAttribute('aria-expanded','false');card.append(panel);
  }
 }
 return card;
}
function generalGalleryEntries(){
 // Use ONLY the already filtered public server media catalogue; never load
 // the editor catalogue or unapproved private /media/new/ assets.
 return (Array.isArray(window.__PUBLIC_MEDIA__)?window.__PUBLIC_MEDIA__:[])
  .filter(item=>item&&item.general===true&&
   ['image','audio','video','pdf','file'].includes(item.type)&&urlOk(item.src))
  .map(item=>({...item,pages:[]}));
}
function renderGallery(main){
 const isGeneral=active==='mediatheque-generale';
 const all=isGeneral?generalGalleryEntries():galleryEntries(),tabs=make('div','media-tabs');
 for(const [category,label] of [['image',t('Images')],['audio',t('Audios')],['video',t('Vidéos')],['text',t('Documents')]]){
  const button=make('button',libraryFamily===category?'media-tab current':'media-tab',label);
  button.type='button';button.onclick=()=>{libraryFamily=category;audioFilter='all';render()};tabs.append(button);
 }
 main.append(tabs);
 if(libraryFamily==='audio'){
  const filters=make('div','media-filters');
  for(const [v,label] of [['all',t('Tous')],['chant',t('Chants')],['other',t('Audios parlés')]]){
   const button=make('button',audioFilter===v?'media-filter current':'media-filter',label);
   button.type='button';button.onclick=()=>{audioFilter=v;render()};filters.append(button);
  }
  main.append(filters);
 }
 const list=make('div',libraryFamily==='image'?'media-list media-image-grid':'media-list');
 const matching=all.filter(x=>libraryFamily==='text'?['pdf','file'].includes(x.type):x.type===libraryFamily)
  .filter(x=>libraryFamily!=='audio'||audioFilter==='all'||(audioFilter==='chant'?x.chant:!x.chant));
 for(const item of matching)list.append(galleryCard(item,isGeneral));
 if(!matching.length)list.append(make('p','media-empty',t('Aucun contenu')));
 main.append(list);
}


async function memberAuth(body){
 const r=await fetch('/api/auth',{method:'POST',credentials:'omit',redirect:'error',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const x=await r.json().catch(()=>({}));if(!r.ok||x.ok!==true)throw Error(t('Connexion refusée'));return x;
}
async function memberAccount(body){
 const r=await fetch('/api/member-account',{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const x=await r.json().catch(()=>({}));if(!r.ok||x.ok!==true)throw Error(x.error||'Demande indisponible');return x;
}
async function memberPasswordProof(password,salt){
 const encoder=new TextEncoder(),key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 password='';
 const derived=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:180000,hash:'SHA-256'},key,256));
 return Array.from(derived,b=>b.toString(16).padStart(2,'0')).join('');
}

async function memberRead(path){
 if(!memberToken||memberExpires<=Date.now())throw Error(t('Session expirée'));
 const cookie=memberToken==='cookie';
 const r=await fetch(path,{method:'GET',credentials:cookie?'same-origin':'omit',redirect:'error',cache:'no-store',headers:cookie?{accept:'application/json'}:{authorization:'Bearer '+memberToken,accept:'application/json'}});
 if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw Error(t('Accès refusé ou révoqué'));
 return r.json();
}
async function refreshMemberPages(){
 if(!memberToken||memberBusy)return;
 publicLanguage.options=[...anonymousLanguageOptions];
 memberBusy=true;memberMessage='';memberPages=[];memberPage=null;render();
 try{const r=await memberRead('/api/participant/space-pages?celebration=all&lang='+encodeURIComponent(publicLanguage?.selectedLanguageId||qs.get('lang')||'fr'));
  // The server has already checked enrollment and category for EACH celebration.
  // Do not restrict the member list to the public celebration currently open.
  publicLanguage.options=[...new Map([...anonymousLanguageOptions,...(r.languages||[])].map(l=>[l.id,{...l,selected:l.id===uiLanguage}])).values()];
  memberPages=projectAuthorizedMemberPages(r,publicLanguage?.selectedLanguageId||qs.get('lang')||'fr');
 }catch(e){memberPages=[];memberPage=null;memberMessage=e.message}finally{memberBusy=false;render()}
}
async function openMemberPage(pageId){
 if(memberBusy||!memberPages.some(p=>p.id===pageId))return;
 memberBusy=true;memberPage=null;render();
 try{const r=await memberRead('/api/participant/space-page?pageId='+encodeURIComponent(pageId)+'&lang='+encodeURIComponent(publicLanguage?.selectedLanguageId||qs.get('lang')||'fr'));
  if(r.id!==pageId||!Array.isArray(r.blocks))throw Error('Page invalide');
  memberPage=r;memberMessage='';
 }catch{publicLanguage.options=[...anonymousLanguageOptions];memberPage=null;memberPages=[];memberMessage=t('Accès refusé ou révoqué')}finally{memberBusy=false;render()}
}

async function loginMember(email,password){
 if(memberBusy)return;memberBusy=true;memberMessage='';render();
 try{
  const begin=await memberAuth({action:'participant_begin',email});
  if(typeof begin.salt!=='string'||!begin.salt)throw Error(t('Compte indisponible'));
  const hex=await memberPasswordProof(password,begin.salt);
  password='';
  const result=await memberAuth({action:'participant_login_derived',email,password_proof:hex}),expires=Date.parse(result.expires_at);
  if(typeof result.token!=='string'||result.token.length<32||!Number.isFinite(expires)||expires<=Date.now())throw Error(t('Session invalide'));
  await memberAccount({action:'adopt_session',participant_token:result.token});
  memberToken='cookie';memberExpires=expires;
 }catch(e){memberToken=null;memberExpires=0;memberPages=[];memberMessage=e.message||t('Connexion impossible')}
 finally{memberBusy=false;render();if(memberToken)void refreshMemberPages()}
}

async function logoutMember(){
 publicLanguage.options=[...anonymousLanguageOptions];
 const token=memberToken;memberToken=null;memberExpires=0;memberPages=[];memberPage=null;memberMessage='';render();
 if(token)try{if(token==='cookie')await memberAccount({action:'logout'});else await memberAuth({action:'participant_logout',participant_token:token})}catch{}
}

function renderMemberArea(main,renderBlock){
 main.append(make('h2','',memberFlow?t('Mon compte'):t('Mes espaces autorisés')));
 if(!memberToken&&memberFlow){
  const flow=memberFlow;
  const form=make('form','member-login'),p1=make('input'),p2=make('input');
  p1.type=p2.type='password';p1.required=p2.required=true;p1.minLength=p2.minLength=10;
  p1.autocomplete=p2.autocomplete='new-password';
  p1.placeholder=memberText('newPassword');p2.placeholder=memberText('confirm');
  p1.setAttribute('aria-label',memberText('newPassword'));p2.setAttribute('aria-label',memberText('confirm'));
  const save=make('button','general-tab',memberText('save'));save.type='submit';save.disabled=memberBusy;
  const back=make('button','general-tab',memberText('back'));back.type='button';back.onclick=()=>{memberFlow=null;memberMessage='';render()};
  form.append(make('p','',flow.email),p1,p2,save,back);
  form.onsubmit=event=>{event.preventDefault();if(memberBusy)return;
   if(p1.value!==p2.value){memberMessage=memberText('mismatch');render();return}
   let password=p1.value;p1.value=p2.value='';memberBusy=true;memberMessage='';render();
   const salt=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
   void memberPasswordProof(password,salt).then(proof=>{
    password='';return memberAccount({action:flow.kind==='activate'?'finish_activation':'finish_reset',email:flow.email,token:flow.token,password_salt:salt,password_proof:proof});
   }).then(()=>{memberFlow=null;memberPanel='login';memberMessage=memberText('changed')}).catch(e=>memberMessage=e.message).finally(()=>{memberBusy=false;render()});
  };
  main.append(form);
 }else if(!memberToken&&memberPanel!=='login'){
  const mode=memberPanel,form=make('form','member-login'),mail=make('input');
  mail.type='email';mail.required=true;mail.autocomplete='email';mail.placeholder=memberText('email');
  mail.setAttribute('aria-label',memberText('email'));
  const send=make('button','general-tab',memberText('send'));send.type='submit';send.disabled=memberBusy;
  const back=make('button','general-tab',memberText('back'));back.type='button';back.onclick=()=>{memberPanel='login';memberMessage='';render()};
  form.append(make('h3','',mode==='request_activation'?memberText('activation'):memberText('forgot')),mail,send,back);
  form.onsubmit=e=>{e.preventDefault();if(memberBusy)return;memberBusy=true;memberMessage='';const address=mail.value;render();
   void memberAccount({action:mode,email:address,language:publicLanguage?.selectedLanguageId||'fr'})
    .then(()=>memberMessage=memberText('sent')).catch(e=>memberMessage=e.message).finally(()=>{memberBusy=false;render()});
  };
  main.append(form);
 }else if(!memberToken){
  const form=make('form','member-login'),mail=make('input'),password=make('input');
  mail.type='email';mail.required=true;mail.autocomplete='username';mail.placeholder=memberText('email');mail.setAttribute('aria-label',memberText('email'));
  password.type='password';password.required=true;password.autocomplete='current-password';password.placeholder=memberText('password');password.setAttribute('aria-label',memberText('password'));
  const submit=make('button','general-tab',memberText('login'));submit.type='submit';submit.disabled=memberBusy;
  const activate=make('button','general-tab',memberText('activation'));
  const forgot=make('button','general-tab',memberText('forgot'));
  activate.type=forgot.type='button';
  activate.onclick=()=>{memberPanel='request_activation';memberMessage='';render()};
  forgot.onclick=()=>{memberPanel='request_reset';memberMessage='';render()};
  form.append(mail,password,submit,activate,forgot);
  form.onsubmit=e=>{e.preventDefault();const secret=password.value;password.value='';void loginMember(mail.value.trim().toLowerCase(),secret)};
  main.append(form);
 }else{
  const refresh=make('button','general-tab',t('Actualiser mes accès')),logout=make('button','general-tab',t('Se déconnecter'));
  refresh.type=logout.type='button';refresh.disabled=logout.disabled=memberBusy;
  refresh.onclick=()=>void refreshMemberPages();logout.onclick=()=>void logoutMember();main.append(refresh,logout);
  const nav=make('nav','member-allowed-pages');nav.setAttribute('aria-label',t('Pages autorisées'));
  const byCelebration=new Map();
  for(const p of memberPages){
   if(!byCelebration.has(p.celebrationId))byCelebration.set(p.celebrationId,[]);
   byCelebration.get(p.celebrationId).push(p);
  }
  for(const entries of byCelebration.values()){
   const group=make('section','member-celebration-group');
   group.append(make('h3','',entries[0].celebrationLabel||t('Célébration')));
   for(const p of entries){
    const button=make('button','stage-tab',(p.spaceName?p.spaceName+' · ':'')+p.name);
    button.type='button';button.disabled=memberBusy;button.onclick=()=>void openMemberPage(p.id);group.append(button);
   }
   nav.append(group);
  }
  main.append(nav);
  if(!memberPages.length&&!memberBusy&&!memberMessage)main.append(make('p','',t('Aucune page autorisée.')));
  if(memberPage){const content=make('section','member-page-content');content.append(make('h2','',memberPage.name||''));for(const b of memberPage.blocks)renderBlock(b,content);translationNotice(memberPage,content);main.append(content)}
 }
 if(memberBusy)main.append(make('p','',t('Vérification des droits…')));
 if(memberMessage)main.append(make('p','media-empty',memberMessage));
}
function closeGeneralMenu(returnFocus=false){
 menuOpen=false;
 const nav=el('general-navigation'),button=el('menu-toggle');
 if(nav)nav.hidden=true;
 if(button){
  button.setAttribute('aria-expanded','false');
  if(returnFocus)button.focus();
 }
}
// Closing the dropdown never changes the page content.
document.addEventListener('pointerdown',event=>{
 if(menuOpen&&!event.target.closest('.site-menu-group'))closeGeneralMenu();
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&menuOpen){
  event.preventDefault();closeGeneralMenu(true);
 }
});
function go(slug){active=slug;menuOpen=false;const next=new URL(location.href);next.searchParams.delete('celebration');next.searchParams.set('page',slug);history.replaceState(null,'',next.pathname+next.search+next.hash);render();if(slug==='member-area'&&memberToken)void refreshMemberPages();window.scrollTo({top:0,behavior:'instant'});}
function render(){
 const identity=document.getElementById('site-identity');if(identity)identity.classList.toggle('is-home',active===(generalPages().homeId||'neutral-accueil-general'));
 for(const [id,key] of [['menu-toggle','☰ Menu'],['back-admin','Administration']]){const node=el(id);if(node)node.textContent=t(key)}
 for(const [id,key] of [['general-navigation','Pages hors célébration'],['public-language-control','Langues du site'],['celebration-shortcuts','Célébration'],['stage-navigation','Pages de la célébration'],['footer-pages','Pages de bas de page']])el(id)?.setAttribute('aria-label',t(key));

 renderLanguagePicker();
 const memberShortcut=el('member-connection');
 if(memberShortcut){memberShortcut.hidden=!memberLoginVisible;memberShortcut.textContent=memberToken?t('Mes célébrations'):t('Connexion membre');memberShortcut.onclick=()=>go('member-area')} 
 const inMembers=typeof memberEnabled!=='undefined'&&memberEnabled&&active==='member-area';
 const listing=active==='celebrations',isGallery=['mediatheque','mediatheque-generale'].includes(active);
 const requested=pages.find(p=>slugOf(p)===active);
 const page=requested||pages.find(p=>p.group==='page')||pages[0]||
  {id:'page-indisponible',name:'Page indisponible',group:'page',blocks:[]};
 const unpublished=!(listing||isGallery||inMembers)&&!requested;
 const neutral=inMembers||listing||active==='mediatheque-generale'||(!isGallery&&page.group==='page');
 document.body.classList.toggle('is-neutral-preview',neutral);
 applyCelebrationPalette();
 const shortcuts=el('celebration-shortcuts');shortcuts.replaceChildren();
 for(const [slug,label] of [['preparation',t('Programme')],['mediatheque',t('Médiathèque')]]){
  const selected=slug==='mediatheque'?active==='mediatheque':slug==='accueil-celebration'?active==='accueil-celebration':!neutral&&!isGallery;
  const button=make('button',selected?'celebration-shortcut current':'celebration-shortcut',label);
  button.type='button';button.onclick=()=>go(slug);shortcuts.append(button);
 }
 shortcuts.hidden=inMembers||listing||active==='mediatheque-generale'||(!isGallery&&page.group==='page');
 const nav=el('stage-navigation');nav.replaceChildren();
 nav.after(shortcuts);
 for(const p of pages.filter(p=>p.group==='celebration')){
  const slug=slugOf(p),date=dateForPage(p);
  const label=(p.spaceName?p.spaceName+' · ':'')+p.name+(date&&DAYS.includes(slug)?' · '+date:'');
  const bt=make('button',slug===active?'stage-tab current':'stage-tab',label);
  bt.type='button';bt.onclick=()=>go(slug);nav.append(bt);
 }
 nav.hidden=neutral||isGallery;
 const general=el('general-navigation');general.replaceChildren();
 const homeId=generalPages().homeId||'neutral-accueil-general';
 // Main menu holds general pages; the celebration owns its media library.
 // Footer pages only appear as links at the bottom of the site.
 const home=make('button',active===homeId?'general-tab current':'general-tab',t('⌂ Accueil'));
 home.type='button';home.onclick=()=>go(homeId);general.append(home);
 const all=null;
 /* Pas de célébrations sur Espace Jeunesse. */
 const library=null;
 /* La médiathèque reste UNIQUEMENT dans l'administration. */
 if(typeof memberLoginVisible!=='undefined'&&memberLoginVisible){const memberLink=make('button',inMembers?'general-tab current':'general-tab',t('Mes célébrations'));
  memberLink.type='button';memberLink.onclick=()=>go('member-area');general.append(memberLink)}
  for(const p of pages.filter(p=>p.group==='page'&&p.placement!=='footer'&&slugOf(p)!==homeId)){
  const item=make('button',slugOf(p)===active?'general-tab current':'general-tab',p.name);
  item.type='button';item.onclick=()=>go(slugOf(p));general.append(item);
 }
 const menu=el('menu-toggle');
 if(menu)menu.onclick=()=>{
  menuOpen=!menuOpen;
  general.hidden=!menuOpen;
  menu.setAttribute('aria-expanded',String(menuOpen));
 };
 general.hidden=!menuOpen;
 if(menu)menu.setAttribute('aria-expanded',String(menuOpen));
 const back=el('return-celebration');if(back){back.hidden=!neutral;back.onclick=()=>go('accueil-celebration')}
 document.title=(inMembers?t('Mes espaces'):listing?t('Célébrations'):isGallery?t('Médiathèque'):page.name)+(location.hostname.endsWith('ronde-des-archanges-universelle.eu')?t(' — Célébrations des Archanges'):t(' — Site d’essai'));
 el('back-admin').href='admin.html';
 const footerPages=el('footer-pages');footerPages.replaceChildren();
 for(const p of pages.filter(p=>p.group==='page'&&p.placement==='footer')){
  const link=make('a','footer-page-link',p.name);
  link.href='?celebration='+encodeURIComponent(celebration)+'&page='+encodeURIComponent(slugOf(p))+'&lang='+encodeURIComponent(publicLanguage?.selectedLanguageId||'fr');
  link.onclick=e=>{e.preventDefault();go(slugOf(p))};
  footerPages.append(link);
 }
 const main=el('stage-main');main.replaceChildren();main.lang=uiLanguage;main.dir=uiLanguage==='ar'?'rtl':'ltr';
 if(!listing&&!isGallery&&page.group==='celebration'){
  const date=dateForPage(page),hour=timeForPage(page),display=[date,hour].filter(Boolean).join(' · ');
  if(display){const label=make('div','site-page-date',display);label.dataset.role='celebration-date';main.append(label)}
 }
 if(inMembers){renderMemberArea(main,appendPageBlock);return}
 if(isGallery){renderGallery(main);return}
 if(unpublished){main.append(make('p','media-empty',t('Cette page n’est pas publiée.')));return}
 if(listing){
  const choices=make('div','celebration-choices');
  for(const entry of celebrations()){
   const card=make(entry.titleOnly?'div':'a','celebration-choice');
   const name=String(entry.archangel||'').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toLowerCase();
   card.dataset.archangel=name.includes('mich')?'michael':
    name.includes('gabri')?'gabriel':name.includes('rapha')?'raphael':
    name.includes('ouriel')||name.includes('auriel')||name.includes('uriel')?'ouriel':'other';
   if(!entry.titleOnly)card.href='/__editor/voir-le-site?celebration='+encodeURIComponent(entry.id)+'&page=accueil-celebration&lang='+encodeURIComponent(publicLanguage?.selectedLanguageId||'fr');
   card.append(make('strong','',entry.title||entry.archangel+' '+entry.year));
   card.append(make('small','',entry.titleOnly?(memberLoginVisible?t('Privée — connexion nécessaire'):t('Célébration privée')):entry.kind==='planned'?t('En préparation (test)'):t('Voir les pages de la célébration')));
   choices.append(card);
  }
  main.append(choices);return;
 }
 let mainHeadingRendered=false;
 function siteVideoInfo(href){
  try{
   const u=new URL(href),host=u.hostname.toLowerCase();let id='';
   if(['youtu.be','www.youtu.be'].includes(host))id=u.pathname.split('/')[1];
   else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host))
    id=u.searchParams.get('v')||(u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)||[])[1];
   if(/^[\w-]{11}$/.test(id||''))return {thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',embed:'https://www.youtube-nocookie.com/embed/'+id};
   if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
    const m=u.pathname.match(/(?:\/video)?\/(\d{6,12})(?:\/|$)/);
    if(m)return {thumbnail:'https://vumbnail.com/'+m[1]+'.jpg',embed:'https://player.vimeo.com/video/'+m[1]};
   }
  }catch{}
  return null;
 }
 function siteLinkCard(href,title){
  const el=make('div','trial-website-card');
  try{
   const url=new URL(href);
   const icon=make('img','trial-website-icon');icon.src=url.origin+'/favicon.ico';icon.alt='';
   icon.onerror=()=>icon.remove();el.append(icon,make('span','trial-website-domain',url.hostname));
  }catch{}
  el.append(make('strong','',title||t('Site')));return el;
 }
 function appendPageBlock(b,root){
  if(!b||b.hideOnSite===true)return;
  if(b.kind==='section'){
   const st=b.style||{},frame=['none','round','square'].includes(st.border)?st.border:'none';
   const section=make('section','trial-content-section');
   section.dataset.layout=b.layout==='columns'?'columns':'single';
   section.dataset.presentation=['resource','video','documents','intro','text'].includes(b.presentation)?b.presentation:'';
   if(frame!=='none'){
    section.style.border=Math.min(5,Math.max(1,Number(st.width)||1))+'px solid '+(/^#[0-9a-f]{6}$/i.test(st.color)?st.color:'#d7dde5');
    section.style.borderRadius=frame==='round'?'16px':'0';
   }
   if(st.shadow)section.style.boxShadow='0 5px 19px #16243329';
   const columns=make('div','trial-content-columns');
   const arrays=Array.isArray(b.columns)?b.columns:[[],[]];
   if(b.presentation==='documents'){
    const list=make('div','trial-document-list');
    const all=arrays.flatMap(x=>Array.isArray(x)?x:[]);
    for(let i=0;i<all.length;i++){
     const item=all[i];
     if(item?.kind==='heading'&&all[i+1]?.kind==='button'){
      const row=make('article','trial-document-item');
      appendPageBlock(item,row);appendPageBlock(all[++i],row);list.append(row);
     }else appendPageBlock(item,list);
    }
    section.append(list);root.append(section);return;
   }
   if(b.layout==='columns'){
    for(const [index,items] of arrays.slice(0,2).entries()){
     const cell=make('div','trial-content-column');
     cell.dataset.parentPresentation=section.dataset.presentation;
     const vertical=b.columnAlignments?.[index];
     cell.dataset.verticalAlign=['top','center','bottom'].includes(vertical)?vertical:
      b.presentation==='resource'?'center':'top';
     cell.dataset.buttonLayout=b.columnButtonLayouts?.[index]==='row'?'row':'stack';
     for(const child of items||[])appendPageBlock(child,cell);
     columns.append(cell);
    }
   }else{
    const cell=make('div','trial-content-column');
    cell.dataset.parentPresentation=section.dataset.presentation;
    cell.dataset.verticalAlign='top';
    cell.dataset.buttonLayout=b.columnButtonLayouts?.[0]==='row'?'row':'stack';
    for(const items of arrays.slice(0,2))for(const child of items||[])appendPageBlock(child,cell);
    columns.append(cell);
   }
   section.append(columns);root.append(section);return;
  }
  if(!['heading','event','text','image','button','audio','video','divider'].includes(b.kind))return;
  // Older celebrations stored linked videos as buttons: show their real
  // player and thumbnail without rewriting the historic content.
  if(b.kind==='button'&&b.displayAsButton!==true){
   const href=urlOk(b.href);
   if(siteVideoInfo(href)||/\.(?:mp4|webm|ogg)(?:\?|$)/i.test(href||'')){
    appendPageBlock({...b,kind:'video'},root);return;
   }
  }
  const wrap=make('div','site-block');
  // Explicit links are buttons, independently of the target URL.
  if(b.kind==='button'&&b.displayAsButton===true)wrap.className+=' trial-button-block';
  if(b.kind!=='event'&&validClock(b.atTime)){const marker=make('time','media-at-time',b.atTime);wrap.append(marker)}
  if(b.kind==='divider'){
   const line=make('hr','trial-custom-divider');
   const color=/^#[0-9a-f]{6}$/i.test(String(b.color||''))?b.color:'#858c94';
   const thickness=Number.isInteger(b.thickness)&&b.thickness>=1&&b.thickness<=8?b.thickness:1;
   const width=Number.isInteger(b.widthPct)&&b.widthPct>=20&&b.widthPct<=100?b.widthPct:60;
   line.style.border='0';line.style.width=width+'%';
   line.style.height=thickness+'px';line.style.backgroundColor=color;
   line.style.margin='16px auto';line.setAttribute('aria-label',t('Séparation'));
   wrap.append(line);
  }else if(b.kind==='heading'||b.kind==='event'){
   const primary=!mainHeadingRendered;mainHeadingRendered=true;
   const isSchedule=/^[0-2]?[0-9]:[0-5][0-9][ ]*[—–-]/.test(String(b.text||''));
   const h=make(primary?'h1':'h2','trial-heading '+(primary?'heading-primary':'heading-secondary')+(isSchedule||b.kind==='event'?' heading-schedule':''));
   formattedText(h,b);
   if(b.kind==='event'&&validClock(b.atTime)&&!/^\d{1,2}:\d{2}\s*[—–-]/.test(String(b.text||''))){
    const time=make('time','event-inline-time',b.atTime+' — ');h.prepend(time);
   }
   applyStyle(h,b);wrap.append(h);
  }else if(b.kind==='text'){
   const p=make('p','trial-paragraph');formattedText(p,b);applyStyle(p,b);wrap.append(p);
  }else if(b.kind==='image'){
   const src=b.assetId?blobUrls.get(b.assetId):urlOk(b.src);
   if(src){
    const fig=make('figure','trial-figure'),img=make('img');
    const width=Number.isInteger(b.widthPct)&&b.widthPct>=20&&b.widthPct<=100?b.widthPct:100;
    fig.style.width=width+'%';fig.style.maxWidth='100%';fig.style.marginLeft='auto';fig.style.marginRight='auto';
    img.src=src;img.alt=String(b.text||t('Illustration'));img.loading='lazy';img.style.width='100%';img.style.height='auto';
    fig.append(img);wrap.append(fig);
   }
  }else if(b.kind==='audio'){
   const box=make('div','trial-audio');
   box.append(make('strong','',String(b.text||t('Enregistrement MP3'))));
   const remote=/^editor-trials\/audio\/[0-9a-f-]{36}\.mp3$/.test(String(b.remoteKey||''));
   const src=remote?'/api/editor-trial-audio?action=stream&key='+encodeURIComponent(b.remoteKey):
     (window.__EJ_WORKER_MEDIA_BASE__ && String(b.src||'').startsWith(window.__EJ_WORKER_MEDIA_BASE__+'/media/'))?b.src:(/^\/media\/(?!.*\.\.)[^?#]+\.mp3$/i.test(String(b.src||''))?b.src:'');
   if(src){const audio=make('audio','trial-audio-player');audio.controls=true;audio.preload='none';audio.src=src;box.append(audio)}
   else box.append(make('p','trial-unavailable',t('MP3 indisponible dans cet aperçu.')));
   wrap.append(box);
  }else if(b.kind==='video'){
   const href=urlOk(b.href),video=siteVideoInfo(href);
   const container=make('div','trial-video');
   const title=make('div','trial-video-title',b.text||t('Vidéo'));
   const cover=b.coverAssetId?blobUrls.get(b.coverAssetId):urlOk(b.cover);
   const image=video?.thumbnail||cover;
   if(href&&video){
    const toggle=make('button','trial-video-trigger');
    toggle.type='button';toggle.setAttribute('aria-label',t('Lire la vidéo'));
    if(image){const thumb=make('img','trial-video-thumb');thumb.src=image;thumb.alt=b.text||t('Vidéo');thumb.loading='lazy';toggle.append(thumb)}
    toggle.append(make('span','trial-video-play','▶'));container.append(toggle,title);
    toggle.onclick=()=>{
     const iframe=make('iframe','trial-video-iframe');iframe.src=video.embed;
     iframe.title=b.text||t('Vidéo');iframe.loading='lazy';iframe.referrerPolicy='strict-origin-when-cross-origin';
     iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';iframe.allowFullscreen=true;
     toggle.replaceWith(iframe);
    };
   }else if(href&&/\.(?:mp4|webm|ogg)(?:$|\?)/i.test(href)){
    const player=make('video','trial-video-player');player.controls=true;player.preload='none';player.src=href;
    if(cover)player.poster=cover;container.append(player,title);
   }else if(href){
    const a=make('a','trial-site-link');a.href=href;a.target='_blank';a.rel='noopener noreferrer';
    if(cover){const thumb=make('img','trial-site-cover');thumb.src=cover;thumb.alt=b.text||t('Site');a.append(thumb)}
    else a.append(siteLinkCard(href,b.text||t('Site')));
    // Only the miniature is the link; the readable title is a small bold caption below.
    container.append(a,title);
   }else container.append(make('span','trial-unavailable',t('Vidéo à ajouter')));
   wrap.append(container);
  }else if(b.kind==='button'){
   const href=b.assetId?blobUrls.get(b.assetId):urlOk(b.href);
   if(href){
    const showAsButton=b.displayAsButton===true;
    const compact=!showAsButton&&
     (root.dataset.parentPresentation==='resource'||root.classList.contains('trial-document-item'))&&
     /^(?:Ouvrir le PDF|Ouvrir :)/i.test(b.text||'')&&
     (/\.pdf(?:[?#]|$)/i.test(href)||!!b.assetId);
    const label=compact?t('📄 Ouvrir le PDF'):(b.text||t('Ouvrir'));
    const link=make('a','trial-button',label);
    if(compact)link.setAttribute('aria-label',String(b.text||t('Ouvrir le document')));
    link.href=withLanguageInInternalLink(href,publicLanguage?.selectedLanguageId||'fr',location.href);link.rel='noopener noreferrer';link.target='_blank';applyStyle(link,b);
    if(!showAsButton){
    const cover=b.coverAssetId?blobUrls.get(b.coverAssetId):urlOk(b.cover);
    const video=siteVideoInfo(href);
    if(video){
     link.className='trial-site-link';
     const img=make('img','trial-site-cover');img.src=video.thumbnail;img.alt=b.text||t('Vidéo');img.loading='lazy';
     link.prepend(img);
    }else if(cover){
     link.className='trial-site-link';
     const img=make('img','trial-site-cover');img.src=cover;img.alt=b.text||t('Site');img.loading='lazy';
     link.prepend(img);
    }else if(/^https:\/\//.test(href)&&!href.endsWith('.pdf')){
     link.className='trial-site-link';link.prepend(siteLinkCard(href,b.text||t('Site')));
    }
    }
    wrap.append(link);
   }
   else {const note=make('span','trial-unavailable',b.text||t('Document indisponible'));wrap.append(note)}
  }
  root.append(wrap);
 }
 for(const b of page.blocks||[])appendPageBlock(b,main);
 translationNotice(page,main);
}

render();
if(memberEnabled)void memberAccount({action:'session'}).then(s=>{
 const expire=Date.parse(s.expires_at);
 if(Number.isFinite(expire)&&expire>Date.now()){
  memberToken='cookie';memberExpires=expire;render();
  if(active==='member-area')void refreshMemberPages();
 }
}).catch(()=>{});
loadAssets().then(render);
// Public pages do not react to local administrator draft changes.
})();

//# sourceURL=ej-original-celebrations-public.js
