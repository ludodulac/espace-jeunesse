const M012B=(()=>{
const m0=(()=>{
// Shared native-site dialog: no browser prompts; text only, focus restored.
function adminDialog(document,{title='Confirmer',message='',fields=[],confirm='Valider',cancel='Annuler'}={}){
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=document.createElement('dialog');
  dialog.className='admin-dialog';
  const form=document.createElement('form');form.method='dialog';
  const heading=document.createElement('h2');heading.textContent=title;heading.id='dialog-'+crypto.randomUUID();
  dialog.setAttribute('aria-labelledby',heading.id);form.append(heading);
  const note=document.createElement('p');note.textContent=message;form.append(note);
  const controls={};
  for(const f of fields){
   if(f.multiple||f.radio){
    const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=f.label;group.append(legend);
    const inputs=[];
    for(const [value,name] of f.options){const row=document.createElement('label'),check=document.createElement('input');row.className='admin-dialog-choice';check.type=f.radio?'radio':'checkbox';check.name=f.name;check.value=value;check.checked=f.radio?f.value===value:(f.value??[]).includes(value);row.append(check,document.createTextNode(name));group.append(row);inputs.push(check)}
    controls[f.name]={get value(){return f.radio?inputs.find(x=>x.checked)?.value:inputs.filter(x=>x.checked).map(x=>x.value)}};form.append(group);continue;
   }
   const label=document.createElement('label'),caption=document.createElement('span');caption.textContent=f.label;
   const input=document.createElement(f.options?'select':'input');
   if(f.options)for(const [value,name] of f.options){const o=document.createElement('option');o.value=value;o.textContent=name;input.append(o)}
   else input.type=f.type||'text';
   input.setAttribute('aria-label',f.label||title);
   input.value=f.value??'';input.required=!!f.required;
   if(f.maxLength)input.maxLength=f.maxLength;
   controls[f.name]=input;label.append(caption,input);form.append(label);
  }
  const actions=document.createElement('div');actions.className='admin-dialog-actions';
  const no=document.createElement('button');no.type='button';no.textContent=cancel;no.className='btn';
  const yes=document.createElement('button');yes.type='submit';yes.textContent=confirm;yes.className='btn primary';
  let finished=false;
  const finish=value=>{if(finished)return;finished=true;dialog.close();dialog.remove();previous?.focus();resolve(value)};
  no.onclick=()=>finish(null);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null)});
  form.onsubmit=event=>{event.preventDefault();if(form.reportValidity())finish(Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.value])))};
  actions.append(no,yes);form.append(actions);dialog.append(form);document.body.append(dialog);dialog.showModal();
  (form.querySelector('input,select')||yes).focus();
 });
}

return {adminDialog};
})();
const m1=(()=>{
// M002 — Portable membership and authorization rules, deliberately NOT wired to
// any public route. Inputs are trusted records supplied by a future server
// adapter after session verification; never accept a client-asserted principal.
// No browser, Cloudflare binding, data store, network, clock, or crypto access.

const ACCESS_MODES = Object.freeze({
 PUBLIC: 'PUBLIC',
 ALL_PRIVATE_TYPES: 'ALL_PRIVATE_TYPES',
 SELECTED_TYPES: 'SELECTED_TYPES'
});
const SPACE_VISIBILITIES = Object.freeze({PUBLIC: 'PUBLIC', PRIVATE: 'PRIVATE'});

// Namespace future member types instead of silently converting historic
// celebrations_groups ids (all, angel, nonangel) into access entitlements.
const TYPE_ID = /^member-type:[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
const identity = value => typeof value === 'string' && value.length > 0 &&
 value.length <= 254 && value === value.trim();
const isMemberTypeId = id => typeof id === 'string' && TYPE_ID.test(id);

function createMemberType({id, name} = {}) {
 if (!isMemberTypeId(id)) throw new TypeError('Stable member-type identifier required');
 if (typeof name !== 'string' || !name.trim() || name.trim().length > 120)
  throw new TypeError('A member type requires a non-empty name (max 120 characters)');
 return {id, name: name.trim()};
}

function renameMemberType(type, name) {
 const renamed = createMemberType({id: type?.id, name});
 return {...type, name: renamed.name}; // preserve ID, metadata and existing links
}

// Build normalized association rows; the caller will eventually persist these
// in D1, not inside a page, translated content, or Cloudflare account metadata.
function assignMemberTypes(memberId, typeIds, catalogue) {
 if (!identity(memberId) || !Array.isArray(typeIds) || !Array.isArray(catalogue))
  throw new TypeError('Member, type ids and catalogue required');
 const known = new Set(catalogue.filter(t => isMemberTypeId(t?.id)).map(t => t.id));
 const assigned = new Set();
 for (const id of typeIds) {
  if (!isMemberTypeId(id) || !known.has(id)) throw new TypeError('Unknown member type');
  assigned.add(id);
 }
 return [...assigned].map(typeId => ({memberId, typeId}));
}

function enrollInSpace(memberId, spaceId) {
 if (!identity(memberId) || !identity(spaceId))
  throw new TypeError('Stable member and space ids required');
 return {memberId, spaceId};
}

const signedIn = principal => !!principal && principal.authenticated === true &&
 identity(principal.id);

function validPolicy(policy) {
 if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return false;
 if (policy.mode === ACCESS_MODES.PUBLIC ||
     policy.mode === ACCESS_MODES.ALL_PRIVATE_TYPES) return true;
 return policy.mode === ACCESS_MODES.SELECTED_TYPES &&
  Array.isArray(policy.typeIds) && policy.typeIds.length > 0 &&
  policy.typeIds.every(isMemberTypeId);
}

function memberTypeIds(context) {
 const principal = context?.principal;
 if (!signedIn(principal) || !Array.isArray(context?.types) ||
     !Array.isArray(context?.memberships)) return new Set();
 const known = new Set(context.types.filter(type => isMemberTypeId(type?.id) &&
  type.disabled !== true).map(type => type.id));
 return new Set(context.memberships.filter(link =>
  link?.memberId === principal.id && known.has(link.typeId)).map(link => link.typeId));
}

function canAccessPolicy(policy, context = {}) {
 if (!validPolicy(policy)) return false; // unknown/invalid policy: fail closed
 if (policy.mode === ACCESS_MODES.PUBLIC) return true;
 if (!signedIn(context.principal)) return false;
 const assigned = memberTypeIds(context);
 if (policy.mode === ACCESS_MODES.ALL_PRIVATE_TYPES) return context.celebrationEnrolled === true || assigned.size > 0;
 return policy.typeIds.some(id => assigned.has(id));
}

function canAccessSpace(space, context = {}) {
 if (!space || !identity(space.id) || !identity(space.celebrationId) ||
     !Object.values(SPACE_VISIBILITIES).includes(space.visibility) ||
     !validPolicy(space.accessPolicy)) return false;
 if (space.visibility === SPACE_VISIBILITIES.PUBLIC) {
  // A public space must really be public; individual pages may still be private.
  return space.accessPolicy.mode === ACCESS_MODES.PUBLIC;
 }
 // Category-based variants reuse the existing celebration enrollment,
 // while historical invitation-only spaces keep their individual enrollments.
 if (!signedIn(context.principal)) return false;
 if (space.accessScope === 'CELEBRATION')
  return context.celebrationEnrolled === true &&
   canAccessPolicy(space.accessPolicy, context);
 if (!Array.isArray(context.enrollments)) return false;
 const enrolled = context.enrollments.some(link =>
  link?.memberId === context.principal.id && link.spaceId === space.id);
 return enrolled && canAccessPolicy(space.accessPolicy, context);
}

function canAccessPage(page, context = {}) {
 if (!page || !identity(page.id)) return false;
 // Existing pages have no accessPolicy/spaceId: preserve PUBLIC access.
 // Explicit null, invalid modes or malformed type lists are NOT legacy pages.
 const policy = Object.hasOwn(page, 'accessPolicy') ? page.accessPolicy :
  {mode: ACCESS_MODES.PUBLIC};
 if (!canAccessPolicy(policy, context)) return false;
 const hasSpace = Object.hasOwn(page, 'spaceId');
 if (!hasSpace) return context.space == null; // no invented space for a legacy page
 const space = context.space;
 if (!identity(page.spaceId) || !space || page.spaceId !== space.id ||
     !identity(page.celebrationId) ||
     page.celebrationId !== space.celebrationId) return false;
 return canAccessSpace(space, context); // never bypass space via a direct page URL
}

// Publishing, media access, navigation and language selection remain separate.
// Future server handlers must authorize canonical page + canonical space BEFORE
// returning any content or media; translation variants must not carry ACLs.

return {ACCESS_MODES,SPACE_VISIBILITIES,isMemberTypeId,createMemberType,renameMemberType,assignMemberTypes,enrollInSpace,canAccessPolicy,canAccessSpace,canAccessPage};
})();
const m2=(()=>{
// Mission 003 — pure multilingual domain model.
// Not connected to the editor, public renderer, authentication or Cloudflare.
// The existing root content of a legacy page/celebration space is French.

const INITIAL_LANGUAGE_ID = 'fr';
const PREPARED_LANGUAGES = Object.freeze([
 {id:'fr',name:'Français',flag:'🇫🇷',active:true},
 {id:'en',name:'English',flag:'🇬🇧',active:true},
 {id:'es',name:'Español',flag:'🇪🇸',active:true},
 {id:'de',name:'Deutsch',flag:'🇩🇪',active:true},
 {id:'pt',name:'Português',flag:'🇵🇹',active:true},
 {id:'it',name:'Italiano',flag:'🇮🇹',active:true},
 {id:'ar',name:'العربية',flag:'🌐',active:true},
 {id:'zh-Hans',name:'简体中文',flag:'🌐',active:true}
]);
const LOCALIZABLE_FIELDS = Object.freeze([
  'name', 'title', 'label', 'description', 'subtitle', 'text', 'rich',
  'blocks', 'documents', 'media', 'links', 'contentIds'
]);

const LANGUAGE_ID_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const LOCALIZABLE = new Set(LOCALIZABLE_FIELDS);
const copy = value => structuredClone(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function requireLanguageId(id) {
  if (typeof id !== 'string' || !LANGUAGE_ID_PATTERN.test(id))
    throw new TypeError('Identifiant de langue invalide (ex. fr, en, pt-BR).');
  return id;
}
function requireLabel(value, name) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${name} doit être un texte non vide.`);
  return value;
}
function requireIdentity(entity) {
  const id = entity?.id ?? entity?.key;
  if ((typeof id !== 'string' || !id.trim()) &&
      (typeof id !== 'number' || !Number.isFinite(id)))
    throw new TypeError('Une page ou un espace doit avoir un identifiant permanent.');
  return id;
}
function assertRegistry(registry) {
  if (!registry || !Array.isArray(registry.languages) || !registry.languages.length)
    throw new TypeError('Registre des langues absent ou invalide.');
  const ids = new Set();
  for (const lang of registry.languages) {
    requireLanguageId(lang?.id);
    requireLabel(lang?.name, 'Le nom de la langue');
    if (ids.has(lang.id)) throw new Error(`Langue dupliquée : ${lang.id}`);
    if (typeof lang.active !== 'boolean') throw new TypeError('Activation invalide.');
    if (lang.flag !== undefined && typeof lang.flag !== 'string')
      throw new TypeError('Le drapeau doit être un texte ou une référence portable.');
    ids.add(lang.id);
  }
  requireLanguageId(registry.defaultLanguageId);
  if (!registry.languages.some(lang => lang.id === registry.defaultLanguageId && lang.active))
    throw new Error('La langue par défaut doit être présente et active.');
  return registry;
}
function withLanguage(registry, languageId, change) {
  assertRegistry(registry);
  requireLanguageId(languageId);
  if (!registry.languages.some(lang => lang.id === languageId))
    throw new Error(`Langue inconnue : ${languageId}`);
  const next = {...registry, languages: registry.languages.map(lang =>
    lang.id === languageId ? change({...lang}) : {...lang})};
  return assertRegistry(next);
}

// No external IDs, URLs or account configuration are generated or inferred.
function createLanguageRegistry(saved) {
  if (saved === undefined || saved === null) return {
    version: 1,
    defaultLanguageId: INITIAL_LANGUAGE_ID,
    languages: [{id: INITIAL_LANGUAGE_ID, name: 'Français', flag: '🇫🇷', active: true}]
  };
  assertRegistry(saved);
  return copy(saved);
}

// Runtime catalogue: migration-free enrichment; no publication or content is invented.
function createPreparedLanguageRegistry(saved){
  const result=createLanguageRegistry(saved);
  for(const prepared of PREPARED_LANGUAGES){
    const existing=result.languages.find(l=>l.id===prepared.id);
    if(existing)existing.active=true;
    else result.languages.push({...prepared});
  }
  return result;
}
function addLanguage(registry, {id, name, flag = '', active = false}) {
  assertRegistry(registry);
  requireLanguageId(id);
  requireLabel(name, 'Le nom de la langue');
  if (typeof flag !== 'string' || typeof active !== 'boolean')
    throw new TypeError('Drapeau ou activation invalide.');
  if (registry.languages.some(lang => lang.id === id)) throw new Error(`Langue déjà présente : ${id}`);
  return {...registry, languages: [...registry.languages.map(lang => ({...lang})),
    {id, name, flag, active}]};
}
function renameLanguage(registry, languageId, name) {
  requireLabel(name, 'Le nom de la langue');
  return withLanguage(registry, languageId, lang => ({...lang, name}));
}
function setLanguageFlag(registry, languageId, flag) {
  if (typeof flag !== 'string') throw new TypeError('Le drapeau doit être un texte ou une référence portable.');
  return withLanguage(registry, languageId, lang => ({...lang, flag}));
}
function setLanguageActive(registry, languageId, active) {
  if (typeof active !== 'boolean') throw new TypeError('Activation invalide.');
  if (!active && registry.defaultLanguageId === languageId)
    throw new Error('Impossible de désactiver la langue par défaut.');
  return withLanguage(registry, languageId, lang => ({...lang, active}));
}
function setDefaultLanguage(registry, languageId) {
  assertRegistry(registry);
  if (!registry.languages.some(lang => lang.id === languageId && lang.active))
    throw new Error('La nouvelle langue par défaut doit exister et être active.');
  return {...registry, defaultLanguageId: languageId};
}
function selectLanguage(registry, requestedLanguageId) {
  assertRegistry(registry);
  const languageId = registry.languages.some(lang => lang.id === requestedLanguageId && lang.active)
    ? requestedLanguageId : registry.defaultLanguageId;
  return {requestedLanguageId: requestedLanguageId ?? null, languageId,
    usedFallback: requestedLanguageId !== languageId};
}

// Language variants carry CONTENT ONLY. The existing entity retains its ID,
// group, routes, lifecycle and all permission/visibility metadata. Translations
// must not be able to override any of these identity/security fields.
function validateContent(content, page) {
  if (!content || typeof content !== 'object' || Array.isArray(content))
    throw new TypeError('Une variante est un objet de contenu.');
  const keys = Object.keys(content);
  if (!keys.length || keys.some(key => !LOCALIZABLE.has(key)))
    throw new TypeError('La variante ne peut modifier que les champs éditoriaux.');
  if (page && (typeof content.name !== 'string' || !Array.isArray(content.blocks)))
    throw new TypeError('Une variante de page exige son nom et ses blocs complets.');
  if (hasOwn(content, 'blocks') && !Array.isArray(content.blocks))
    throw new TypeError('Les blocs doivent être une liste.');
  return copy(content);
}
function sourceLanguageOf(entity, registry) {
  const source = entity?.sourceLanguageId ?? INITIAL_LANGUAGE_ID;
  requireLanguageId(source);
  if (!registry.languages.some(lang => lang.id === source))
    throw new Error(`Langue du contenu original inconnue : ${source}`);
  return source;
}
function sourceContent(entity) {
  const result = {};
  for (const field of LOCALIZABLE_FIELDS)
    if (hasOwn(entity, field)) result[field] = copy(entity[field]);
  return result;
}
function withVariant(entity, registry, languageId, content, page) {
  requireIdentity(entity);
  assertRegistry(registry);
  requireLanguageId(languageId);
  if (!registry.languages.some(lang => lang.id === languageId))
    throw new Error(`Langue inconnue : ${languageId}`);
  if (languageId === sourceLanguageOf(entity, registry))
    throw new Error('Le contenu original reste dans les champs historiques ; ne pas le déplacer.');
  const variant = validateContent(content, page);
  return {...entity, translations: {...(entity.translations ?? {}), [languageId]: variant}};
}
function resolveVariant(entity, registry, requestedLanguageId) {
  const id = requireIdentity(entity);
  const selection = selectLanguage(registry, requestedLanguageId);
  const sourceId = sourceLanguageOf(entity, registry);
  const isActive = languageId => registry.languages.some(lang => lang.id === languageId && lang.active);
  const available = languageId => {
    if (!isActive(languageId)) return null;
    if (languageId === sourceId) return sourceContent(entity);
    if (!hasOwn(entity.translations ?? {}, languageId)) return null;
    const value = entity.translations[languageId];
    return value && typeof value === 'object' && !Array.isArray(value) ? copy(value) : null;
  };
  // Requested language > configured default > original legacy language.
  // Never splice missing translated fields from another language: blocks,
  // documents and media are a single independent version.
  for (const languageId of new Set([selection.languageId, registry.defaultLanguageId, sourceId])) {
    const content = available(languageId);
    if (content !== null) return {id, requestedLanguageId: selection.requestedLanguageId,
      languageId, usedFallback: languageId !== requestedLanguageId, content};
  }
  return null; // No active language has content: caller must not invent a version.
}
function setPageTranslation(page, registry, languageId, content) {
  return withVariant(page, registry, languageId, content, true);
}
function resolvePageTranslation(page, registry, requestedLanguageId) {
  return resolveVariant(page, registry, requestedLanguageId);
}
function setCelebrationSpaceTranslation(space, registry, languageId, content) {
  return withVariant(space, registry, languageId, content, false);
}
function resolveCelebrationSpaceTranslation(space, registry, requestedLanguageId) {
  return resolveVariant(space, registry, requestedLanguageId);
}

// A menu is a projection of canonical pages, NOT a collection of translations.
// This is intentionally unfiltered: the caller must apply the existing access
// and publication decisions to the canonical pages BEFORE invoking it.
function projectPageMenu(pages, registry, requestedLanguageId) {
  if (!Array.isArray(pages)) throw new TypeError('La liste des pages est invalide.');
  const seen = new Set(), menu = [];
  for (const page of pages) {
    const id = requireIdentity(page), key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    const resolved = resolvePageTranslation(page, registry, requestedLanguageId);
    if (!resolved) continue;
    menu.push({pageId: id, name: resolved.content.name ?? '',
      group: page.group, placement: page.placement,
      languageId: resolved.languageId, usedFallback: resolved.usedFallback});
  }
  return menu;
}

/**
 * Build-time browser adapter for the existing nonce-protected inline editor.
 * Serializes this very domain model, not a second translation engine.
 * The public visitor renderer never uses this source.
 */
function editorLocalizationInlineSource() {
  const declarations=[
    'const INITIAL_LANGUAGE_ID='+JSON.stringify(INITIAL_LANGUAGE_ID)+';',
    'const PREPARED_LANGUAGES='+JSON.stringify(PREPARED_LANGUAGES)+';',
    'const LOCALIZABLE_FIELDS=Object.freeze('+JSON.stringify(LOCALIZABLE_FIELDS)+');',
    'const LANGUAGE_ID_PATTERN='+LANGUAGE_ID_PATTERN.toString()+';',
    'const LOCALIZABLE=new Set(LOCALIZABLE_FIELDS);',
    'const copy=value=>structuredClone(value);',
    'const hasOwn=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);'
  ];
  return declarations.join('\n')+'\n'+[
    requireLanguageId,requireLabel,requireIdentity,assertRegistry,withLanguage,
    createLanguageRegistry,createPreparedLanguageRegistry,addLanguage,renameLanguage,setLanguageFlag,
    setLanguageActive,setDefaultLanguage,selectLanguage,validateContent,
    sourceLanguageOf,sourceContent,withVariant,resolveVariant,
    setPageTranslation,resolvePageTranslation,setCelebrationSpaceTranslation,
    resolveCelebrationSpaceTranslation,projectPageMenu
  ].map(fn=>fn.toString()).join('\n');
}

return {INITIAL_LANGUAGE_ID,PREPARED_LANGUAGES,LOCALIZABLE_FIELDS,createLanguageRegistry,createPreparedLanguageRegistry,addLanguage,renameLanguage,setLanguageFlag,setLanguageActive,setDefaultLanguage,selectLanguage,setPageTranslation,resolvePageTranslation,setCelebrationSpaceTranslation,resolveCelebrationSpaceTranslation,projectPageMenu,editorLocalizationInlineSource};
})();
const m3=(()=>{
// M005 — Pure, portable domain model for celebration spaces and draft copies.
// No storage, network, Cloudflare, publication or administration integration.
// IDs are allocated by the future trusted caller, never inferred from labels.
// Authorization is delegated to M002; translations are delegated to M003.
const {
  ACCESS_MODES, SPACE_VISIBILITIES, isMemberTypeId,
  canAccessSpace, canAccessPage
}=m1;
const {setCelebrationSpaceTranslation, resolveCelebrationSpaceTranslation}=m2;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const stable = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 254 && value === value.trim();
const identity = value => stable(value) ||
  (typeof value === 'number' && Number.isSafeInteger(value));
const asId = value => String(value);

// These individual associations must be obtained afresh from the authoritative
// member store. They are not part of an editorial template or copied entitlement.
const INDIVIDUAL_LINKS = new Set([
  'enrollments', 'spaceEnrollments', 'memberEnrollments',
  'memberships', 'memberAssignments', 'memberTypeAssignments',
  'participantEnrollments', 'participantAccess', 'invitedMembers',
  'memberIds', 'participantIds'
]);

function copyJSON(value) {
  // Editor snapshots / R2 manifests must contain JSON data, not live objects.
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError('Expected portable JSON content');
  return JSON.parse(json);
}
function stripIndividualLinks(value) {
  if (Array.isArray(value)) return value.map(stripIndividualLinks);
  if (!value || typeof value !== 'object') return value;
  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    if (!INDIVIDUAL_LINKS.has(key)) Object.defineProperty(clean, key, {
      value: stripIndividualLinks(item), enumerable: true, writable: true,
      configurable: true
    });
  }
  return clean;
}
function portable(value) {
  return stripIndividualLinks(copyJSON(value));
}
function requireCelebration(celebration) {
  if (!celebration || typeof celebration !== 'object' ||
      Array.isArray(celebration) || !identity(celebration.id))
    throw new TypeError('Celebration with a permanent ID required');
  if (own(celebration, 'spaces') && !Array.isArray(celebration.spaces))
    throw new TypeError('Invalid spaces collection');
  if (own(celebration, 'pages') && !Array.isArray(celebration.pages))
    throw new TypeError('Invalid pages collection');
  return celebration;
}
function policyShape(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return false;
  if (policy.mode === ACCESS_MODES.PUBLIC ||
      policy.mode === ACCESS_MODES.ALL_PRIVATE_TYPES) return true;
  return policy.mode === ACCESS_MODES.SELECTED_TYPES &&
    Array.isArray(policy.typeIds) && policy.typeIds.length > 0 &&
    policy.typeIds.every(isMemberTypeId);
}
function requireSpace(space) {
  if (!space || typeof space !== 'object' || Array.isArray(space) ||
      !stable(space.id) || !stable(space.celebrationId) ||
      !Object.values(SPACE_VISIBILITIES).includes(space.visibility) ||
      ![undefined,'INDIVIDUAL','CELEBRATION'].includes(space.accessScope) ||
      (space.visibility===SPACE_VISIBILITIES.PUBLIC&&space.accessScope==='CELEBRATION') ||
      !policyShape(space.accessPolicy) ||
      (space.visibility === SPACE_VISIBILITIES.PUBLIC &&
       space.accessPolicy.mode !== ACCESS_MODES.PUBLIC) ||
      !Array.isArray(space.pages))
    throw new TypeError('Invalid canonical celebration space or access policy');
  const seen = new Set();
  for (const page of space.pages) {
    if (!page || !identity(page.id) || seen.has(asId(page.id)) ||
        page.celebrationId !== space.celebrationId ||
        page.spaceId !== space.id)
      throw new TypeError('Invalid, duplicate or unbound space page');
    seen.add(asId(page.id));
  }
  return space;
}
function requireUnique(newId, oldId, used, label) {
  if (!stable(newId) || asId(newId) === asId(oldId) || used.has(newId))
    throw new TypeError('Distinct permanent ' + label + ' ID required');
  used.add(newId);
}
function mappedId(ids, oldId, used, label) {
  const key = asId(oldId);
  if (!ids || !own(ids, key)) throw new TypeError('Missing ' + label + ' ID for ' + key);
  const value = ids[key];
  requireUnique(value, oldId, used, label);
  return value;
}
function allPageIds(celebration) {
  const ids = new Set();
  for (const page of celebration.pages ?? []) {
    if (!identity(page?.id) || ids.has(asId(page.id)))
      throw new TypeError('Invalid or duplicate celebration page ID');
    ids.add(asId(page.id));
  }
  for (const space of celebration.spaces ?? []) {
    requireSpace(space);
    if (space.celebrationId !== asId(celebration.id))
      throw new TypeError('Space belongs to another celebration');
    for (const page of space.pages) {
      if (ids.has(asId(page.id))) throw new TypeError('Page ID reused across spaces');
      ids.add(asId(page.id));
    }
  }
  return ids;
}
function draft(value, isSpace = false) {
  const item = portable(value);
  if (!isSpace) item.visibility = 'draft'; // editor's existing publication lifecycle
  item.publicationStatus = 'draft'; // additive state; never a publication command
  if (own(item, 'status')) item.status = 'draft';
  if (own(item, 'published')) item.published = false;
  if (own(item, 'isPublished')) item.isPublished = false;
  for (const field of ['publishedAt', 'publishedRevision', 'publishedVersion',
    'publishedSnapshot', 'publishedContent', 'publicationId']) {
    if (own(item, field)) delete item[field];
  }
  return item;
}
function remapPageTargets(value, map) {
  if (Array.isArray(value)) {
    value.forEach(child => remapPageTargets(child, map));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      // Explicit page-ID relations only. Keep href/url/src, media keys,
      // block IDs, dates and any free-form legacy metadata unchanged.
      if (['pageId', 'targetPageId', 'linkedPageId'].includes(key) &&
          (typeof child === 'string' || typeof child === 'number') &&
          map.has(asId(child))) value[key] = map.get(asId(child));
      else remapPageTargets(child, map);
    }
  }
}
function clonePage(source, newId, celebrationId, spaceId, pageMap) {
  if (!identity(source?.id)) throw new TypeError('Source page ID required');
  const page = draft(source);
  page.id = newId;
  page.celebrationId = celebrationId;
  if (spaceId) page.spaceId = spaceId;
  else if (own(page, 'spaceId'))
    throw new TypeError('A root page cannot retain an orphan space binding');
  remapPageTargets(page, pageMap);
  return page;
}

// M002 PRIVATE spaces always require individual enrollment, even if the
// accessPolicy mode is PUBLIC (invitation-only). Public is always explicit.
function createCelebrationSpace({
  id, celebrationId, visibility = SPACE_VISIBILITIES.PRIVATE,
  accessPolicy = {mode: ACCESS_MODES.PUBLIC}, pages = [], ...content
} = {}) {
  if (!stable(id) || !identity(celebrationId) || !Array.isArray(pages))
    throw new TypeError('Stable space/celebration ID and pages required');
  const ownerId = asId(celebrationId);
  const space = portable({...content, id, celebrationId: ownerId,
    visibility, accessPolicy, pages: pages.map(page => {
      if (!identity(page?.id) ||
          (own(page, 'celebrationId') && page.celebrationId !== ownerId) ||
          (own(page, 'spaceId') && page.spaceId !== id))
        throw new TypeError('Page belongs to another space or celebration');
      return {...page, celebrationId: ownerId, spaceId: id};
    })});
  return requireSpace(space);
}

// Adds spaces to ONE existing main celebration, never creates a second
// celebration or changes legacy pages, stage IDs, dates or media.
function addSpaceToCelebration(celebration, space) {
  requireCelebration(celebration);
  requireSpace(space);
  if (space.celebrationId !== asId(celebration.id))
    throw new TypeError('Cannot attach a space to another celebration');
  const used = allPageIds(celebration);
  if ((celebration.spaces ?? []).some(existing => existing.id === space.id))
    throw new TypeError('Space ID already exists');
  for (const page of space.pages) {
    if (used.has(asId(page.id))) throw new TypeError('Page ID already exists');
    used.add(asId(page.id));
  }
  const result = portable(celebration);
  result.spaces = [...(result.spaces ?? []), portable(space)];
  return result;
}
function getCelebrationSpaces(celebration) {
  requireCelebration(celebration);
  allPageIds(celebration);
  return portable(celebration.spaces ?? []);
}
function canReadSpacePage(celebration, spaceId, pageId, context = {}) {
  try {
    requireCelebration(celebration);
    if (!stable(spaceId) || !identity(pageId)) return false;
    const space = (celebration.spaces ?? []).find(item => item.id === spaceId);
    if (!space) return false;
    requireSpace(space);
    if (space.celebrationId !== asId(celebration.id)) return false;
    const page = space.pages.find(item => asId(item.id) === asId(pageId));
    // Delegate ALL access evaluation to the canonical M002 functions.
    return !!page && canAccessSpace(space, context) &&
      canAccessPage(page, {...context, space});
  } catch {
    return false; // invalid or missing canonical data fails closed
  }
}
function translateCelebrationSpace(space, registry, languageId, content) {
  requireSpace(space);
  return setCelebrationSpaceTranslation(space, registry, languageId, content);
}
function resolveSpaceLanguage(space, registry, languageId) {
  requireSpace(space);
  return resolveCelebrationSpaceTranslation(space, registry, languageId);
}

function copySpace(source, {id, celebrationId, pageIds, usedPages, pageMap}) {
  requireSpace(source);
  const target = draft(source, true);
  remapPageTargets(target, pageMap); // also rebind internal links in space translations/blocks
  target.id = id;
  target.celebrationId = celebrationId;
  // Inherit PRIVATE/PUBLIC and its type policy unchanged. Never inherit people.
  target.visibility = source.visibility;
  target.accessPolicy = portable(source.accessPolicy);
  target.pages = source.pages.map(page => clonePage(page,
    mappedId(pageIds, page.id, usedPages, 'page'), celebrationId, id, pageMap));
  return requireSpace(target);
}

// Requires distinct IDs supplied by the caller. No R2 copy is made; all
// media/document URLs are portable references within detached JSON objects.
function duplicateCelebrationSpace(space, {
  id, pageIds = {}, reservedPageIds = []
} = {}) {
  requireSpace(space);
  const usedSpaces = new Set([space.id]);
  requireUnique(id, space.id, usedSpaces, 'space');
  const usedPages = new Set([...space.pages.map(page => asId(page.id)),
    ...reservedPageIds.map(asId)]);
  const pageMap = new Map(Object.entries(pageIds));
  return copySpace(space, {id, celebrationId: space.celebrationId,
    pageIds, usedPages, pageMap});
}

// Copies the entire editor aggregate, not published state or member grants.
// The new celebration is distinct; stages, dates and opaque legacy fields are
// retained until the future editor explicitly changes them.
function duplicateCelebration(celebration, {
  id, spaceIds = {}, pageIds = {}, reservedSpaceIds = [], reservedPageIds = []
} = {}) {
  requireCelebration(celebration);
  const oldPages = allPageIds(celebration);
  const spaces = celebration.spaces ?? [];
  const usedSpaces = new Set([...spaces.map(space => space.id), ...reservedSpaceIds]);
  requireUnique(id, celebration.id, new Set([asId(celebration.id)]), 'celebration');
  const usedPages = new Set([...oldPages, ...reservedPageIds.map(asId)]);
  const pageMap = new Map(Object.entries(pageIds));
  const copied = draft(celebration);
  remapPageTargets(copied, pageMap); // also rebind links in celebration-level content
  copied.id = id;
  copied.pages = (celebration.pages ?? []).map(page =>
    clonePage(page, mappedId(pageIds, page.id, usedPages, 'page'), id, null, pageMap));
  copied.spaces = spaces.map(space => copySpace(space, {
    id: mappedId(spaceIds, space.id, usedSpaces, 'space'),
    celebrationId: id, pageIds, usedPages, pageMap
  }));
  // Existing historical fields remain serialized as provided; no D1/R2 writes.
  return copied;
}

return {createCelebrationSpace,addSpaceToCelebration,getCelebrationSpaces,canReadSpacePage,translateCelebrationSpace,resolveSpaceLanguage,duplicateCelebrationSpace,duplicateCelebration};
})();
const m4=(()=>{
// M007-B — isolated administrative draft model; no session, network or D1 writes.
// Canonical authorization remains in M002. Never authorize a request using
// data submitted by this UI: a future server adapter must reload trusted data.
const {
  ACCESS_MODES, SPACE_VISIBILITIES, isMemberTypeId,
  createMemberType, renameMemberType, assignMemberTypes, enrollInSpace,
  canAccessPage
}=m1;
const PAGE_KINDS = Object.freeze({
  ORDINARY: 'ordinary', FOOTER: 'footer', CELEBRATION: 'celebration'
});
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const stable = id => typeof id === 'string' && id.length > 0 &&
  id.length <= 254 && id === id.trim();
const duplicate = value => structuredClone(value);
const list = (value, name) => {
  if (!Array.isArray(value)) throw new TypeError(name + ' must be an array');
  return value;
};
const uniqueRecords = (records, name, validator) => {
  const seen = new Set();
  for (const record of records) {
    if (!validator(record) || seen.has(record.id))
      throw new TypeError('Invalid or duplicate ' + name + ' identifier');
    seen.add(record.id);
  }
};
const knownMember = (state, memberId) => {
  if (!stable(memberId) || !state.members.some(m => m.id === memberId))
    throw new TypeError('Unknown person');
};
const knownType = (types, id, allowDisabled = false) => {
  const type = types.find(item => item.id === id);
  if (!isMemberTypeId(id) || !type || (!allowDisabled && type.disabled === true))
    throw new TypeError('Unknown or disabled member type');
};

function normalizeAdminPolicy(policy, types, {allowDisabled = false} = {}) {
  list(types, 'Member type catalogue');
  if (!policy || typeof policy !== 'object' || Array.isArray(policy))
    throw new TypeError('Invalid access policy');
  if (policy.mode === ACCESS_MODES.PUBLIC ||
      policy.mode === ACCESS_MODES.ALL_PRIVATE_TYPES) {
    if (own(policy, 'typeIds'))
      throw new TypeError('Type selection is only allowed in SELECTED_TYPES');
    return {mode: policy.mode};
  }
  if (policy.mode !== ACCESS_MODES.SELECTED_TYPES ||
      !Array.isArray(policy.typeIds) || policy.typeIds.length === 0)
    throw new TypeError('Invalid or empty selected-type access policy');
  const ids = new Set();
  for (const id of policy.typeIds) {
    knownType(types, id, allowDisabled);
    if (ids.has(id)) throw new TypeError('Duplicate type in access policy');
    ids.add(id);
  }
  return {mode: ACCESS_MODES.SELECTED_TYPES, typeIds: [...ids]};
}

function pageKind(page) {
  if (!page || !stable(page.id)) throw new TypeError('Permanent page ID required');
  if (page.group === 'page') {
    if (page.placement === 'footer') return PAGE_KINDS.FOOTER;
    if (page.placement === undefined || page.placement === null ||
        page.placement === 'page') return PAGE_KINDS.ORDINARY;
  }
  if (page.group === 'celebration') return PAGE_KINDS.CELEBRATION;
  throw new TypeError('Unsupported page category');
}

function createMemberAdminState({
  types = [], members = [], memberships = [], pages = [], spaces = [],
  enrollments = []
} = {}) {
  const state = duplicate({
    types: list(types, 'Types'), members: list(members, 'People'),
    memberships: list(memberships, 'Memberships'), pages: list(pages, 'Pages'),
    spaces: list(spaces, 'Spaces'), enrollments: list(enrollments, 'Enrollments')
  });
  uniqueRecords(state.types, 'member type', type =>
    isMemberTypeId(type?.id) && createMemberType(type).name === type.name &&
    (type.disabled === undefined || typeof type.disabled === 'boolean'));
  uniqueRecords(state.members, 'person', member => stable(member?.id));
  uniqueRecords(state.pages, 'page', page => stable(page?.id) &&
    Object.values(PAGE_KINDS).includes(pageKind(page)));
  uniqueRecords(state.spaces, 'space', space =>
    stable(space?.id) && stable(space?.celebrationId) &&
    Object.values(SPACE_VISIBILITIES).includes(space?.visibility));
  for (const space of state.spaces) {
    const normalized = normalizeAdminPolicy(space.accessPolicy, state.types,
      {allowDisabled: true});
    if (space.visibility === SPACE_VISIBILITIES.PUBLIC &&
        normalized.mode !== ACCESS_MODES.PUBLIC)
      throw new TypeError('Public space requires a public policy');
  }
  for (const page of state.pages) {
    if (own(page, 'accessPolicy'))
      normalizeAdminPolicy(page.accessPolicy, state.types, {allowDisabled: true});
    if (own(page, 'spaceId')) {
      const space = state.spaces.find(item => item.id === page.spaceId);
      if (!space || page.celebrationId !== space.celebrationId)
        throw new TypeError('Page has an unknown or foreign celebration space');
    }
  }
  const seenMemberships = new Set();
  for (const link of state.memberships) {
    knownMember(state, link?.memberId);
    knownType(state.types, link?.typeId, true); // retain historic disabled links
    const key = JSON.stringify([link.memberId, link.typeId]);
    if (seenMemberships.has(key)) throw new TypeError('Duplicate membership');
    seenMemberships.add(key);
  }
  const seenEnrollments = new Set();
  for (const link of state.enrollments) {
    knownMember(state, link?.memberId);
    if (!state.spaces.some(space => space.id === link?.spaceId))
      throw new TypeError('Unknown celebration space enrollment');
    const key = JSON.stringify([link.memberId, link.spaceId]);
    if (seenEnrollments.has(key)) throw new TypeError('Duplicate enrollment');
    seenEnrollments.add(key);
  }
  return state;
}

function addAdminMemberType(state, input) {
  const type = createMemberType(input);
  if (state.types.some(item => item.id === type.id))
    throw new TypeError('Member type identifier already exists');
  return createMemberAdminState({...state, types: [...state.types, type]});
}

function renameAdminMemberType(state, id, name) {
  if (!state.types.some(type => type.id === id))
    throw new TypeError('Unknown member type');
  const types = state.types.map(type => type.id === id ?
    renameMemberType(type, name) : type);
  return createMemberAdminState({...state, types});
}

function assignAdminMemberTypes(state, memberId, typeIds) {
  knownMember(state, memberId);
  list(typeIds, 'Type IDs');
  // Disabled historical memberships stay linked, but cannot be newly granted.
  const historic = state.memberships.filter(link => link.memberId === memberId &&
    state.types.some(type => type.id === link.typeId && type.disabled === true))
    .map(link => link.typeId);
  for (const id of typeIds) knownType(state.types, id, historic.includes(id));
  const links = assignMemberTypes(memberId, [...historic, ...typeIds], state.types);
  return createMemberAdminState({...state, memberships: [
    ...state.memberships.filter(link => link.memberId !== memberId), ...links
  ]});
}

function setAdminPagePolicy(state, pageId, policy) {
  if (!stable(pageId) || !state.pages.some(page => page.id === pageId))
    throw new TypeError('Unknown page');
  const normalized = normalizeAdminPolicy(policy, state.types);
  return createMemberAdminState({...state, pages: state.pages.map(page =>
    page.id === pageId ? {...page, accessPolicy: normalized} : page)});
}

// Optional preview of the exact M002 rule. NOT a server authorization endpoint.
// A real server must fetch canonical page, type, membership and enrollment rows
// from trusted storage and verify the session BEFORE invoking canAccessPage.
function previewAdminPageAccess(state, pageId, verifiedPrincipal = null) {
  const page = state.pages.find(item => item.id === pageId);
  if (!page) return false;
  const space = own(page, 'spaceId') ?
    state.spaces.find(item => item.id === page.spaceId) : undefined;
  return canAccessPage(page, {principal: verifiedPrincipal,
    types: state.types, memberships: state.memberships,
    enrollments: state.enrollments, space});
}

// For a future D1 writer, explicitly retain the distinct relations: type labels
// and IDs, memberships, page policies and individual space enrollments.
function draftMemberAdminChanges(state) {
  const verified = createMemberAdminState(state);
  return duplicate({
    types: verified.types, memberships: verified.memberships,
    pagePolicies: verified.pages.filter(p => own(p, 'accessPolicy'))
      .map(p => ({pageId: p.id, accessPolicy: p.accessPolicy})),
    enrollments: verified.enrollments
  });
}


return {PAGE_KINDS,normalizeAdminPolicy,pageKind,createMemberAdminState,addAdminMemberType,renameAdminMemberType,assignAdminMemberTypes,setAdminPagePolicy,previewAdminPageAccess,draftMemberAdminChanges,ACCESS_MODES};
})();
const m5=(()=>{
// M007-B — opt-in administration component. Never mounted on public pages.
// The caller owns authentication, server reads/writes and conflict handling.
// This component is a DRAFT editor only, not a security boundary.
const {
  ACCESS_MODES, PAGE_KINDS, pageKind, createMemberAdminState,
  addAdminMemberType, renameAdminMemberType, assignAdminMemberTypes,
  setAdminPagePolicy
}=m4;
const MODE_LABELS = Object.freeze({
  [ACCESS_MODES.PUBLIC]: 'Public — accessible à tous',
  [ACCESS_MODES.ALL_PRIVATE_TYPES]: 'Tous les types de membres privés',
  [ACCESS_MODES.SELECTED_TYPES]: 'Uniquement les types sélectionnés'
});
const PAGE_LABELS = Object.freeze({
  [PAGE_KINDS.ORDINARY]: 'Pages ordinaires',
  [PAGE_KINDS.FOOTER]: 'Pages de bas de page',
  [PAGE_KINDS.CELEBRATION]: 'Pages des célébrations'
});

function mountMemberAccessAdmin(root, {initialState = {}, onChange = () => {}, warningText = null, pagePolicyWritable = true} = {}) {
  if (!root || typeof root.replaceChildren !== 'function' ||
      !root.ownerDocument || typeof onChange !== 'function')
    throw new TypeError('A real DOM root and an optional onChange callback are required');
  const document = root.ownerDocument;
  let state = createMemberAdminState(initialState);
  let memberId = state.members[0]?.id ?? '';
  let pageId = state.pages[0]?.id ?? '';
  let destroyed = false;

  function node(tag, className = '', text = null) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== null) element.textContent = String(text);
    return element;
  }
  function label(text, control) {
    const wrapper = node('label', 'member-admin-field');
    wrapper.append(node('span', '', text), control);
    return wrapper;
  }
  function button(text) {
    const element = node('button', 'member-admin-button', text);
    element.type = 'submit';
    return element;
  }
  function title(text) { return node('h3', 'member-admin-subtitle', text); }
  function section(heading) {
    const area = node('section', 'member-admin-card');
    area.append(title(heading));
    return area;
  }
  function emit(change, next, errorBox) {
    try {
      const updated = next();
      state = updated;
      onChange(createMemberAdminState(state), {kind: change});
      render();
    } catch (error) {
      errorBox.textContent = error?.message || 'Modification refusée';
    }
  }
  function render() {
    if (destroyed) return;
    const wrap = node('div', 'member-admin-007b');
    wrap.append(node('h2', 'member-admin-heading', 'Types de membres et autorisations'));
    const warning = node('p', 'member-admin-warning',
      warningText === null ?
        'Préparation uniquement : aucune sauvegarde D1 ni protection serveur active. ' +
        'Les contenus privés devront être protégés côté serveur, y compris leurs médias.' :
        String(warningText));
    warning.setAttribute('role', 'note');
    wrap.append(warning);
    const grid = node('div', 'member-admin-layout');

    // Catalogue: IDs remain permanent. Renaming only changes the display name.
    const typesCard = section('1. Types de membres');
    const addForm = node('form', 'member-admin-form');
    const newId = node('input');
    newId.type = 'text'; newId.required = true; newId.maxLength = 132;
    newId.placeholder = 'member-type:identifiant-permanent';
    const newName = node('input');
    newName.type = 'text'; newName.required = true; newName.maxLength = 120;
    newName.placeholder = 'Ex. : Membres de soutien';
    const addError = node('p', 'member-admin-error');
    addError.setAttribute('role', 'alert');
    addForm.append(label('Identifiant permanent', newId),
      label('Nom du type', newName), button('Créer ce type'), addError);
    addForm.addEventListener('submit', event => {
      event.preventDefault();
      emit('type-created', () => addAdminMemberType(state,
        {id: newId.value.trim(), name: newName.value}), addError);
    });
    typesCard.append(addForm);
    const list = node('div', 'member-admin-type-list');
    for (const type of state.types) {
      const form = node('form', 'member-admin-type-row');
      const fixed = node('code', 'member-admin-id', type.id);
      const input = node('input');
      input.type = 'text'; input.value = type.name; input.maxLength = 120;
      input.required = true;
      const nameField = label('Nom modifiable', input);
      const error = node('p', 'member-admin-error');
      error.setAttribute('role', 'alert');
      form.append(fixed, nameField, button('Renommer'));
      if (type.disabled === true)
        form.append(node('small', 'member-admin-muted', 'Type suspendu (historique conservé)'));
      form.append(error);
      form.addEventListener('submit', event => {
        event.preventDefault();
        emit('type-renamed', () => renameAdminMemberType(state, type.id, input.value), error);
      });
      list.append(form);
    }
    if (!state.types.length)
      list.append(node('p', 'member-admin-muted', 'Aucun type créé.'));
    typesCard.append(list);
    grid.append(typesCard);

    // A person may hold several independent member-type assignments.
    const peopleCard = section('2. Attributions aux personnes');
    if (state.members.length) {
      if (!state.members.some(person => person.id === memberId))
        memberId = state.members[0].id;
      const selector = node('select');
      for (const person of state.members) {
        const option = node('option', '', person.name || person.id);
        option.value = person.id; option.selected = person.id === memberId;
        selector.append(option);
      }
      selector.addEventListener('change', () => {memberId = selector.value; render();});
      peopleCard.append(label('Personne', selector));
      const form = node('form', 'member-admin-form');
      const choices = node('fieldset', 'member-admin-checks');
      choices.append(node('legend', '', 'Types attribués (choix multiples)'));
      const current = new Set(state.memberships
        .filter(link => link.memberId === memberId).map(link => link.typeId));
      const inputs = [];
      for (const type of state.types) {
        const input = node('input');
        input.type = 'checkbox'; input.value = type.id;
        input.checked = current.has(type.id);
        input.disabled = type.disabled === true;
        if (!input.disabled) inputs.push(input);
        const description = type.name + (input.disabled ?
          ' — suspendu, non attribuable' : '');
        choices.append(label(description, input));
      }
      const error = node('p', 'member-admin-error');
      error.setAttribute('role', 'alert');
      form.append(choices, button('Enregistrer les types'), error);
      form.addEventListener('submit', event => {
        event.preventDefault();
        // Do not revoke disabled historical memberships through this form.
        const historic = state.memberships.filter(link => link.memberId === memberId &&
          state.types.some(type => type.id === link.typeId && type.disabled === true))
          .map(link => link.typeId);
        emit('membership-updated', () => assignAdminMemberTypes(state, memberId,
          [...historic, ...inputs.filter(input => input.checked).map(input => input.value)]),
          error);
      });
      peopleCard.append(form);
    } else {
      peopleCard.append(node('p', 'member-admin-muted',
        'Aucune personne chargée. Le répertoire central sera raccordé après consolidation.'));
    }
    grid.append(peopleCard);

    // The same canonical page policy applies to all three categories.
    const pageCard = section('3. Autorisations des pages');
    if (state.pages.length) {
      if (!state.pages.some(page => page.id === pageId)) pageId = state.pages[0].id;
      const pageSelect = node('select');
      for (const category of Object.values(PAGE_KINDS)) {
        const group = node('optgroup');
        group.label = PAGE_LABELS[category];
        for (const page of state.pages.filter(item => pageKind(item) === category)) {
          const option = node('option', '', page.name || page.title || page.id);
          option.value = page.id; option.selected = page.id === pageId;
          group.append(option);
        }
        if (group.children.length) pageSelect.append(group);
      }
      pageSelect.addEventListener('change', () => {pageId = pageSelect.value; render();});
      pageCard.append(label('Page concernée', pageSelect));
      const page = state.pages.find(p => p.id === pageId);
      pageCard.append(node('code', 'member-admin-id', page.id));
      if (page.spaceId)
        pageCard.append(node('p', 'member-admin-warning',
          'Espace privé/public : les inscriptions individuelles à cet espace ' +
          'restent obligatoires lorsque celui-ci est privé.'));
      const form = node('form', 'member-admin-form');
      const radios = node('fieldset', 'member-admin-checks');
      radios.append(node('legend', '', 'Mode d’accès'));
      const currentPolicy = page.accessPolicy || {mode: ACCESS_MODES.PUBLIC};
      const modes = [];
      for (const mode of Object.values(ACCESS_MODES)) {
        const input = node('input');
        input.type = 'radio'; input.name = 'member-admin-policy-mode';
        input.value = mode; input.checked = currentPolicy.mode === mode;
        modes.push(input);
        radios.append(label(MODE_LABELS[mode], input));
      }
      const selectedBox = node('fieldset', 'member-admin-checks');
      selectedBox.append(node('legend', '', 'Types autorisés pour cette page'));
      const selected = new Set(currentPolicy.typeIds || []);
      const checks = [];
      for (const type of state.types) {
        const input = node('input');
        input.type = 'checkbox'; input.value = type.id;
        input.checked = selected.has(type.id);
        input.disabled = type.disabled === true;
        checks.push(input);
        selectedBox.append(label(type.name + (input.disabled ? ' (suspendu)' : ''), input));
      }
      const toggleSelected = () => {
        selectedBox.hidden = !modes.some(input =>
          input.checked && input.value === ACCESS_MODES.SELECTED_TYPES);
      };
      modes.forEach(input => input.addEventListener('change', toggleSelected));
      toggleSelected();
      const error = node('p', 'member-admin-error');
      error.setAttribute('role', 'alert');
      const applyPolicy=button('Appliquer à cette page');
      applyPolicy.disabled=!pagePolicyWritable;
      if(!pagePolicyWritable){
        applyPolicy.title='Sauvegarde sécurisée des politiques indisponible';
        form.append(node('p','member-admin-muted',
          'Lecture préparatoire uniquement : écriture de politique désactivée.'));
      }
      form.append(radios, selectedBox, applyPolicy, error);
      form.addEventListener('submit', event => {
        event.preventDefault();
        if(!pagePolicyWritable) return;
        const mode = modes.find(input => input.checked)?.value;
        const policy = mode === ACCESS_MODES.SELECTED_TYPES ?
          {mode, typeIds: checks.filter(input => input.checked).map(input => input.value)} :
          {mode};
        emit('page-policy-updated', () => setAdminPagePolicy(state, pageId, policy), error);
      });
      pageCard.append(form);
    } else {
      pageCard.append(node('p', 'member-admin-muted', 'Aucune page chargée.'));
    }
    grid.append(pageCard);
    wrap.append(grid);
    root.replaceChildren(wrap);
  }
  render();
  return {
    getState: () => createMemberAdminState(state),
    setState(next) {state = createMemberAdminState(next); render();},
    destroy() {destroyed = true; root.replaceChildren();}
  };
}

return {mountMemberAccessAdmin};
})();
const m6=(()=>{
// One directory, using the existing authenticated, audited server commands.
const {adminDialog}=m0;
function categoryAbbreviation(name){
 return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-zA-Z0-9]+/).filter(Boolean).map(word=>word[0]).join('').toUpperCase().slice(0,16);
}
function mountMemberDirectoryAdmin(root,{transport,styleNonce,celebrations=[],onCategories=()=>{}}={}){
 const doc=root.ownerDocument;
 const n=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e};
 const b=(text,action)=>{const e=n('button',text);e.type='button';e.className='btn';e.onclick=action;return e};
 const label=(text,input)=>{input.setAttribute('aria-label',text);const e=n('label');e.className='field';e.append(n('span',text),input);return e};
 const input=(type='text',value='')=>{const e=n('input');e.type=type;e.value=value;e.maxLength=120;return e};
 const select=(items,value='')=>{const e=n('select');for(const [id,name]of items){const o=n('option',name);o.value=id;e.append(o)}e.value=value;return e};
 const names=[...new Map(celebrations.filter(c=>/^\d+$/.test(String(c.id))).map(c=>[String(c.id),c.title||[c.archangel,c.year].filter(Boolean).join(' ')])).entries()];
 const celebrationName=id=>names.find(x=>x[0]===String(id))?.[1]||'Célébration archivée';
 let types=[],members=[],memberships=[],selected='',search='',celebrationId='',typeId='',cursor='',cursors=[],next=null,busy=false,destroyed=false,epoch=0;
 const demoHost=globalThis.location?.hostname==='celebrations-m016-admin-preprod.rondes.workers.dev';
 let demoMembers=[],demoLoaded=false;
 const shell=n('section');shell.className='member-directory-009b';
 const status=n('p','Chargement…');status.setAttribute('role','status');
 const people=n('section');people.className='m019-people';
 const categories=n('section');categories.className='m019-categories';
 shell.append(status,people,categories);root.replaceChildren(shell);
 const call=async command=>{const r=await transport(command);if(!r?.ok)throw Object.assign(Error(r?.error||'Enregistrement impossible. Réessayez.'),{status:r?.status});return r.data??r.result??r};
 const activeTypes=()=>types.filter(t=>!t.disabled).map(t=>[t.id,t.name]);
 async function run(action,message='Enregistré.'){
  if(busy)return;busy=true;shell.inert=true;shell.setAttribute('aria-busy','true');status.textContent='Enregistrement…';
  try{await action();await reload();status.textContent=message}catch(e){status.textContent=e.message}finally{busy=false;shell.inert=false;shell.removeAttribute('aria-busy')}
 }
 async function reload(){
  const attempt=++epoch;
  const data=await call({method:'GET',action:'snapshot',search,cursor,celebrationId,typeId,limit:50,sort:'name'});
  if(destroyed||attempt!==epoch)return;
  types=data.types;members=data.members;memberships=data.memberships||[];next=data.nextCursor;onCategories(types);
  renderPeople();renderCategories();
  if(demoHost&&!demoLoaded){demoLoaded=true;void loadDemoMembers();}
 }
 async function loadDemoMembers(){
  try{demoMembers=await call({method:'GET',action:'m021_demo_list'});if(!destroyed)renderPeople();}
  catch(e){demoMembers=[];if(!destroyed)status.textContent='Comptes de démonstration indisponibles : '+e.message;}
 }
 function renderDemoMembers(){
  if(!demoHost)return;
  const card=n('section');card.className='card m021-demo-members';
  card.append(n('h3','Comptes fictifs · préproduction'),
   n('p','Ces identités n’existent que sur la base de test. Mot de passe commun : poule. Ne renseignez jamais de véritables données.'));
  const form=n('form');form.className='m019-member-form m021-demo-form';
  const given=input('text','Marie'),family=input('text','Test');
  given.required=family.required=true;
  const type=select([['','Choisir une catégorie'],...activeTypes()]);
  type.required=true;
  const celebrations=n('fieldset');celebrations.append(n('legend','Célébrations accessibles'));
  const checks=[];
  for(const [id,title] of names){
   const check=input('checkbox');check.value=id;checks.push(check);
   celebrations.append(label(title,check));
  }
  if(checks.length)checks[0].checked=true;
  const add=b('Créer ce compte fictif');add.type='submit';
  form.append(label('Prénom fictif',given),label('Nom fictif',family),
   label('Catégorie',type),celebrations,add);
  form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;
   const celebrationIds=checks.filter(c=>c.checked).map(c=>c.value);
   if(!celebrationIds.length){status.textContent='Choisissez au moins une célébration.';return;}
   void run(()=>call({method:'POST',action:'m021_demo_create',givenName:given.value,
    familyName:family.value,typeId:type.value,celebrationIds}),
    'Compte fictif créé. Connectez-vous avec son e-mail et « poule ».').then(loadDemoMembers);
  };
  const list=n('div');list.className='m021-demo-list';
  for(const member of demoMembers){
   const row=n('div');row.className='m021-demo-row';
   row.append(n('strong',[member.givenName,member.familyName].filter(Boolean).join(' ')),
    n('small',member.email),
    n('small',member.celebrations.map(celebrationName).join(' · ')));
   row.append(b('Supprimer',async()=>{
    const yes=await adminDialog(doc,{title:'Supprimer ce compte fictif ?',
     message:'Le membre et ses sessions de test seront définitivement supprimés.',
     confirm:'Supprimer le compte'});
    if(yes)await run(()=>call({method:'POST',action:'m021_demo_delete',personId:member.personId}),
     'Compte fictif supprimé.').then(loadDemoMembers);
   }));
   list.append(row);
  }
  if(!demoMembers.length)list.append(n('p','Aucun compte fictif créé.'));
  const visit=n('a','Ouvrir la connexion des membres ↗');visit.href='/?page=member-area';
  visit.target='_blank';visit.rel='noopener noreferrer';visit.className='btn';
  card.append(form,list,visit);people.append(card);
 }
 function renderPeople(){
  people.replaceChildren();
  const heading=n('div');heading.className='m019-member-header';
  const title=n('h2','Membres');
  const addMember=b('+ Ajouter un membre',()=>{
    form.hidden=!form.hidden;
    addMember.setAttribute('aria-expanded',String(!form.hidden));
    if(!form.hidden){given.focus();form.scrollIntoView?.({block:'nearest'});}
  });
  addMember.setAttribute('aria-expanded','false');
  heading.append(title,addMember);people.append(heading);

  // Creation remains available but never occupies the everyday directory.
  const form=n('form');form.className='m019-member-form card';form.hidden=true;
  const given=input(),family=input(),email=input('email');
  given.required=family.required=email.required=true;
  const category=select([['','Choisir une catégorie'],...activeTypes()]);category.required=true;
  const celebration=select([['','Choisir une célébration'],...names]);celebration.required=true;
  const save=b('Enregistrer');save.type='submit';
  form.append(label('Prénom',given),label('Nom',family),label('E-mail',email),
    label('Catégorie',category),label('Célébration',celebration),save);
  form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;
   if(!given.value.trim()||!family.value.trim()){status.textContent='Renseignez le prénom et le nom.';return;}
   void run(async()=>{
    const command={method:'POST',action:'create_person',givenName:given.value.trim(),familyName:family.value.trim(),email:email.value.trim(),displayName:'',typeIds:category.value?[category.value]:[],celebrationId:celebration.value};
    let result;
    try{result=await call(command)}catch(error){
      if(error.status&&error.status<500||/e-mail existe déjà/.test(error.message))throw error;
      // Lost server responses must never create duplicate people.
      const check=await call({method:'GET',action:'snapshot',search:command.email,limit:50});
      const member=check.members.find(p=>p.emailNormalized===command.email.trim().toLowerCase());
      if(!member)throw error;
      const detail=await call({method:'GET',action:'person_detail',personId:member.id});
      if(detail.person.givenName!==command.givenName||detail.person.familyName!==command.familyName||
        !detail.celebrations.some(c=>String(c.celebrationId)===command.celebrationId)||
        !command.typeIds.every(id=>detail.types.some(t=>t.typeId===id)))throw error;
      result={result:member};
    }
    selected=result.result?.id||'';search='';cursor='';cursors=[];
    celebrationId=celebration.value;typeId=category.value;
   },'Membre enregistré et inscrit.');
  };
  people.append(form);
  renderDemoMembers();

  const filter=n('form');filter.className='m019-filters';
  const query=input('search',search);
  query.className='m019-search';query.placeholder='Nom, prénom ou e-mail';
  query.setAttribute('aria-label','Rechercher un membre');
  const selectedCelebration=select([['','Toutes les célébrations'],...names],celebrationId);
  const selectedCategory=select([['','Toutes les catégories'],...types.map(t=>[t.id,t.name+(t.disabled?' (désactivée)':'')])],typeId);
  const apply=async(restoreFocus=false)=>{
    if(busy)return;
    const shouldRefocus=restoreFocus&&doc.activeElement===query;
    const caret=shouldRefocus?query.selectionStart:null;
    search=query.value.trim();celebrationId=selectedCelebration.value;typeId=selectedCategory.value;
    cursor='';cursors=[];
    try{
      await reload();status.textContent='';
      if(shouldRefocus){
        const current=people.querySelector('.m019-search');current?.focus();
        if(caret!=null)current?.setSelectionRange(caret,caret);
      }
    }catch(e){status.textContent=e.message;}
  };
  let typingTimer;
  query.addEventListener('input',()=>{
    clearTimeout(typingTimer);
    typingTimer=setTimeout(()=>void apply(true),280);
  });
  filter.onsubmit=e=>{e.preventDefault();clearTimeout(typingTimer);void apply(true);};
  selectedCelebration.onchange=()=>void apply();
  selectedCategory.onchange=()=>void apply();
  const reset=b('Effacer les filtres',()=>{
    query.value='';selectedCelebration.value='';selectedCategory.value='';
    clearTimeout(typingTimer);void apply();
  });
  const first=n('div');first.className='m019-filter-search';
  const find=b('Rechercher');find.type='submit';first.append(query,find);
  filter.append(first,label('Célébration',selectedCelebration),
    label('Catégorie',selectedCategory),reset);
  people.append(filter);

  const pageInfo=n('p','Page '+(cursors.length+1)+' · '+members.length+
    (members.length>1?' membres affichés':' membre affiché'));
  pageInfo.className='m019-page-info';pageInfo.setAttribute('aria-live','polite');
  people.append(pageInfo);
  const list=n('div');list.className='m019-member-list';
  if(!members.length){
    list.append(n('p',search||celebrationId||typeId
      ?'Aucun membre ne correspond à cette recherche.':'Aucun membre inscrit.'));
  }
  const categoryLabels=new Map(types.map(t=>[t.id,t.name]));
  for(const member of members){
    const row=b('',()=>void showAssignments(member.id).catch(e=>status.textContent=e.message));
    row.className='m019-member-row';row.setAttribute('aria-label','Ouvrir la fiche de '+(member.name||member.emailNormalized));
    const identity=n('span');identity.className='m019-member-identity';
    identity.append(n('strong',member.name||member.emailNormalized),
      n('small',member.emailNormalized));
    row.append(identity);
    const belonging=new Set((memberships||[]).filter(t=>t.memberId===member.id)
      .map(t=>categoryLabels.get(t.typeId)).filter(Boolean));
    if(belonging.size){const badge=n('small',[...belonging].slice(0,2).join(' · '));
      badge.className='m019-member-categories';row.append(badge);}
    list.append(row);
  }
  people.append(list);
  if(cursors.length||next){
    const pager=n('div');pager.className='m019-pager';
    const back=b('Précédent',()=>{
      cursor=cursors.pop()||'';void reload().catch(e=>status.textContent=e.message);
    });back.disabled=!cursors.length;
    const forward=b('Suivant',()=>{
      cursors.push(cursor);cursor=next;void reload().catch(e=>status.textContent=e.message);
    });forward.disabled=!next;
    pager.append(back,forward);people.append(pager);
  }
 }
 async function editPerson(id){
  if(busy)return;
  try{
   const detail=await call({method:'GET',action:'person_detail',personId:id});if(destroyed)return;
   const person=detail.person;
   const result=await adminDialog(doc,{title:'Modifier le membre',fields:[
    {name:'givenName',label:'Prénom',value:person.givenName,required:true},{name:'familyName',label:'Nom',value:person.familyName,required:true},
    {name:'email',label:'E-mail',type:'email',value:person.emailNormalized,required:true}],confirm:'Enregistrer'});
   if(!result)return;
   await run(()=>call({method:'POST',action:'update_person',personId:id,expectedRevision:person.revision,changes:result}),'Fiche enregistrée.');
   // A single expandable sheet keeps advanced multiple assignments out of creation.
   await showAssignments(id);
  }catch(e){status.textContent=e.message}
 }
 async function showAssignments(id){
  const data=await call({method:'GET',action:'person_detail',personId:id});
  const old=people.querySelector('.m019-assignments');old?.remove();
  const card=n('section');card.className='card m019-assignments';card.tabIndex=-1;
  card.append(n('h3','Inscriptions de '+(data.person.givenName||data.person.emailNormalized)),b('Modifier',()=>void editPerson(id)),b('Fermer',()=>card.remove()));
  const stateLabel={not_invited:'Invitation à préparer',invited:'Invitation à activer',active:'Compte activé',revoked:'Accès révoqué'};
  const access=n('p','Accès : '+(stateLabel[data.access?.status]||'Invitation à préparer'));access.setAttribute('role','status');card.append(access);
  const languageSelect=select([['fr','Français'],['en','English'],['es','Español'],['de','Deutsch'],['pt','Português'],['it','Italiano'],['ar','العربية'],['zh','中文']]);
  if(data.access?.status!=='active'){
   const invite=b(data.access?.status==='invited'?'Renvoyer l’invitation':'Préparer et envoyer l’invitation',async()=>{
    const checked=await adminDialog(doc,{title:'Vérification administrative',message:'Confirmez que vous autorisez précisément cette personne et avez vérifié son identité indépendamment de la seule adresse e-mail.',confirm:'Confirmer et inviter'});
    if(!checked)return;
    await run(async()=>{
     const response=await call({method:'POST',action:'invite_member',personId:id,verified:true,language:languageSelect.value});
     const mail=response.result?.mail;
     if(mail!=='sent'&&mail!=='not_required')throw Error(mail==='unconfigured'?'Invitation préparée, mais aucun e-mail envoyé : Brevo n’est pas encore configuré.':'Invitation préparée, mais envoi non confirmé. Vérifiez Brevo avant de réessayer.');
    },'Invitation envoyée.');await showAssignments(id);
   });
   card.append(label('Langue de l’e-mail',languageSelect),invite);
  }
  if(data.access?.status==='active'||data.access?.status==='invited'){
   card.append(b('Révoquer l’accès',async()=>{
    const yes=await adminDialog(doc,{title:'Révoquer l’accès',message:'Les sessions en cours seront invalidées immédiatement. Les inscriptions historiques seront préservées.',confirm:'Révoquer'});
    if(!yes)return;
    await run(()=>call({method:'POST',action:'revoke_member',personId:id}),'Accès révoqué.');await showAssignments(id);
   }));
  }
  const form=n('form'),checks=[];
  const typeBox=n('fieldset');typeBox.append(n('legend','Catégories'));
  for(const type of types){const check=input('checkbox');check.checked=data.types.some(t=>t.typeId===type.id);check.disabled=!!type.disabled;checks.push([type,check]);typeBox.append(label(type.name+(type.disabled?' (désactivée)':''),check))}
  const save=b('Enregistrer les catégories');save.type='submit';form.append(typeBox,save);
  form.onsubmit=e=>{e.preventDefault();void run(()=>call({method:'POST',action:'set_person_types',personId:id,expectedRevision:data.person.revision,typeIds:checks.filter(([,c])=>c.checked).map(([t])=>t.id)}),'Catégories enregistrées.').then(()=>showAssignments(id))};card.append(form);
  for(const link of data.celebrations){const row=n('p',celebrationName(link.celebrationId));row.append(b('Retirer l’inscription',async()=>{
   if(!await adminDialog(doc,{title:'Retirer l’inscription',message:'Ce membre perdra l’accès à '+celebrationName(link.celebrationId)+'.',confirm:'Retirer'}))return;
   await run(()=>call({method:'POST',action:'remove_celebration',personId:id,expectedRevision:data.person.revision,celebrationId:link.celebrationId}),'Inscription retirée. L’accès est révoqué.');await showAssignments(id);
  }));card.append(row)}
  const available=names.filter(([cid])=>!data.celebrations.some(l=>String(l.celebrationId)===cid));
  if(available.length){const addForm=n('form'),target=select(available),add=b('Ajouter une inscription');add.type='submit';addForm.append(label('Célébration',target),add);addForm.onsubmit=e=>{e.preventDefault();void run(()=>call({method:'POST',action:'add_celebration',personId:id,expectedRevision:data.person.revision,celebrationId:target.value}),'Inscription ajoutée.').then(()=>showAssignments(id))};card.append(addForm)}
  const claims=await call({method:'GET',action:'pending_claims'});
  for(const claim of claims.filter(c=>c.personId===id)){
   const row=n('p','Connexion en attente : '+claim.participantEmail);
   row.append(b('Vérifier l’identité',async()=>{
    const decision=await adminDialog(doc,{title:'Vérifier l’identité',message:'Une adresse e-mail identique ne suffit pas. Confirmez uniquement après une vérification indépendante.',fields:[{name:'method',label:'Vérification effectuée',required:true,options:[['','Choisir'],['in_person','En personne'],['independent_records','Documents indépendants'],['video_verified','En vidéo']]}],confirm:'Confirmer l’identité'});
    if(decision)await run(()=>call({method:'POST',action:'review_claim',claimId:claim.claimId,approve:true,verificationMethod:decision.method}),'Identité vérifiée.');
   }),b('Refuser',()=>void run(()=>call({method:'POST',action:'review_claim',claimId:claim.claimId,approve:false}),'Demande refusée.')));card.append(row);
  }
  people.append(card);card.focus();
 }
 function renderCategories(){
  categories.replaceChildren(n('h2','Catégories'));
  const form=n('form'),name=input();name.required=true;name.placeholder='Nouvelle catégorie';name.setAttribute('aria-label','Nouvelle catégorie');
  const abbreviation=input();abbreviation.maxLength=16;abbreviation.setAttribute('aria-label','Sigle administratif');abbreviation.placeholder='Sigle administratif';let manual=false;abbreviation.oninput=()=>{manual=true};name.oninput=()=>{if(!manual)abbreviation.value=categoryAbbreviation(name.value)};
  const add=b('Ajouter');add.type='submit';form.append(label('Nom de la catégorie',name),label('Sigle administratif',abbreviation),add);form.onsubmit=e=>{e.preventDefault();void run(()=>call({method:'POST',action:'create_type',name:name.value.trim(),abbreviation:abbreviation.value.trim()||categoryAbbreviation(name.value)}),'Catégorie ajoutée.');};categories.append(form);
  const disabled=n('details');disabled.append(n('summary','Catégories désactivées ('+types.filter(t=>t.disabled).length+')'));
  for(const type of types){const row=n('div');row.className='card';row.append(n('strong',type.name+' — '+(type.abbreviation||categoryAbbreviation(type.name))),n('span',type.disabled?' · Désactivée':''),b('Renommer',async()=>{const r=await adminDialog(doc,{title:'Renommer la catégorie',fields:[{name:'name',label:'Nom',value:type.name,required:true,maxLength:120},{name:'abbreviation',label:'Sigle administratif',value:type.abbreviation||categoryAbbreviation(type.name),required:true,maxLength:16}]});if(r)await run(()=>call({method:'POST',action:'rename_type',typeId:type.id,expectedRevision:type.revision,name:r.name,abbreviation:r.abbreviation}));}),b(type.disabled?'Activer':'Désactiver',()=>void run(()=>call({method:'POST',action:'disable_type',typeId:type.id,expectedRevision:type.revision,disabled:!type.disabled}),'Catégorie actualisée. Les inscriptions sont conservées.')));(type.disabled?disabled:categories).append(row)}
  if(types.some(t=>t.disabled))categories.append(disabled);
 }
 reload().then(()=>{status.textContent='';}).catch(e=>status.textContent='Chargement impossible : '+e.message);
 return {reload,destroy(){destroyed=true;++epoch;root.replaceChildren()}};
}

return {categoryAbbreviation,mountMemberDirectoryAdmin};
})();
const m7=(()=>{
// M011-C: transient editorial workspace over the canonical M005 domain.
// It NEVER writes to localStorage, D1, R2, the legacy editor state or a Worker.
// IDs created here are provisional; a trusted server must allocate final IDs.
const {
  createCelebrationSpace, addSpaceToCelebration, getCelebrationSpaces,
  duplicateCelebration
}=m3;
const {ACCESS_MODES, SPACE_VISIBILITIES, isMemberTypeId}=m1;
const copy = value => JSON.parse(JSON.stringify(value));
const newId = kind => 'draft-' + kind + ':' + crypto.randomUUID();
const requiredId = id => {
  if(typeof id !== 'string' || !id.trim() || id.trim() !== id) {
    throw new TypeError('Identifiant de célébration invalide');
  }
  return id;
};

function createSpacesDraftWorkspace(celebrations = [], {allocateId = newId} = {}) {
  if(!Array.isArray(celebrations) || typeof allocateId !== 'function')
    throw new TypeError('Catalogue et allocateur attendus');
  // No reference to the legacy state or server snapshot escapes into mutations.
  const original = copy(celebrations);
  let current = copy(celebrations), undo = [], redo = [];
  function snapshot() { return copy(current); }
  function index(celebrationId) {
    const pos = current.findIndex(c => String(c.id) === String(celebrationId));
    if(pos < 0) throw new RangeError('Célébration inconnue');
    return pos;
  }
  function change(mutator) {
    const next = copy(current);
    mutator(next);
    undo.push(snapshot());
    if(undo.length > 30) undo.shift();
    current = next; redo = [];
    return snapshot();
  }
  function lookup(celebrationId, spaceId) {
    const celebration = current[index(celebrationId)];
    const space = getCelebrationSpaces(celebration).find(s => s.id === spaceId);
    if(!space) throw new RangeError('Espace inconnu');
    return {celebration,space};
  }
  function policyFor(visibility, mode, typeIds = []) {
    if(visibility === SPACE_VISIBILITIES.PUBLIC)
      return {mode:ACCESS_MODES.PUBLIC};
    if(!Object.values(ACCESS_MODES).includes(mode))
      throw new TypeError('Politique inconnue');
    return mode === ACCESS_MODES.SELECTED_TYPES
      ? {mode, typeIds:[...new Set(typeIds)]} : {mode};
  }
  return {
    list: snapshot,
    get(celebrationId) { return copy(current[index(celebrationId)]); },
    spaces(celebrationId) { return getCelebrationSpaces(current[index(celebrationId)]); },
    getSpace(celebrationId,spaceId) { return lookup(celebrationId,spaceId).space; },
    get changed() { return JSON.stringify(current) !== JSON.stringify(original); },
    get canUndo() { return undo.length > 0; },
    get canRedo() { return redo.length > 0; },
    addSpace(celebrationId,{name,visibility=SPACE_VISIBILITIES.PRIVATE,
      accessScope='CELEBRATION',mode=ACCESS_MODES.PUBLIC,typeIds=[]}={}) {
      if(typeof name !== 'string' || !name.trim() || name.trim().length > 120)
        throw new TypeError('Nom d’espace requis (120 caractères maximum)');
      const id = requiredId(allocateId('space'));
      const space = createCelebrationSpace({id,celebrationId:String(celebrationId),
        name:name.trim(),visibility,accessScope:visibility===SPACE_VISIBILITIES.PRIVATE?accessScope:'INDIVIDUAL',
        accessPolicy:policyFor(visibility,mode,typeIds),pages:[]});
      change(items => {const pos=index(celebrationId);
        items[pos]=addSpaceToCelebration(items[pos],space);});
      return id;
    },
    updateSpace(celebrationId,spaceId,{name,visibility,accessScope,mode,typeIds=[]}={}) {
      const {space}=lookup(celebrationId,spaceId);
      const nextVisibility=visibility??space.visibility;
      const nextMode=mode??space.accessPolicy.mode;
      const nextName=name??space.name;
      if(typeof nextName!=='string'||!nextName.trim())
        throw new TypeError('Nom requis');
      const nextSpace=createCelebrationSpace({...space,name:nextName.trim(),
        visibility:nextVisibility,
        accessScope:nextVisibility===SPACE_VISIBILITIES.PRIVATE?(accessScope??space.accessScope??'INDIVIDUAL'):'INDIVIDUAL',
        accessPolicy:policyFor(nextVisibility,nextMode,typeIds)});
      change(items=>{const c=items[index(celebrationId)];
        c.spaces=c.spaces.map(s=>s.id===spaceId?nextSpace:s);
        getCelebrationSpaces(c);
      });
    },
    addPage(celebrationId,spaceId,{title}={}) {
      if(typeof title!=='string' || !title.trim() || title.trim().length>160)
        throw new TypeError('Titre de page requis');
      const {space}=lookup(celebrationId,spaceId);
      const id=requiredId(allocateId('page'));
      const nextSpace=createCelebrationSpace({...space,pages:[
        ...space.pages,{id,celebrationId:String(celebrationId),spaceId,
          title:title.trim(),blocks:[],visibility:'draft',
          publicationStatus:'draft',accessPolicy:{mode:ACCESS_MODES.PUBLIC}}
      ]});
      change(items=>{const c=items[index(celebrationId)];
        c.spaces=c.spaces.map(s=>s.id===spaceId?nextSpace:s);
        getCelebrationSpaces(c);
      });
      return id;
    },
    updatePagePolicy(celebrationId,spaceId,pageId,{mode,typeIds=[]}={}) {
      const {space}=lookup(celebrationId,spaceId);
      if(!space.pages.some(p=>p.id===pageId))throw new RangeError('Page inconnue');
      if(!Object.values(ACCESS_MODES).includes(mode)||
        (mode===ACCESS_MODES.SELECTED_TYPES&&(!Array.isArray(typeIds)||!typeIds.length||!typeIds.every(isMemberTypeId))))
        throw new TypeError('Politique de page invalide');
      const accessPolicy=policyFor(SPACE_VISIBILITIES.PRIVATE,mode,typeIds);
      const nextSpace=createCelebrationSpace({...space,pages:space.pages.map(p=>p.id===pageId?{...p,accessPolicy}:p)});
      change(items=>{const c=items[index(celebrationId)];
        c.spaces=c.spaces.map(s=>s.id===spaceId?nextSpace:s);
        getCelebrationSpaces(c);
      });
    },
    // M005 owns cloning, ID remapping, translation and media references,
    // draft lifecycle, and removal of every individual member enrollment.
    duplicate(celebrationId) {
      const source=current[index(celebrationId)];
      const newCelebrationId=requiredId(allocateId('celebration'));
      const spaceIds={},pageIds={};
      for(const space of getCelebrationSpaces(source)) {
        spaceIds[space.id]=requiredId(allocateId('space'));
        for(const page of space.pages) pageIds[String(page.id)]=requiredId(allocateId('page'));
      }
      for(const page of source.pages??[]) pageIds[String(page.id)]=requiredId(allocateId('page'));
      const duplicate=duplicateCelebration(source,{
        id:newCelebrationId,spaceIds,pageIds,
        reservedSpaceIds:current.flatMap(c=>(c.spaces??[]).map(s=>s.id)),
        reservedPageIds:current.flatMap(c=>[...(c.pages??[]).map(p=>p.id),
          ...(c.spaces??[]).flatMap(s=>s.pages.map(p=>p.id))])
      });
      change(items=>{if(items.some(c=>String(c.id)===newCelebrationId))
        throw new TypeError('Identifiant déjà utilisé');
        items.push(duplicate);});
      return newCelebrationId;
    },
    undo() {if(!undo.length)return false; redo.push(snapshot());current=undo.pop();return true;},
    redo() {if(!redo.length)return false; undo.push(snapshot());current=redo.pop();return true;},
    discard() {current=copy(original);undo=[];redo=[];return snapshot();}
  };
}

return {createSpacesDraftWorkspace};
})();
const m8=(()=>{
// M011-C — the existing admin panel mounts the existing M007-B/M010-B directory.
// Space preparation uses M005 inside a disposable editor draft; no new dashboard,
// storage API, private routes, publication, migrations or real member fixtures.
const {adminDialog}=m0;
const {mountMemberDirectoryAdmin,categoryAbbreviation}=m6;
const {createSpacesDraftWorkspace}=m7;
const {ACCESS_MODES,SPACE_VISIBILITIES}=m1;
function mountExistingEditorMemberSpaces(root,{
  transport,privateTransport,isConnected=()=>false,celebrations=[],currentCelebrationId=null,allocateId,styleNonce,canDuplicate=()=>true,onEditPage,onCategories=()=>{}
}={}) {
  if(!root?.ownerDocument||typeof root.replaceChildren!=='function' ||
     typeof transport!=='function')throw new TypeError('Existing editor root and admin transport required');
  const doc=root.ownerDocument;
  const node=(tag,text)=>{
    const el=doc.createElement(tag);
    if(text!==undefined)el.textContent=text;
    return el;
  };
  const button=(text)=>{const el=node('button',text);el.type='button';el.className='btn';return el;};
  const label=(text,control)=>{control.setAttribute('aria-label',text);const el=node('label');el.className='field';
    el.append(node('span',text),control);return el;};
  const field=(type,placeholder='',maxLength=120)=>{
    const el=node('input');el.type=type;el.placeholder=placeholder;el.maxLength=maxLength;return el;};
  const clone=items=>JSON.parse(JSON.stringify(items));
  const selected=()=>currentCelebrationId!=null &&
    workspace.list().some(x=>String(x.id)===String(currentCelebrationId))
    ? String(currentCelebrationId):String(workspace.list()[0]?.id??'');
  const canonical=typeof privateTransport==='function';
  const catalogue=clone(celebrations).map(({id,archangel,year,title})=>({id,archangel,year,title}));
  const newWorkspace=items=>createSpacesDraftWorkspace(clone(items),allocateId?{allocateId}:{});
  let workspace=newWorkspace(canonical?catalogue:celebrations);
  let snapshot=null,busy=false,needsReload=false,epoch=0;
  const ready=()=>canonical&&isConnected()&&snapshot!==null&&!needsReload&&!busy;
  let celebrationId=selected(),memberMount=null,destroyed=false,memberTypes=[];
  const activeTypes=()=>memberTypes.filter(t=>t.disabled!==true&&t.disabled!==1);
  function accessChoice(policy,visibility){
    if(visibility===SPACE_VISIBILITIES.PUBLIC)return 'PUBLIC';
    if(policy?.mode===ACCESS_MODES.SELECTED_TYPES)
      return policy.typeIds?.length===1?'CATEGORY:'+policy.typeIds[0]:'MULTI';
    return 'REGISTERED';
  }
  function pagePolicyChoice(policy){
    if(policy?.mode===ACCESS_MODES.SELECTED_TYPES)
      return policy.typeIds?.length===1?'CATEGORY:'+policy.typeIds[0]:'MULTI';
    return policy?.mode===ACCESS_MODES.ALL_PRIVATE_TYPES?'REGISTERED':'PUBLIC';
  }
  function selectedTypeIds(choices,previous){
    const ids=[...new Set(choices??previous?.typeIds??[])];
    if(!ids.length)throw Error('Sélectionnez au moins une catégorie');
    if(ids.some(id=>!activeTypes().some(type=>type.id===id)&&!(previous?.typeIds||[]).includes(id)))
      throw Error('Catégorie inconnue ou désactivée');
    return ids;
  }
  function categoryChecks(previous){
    const area=node('fieldset');area.className='member-spaces-category-checks';
    area.append(node('legend','Catégories sélectionnées (choix multiples)'));
    const selected=new Set(previous?.typeIds||[]),inputs=[];
    for(const type of memberTypes){
      const entry=node('label'),check=node('input');
      check.type='checkbox';check.value=type.id;check.checked=selected.has(type.id);
      check.disabled=type.disabled===true||type.disabled===1;
      entry.append(check,doc.createTextNode(' '+type.name+(check.disabled?' (désactivée)':'')));
      area.append(entry);inputs.push(check);
    }
    return {area,
      selected:()=>inputs.filter(x=>x.checked).map(x=>x.value),
      attach:select=>{
        const toggle=()=>{area.hidden=select.value!=='MULTI';};
        select.addEventListener('change',toggle);toggle();
      }};
  }
  function pagePolicyFromChoice(value,previous,choices){
    if(value==='PUBLIC')return {mode:ACCESS_MODES.PUBLIC};
    if(value==='REGISTERED')return {mode:ACCESS_MODES.ALL_PRIVATE_TYPES};
    if(value==='MULTI')
      return {mode:ACCESS_MODES.SELECTED_TYPES,typeIds:selectedTypeIds(choices,previous)};
    if(value.startsWith('CATEGORY:')){
      const typeId=value.slice(9);
      if(!activeTypes().some(t=>t.id===typeId))throw Error('Catégorie inconnue');
      return {mode:ACCESS_MODES.SELECTED_TYPES,typeIds:[typeId]};
    }
    throw Error('Visibilité inconnue');
  }
  function pagePolicyOptions(previous){
    const select=node('select'),current=pagePolicyChoice(previous);
    const options=[['PUBLIC','Public'],['REGISTERED','Privé — Tous les inscrits']];
    options.push(['MULTI','Privé — catégories sélectionnées']);
    if(current.startsWith('CATEGORY:')&&!activeTypes().some(t=>t.id===current.slice(9)))
      options.push([current,'Privé — catégorie existante conservée']);
    options.push(...activeTypes().map(t=>['CATEGORY:'+t.id,'Privé — '+t.name]));
    for(const [key,title] of options){
      const option=node('option',title);option.value=key;option.selected=key===current;select.append(option);
    }
    return select;
  }
  function accessPolicyFromChoice(value,previous,choices){
    if(value==='MULTI')
      return {visibility:SPACE_VISIBILITIES.PRIVATE,
        mode:ACCESS_MODES.SELECTED_TYPES,typeIds:selectedTypeIds(choices,previous)};

    if(value==='PUBLIC')return {visibility:SPACE_VISIBILITIES.PUBLIC,
      mode:ACCESS_MODES.PUBLIC,typeIds:[]};
    if(value==='REGISTERED')return {visibility:SPACE_VISIBILITIES.PRIVATE,
      mode:ACCESS_MODES.PUBLIC,typeIds:[]};
    if(value.startsWith('CATEGORY:')){
      const typeId=value.slice(9);
      if(!activeTypes().some(t=>t.id===typeId))throw Error('Catégorie inconnue');
      return {visibility:SPACE_VISIBILITIES.PRIVATE,
        mode:ACCESS_MODES.SELECTED_TYPES,typeIds:[typeId]};
    }
    throw Error('Visibilité inconnue');
  }
  function accessOptions({policy,visibility}){
    const select=node('select');
    const value=accessChoice(policy,visibility);
    const options=[['PUBLIC','Public'],['REGISTERED','Privé — Tous les inscrits']];
    options.push(['MULTI','Privé — catégories sélectionnées']);
    if(value.startsWith('CATEGORY:')&&!activeTypes().some(t=>t.id===value.slice(9)))
      options.push([value,'Privé — catégorie existante conservée']);
    options.push(...activeTypes().map(t=>['CATEGORY:'+t.id,'Privé — '+t.name]));
    for(const [key,title] of options){
      const option=node('option',title);option.value=key;option.selected=key===value;
      select.append(option);
    }
    return select;
  }
  async function reloadCategoryNames(){
    if(!isConnected())return;
    const raw=await transport({method:'GET',action:'snapshot',limit:1});
    if(!raw?.ok)throw Error(raw?.error||'Catégories indisponibles');
    const loaded=raw.data??raw.result??raw;
    if(!Array.isArray(loaded.types))throw Error('Types non confirmés');
    memberTypes=loaded.types;
  }
  const container=node('section');container.className='admin-member-spaces-011c';
  const header=node('div');header.className='admin-view-head';
  header.append(node('h1','Membres'));
  const tabs=node('div');tabs.className='member-spaces-tabs';
  const peopleTab=button('Membres');
  const spacesTab=button('Versions des célébrations');
  peopleTab.setAttribute('aria-controls','member-spaces-directory');
  spacesTab.setAttribute('aria-controls','member-spaces-workspace');
  tabs.append(peopleTab,spacesTab);
  const warning=node('p',canonical?'Les droits sont vérifiés à chaque consultation.':'Les espaces se préparent ici sans sauvegarde. '+
    'La publication et les politiques de pages restent désactivées tant que '+
    'leur écriture sécurisée côté serveur n’est pas raccordée.');
  warning.className='notice';warning.setAttribute('role','note');
  const directory=node('section');directory.id='member-spaces-directory';
  const spaces=node('section');spaces.id='member-spaces-workspace';spaces.hidden=true;
  container.append(header,tabs,warning,directory,spaces);
  root.replaceChildren(container);
  // Mount only once: the existing M007-B component owns type/member changes.
  function refreshMembers(){
    if(destroyed)return;
    memberMount?.destroy();
    memberMount=mountMemberDirectoryAdmin(directory,{transport,styleNonce,celebrations,onCategories});
  }
  refreshMembers();
  function activate(showSpaces) {
    if(destroyed)return;
    directory.hidden=showSpaces;spaces.hidden=!showSpaces;
    peopleTab.classList.toggle('primary',!showSpaces);
    spacesTab.classList.toggle('primary',showSpaces);
    peopleTab.setAttribute('aria-pressed',String(!showSpaces));
    spacesTab.setAttribute('aria-pressed',String(showSpaces));
    if(showSpaces){
      renderSpaces();
      if(canonical&&isConnected()){
        void reloadCategoryNames().then(()=>{if(!destroyed&&!spaces.hidden)renderSpaces();})
          .catch(e=>{if(!destroyed&&!spaces.hidden)renderSpaces('Catégories : '+e.message)});
        if(!snapshot&&!busy&&!needsReload)void loadCanonical();
      }
    }
  }
  peopleTab.addEventListener('click',()=>activate(false));
  spacesTab.addEventListener('click',()=>activate(true));

  function applySnapshot(result){
    if(!result?.ok||!Number.isSafeInteger(result.revision)||!result.record||!Array.isArray(result.record.spaces??[]))
      throw Error('Réponse canonique non confirmée');
    if(!catalogue.some(c=>String(c.id)===celebrationId))throw Error('Célébration inconnue');
    workspace=newWorkspace(catalogue.map(c=>String(c.id)===celebrationId?{...c,spaces:result.record.spaces??[]}:c));
    snapshot=result;needsReload=false;
  }
  async function loadCanonical(){
    if(!canonical||!isConnected()||busy||!celebrationId)return;
    if(workspace.changed&&!await adminDialog(doc,{title:'Recharger',message:'Abandonner les modifications non enregistrées ?'}))return;
    const attempt=++epoch;busy=true;renderSpaces('Chargement canonique…');
    let message,loaded=null;
    try{
      const result=await privateTransport({method:'GET',celebration:celebrationId});
      if(attempt!==epoch)return;
      if(!result.ok)throw Error(result.error||'Chargement refusé');
      applySnapshot(result);loaded=snapshot;
      message='Contenus chargés.';
    }catch(e){if(attempt!==epoch)return;needsReload=true;message='Chargement impossible : '+e.message;}
    finally{if(attempt===epoch){busy=false;renderSpaces(message);}}
    return loaded;
  }
  async function mutate(action,fields={}){
    if(!ready())return;
    const attempt=++epoch;busy=true;renderSpaces('Commande serveur en cours…');
    let message,outcome={ok:false,error:'Commande interrompue'};
    try{
      const result=await privateTransport({method:'POST',action,celebration:celebrationId,expectedRevision:snapshot.revision,...fields});
      if(attempt!==epoch)return;
      if(!result.ok){
        needsReload=true;
        throw Error((result.saved?'Le brouillon est enregistré, mais la publication n’est pas confirmée. ':'')+(result.error||'Commande refusée')+' — Rechargez avant toute nouvelle tentative.');
      }
      applySnapshot(result);outcome=result;
      message=action==='save'?'Brouillon enregistré.':
        'Modification enregistrée.';
    }catch(e){if(attempt!==epoch)return;needsReload=true;message='Commande non confirmée : '+e.message;outcome={ok:false,error:e.message};}
    finally{if(attempt===epoch){busy=false;renderSpaces(message);}}
    return outcome;
  }

  // The visual editor owns the block controls. This adapter only exposes the
  // already-authorized canonical R2 command, with server revision arbitration.
  function openCanonicalPage(spaceId,pageId,languageId='fr') {
    if(!ready()||workspace.changed||typeof onEditPage!=='function')return;
    const cid=celebrationId;
    const find=()=>workspace.spaces(cid).find(s=>s.id===spaceId)?.pages.find(p=>p.id===pageId);
    const page=find();
    if(!page||page.id.startsWith('draft-page:'))return;
    if(languageId!=='fr'&&!snapshot?.languageRegistry?.languages?.some(x=>x.id===languageId))
      throw Error('Langue non créée par l’administrateur');
    // The existing visual block editor handles each manually authored variant.
    // Never copy French blocks into a missing language variant.
    const localized=canonical=>{
      const copy={...clone(canonical),group:canonical.group||'celebration'};
      if(languageId==='fr')return copy;
      const content=copy.translations?.[languageId];
      return {...copy,name:content?.name??'Titre à rédiger',
        blocks:clone(content?.blocks??[])};
    };
    const check=()=>{
      if(destroyed||cid!==celebrationId||!ready()||workspace.changed||!find())
        throw Error('Session ou révision indisponible : rechargez les espaces.');
    };
    const command=async(action,fields)=>{
      check();
      const result=await mutate(action,fields);
      if(!result?.ok)throw Error(result?.error||'Commande canonique non confirmée');
      return clone(find());
    };
    onEditPage({
      languageId,
      page:localized(page),
      save:async({name,blocks})=>{
        check();
        if(typeof name!=='string'||!name.trim()||!Array.isArray(blocks))
          throw Error('Page ou blocs invalides');
        const spaces=workspace.spaces(cid);
        const space=spaces.find(s=>s.id===spaceId);
        const position=space?.pages.findIndex(p=>p.id===pageId);
        if(position<0||position===undefined)throw Error('Page inconnue');
        // Replace only the canonical page content, never its identity or ACL.
        const original=space.pages[position];
        if(languageId==='fr'){
          space.pages[position]={...original,name:name.trim(),blocks:clone(blocks)};
        }else{
          space.pages[position]={...original,translations:{
            ...(original.translations||{}),[languageId]:{name:name.trim(),blocks:clone(blocks)}
          }};
        }
        await command('save',{spaces});
        return localized(find());
      },
      reload:async()=>{
        if(!isConnected()||cid!==celebrationId)throw Error('Session expirée');
        const result=await loadCanonical();
        if(!result||!find())throw Error('Rechargement impossible');
        return localized(find());
      },
      publish:async()=>{if(!snapshot.spaceReleases.some(s=>s.spaceId===spaceId))await command('publish',{kind:'space',id:spaceId});return command('publish',{kind:'page',id:pageId,spaceId})},
      unpublish:(visibility='draft')=>command('unpublish',{kind:'page',id:pageId,spaceId,visibility}),
      isPublished:()=>!!snapshot?.pageReleases?.some(x=>x.pageId===pageId)
    });
  }
  function sessionChanged(active){
    if(!canonical)return;
    ++epoch;busy=false;needsReload=false;snapshot=null;workspace=newWorkspace(catalogue);
    if(!spaces.hidden){renderSpaces();if(active)void loadCanonical();}
    else spaces.replaceChildren();
  }
  async function createVersion(source=null,sourceLanguage='fr',categoryId='',pageTitle=''){
    if(!ready())return;
    const languages=snapshot.languageRegistry.languages;
    const fields=[{name:'title',label:'Titre de la page',value:source?.name||pageTitle,required:true,maxLength:160},
      {name:'category',label:'Catégorie',value:categoryId,options:[['','Tous les inscrits'],...activeTypes().map(t=>[t.id,t.name])]},
      {name:'language',label:'Langue',options:languages.map(l=>[l.id,l.name]),value:sourceLanguage}];
    if(source){
      const options=[];
      for(const s of workspace.spaces(celebrationId))for(const p of s.pages){
        options.push([p.id+'|fr',s.name+' — '+p.name+' — Français']);
        for(const [id,version]of Object.entries(p.translations||{}))options.push([p.id+'|'+id,s.name+' — '+version.name+' — '+(languages.find(l=>l.id===id)?.name||id)]);
      }
      if(!options.some(o=>o[0]===source.id+'|'+sourceLanguage))options.unshift([source.id+'|'+sourceLanguage,source.name+' — version ouverte']);
      fields.unshift({name:'source',label:'Version à copier',value:source.id+'|'+sourceLanguage,options});
    }
    const answer=await adminDialog(doc,{title:source?'Dupliquer en brouillon':'Ajouter une version',fields,confirm:'Créer le brouillon'});
    if(!answer)return;
    try{
      let target=workspace.spaces(celebrationId).find(s=>
        answer.category?s.accessPolicy.mode===ACCESS_MODES.SELECTED_TYPES&&s.accessPolicy.typeIds?.length===1&&s.accessPolicy.typeIds[0]===answer.category:
        s.visibility===SPACE_VISIBILITIES.PRIVATE&&s.accessPolicy.mode===ACCESS_MODES.PUBLIC);
      if(!target){
        workspace.addSpace(celebrationId,{name:activeTypes().find(t=>t.id===answer.category)?.name||'Tous les inscrits',
          visibility:SPACE_VISIBILITIES.PRIVATE,mode:answer.category?ACCESS_MODES.SELECTED_TYPES:ACCESS_MODES.PUBLIC,
          typeIds:answer.category?[answer.category]:[],accessScope:'CELEBRATION'});
        target=workspace.spaces(celebrationId).at(-1);
      }
      // Copies contain content only. Category is the administrator's explicit
      // target selection; people, enrollment and release ledgers are untouched.
      let content;
      if(answer.source){const [pid,lang]=answer.source.split('|');const page=workspace.spaces(celebrationId).flatMap(s=>s.pages).find(p=>p.id===pid)||source;content=lang==='fr'?page:page?.translations?.[lang];}
      const next=workspace.spaces(celebrationId);
      const targetSpace=next.find(s=>s.id===target.id);
      let page=targetSpace.pages.find(p=>p.name.trim().toLocaleLowerCase()===answer.title.trim().toLocaleLowerCase());
      if(page&&(answer.language==='fr'?(page.blocks.length>0||!Object.keys(page.translations||{}).length):page.translations?.[answer.language]))
        throw Error('Cette version existe déjà. Choisissez un autre titre ou une autre langue.');
      if(!page){page={id:'draft-page:'+crypto.randomUUID(),name:answer.title,group:source?.group||'celebration',...(source?.placement?{placement:source.placement}:{}),blocks:[],accessPolicy:{mode:ACCESS_MODES.PUBLIC}};targetSpace.pages.push(page)}
      if(answer.language==='fr')page.blocks=clone(content?.blocks||[]);
      else page.translations={...page.translations,[answer.language]:{name:answer.title,blocks:clone(content?.blocks||[])}};
      const result=await mutate('save',{spaces:next});
      if(!result?.ok)return;
      const saved=snapshot.record.spaces.find(s=>s.name===targetSpace.name)?.pages.find(p=>p.name.trim().toLocaleLowerCase()===answer.title.trim().toLocaleLowerCase());
      if(saved)openCanonicalPage(snapshot.record.spaces.find(s=>s.pages.some(p=>p.id===saved.id)).id,saved.id,answer.language);
    }catch(e){renderSpaces(e.message)}
  }
  // Duplicate the ENTIRE celebration for one category/language, never an
  // independent celebration and never any member enrollment or permission.
  // The only dialog asks for its target category and language.
  async function duplicateWholeCelebrationVersion(sourcePages,celebrationTitle){
    if(!ready())throw Error('La session des membres est indisponible.');
    if(!Array.isArray(sourcePages)||!sourcePages.length||sourcePages.length>75)
      throw Error('Aucune page de célébration à dupliquer.');
    const activeLanguages=snapshot.languageRegistry.languages;
    const chosen=await adminDialog(doc,{
      title:'Nouvelle version de '+String(celebrationTitle||'la célébration').slice(0,100),
      message:'Choisissez la catégorie et la langue. Une nouvelle version de toutes les pages sera créée en brouillon, sans modifier les autres versions ni les droits des membres. Les traductions absentes seront à rédiger.',
      fields:[
        {name:'category',label:'Catégorie',options:[['','Tous les inscrits'],...activeTypes().map(t=>[t.id,t.name])],value:''},
        {name:'language',label:'Langue',options:activeLanguages.map(l=>[l.id,l.name]),value:'fr'}
      ],
      confirm:'Créer la version'
    });
    if(!chosen)return null;
    const language=activeLanguages.find(l=>l.id===chosen.language);
    if(!language||chosen.category&&!activeTypes().some(t=>t.id===chosen.category))
      throw Error('Catégorie ou langue non disponible.');
    const source=sourcePages.map(p=>({
      name:String(p.name||'').trim().slice(0,160),group:'celebration',
      blocks:clone(p.blocks||[]),translations:clone(p.translations||{})
    }));
    if(source.some(p=>!p.name||!Array.isArray(p.blocks)))
      throw Error('Une page à copier est invalide.');
    const targetMatches=s=>chosen.category?
      s.visibility===SPACE_VISIBILITIES.PRIVATE&&s.accessPolicy.mode===ACCESS_MODES.SELECTED_TYPES&&
       s.accessPolicy.typeIds?.length===1&&s.accessPolicy.typeIds[0]===chosen.category:
      s.visibility===SPACE_VISIBILITIES.PRIVATE&&s.accessPolicy.mode===ACCESS_MODES.PUBLIC;
    let target=workspace.spaces(celebrationId).find(targetMatches);
    if(!target){
      workspace.addSpace(celebrationId,{
        name:activeTypes().find(t=>t.id===chosen.category)?.name||'Tous les inscrits',
        visibility:SPACE_VISIBILITIES.PRIVATE,mode:chosen.category?ACCESS_MODES.SELECTED_TYPES:ACCESS_MODES.PUBLIC,
        typeIds:chosen.category?[chosen.category]:[],accessScope:'CELEBRATION'
      });
      target=workspace.spaces(celebrationId).find(targetMatches);
    }
    if(!target)throw Error('Impossible de créer la catégorie.');
    const spaces=workspace.spaces(celebrationId);
    const destination=spaces.find(s=>s.id===target.id);
    // Preflight ALL pages: never partially replace an existing target version.
    const conflicts=source.filter(p=>destination.pages.some(existing=>
      existing.name.trim().toLocaleLowerCase()===p.name.toLocaleLowerCase()&&
      (language.id==='fr'?(existing.blocks?.length>0||!Object.keys(existing.translations||{}).length):
       Object.hasOwn(existing.translations||{},language.id))));
    if(conflicts.length)throw Error('Une version existe déjà pour cette catégorie et cette langue. Aucun contenu n’a été écrasé.');
    for(const p of source){
      let existing=destination.pages.find(x=>x.name.trim().toLocaleLowerCase()===p.name.toLocaleLowerCase());
      if(!existing){
        existing={id:'draft-page:'+crypto.randomUUID(),name:p.name,group:'celebration',blocks:[],
          accessPolicy:{mode:ACCESS_MODES.PUBLIC}};
        destination.pages.push(existing);
      }
      if(language.id==='fr')existing.blocks=clone(p.blocks);
      else existing.translations={...(existing.translations||{}),
        [language.id]:{name:p.translations[language.id]?.name||p.name,
          blocks:clone(p.translations[language.id]?.blocks||[])}};
    }
    const result=await mutate('save',{spaces});
    if(!result?.ok)throw Error(result?.error||'Duplication non enregistrée');
    return {category:activeTypes().find(t=>t.id===chosen.category)?.name||'Tous les inscrits',
      language:language.name,pages:source.length};
  }
  function renderSpaces(message=''){
    if(destroyed)return;
    spaces.replaceChildren();
    const status=node('p',message);status.setAttribute('role','status');spaces.append(status);
    const choice=node('select');choice.hidden=true;choice.setAttribute('aria-label','Célébration');
    for(const c of workspace.list()){const o=node('option',c.title||[c.archangel,c.year].filter(Boolean).join(' '));o.value=String(c.id);choice.append(o)}
    choice.value=celebrationId;choice.disabled=busy;
    choice.onchange=()=>{celebrationId=choice.value;snapshot=null;needsReload=false;workspace=newWorkspace(catalogue);renderSpaces();void loadCanonical()};
    const heading=label('Célébration',choice);heading.hidden=true;spaces.append(heading);
    spaces.append(node('h2',catalogue.find(c=>String(c.id)===celebrationId)?.title||'Versions de la célébration'));
    if(!snapshot){
      spaces.append(node('p',isConnected()?'Chargement des versions…':'Connectez-vous pour consulter les versions.'));
      return;
    }
    const search=field('search','Rechercher une version');search.setAttribute('aria-label','Rechercher une version');spaces.append(search);
    search.oninput=()=>{const query=search.value.trim().toLocaleLowerCase();for(const card of spaces.querySelectorAll('.member-spaces-card')){for(const row of card.querySelectorAll('.member-spaces-version'))row.hidden=!row.textContent.toLocaleLowerCase().includes(query);card.hidden=!!query&&![...card.querySelectorAll('.member-spaces-version')].some(row=>!row.hidden)}};
    const add=button('＋ Ajouter une version');add.disabled=!ready();add.onclick=()=>void createVersion();spaces.append(add);

    if(!snapshot.privateReleaseReady&&snapshot.pageReleases.length){
      spaces.append(node('p','La publication doit encore être confirmée avant de donner accès aux membres.'));
      const retry=button('Terminer la publication');retry.onclick=()=>void mutate('reconcile');spaces.append(retry);
    }
    if(needsReload){const retry=button('Recharger');retry.onclick=()=>void loadCanonical();spaces.append(retry)}
    for(const space of workspace.spaces(celebrationId)){
      const card=node('section');card.className='card member-spaces-card';card.append(node('h3',space.accessPolicy.typeIds?.map(id=>{const t=memberTypes.find(t=>t.id===id);return t?(t.abbreviation||categoryAbbreviation(t.name)):id}).join(', ')||'Tous les inscrits'));
      for(const page of space.pages){
        const langs=snapshot.languageRegistry.languages.filter(l=>l.id==='fr'?(page.blocks.length>0||!Object.keys(page.translations||{}).length):!!page.translations?.[l.id]);
        for(const lang of langs){
          const released=snapshot.pageReleases.some(p=>p.pageId===page.id);
          const row=node('div');row.className='member-spaces-version';
          const name=lang.id==='fr'?page.name:page.translations[lang.id].name;
          const adminName=(catalogue.find(c=>String(c.id)===celebrationId)?.title||'Célébration')+' — '+(space.accessPolicy.typeIds?.map(id=>{const t=memberTypes.find(t=>t.id===id);return t?(t.abbreviation||categoryAbbreviation(t.name)):id}).join(', ')||'Tous les inscrits')+' — '+lang.name;
          const open=button(adminName+' · '+name+' · '+(released?'Publiée':'Brouillon'));
          open.onclick=()=>openCanonicalPage(space.id,page.id,lang.id);open.disabled=!ready();row.append(open);

          const release=button(released?'Dépublier':'Publier');release.disabled=!ready();
          release.onclick=async()=>{
            if(!await adminDialog(doc,{title:released?'Dépublier la page':'Publier la page',message:released?'Retirer cette page et ses versions du site ?':'Publier les versions rédigées de cette page ?',confirm:released?'Dépublier':'Publier'}))return;
            if(released){await mutate('unpublish',{kind:'page',id:page.id,spaceId:space.id});return}
            if(snapshot.celebrationVisibility!=='published'){renderSpaces('Publiez d’abord la célébration depuis Célébrations.');return}
            if(!snapshot.spaceReleases.some(s=>s.spaceId===space.id)){
              const r=await mutate('publish',{kind:'space',id:space.id});if(!r?.ok)return;
            }
            await mutate('publish',{kind:'page',id:page.id,spaceId:space.id});
          };
          const duplicate=button('Dupliquer');duplicate.disabled=!ready();duplicate.onclick=()=>void createVersion(page,lang.id);
          const change=button('Langue / catégorie');change.disabled=!ready();change.onclick=async()=>{
           const answer=await adminDialog(doc,{title:'Modifier cette version',fields:[{name:'category',label:'Catégorie',value:space.accessPolicy.typeIds?.[0]||'',options:[['','Tous les inscrits'],...activeTypes().map(t=>[t.id,t.name])]},{name:'language',label:'Langue',value:lang.id,options:snapshot.languageRegistry.languages.map(l=>[l.id,l.name])}]});
           if(!answer)return;
           const nextCategory=activeTypes().find(t=>t.id===answer.category)?.name||'Tous les inscrits';
           const nextLanguage=snapshot.languageRegistry.languages.find(l=>l.id===answer.language)?.name;
           if(!await adminDialog(doc,{title:'Confirmer le changement',message:adminName+' → '+nextCategory+' — '+nextLanguage+'. La version modifiée restera en brouillon.',confirm:'Modifier'}))return;
           await mutate('change-version',{spaceId:space.id,pageId:page.id,languageId:lang.id,targetLanguageId:answer.language,typeIds:answer.category?[answer.category]:[]});
          };
          row.append(release,duplicate,change);card.append(row);
        }
      }
      spaces.append(card);
    }
    for(const type of activeTypes().filter(t=>!workspace.spaces(celebrationId).some(s=>s.accessPolicy.typeIds?.includes(t.id)))){const card=node('section');card.className='card member-spaces-card';const add=button('＋ Ajouter une version');add.disabled=!ready();add.onclick=()=>void createVersion(null,'fr',type.id);card.append(node('h3',type.name+' — '+(type.abbreviation||categoryAbbreviation(type.name))),node('p','Aucune version pour cette catégorie.'),add);spaces.append(card)}
    if(!workspace.spaces(celebrationId).length)spaces.append(node('p','Aucune version par catégorie. Les pages générales restent dans l’éditeur.'));
  }
  activate(false);
  return {
    getDraft:()=>workspace.list(),
    refreshMembers,sessionChanged,
    get changed(){return workspace.changed;},
    showSpaces(){activate(true);},
    async duplicateVersion(source,languageId='fr'){await reloadCategoryNames();await loadCanonical();await createVersion(source,languageId);},
    async duplicateCelebrationVersion(pages,title){
      await reloadCategoryNames();
      await loadCanonical();
      return duplicateWholeCelebrationVersion(pages,title);
    },
    async openVersion(typeId,languageId='fr',title=''){
      directory.hidden=true;spaces.hidden=false;await reloadCategoryNames();await loadCanonical();
      const space=workspace.spaces(celebrationId).find(s=>typeId?
        s.accessPolicy.typeIds?.includes(typeId):s.accessPolicy.mode===ACCESS_MODES.PUBLIC);
      const page=space?.pages.find(p=>p.name===title)||(!title?space?.pages[0]:null);
      if(page)openCanonicalPage(space.id,page.id,languageId);
      else await createVersion(null,languageId,typeId,title);
    },
    showMembers(){activate(false);container.classList.remove('m019-category-mode');},
    showCategories(){activate(false);container.classList.add('m019-category-mode');},
    destroy(){destroyed=true;++epoch;memberMount?.destroy();root.replaceChildren();}
  };
}

return {mountExistingEditorMemberSpaces};
})();
const m9=(()=>{
// M018: the already-authenticated official editor can exchange its PIN cookie
// ONCE for the existing short-lived D1 bearer; member API calls still require
// bearer authorization. The M016 separate password-challenge remains available.
const {mountExistingEditorMemberSpaces}=m8;
function createEditorD1Session({origin,fetchImpl=globalThis.fetch,cryptoImpl=globalThis.crypto,onChange=()=>{}}={}){
  const base=new URL(origin);
  if(base.origin!==origin || (base.protocol!=='https:' && !(base.protocol==='http:' && ['127.0.0.1','localhost'].includes(base.hostname))))
    throw Error('Origine sécurisée requise');
  let token=null,expires=0,generation=0;
  const enc=new TextEncoder(),hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
  const clear=()=>{token=null;expires=0;generation++;onChange(false);};
  const connected=()=>!!token&&expires>Date.now();
  const request=async(path,{method='POST',body,query,bearer}={})=>{
    const url=new URL(path,base);
    if(url.origin!==origin)throw Error('Origine interdite');
    for(const [k,v] of Object.entries(query||{}))if(v!==null&&v!==undefined&&v!=='')url.searchParams.set(k,String(v));
    const editorPinBridge=body?.action==='editor-pin-session' && path==='/api/admin/editor-session';
    const headers={accept:'application/json'};
    if(bearer)headers.authorization='Bearer '+bearer;
    if(body!==undefined)headers['content-type']='application/json';
    if(editorPinBridge)headers['x-celebrations-editor-bridge']='1';
    const response=await fetchImpl(url.href,{method,headers,credentials:editorPinBridge?'same-origin':'omit',cache:'no-store',redirect:'error',
      ...(body!==undefined?{body:JSON.stringify(body)}:{})});
    if(response.status===401&&bearer&&bearer===token)clear();
    if(!response.headers.get('content-type')?.toLowerCase().includes('application/json'))
      throw Error('Route administrative indisponible ('+response.status+')');
    const result=await response.json();
    if(!response.ok||result?.ok!==true)throw Object.assign(Error((typeof result?.error==='string'?result.error:'Requête administrative refusée')+' ('+response.status+')'),{status:response.status,saved:result?.saved===true});
    return result;
  };
  const auth=(body,bearer)=>request('/api/admin/editor-session',{body,bearer});
  function acceptSession(result,attempt){
    if(attempt!==generation)throw Error('Connexion interrompue');
    const end=Date.parse(result.expires_at);
    if(typeof result.token!=='string'||!result.token||!Number.isFinite(end)||end<=Date.now())
      throw Error('Connexion non confirmée');
    token=result.token;expires=end;onChange(true);
  }
  async function loginWithEditorPin(){
    if(token)throw Error('Déconnexion préalable requise');
    const attempt=++generation;
    const result=await auth({action:'editor-pin-session'});
    acceptSession(result,attempt);
  }
  async function login(password){
    if(!password||token)throw Error('Déconnexion préalable ou mot de passe requis');
    const attempt=++generation;
    const challenge=await auth({action:'challenge'});
    if(typeof challenge.salt!=='string'||!challenge.salt||typeof challenge.challenge!=='string'||!challenge.challenge||challenge.iterations!==180000)
      throw Error('Défi D1 invalide');
    const key=await cryptoImpl.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
    password='';
    const derived=hex(await cryptoImpl.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(challenge.salt),iterations:180000,hash:'SHA-256'},key,256));
    const hmac=await cryptoImpl.subtle.importKey('raw',enc.encode(derived),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const response=hex(await cryptoImpl.subtle.sign('HMAC',hmac,enc.encode('celebrations-admin-login-v1:'+origin+':'+challenge.challenge)));
    const result=await auth({action:'login',challenge:challenge.challenge,response});
    acceptSession(result,attempt);
  }
  async function logout(){
    const bearer=token;clear();
    if(bearer)await auth({action:'logout'},bearer);
  }
  async function send(command,path,queryKeys){
    if(!['GET','POST'].includes(command?.method))return {ok:false,error:'Commande invalide'};
    if(!connected()){
      if(token)clear();
      return {ok:false,error:'Veuillez vous reconnecter.'};
    }
    const bearer=token;
    try{
      const data=Object.fromEntries(Object.entries(command).filter(([k])=>k!=='method'));
      const options=command.method==='GET'?{query:Object.fromEntries(Object.entries(data).filter(([k])=>queryKeys.includes(k)))}:{body:data};
      const result=await request(path,{method:command.method,bearer,...options});
      if(bearer!==token)return {ok:false,error:'Session terminée'};
      return result;
    }catch(e){return {ok:false,error:e.message||'Service D1 indisponible',status:e.status,saved:e.saved===true};}
  }
  const transport=command=>send(command,'/api/admin/member-directory',['action','search','cursor','limit','personId','celebrationId','typeId']);
  const privateTransport=command=>send(command,'/api/admin/private-editor',['celebration']);
  return {login,loginWithEditorPin,logout,connected,transport,privateTransport};
}

function mountRealEditorMemberSpaces(root,{celebrations,currentCelebrationId,styleNonce,css='',origin=location.origin,onEditPage,onSessionChange=()=>{},onCategories=()=>{}}={}){
  const doc=root.ownerDocument,node=(tag,text)=>{const x=doc.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
  const shell=node('section'),style=node('style');if(styleNonce)style.nonce=styleNonce;style.textContent=css;
  const officialEditor=['ronde-des-archanges-universelle.eu',
    'www.ronde-des-archanges-universelle.eu','celebrations-m016-admin-preprod.rondes.workers.dev'].includes(new URL(origin).hostname);
  const authBox=node('section');authBox.className='member-session-box';
  const heading=node('h2',officialEditor?'Administration des membres':'Connexion administrateur'),status=node('p','Connexion aux membres…');
  status.setAttribute('role','status');
  const form=node('form'),label=node('label','Code administrateur '),input=node('input');
  input.type='password';input.required=!officialEditor;input.autocomplete='current-password';label.append(input);label.hidden=officialEditor;
  const login=node('button',officialEditor?'Réactiver les membres':'Se connecter');login.type='submit';login.className='btn';
  const logout=node('button','Se déconnecter');logout.type='button';logout.className='btn';logout.hidden=true;
  form.append(label,login);
  authBox.append(heading,node('p',officialEditor?'Vous utilisez votre code administrateur habituel.':'Utilisez votre code administrateur habituel.'),status,form,logout);
  const body=node('div');shell.append(style,authBox,body);root.replaceChildren(shell);
  let mounted,busy=false;
  const session=createEditorD1Session({origin,onChange:active=>{
    form.hidden=active;logout.hidden=!active;authBox.hidden=active;
    status.textContent=active?'Gestion des membres activée.':'Gestion des membres déconnectée.';
    mounted?.refreshMembers();
    mounted?.sessionChanged(active);onSessionChange(active);
  }});
  mounted=mountExistingEditorMemberSpaces(body,{transport:session.transport,privateTransport:session.privateTransport,isConnected:session.connected,celebrations,currentCelebrationId,styleNonce,onEditPage,onCategories});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    busy=true;login.disabled=true;status.textContent='Connexion en cours…';
    let password=input.value;input.value='';
    try{
      const pending=officialEditor?session.loginWithEditorPin():session.login(password);
      password='';await pending;
    }
    catch(e){status.textContent='Connexion impossible : '+(e.message||'erreur réseau');}
    finally{busy=false;login.disabled=false;}
  });
  // No second password prompt after the owner has used the usual admin code.
  const initialSession=officialEditor?session.loginWithEditorPin().catch(error=>{
    status.textContent='Accès aux membres indisponible : '+(error.message||'erreur réseau');
  }):Promise.resolve();
  logout.addEventListener('click',async()=>{
    if(busy)return;busy=true;login.disabled=true;logout.disabled=true;
    try{await session.logout();status.textContent='Déconnexion confirmée.';}
    catch{status.textContent='Session effacée localement ; révocation serveur non confirmée.';}
    finally{busy=false;login.disabled=false;logout.disabled=false;}
  });
  const readContent=async()=>{await initialSession;const r=await session.privateTransport({method:'GET',celebration:String(currentCelebrationId)});if(!r.ok)throw Error(r.error);return r};
  const commandContent=async(action,fields={})=>{const current=await readContent();const r=await session.privateTransport({method:'POST',action,celebration:String(currentCelebrationId),expectedRevision:current.revision,...fields});if(!r.ok)throw Error(r.error);return r};
  return {duplicateVersion:(...args)=>mounted.duplicateVersion(...args),duplicateCelebrationVersion:(...args)=>mounted.duplicateCelebrationVersion(...args),openVersion:(...args)=>mounted.openVersion(...args),readContent,commandContent,categories:async()=>{await initialSession;const r=await session.transport({method:'GET',action:'snapshot',limit:1});if(!r.ok)throw Error(r.error);return (r.data??r).types;},get changed(){return mounted.changed;},getDraft:()=>mounted.getDraft(),showMembers:()=>mounted.showMembers(),showCategories:()=>mounted.showCategories(),showSpaces:()=>mounted.showSpaces()};
}

return {createEditorD1Session,mountRealEditorMemberSpaces};
})();
return {dialog:m0.adminDialog,mount:m9.mountRealEditorMemberSpaces,css:"/* M011-C scoped layout: reuses current admin buttons/cards and M007-B UI. */\n.admin-member-spaces-011c {max-width:100%;min-width:0;overflow-wrap:anywhere}\n.admin-member-spaces-011c .admin-view-head{display:flex;align-items:center;justify-content:space-between}\n.admin-member-spaces-011c .member-spaces-tabs,\n.admin-member-spaces-011c .member-spaces-actions {\n  display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin:.75rem 0;\n}\n.admin-member-spaces-011c [hidden]{display:none!important}\n.admin-member-spaces-011c .member-spaces-tabs button[aria-pressed=\"true\"]{font-weight:700}\n.admin-member-spaces-011c #member-spaces-directory,\n.admin-member-spaces-011c #member-spaces-workspace{max-width:100%;min-width:0}\n.admin-member-spaces-011c .member-spaces-grid{\n  display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:1rem;\n}\n.admin-member-spaces-011c .member-spaces-card,\n.admin-member-spaces-011c .member-spaces-create{min-width:0;padding:1rem;margin:1rem 0}\n.admin-member-spaces-011c .member-spaces-form{display:grid;gap:.65rem;margin:1rem 0}\n.admin-member-spaces-011c .member-spaces-form label,\n.admin-member-spaces-011c .member-spaces-actions label {min-width:0}\n.admin-member-spaces-011c input,\n.admin-member-spaces-011c select,\n.admin-member-spaces-011c button,\n.admin-member-spaces-011c textarea {max-width:100%;box-sizing:border-box}\n.admin-member-spaces-011c input,\n.admin-member-spaces-011c select {width:100%;min-height:40px}\n.admin-member-spaces-011c button{min-height:40px;white-space:normal;text-align:center}\n.admin-member-spaces-011c button:disabled{cursor:not-allowed;opacity:.55}\n.admin-member-spaces-011c .member-spaces-pages p{border-bottom:1px solid #ddd;padding:.35rem 0}\n.admin-member-spaces-011c .member-spaces-disclaimer{padding:.8rem;background:#fff3cd;border-radius:.4rem}\n.admin-member-spaces-011c .member-spaces-status{font-weight:600}\n.admin-member-spaces-011c code{display:block;overflow-wrap:anywhere}\n.admin-member-spaces-011c .member-admin-007b .member-admin-layout{min-width:0}\n.admin-member-spaces-011c .member-directory-009b {max-width:100%}\n@media(max-width:720px){\n .admin-member-spaces-011c .member-spaces-tabs{display:grid;grid-template-columns:1fr}\n .admin-member-spaces-011c .member-spaces-actions{display:grid;grid-template-columns:1fr}\n .admin-member-spaces-011c .member-spaces-actions > *{width:100%}\n .admin-member-spaces-011c button{min-height:44px}\n}\n\n/* M019: familiar cards and buttons, compact on Android. */\n.admin-dialog{width:min(92vw,480px);max-height:88dvh;overflow:auto;border:1px solid #ddd;border-radius:12px;padding:1.2rem;color:inherit;background:#fff}\n.admin-dialog::backdrop{background:#0006}\n.admin-dialog form,.admin-dialog label{display:grid;gap:.65rem}\n.admin-dialog input,.admin-dialog select{box-sizing:border-box;width:100%;min-height:44px;font:inherit;padding:.5rem}\n.admin-dialog-actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}\n.m019-member-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:.7rem;padding:1rem}\n.member-directory-009b .field{display:grid;gap:.3rem}\n.member-directory-009b input,.member-directory-009b select{width:100%;box-sizing:border-box;min-height:44px;padding:.5rem;font:inherit}\n.member-directory-009b input[type=checkbox]{width:auto;min-height:24px}\n.m019-filters{display:grid;gap:.7rem;margin:1.2rem 0}\n.m019-member-list{display:grid;gap:.6rem}\n.m019-member-list .card,.m019-categories .card,.m019-assignments{padding:.8rem;margin:.5rem 0}\n.m019-categories .card{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}\n.m019-categories{display:none}.m019-category-mode .m019-categories{display:block}.m019-category-mode .m019-people{display:none}\n.admin-member-spaces-011c>.admin-view-head,.admin-member-spaces-011c>.member-spaces-tabs,.admin-member-spaces-011c>.notice{display:none}\n\n.admin-dialog .admin-dialog-choice{display:flex;align-items:center;gap:.6rem;padding:.3rem 0}\n.admin-dialog input[type=radio],.admin-dialog input[type=checkbox]{width:auto;min-height:24px;flex:0 0 auto}\n.member-spaces-version{display:flex;flex-wrap:wrap;gap:.4rem;border-top:1px solid #eee;padding:.6rem 0}\n.member-spaces-version>button:first-child{flex:1 1 100%;text-align:left}\n\n.m019-categories .card{flex-direction:row;justify-content:flex-start;padding:.7rem}\n.m019-categories .card strong{flex:1 1 100%;text-align:left}\n.stage-editor.is-catalogue .topbar{display:none}\n\n/* Compact settings retain the existing card palette and 44px touch controls. */\n.m019-categories .card,.m019-member-list .card{min-height:0}\n.m019-categories details{margin-top:.8rem}.m019-categories summary{cursor:pointer;padding:.6rem}\n.m018-language-panel{max-width:100%;min-width:0}\n.m018-language-form,.m018-language-entry{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem;align-items:center;margin:.7rem 0}\n.m018-language-entry{grid-template-columns:minmax(0,1fr) auto auto}\n.m018-language-panel input{width:100%;min-width:0;box-sizing:border-box;min-height:44px;padding:.5rem;border:1px solid #ccc;border-radius:8px;font:inherit}\n.m018-language-panel .btn{min-height:44px;padding:.5rem}\n\n/* M019: real member directory at scale: compact list, creation on demand. */\n.member-directory-009b .m019-member-header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin:.3rem 0}\n.member-directory-009b .m019-member-header h2{margin:0}\n.member-directory-009b .m019-member-form[hidden]{display:none!important}\n.member-directory-009b .m019-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin:.85rem 0}\n.member-directory-009b .m019-filter-search{grid-column:1 / -1;display:flex;align-items:center;gap:.4rem;min-width:0}\n.member-directory-009b .m019-filter-search input{flex:1;min-width:0}\n.member-directory-009b .m019-filters>.btn{justify-self:start;padding:.45rem .65rem}\n.member-directory-009b .m019-page-info{font-size:.9rem;color:#555;margin:.65rem 0}\n.member-directory-009b .m019-member-list{display:grid;gap:0;border:1px solid #e3e3e3;border-radius:10px;overflow:hidden}\n.member-directory-009b .m019-member-row.btn{display:flex;align-items:center;justify-content:space-between;gap:.7rem;min-height:54px;width:100%;box-sizing:border-box;border:0;border-bottom:1px solid #e9e9e9;border-radius:0;background:#fff;text-align:left;padding:.5rem .7rem;white-space:normal;color:inherit}\n.member-directory-009b .m019-member-row:last-child{border-bottom:0}\n.member-directory-009b .m019-member-row:focus-visible{outline:2px solid #225f9d;outline-offset:-2px}\n.member-directory-009b .m019-member-row:hover{background:#f5f7f8}\n.member-directory-009b .m019-member-identity{display:grid;gap:.06rem;min-width:0}\n.member-directory-009b .m019-member-identity strong{font-size:1rem;line-height:1.25}\n.member-directory-009b .m019-member-identity small{font-size:.8rem;color:#666;overflow-wrap:anywhere}\n.member-directory-009b .m019-member-categories{max-width:35%;font-size:.74rem;text-align:right;color:#535c63}\n.member-directory-009b .m019-pager{display:flex;gap:.6rem;align-items:center;margin:.8rem 0}\n@media(max-width:460px){.member-directory-009b .m019-filters{grid-template-columns:minmax(0,1fr)}.member-directory-009b .m019-member-categories{display:none}.member-directory-009b .m019-filter-search .btn{padding:.5rem}}\n\n/* M020-B: one compact settings area, native calendar and touch targets. */\n.m020-settings,.celebration-publication-controls{display:flex;flex-wrap:wrap;align-items:start;gap:.6rem;padding:.75rem;border:1px solid #ddd;border-radius:10px;margin-bottom:.8rem}\n.m020-settings>strong{flex-basis:100%}.m020-settings select,.celebration-publication-controls select{min-height:44px;max-width:100%;font:inherit}\n.m020-access{display:grid;gap:.4rem;min-width:0}.m020-access fieldset{border:0;margin:0;padding:.3rem}.m020-access fieldset label{display:flex;align-items:center;gap:.4rem;min-height:36px}\n.m020-access [hidden]{display:none!important}.m020-settings .publication-status-controls{display:flex;flex-wrap:wrap;gap:.4rem;align-items:end}\n@media(max-width:600px){.m020-settings>*,.celebration-publication-controls>*{max-width:100%}.m020-settings .editor-language-choice{min-width:0}.m020-access{flex:1 1 100%}.m020-settings button{min-height:44px}}\n\n/* M021-A: simple, clearly marked disposable accounts in M016 only. */\n.member-directory-009b .m021-demo-members{padding:1rem;margin:1rem 0;border:1px solid #c1d0d8;background:#f8fafb;border-radius:12px}\n.m021-demo-members>p{max-width:66ch;color:#374957}\n.m021-demo-members .m021-demo-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:.7rem}\n.m021-demo-members .m021-demo-form fieldset{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.6rem;border:1px solid #ccd6db;border-radius:9px}\n.m021-demo-members .m021-demo-form fieldset label{display:flex;gap:.5rem;align-items:center;min-height:40px}\n.m021-demo-members .m021-demo-form>.btn{grid-column:1/-1;justify-self:start;min-height:44px}\n.m021-demo-list{display:grid;gap:.45rem;margin:1rem 0}\n.m021-demo-row{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;border-top:1px solid #dde5e7;padding:.65rem 0;min-width:0}\n.m021-demo-row strong{flex:1 1 130px}.m021-demo-row small{flex:1 1 180px;overflow-wrap:anywhere}\n.m021-demo-row .btn{min-height:42px}\n@media(max-width:500px){.m021-demo-members .m021-demo-form{grid-template-columns:1fr}.m021-demo-row>*{flex-basis:100%}}\n\n.member-session-box{padding:1rem;margin:0 0 1rem;border:1px solid #ddd;border-radius:.5rem}\n.member-session-box form{display:flex;align-items:end;gap:.5rem;flex-wrap:wrap}\n.member-session-box input{max-width:100%;min-height:44px}\n.member-session-box [hidden]{display:none!important}\n"};
})();

(async()=>{'use strict';
const __name=(fn,name)=>{Object.defineProperty(fn,'name',{value:name,configurable:true});return fn};
function createEditorState({STAGE_SEED,KEY,seed,clone,storage,search}){
if(STAGE_SEED)seed.pages=STAGE_SEED.pages;
let db;try{db=JSON.parse(storage.getItem(KEY)||'null')}catch{}
if(!db||!Array.isArray(db.pages))db=clone(seed);
if(STAGE_SEED){
 // Existing local edits take precedence; old historical pages are appended.
 for(const archived of seed.pages)
  if(!db.pages.some(p=>p.id===archived.id))db.pages.push(clone(archived));
 for(const official of seed.pages){
  const previous=db.pages.find(p=>p.id===official.id);
  if(!previous)continue;
  if(official.id.startsWith('apres-celebration-')&&previous.name==='Après préparation')
   previous.name='Après célébration';
  if(official.id.startsWith('accueil-celebration-')){
   for(const extra of official.blocks.filter(b=>Number(b.id)>100000))
    if(!previous.blocks.some(b=>b.id===extra.id))previous.blocks.push(clone(extra));
  }
 }
}
const stageTab=STAGE_SEED&&new URLSearchParams(search).get('tab')==='pages'?'pages':'celebrations';
const stageRequest=String(new URLSearchParams(search).get('page'));
const stageActive=STAGE_SEED?(seed.pages.find(p=>
 p.id===stageRequest+'-'+STAGE_SEED.celebrationId||p.id===stageRequest)||
 seed.pages.find(p=>p.group==='celebration')||seed.pages[0]):null;
return {db,stageTab,stageActive};
}

function createEditorLocalRules(){
function validIso(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return false;
 const [y,m,d]=value.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;
}

function prettyDate(iso){
 if(!validIso(iso))return '';
 const [year,month,day]=iso.split('-');
 return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(Number(year),Number(month)-1,Number(day))));
}

function validTime(value){return typeof value==='string'&&/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)}

function validHref(raw){const s=String(raw||'').trim();if(!s||s.includes('\\'))return false;if(s.startsWith('/')&&!s.startsWith('//'))return true;try{return new URL(s).protocol==='https:'}catch{return false}}

function validColor(c){return typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)}

return {validIso,prettyDate,validTime,validHref,validColor};
}

function renderEditorFrame(ctx){
 const {IS_STAGE,document,STAGE_SEED,page,pageSlug,stateOfPage,editorDragState,editorDragFinish,undoAnchor,resetUndoHistory,ensureUndoButton,applyPalette,w,tab,preview,el,pages,footerPages,celebrations,media,userGuide,settings,memberSpaces}=ctx;
 if(IS_STAGE){
  const see=document.getElementById('view-site-btn');
  if(see){
   const current=page(),stage=pageSlug(current);
   see.href='/__editor/voir-le-site?celebration='+encodeURIComponent(STAGE_SEED.celebrationId)+'&page='+encodeURIComponent(stage);
   see.hidden=!current||stateOfPage(current)!=='published';
   see.title=see.hidden?'Page en brouillon : utilisez Aperçu ou Publier cette page.':'Voir la page publiée';
  }
 }
 if(editorDragState)editorDragFinish(editorDragState,false);
 if(undoAnchor===null)resetUndoHistory();
 ensureUndoButton();
 const shell=document.querySelector('.stage-editor');
 if(shell){const general=page()?.group==='page';shell.classList.toggle('is-neutral',general);shell.classList.toggle('is-celebration',!general);
}
 applyPalette();w.replaceChildren();document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));el('preview-btn').textContent=preview?'Revenir à l’édition':'Aperçu du brouillon';if(tab==='pages')pages();else if(tab==='footer')footerPages();else if(tab==='celebrations')celebrations();else if(tab==='media')media();else if(tab==='guide')userGuide();else if(['members-spaces','participants','languages-categories'].includes(tab)&&memberSpaces)memberSpaces();else settings();}

function bindEditorShell({document,window,el,enter,onPreview,isPreview,deselect,shouldWarnBeforeUnload}){
 document.querySelectorAll('[data-tab]').forEach(x=>x.onclick=()=>enter(x.dataset.tab));
 el('preview-btn').onclick=onPreview;
document.addEventListener('pointerdown',e=>{
 // Keep the selected block while tapping any section toolbar. On touch
 // devices, deselecting here reflows the editor between pointerdown and
 // pointerup; the green + then never receives the click event.
 if(isPreview()||e.target.closest('dialog,.block,.section-column-actions,.section-root-actions,.section-insert,.section-element-menu,.existing-block-add,.section-settings'))return;
 deselect();
});
window.addEventListener('beforeunload',e=>{
 if(shouldWarnBeforeUnload()){e.preventDefault();e.returnValue=''}
});
}

function createBlockModel(){
 const styleDefaults=()=>({border:'none',color:'#d7dde5',shadow:false,width:1});
 function createContent(kind,id,starterText={}){
  const names={heading:'Nouveau titre',text:'Votre paragraphe',button:'Mon bouton',
   event:'Titre de l’événement',video:'',image:'',audio:'MP3 à choisir'};
  if(kind==='divider')return {id,kind:'divider',color:'#858c94',thickness:1,widthPct:60};
  const created={id,kind,align:'left',text:starterText[kind]?'':(names[kind]||''),href:'',src:''};
  if(kind==='button')created.displayAsButton=true;
  return created;
 }
 function createSection(id,layout,columns,extra={}){
  // Keep the original child objects without copying or changing rich/media fields.
  return {id,kind:'section',layout,columns,...extra,style:styleDefaults()};
 }
 function createResourcePreset(kind,id,create){
  let columns,layout,presentation;
  if(kind==='video'){
   presentation='video';layout='single';columns=[[create('heading'),create('video')],[]];
  }else if(kind==='documents'){
   presentation='documents';layout='single';columns=[[create('heading'),create('button')],[]];
  }else{
   presentation='resource';layout='columns';
   columns=[[create('image')],[create('heading'),create('text'),create('button')]];
  }
  const section=createSection(id,layout,columns,{
   presentation,columnAlignments:kind==='resource'?['center','center']:['top','top']});
  return {section,selectedIndex:layout==='columns'?1:0};
 }
 function duplicateData(existing,id,clone){
  const copied=clone(existing);copied.id=id;return copied;
 }
 function sectionStyle(section,validColor){
  const st=section.style&&typeof section.style==='object'?section.style:{};
  return {border:['none','round','square'].includes(st.border)?st.border:'none',
   color:validColor(st.color)?st.color:'#d7dde5',
   width:[1,2,3,4,5].includes(Number(st.width))?Number(st.width):1,shadow:!!st.shadow};
 }
 function patchSectionStyle(section,patch,validColor){
  const existing=section.style&&typeof section.style==='object'&&!Array.isArray(section.style)
   ?section.style:{};
  return {...existing,...sectionStyle(section,validColor),...patch};
 }
 function columnVerticalAlign(section,index){
  const value=section.columnAlignments?.[index];
  return ['top','center','bottom'].includes(value)?value:
   section.presentation==='resource'?'center':'top';
 }
 function columnButtonLayout(section,index){
  return section.columnButtonLayouts?.[index]==='row'?'row':'stack';
 }
 function nextLayout(layout){return layout==='columns'?'single':'columns'}
 return {createContent,createSection,createResourcePreset,duplicateData,sectionStyle,
  patchSectionStyle,columnVerticalAlign,columnButtonLayout,nextLayout};
}

function createEditorBlockCommands({model}){
 function duplicateInContainer(existing,items,id,clone){
  const index=items.indexOf(existing);if(index<0)return null;
  const copy=model.duplicateData(existing,id,clone);
  items.splice(index+1,0,copy);return copy;
 }
 function wrapRootBlock(page,original,added,id){
  const index=page.blocks.indexOf(original);if(index<0)return null;
  const section=model.createSection(id,'single',[[original,added],[]]);
  page.blocks.splice(index,1,section);return section;
 }
 return {duplicateInContainer,wrapRootBlock};
}

function createMediaCatalogue({validHref}){
 const categories=[['images','Images'],['pdf','PDF'],['audios','Audios'],['videos','Vidéos'],['autres','Autres']];
 const supported=new Set(categories.map(row=>row[0]));
 function categoryOfLocal(record){
  const type=String(record.type||'').toLowerCase(),name=String(record.name||'').toLowerCase();
  if(type.startsWith('image/')||/\.(?:png|jpg|jpeg|gif|webp|svg|avif)$/.test(name))return 'images';
  if(type==='application/pdf'||/\.pdf$/.test(name))return 'pdf';
  if(type.startsWith('audio/')||/\.(?:mp3|wav|m4a|ogg|opus|flac)$/.test(name))return 'audios';
  if(type.startsWith('video/')||/\.(?:mp4|webm|mov|ogv)$/.test(name))return 'videos';
  return 'autres';
 }
 function mediaCategoryOf(record){
  return ({image:'images',video:'videos',pdf:'pdf',audio:'audios',file:'autres',link:'links'})[record.type]||'autres';
 }
 function publicFiles(files){
  return Array.isArray(files)?files.filter(record=>record&&
   supported.has(record.category)&&typeof record.name==='string'&&
   /^\/media\/(?!.*\.\.)[^?#]+$/i.test(String(record.src||''))):[];
 }
 function fileKey(record){
  return String(record.category)+':'+String(record.src||record.remoteKey||record.assetId||record.id);
 }
 function fileUses(record){
  return (record.uses||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')||a.pageName.localeCompare(b.pageName,'fr'));
 }
 function pickerItems(historical,remote){
  const entries=new Map();
  const add=(record,type)=>{
   const src=String(record?.src||'').trim();
   if(!validHref(src))return;
   const category=supported.has(type)?type:'autres';
   const name=String(record.name||src.split('/').at(-1)||'Fichier').slice(0,200);
   if(!entries.has(src))entries.set(src,{src,name,category});
  };
  for(const record of historical||[])add(record,record.category);
  for(const record of remote||[])add(record,mediaCategoryOf(record));
  return [...entries.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 }
 function imageItems({historical,pages,globalMedia,fileRecords,assetUrls}){
  const entries=new Map(),pageImages=[];
  for(const file of historical||[])if(file?.category==='images'&&
   /^\/media\//.test(String(file.src||''))&&file.src&&!entries.has(file.src))
   entries.set(file.src,{name:file.name,src:file.src});
  function gather(blocks){
   for(const item of blocks||[]){
    if(item?.kind==='image'&&typeof item.src==='string'&&item.src)
     pageImages.push({src:item.src,name:item.text||'Image'});
    if(item?.kind==='section')for(const col of item.columns||[])gather(col);
   }
  }
  for(const page of pages||[])gather(page.blocks);
  for(const image of pageImages)if(image.src&&!entries.has(image.src))
   entries.set(image.src,{name:image.name,src:image.src});
  for(const item of globalMedia||[])if(item.type==='image'&&item.src&&!entries.has(item.src))
   entries.set(item.src,{name:item.name,src:item.src});
  const local=[];
  for(const item of fileRecords||[])if(categoryOfLocal(item)==='images')
   local.push({name:item.name,src:assetUrls.get(item.id)||'',assetId:item.id});
  return {entries:[...entries.values()],local};
 }
 function libraryCollections(historical,fileRecords,globalMedia){
  // Same three source families as before: R2/D1 historical, local IndexedDB,
  // server mediaCatalogue. Historical URLs take display precedence.
  const local=[...fileRecords].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const remote=(globalMedia||[]).filter(item=>['image','pdf','audio','video','file'].includes(item?.type));
  const usedUrls=new Set(historical.map(item=>item.src));
  const countFor=category=>historical.filter(item=>item.category===category).length+
   local.filter(item=>categoryOfLocal(item)===category).length+
   remote.filter(item=>mediaCategoryOf(item)===category&&!usedUrls.has(item.src)).length;
  return {local,remote,usedUrls,countFor};
 }
 function makeLibraryBlock(record,time,id){
  const category=record.category,kind=category==='images'?'image':category==='audios'?'audio':
   category==='videos'?'video':category==='autres'&&typeof record.text==='string'?'text':'button';
  const block={id,kind,align:'left',
   text:kind==='text'?record.text:kind==='button'?'Ouvrir : '+record.name:record.name};
  if(record.remoteKey)block.remoteKey=record.remoteKey;
  else if(record.assetId)block.assetId=record.assetId;
  else if(kind==='image'||kind==='audio')block.src=record.src;
  else if(kind==='button'||kind==='video')block.href=record.src;
  if(time)block.atTime=time;
  return block;
 }
 return {categories,categoryOfLocal,mediaCategoryOf,publicFiles,fileKey,fileUses,
  pickerItems,imageItems,libraryCollections,makeLibraryBlock};
}

function createEditorMediaCommands(){
 function chooseFile(block,file,choosingVideo){
  if(choosingVideo&&file.category!=='videos')return false;
  block.href=file.src;delete block.assetId;
  if(choosingVideo){
   // Never change the kind of a video block or discard its existing title.
   if(!String(block.text||'').trim())
    block.text=file.name.replace(/\.(?:mp4|webm|ogv|ogg)(?:[?#].*)?$/i,'');
  }else{
   block.displayAsButton=true;delete block.cover;delete block.coverAssetId;
   if(!String(block.text||'').trim()||['Mon bouton','Découvrir le programme'].includes(block.text))
    block.text='Ouvrir : '+file.name;
  }
  return true;
 }
 function chooseImage(block,source,cover=false){
  if(cover){block.cover=source.src||'';block.coverAssetId=source.assetId||''}
  else{block.src=source.src||'';block.assetId=source.assetId||''}
  return block;
 }
 return {chooseFile,chooseImage};
}

function createPageModel(){
 const visibilityLabels={draft:'Brouillon',published:'Publiée',hidden:'Masquée'};
 const fixedStages=['accueil-celebration','preparation','mercredi','jeudi','vendredi',
  'samedi','dimanche','apres-celebration'];
 const plannedPattern=/^plan-(michael|gabriel|raphael|ouriel)-\d{4}-\d{2}-\d{2}$/;
 function pageSlug(page,celebrationId){
  if(!page)return '';
  if(page.group==='page')return page.id;
  const suffix='-'+String(celebrationId||'');
  return suffix!=='-'&&String(page.id).endsWith(suffix)?
   String(page.id).slice(0,-suffix.length):
   String(page.id).slice(0,String(page.id).lastIndexOf('-'));
 }
 function groupPages(pages,group){
  // Never sort: the editor's existing stored order is the only authority.
  return (pages||[]).filter(page=>group==='footer'?
   page.group==='page'&&page.placement==='footer':
   group==='page'?page.group==='page'&&page.placement!=='footer':
   page.group===group);
 }
 function activePageId(pages,group,currentId){
  const visible=groupPages(pages,group);
  return visible.some(p=>p.id===currentId)?currentId:visible[0]?.id??currentId;
 }
 function createPage(group,name,uid,celebrationId){
  const isCelebration=group==='celebration';
  return {
   id:isCelebration?'extra-'+uid+'-'+String(celebrationId||'demo'):'neutral-'+uid,
   name,group:group==='footer'?'page':group,
   ...(group==='footer'?{placement:'footer'}:{}),visibility:'draft',
   blocks:[{id:1,kind:'heading',text:name,align:'center'}]
  };
 }
 function removablePage(page,celebrationId){
  const suffix='-'+String(celebrationId||'');
  const general=page?.group==='page'&&/^neutral-[0-9a-f-]{30,45}$/.test(page.id);
  const extra=page?.group==='celebration'&&
   /^extra-[0-9a-f-]{30,45}-/.test(page.id)&&page.id.endsWith(suffix);
  return {allowed:!!(general||extra),general:!!general};
 }
 function pageVisibility(page){
  // Legacy pages without 'visibility' were public. Never expose actual
  // draft/hidden pages merely because of the refactor.
  return Object.hasOwn(visibilityLabels,page?.visibility)?page.visibility:'published';
 }
 function celebrationVisibility(entry,shared={}){
  const current=shared[entry.id]||entry.visibility;
  return Object.hasOwn(visibilityLabels,current)?current:
   String(entry.id||'').startsWith('plan-')?'draft':'published';
 }
 function publicationIntent(kind,item,visibility){
  if(!Object.hasOwn(visibilityLabels,visibility))return null;
  return kind==='page'?{kind:'page',pageId:item.id,visibility}:
   {kind:'celebration',visibility};
 }
 function editorUrl(celebrationId){
  return '/__editor/demo-preparation?celebration='+encodeURIComponent(celebrationId)+'&tab=celebrations';
 }
 function validPlannedId(id){return typeof id==='string'&&plannedPattern.test(id)}
 function plannedEntry(id,archangel,date,title,customTitle){
  return {id,archangel,date,year:date.slice(0,4),title:title.slice(0,100),
   customTitle,kind:'planned',visibility:'draft'};
 }
 function validSharedPage(page){
  return page?.group==='page'&&Array.isArray(page.blocks)&&
   (page.id==='neutral-accueil-general'||/^neutral-[0-9a-f-]{30,45}$/.test(page.id));
 }
 return {visibilityLabels,fixedStages,pageSlug,groupPages,activePageId,createPage,
  removablePage,pageVisibility,celebrationVisibility,publicationIntent,
  editorUrl,validPlannedId,plannedEntry,validSharedPage};
}

function createEditorPageCommands({model}){
 function restoreSharedPages(db,saved){
  if(!Array.isArray(saved?.pages))return false;
  const clean=saved.pages.filter(model.validSharedPage);
  if(!clean.length)return false;
  db.pages=db.pages.filter(p=>p.group!=='page').concat(clean);
  db.siteHomeId=clean.some(p=>p.id===saved.homeId)?saved.homeId:clean[0].id;
  return true;
 }
 function sharedSnapshot(db,before={}){
  return {...before,pages:db.pages.filter(p=>p.group==='page'),
   homeId:db.siteHomeId||'neutral-accueil-general',
   deletedPageIds:Array.isArray(before.deletedPageIds)?before.deletedPageIds:[],
   celebrationVisibility:before.celebrationVisibility||{}};
 }
 function moveGeneralPage(db,page,direction){
  const general=model.groupPages(db.pages,page.placement==='footer'?'footer':'page'),
   index=general.indexOf(page),other=general[index+direction];
  if(index<0||!other)return false;
  const a=db.pages.indexOf(page),b=db.pages.indexOf(other);
  db.pages[a]=other;db.pages[b]=page;return true;
 }
 // Rename user-created pages without changing stable public URL, ID, rights
 // or status. Fixed historical celebration stages keep their canonical names.
 function renameEditablePage(db,page,name,celebrationId){
  if(!db?.pages?.includes(page)||!model.removablePage(page,celebrationId).allowed)
   return {ok:false,error:'Cette page historique conserve son nom.'};
  const value=typeof name==='string'?name.trim():'';
  if(!value||value.length>95)
   return {ok:false,error:'Saisissez un nom de page de 1 à 95 caractères.'};
  const group=page.placement==='footer'?'footer':page.group;
  if(model.groupPages(db.pages,group).some(other=>other!==page&&
     other.name.trim().toLocaleLowerCase('fr')===value.toLocaleLowerCase('fr')))
   return {ok:false,error:'Une page porte déjà ce nom.'};
  const previous=page.name;
  if(previous===value)return {ok:true,changed:false};
  page.name=value;
  // Only update a generated heading, never an independently edited title.
  for(const block of page.blocks||[])
   if(block.kind==='heading'&&block.text===previous)block.text=value;
  return {ok:true,changed:true};
 }
 function deletionPlan(db,page,celebrationId){
  if(!page||!db.pages.includes(page))return {allowed:false,general:false,siblings:[]};
  const {allowed,general}=model.removablePage(page,celebrationId);
  const siblings=model.groupPages(db.pages,page.placement==='footer'?'footer':page.group)
   .filter(p=>p!==page);
  // A footer can be empty. Other sections retain their existing last-page guard.
  return {allowed:allowed&&(page.placement==='footer'||siblings.length>0),general,siblings};
 }
 function removeConfirmedPage(db,page,currentId,plan){
  // Never call this before the caller has hidden a published page on the server.
  if(!plan?.allowed||!db.pages.includes(page))return null;
  if(plan.general&&db.siteHomeId===page.id)
   db.siteHomeId=plan.siblings.find(p=>p.id==='neutral-accueil-general')?.id||plan.siblings[0].id;
  db.pages=db.pages.filter(p=>p!==page);
  return currentId===page.id?(plan.siblings[0]?.id||db.siteHomeId||'neutral-accueil-general'):currentId;
 }
 function rememberDeletedPage(before,pageId){
  return [...new Set([...(Array.isArray(before?.deletedPageIds)?before.deletedPageIds:[]),pageId])].slice(-100);
 }
 return {restoreSharedPages,sharedSnapshot,moveGeneralPage,renameEditablePage,
  deletionPlan,removeConfirmedPage,rememberDeletedPage};
}

function createEditorSyncPolicy(){
 const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
 function unchangedRemote(fresh,baseRecord,baseShared,basePlans,baseLocalization){
  return same(fresh.record,baseRecord)&&same(fresh.shared,baseShared)&&
   same(fresh.plans,basePlans)&&
   (arguments.length<5||same(fresh.localization??null,baseLocalization??null));
 }
 function noNewEdits(started,current){return started===current}
 function readbackConfirmed(saved,revision,pageId,record,shared,localization){
  if(!saved||!Number.isSafeInteger(revision)||!Number.isSafeInteger(saved.revision)||saved.revision<revision)return false;
  if(arguments.length>=6&&!same(saved.localization??null,localization??null))return false;
  if(!pageId)return true;
  const expected=record.pages.find(p=>p.id===pageId)||
   shared.pages.find(p=>p.id===pageId);
  const actual=saved.record?.pages?.find(p=>p.id===pageId)||
   saved.shared?.pages?.find(p=>p.id===pageId);
  // A selected page cannot be declared saved if the server lost it.
  return !!expected&&!!actual&&same(expected.blocks,actual.blocks);
 }
 return {same,unchangedRemote,noNewEdits,readbackConfirmed};
}

function createEditorDragModel({createSection}){
 function locate(p,blockId){
  const requested=String(blockId);
  for(let i=0;i<(p.blocks||[]).length;i++){
   const item=p.blocks[i];
   if(item?.kind!=='section'&&String(item?.id)===requested)
    return {array:p.blocks,index:i,block:item,sectionId:'',columnIndex:0};
   if(item?.kind==='section'){
    for(let col=0;col<2;col++){
     const array=item.columns?.[col];if(!Array.isArray(array))continue;
     const index=array.findIndex(child=>child?.kind!=='section'&&String(child?.id)===requested);
     if(index>=0)return {array,index,block:array[index],sectionId:String(item.id),columnIndex:col};
    }
   }
  }
  return null;
 }
 function move(p,blockId,sectionId='',columnIndex=0,anchorId=null,after=false){
  const source=locate(p,blockId);if(!source)return false;
  let destination=p.blocks;
  if(sectionId){
   const section=p.blocks.find(b=>b?.kind==='section'&&String(b.id)===String(sectionId));
   if(!section||!Array.isArray(section.columns?.[columnIndex]))return false;
   destination=section.columns[columnIndex];
  }
  let index=destination.length;
  if(anchorId!==null&&anchorId!==undefined){
   const i=destination.findIndex(b=>String(b?.id)===String(anchorId));
   if(i<0)return false;
   index=i+(after?1:0);
  }
  if(source.array===destination){
   if(source.index<index)index--;
   if(source.index===index)return false; // no-op: do not push an Undo entry
  }
  source.array.splice(source.index,1);
  destination.splice(index,0,source.block);
  return true;
 }
 function intoBlock(p,sourceId,targetId,after=true,createId){
  const original=locate(p,sourceId),destination=locate(p,targetId);
  if(!original||!destination||original.block===destination.block||destination.sectionId)return false;
  const moved=original.block;
  original.array.splice(original.index,1);
  const index=p.blocks.indexOf(destination.block);
  if(index<0){original.array.splice(original.index,0,moved);return false}
  const section=createSection(createId(),'single',
   [after?[destination.block,moved]:[moved,destination.block],[]]);
  p.blocks.splice(index,1,section);
  return true;
 }
 function pointerIntent(state,event){
  const distance=Math.hypot(event.clientX-state.startX,event.clientY-state.startY);
  if(state.isTouch)return distance>12?'cancel':'wait';
  return distance<6?'wait':'activate';
 }
 function pointerAllowed(event,preview){
  return !preview&&(event.pointerType!=='mouse'||event.button===0);
 }
 return {locate,move,intoBlock,pointerIntent,pointerAllowed};
}

function createEditorUndoPolicy({steps=36,bytes=6000000}={}){
 function snapshot(db){
  return JSON.stringify({pages:db.pages,siteHomeId:db.siteHomeId??null,
   celebrationDates:db.celebrationDates??null,
   celebrationTimes:db.celebrationTimes??null});
 }
 function record(stack,anchor,current,field,now,lastTyping,lastTypedAt){
  if(anchor===null)return {anchor:current,lastTyping,lastTypedAt};
  if(current===anchor)return {anchor,lastTyping,lastTypedAt};
  const continuous=!!field&&field===lastTyping&&now-lastTypedAt<1000&&stack.length>0;
  if(!continuous){
   stack.push(anchor);
   let used=stack.reduce((n,part)=>n+part.length,0);
   while(stack.length>steps||used>bytes){used-=stack.shift()?.length||0}
  }
  return {anchor:current,lastTyping:field,lastTypedAt:now};
 }
 function restorePages(previous,currentPages){
  // Remote visibility is not part of local undo, including implicit published
  // status on legacy pages. A restored deleted page is private by default.
  const visibility=new Map(currentPages.map(page=>[String(page.id),{
   defined:Object.hasOwn(page,'visibility'),value:page.visibility
  }]));
  return previous.map(page=>{
   const restored={...page},current=visibility.get(String(page.id));
   if(!current)restored.visibility='draft';
   else if(current.defined)restored.visibility=current.value;
   else delete restored.visibility;
   return restored;
  });
 }
 return {snapshot,record,restorePages};
}

const INITIAL_LANGUAGE_ID="fr";
const PREPARED_LANGUAGES=[{"id":"fr","name":"Français","flag":"🇫🇷","active":true},{"id":"en","name":"English","flag":"🇬🇧","active":true},{"id":"es","name":"Español","flag":"🇪🇸","active":true},{"id":"de","name":"Deutsch","flag":"🇩🇪","active":true},{"id":"pt","name":"Português","flag":"🇵🇹","active":true},{"id":"it","name":"Italiano","flag":"🇮🇹","active":true},{"id":"ar","name":"العربية","flag":"🌐","active":true},{"id":"zh-Hans","name":"简体中文","flag":"🌐","active":true}];
const LOCALIZABLE_FIELDS=Object.freeze(["name","title","label","description","subtitle","text","rich","blocks","documents","media","links","contentIds"]);
const LANGUAGE_ID_PATTERN=/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const LOCALIZABLE=new Set(LOCALIZABLE_FIELDS);
const copy=value=>structuredClone(value);
const hasOwn=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function requireLanguageId(id) {
  if (typeof id !== 'string' || !LANGUAGE_ID_PATTERN.test(id))
    throw new TypeError('Identifiant de langue invalide (ex. fr, en, pt-BR).');
  return id;
}
function requireLabel(value, name) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${name} doit être un texte non vide.`);
  return value;
}
function requireIdentity(entity) {
  const id = entity?.id ?? entity?.key;
  if ((typeof id !== 'string' || !id.trim()) &&
      (typeof id !== 'number' || !Number.isFinite(id)))
    throw new TypeError('Une page ou un espace doit avoir un identifiant permanent.');
  return id;
}
function assertRegistry(registry) {
  if (!registry || !Array.isArray(registry.languages) || !registry.languages.length)
    throw new TypeError('Registre des langues absent ou invalide.');
  const ids = new Set();
  for (const lang of registry.languages) {
    requireLanguageId(lang?.id);
    requireLabel(lang?.name, 'Le nom de la langue');
    if (ids.has(lang.id)) throw new Error(`Langue dupliquée : ${lang.id}`);
    if (typeof lang.active !== 'boolean') throw new TypeError('Activation invalide.');
    if (lang.flag !== undefined && typeof lang.flag !== 'string')
      throw new TypeError('Le drapeau doit être un texte ou une référence portable.');
    ids.add(lang.id);
  }
  requireLanguageId(registry.defaultLanguageId);
  if (!registry.languages.some(lang => lang.id === registry.defaultLanguageId && lang.active))
    throw new Error('La langue par défaut doit être présente et active.');
  return registry;
}
function withLanguage(registry, languageId, change) {
  assertRegistry(registry);
  requireLanguageId(languageId);
  if (!registry.languages.some(lang => lang.id === languageId))
    throw new Error(`Langue inconnue : ${languageId}`);
  const next = {...registry, languages: registry.languages.map(lang =>
    lang.id === languageId ? change({...lang}) : {...lang})};
  return assertRegistry(next);
}
function createLanguageRegistry(saved) {
  if (saved === undefined || saved === null) return {
    version: 1,
    defaultLanguageId: INITIAL_LANGUAGE_ID,
    languages: [{id: INITIAL_LANGUAGE_ID, name: 'Français', flag: '🇫🇷', active: true}]
  };
  assertRegistry(saved);
  return copy(saved);
}
function createPreparedLanguageRegistry(saved){
  const result=createLanguageRegistry(saved);
  for(const prepared of PREPARED_LANGUAGES){
    const existing=result.languages.find(l=>l.id===prepared.id);
    if(existing)existing.active=true;
    else result.languages.push({...prepared});
  }
  return result;
}
function addLanguage(registry, {id, name, flag = '', active = false}) {
  assertRegistry(registry);
  requireLanguageId(id);
  requireLabel(name, 'Le nom de la langue');
  if (typeof flag !== 'string' || typeof active !== 'boolean')
    throw new TypeError('Drapeau ou activation invalide.');
  if (registry.languages.some(lang => lang.id === id)) throw new Error(`Langue déjà présente : ${id}`);
  return {...registry, languages: [...registry.languages.map(lang => ({...lang})),
    {id, name, flag, active}]};
}
function renameLanguage(registry, languageId, name) {
  requireLabel(name, 'Le nom de la langue');
  return withLanguage(registry, languageId, lang => ({...lang, name}));
}
function setLanguageFlag(registry, languageId, flag) {
  if (typeof flag !== 'string') throw new TypeError('Le drapeau doit être un texte ou une référence portable.');
  return withLanguage(registry, languageId, lang => ({...lang, flag}));
}
function setLanguageActive(registry, languageId, active) {
  if (typeof active !== 'boolean') throw new TypeError('Activation invalide.');
  if (!active && registry.defaultLanguageId === languageId)
    throw new Error('Impossible de désactiver la langue par défaut.');
  return withLanguage(registry, languageId, lang => ({...lang, active}));
}
function setDefaultLanguage(registry, languageId) {
  assertRegistry(registry);
  if (!registry.languages.some(lang => lang.id === languageId && lang.active))
    throw new Error('La nouvelle langue par défaut doit exister et être active.');
  return {...registry, defaultLanguageId: languageId};
}
function selectLanguage(registry, requestedLanguageId) {
  assertRegistry(registry);
  const languageId = registry.languages.some(lang => lang.id === requestedLanguageId && lang.active)
    ? requestedLanguageId : registry.defaultLanguageId;
  return {requestedLanguageId: requestedLanguageId ?? null, languageId,
    usedFallback: requestedLanguageId !== languageId};
}
function validateContent(content, page) {
  if (!content || typeof content !== 'object' || Array.isArray(content))
    throw new TypeError('Une variante est un objet de contenu.');
  const keys = Object.keys(content);
  if (!keys.length || keys.some(key => !LOCALIZABLE.has(key)))
    throw new TypeError('La variante ne peut modifier que les champs éditoriaux.');
  if (page && (typeof content.name !== 'string' || !Array.isArray(content.blocks)))
    throw new TypeError('Une variante de page exige son nom et ses blocs complets.');
  if (hasOwn(content, 'blocks') && !Array.isArray(content.blocks))
    throw new TypeError('Les blocs doivent être une liste.');
  return copy(content);
}
function sourceLanguageOf(entity, registry) {
  const source = entity?.sourceLanguageId ?? INITIAL_LANGUAGE_ID;
  requireLanguageId(source);
  if (!registry.languages.some(lang => lang.id === source))
    throw new Error(`Langue du contenu original inconnue : ${source}`);
  return source;
}
function sourceContent(entity) {
  const result = {};
  for (const field of LOCALIZABLE_FIELDS)
    if (hasOwn(entity, field)) result[field] = copy(entity[field]);
  return result;
}
function withVariant(entity, registry, languageId, content, page) {
  requireIdentity(entity);
  assertRegistry(registry);
  requireLanguageId(languageId);
  if (!registry.languages.some(lang => lang.id === languageId))
    throw new Error(`Langue inconnue : ${languageId}`);
  if (languageId === sourceLanguageOf(entity, registry))
    throw new Error('Le contenu original reste dans les champs historiques ; ne pas le déplacer.');
  const variant = validateContent(content, page);
  return {...entity, translations: {...(entity.translations ?? {}), [languageId]: variant}};
}
function resolveVariant(entity, registry, requestedLanguageId) {
  const id = requireIdentity(entity);
  const selection = selectLanguage(registry, requestedLanguageId);
  const sourceId = sourceLanguageOf(entity, registry);
  const isActive = languageId => registry.languages.some(lang => lang.id === languageId && lang.active);
  const available = languageId => {
    if (!isActive(languageId)) return null;
    if (languageId === sourceId) return sourceContent(entity);
    if (!hasOwn(entity.translations ?? {}, languageId)) return null;
    const value = entity.translations[languageId];
    return value && typeof value === 'object' && !Array.isArray(value) ? copy(value) : null;
  };
  // Requested language > configured default > original legacy language.
  // Never splice missing translated fields from another language: blocks,
  // documents and media are a single independent version.
  for (const languageId of new Set([selection.languageId, registry.defaultLanguageId, sourceId])) {
    const content = available(languageId);
    if (content !== null) return {id, requestedLanguageId: selection.requestedLanguageId,
      languageId, usedFallback: languageId !== requestedLanguageId, content};
  }
  return null; // No active language has content: caller must not invent a version.
}
function setPageTranslation(page, registry, languageId, content) {
  return withVariant(page, registry, languageId, content, true);
}
function resolvePageTranslation(page, registry, requestedLanguageId) {
  return resolveVariant(page, registry, requestedLanguageId);
}
function setCelebrationSpaceTranslation(space, registry, languageId, content) {
  return withVariant(space, registry, languageId, content, false);
}
function resolveCelebrationSpaceTranslation(space, registry, requestedLanguageId) {
  return resolveVariant(space, registry, requestedLanguageId);
}
function projectPageMenu(pages, registry, requestedLanguageId) {
  if (!Array.isArray(pages)) throw new TypeError('La liste des pages est invalide.');
  const seen = new Set(), menu = [];
  for (const page of pages) {
    const id = requireIdentity(page), key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    const resolved = resolvePageTranslation(page, registry, requestedLanguageId);
    if (!resolved) continue;
    menu.push({pageId: id, name: resolved.content.name ?? '',
      group: page.group, placement: page.placement,
      languageId: resolved.languageId, usedFallback: resolved.usedFallback});
  }
  return menu;
}
const modalStyle=document.createElement('style');modalStyle.nonce=document.querySelector('script[nonce]')?.nonce||'';modalStyle.textContent=M012B.css;document.head.append(modalStyle);
const siteDialog=options=>M012B.dialog(document,options);
const siteConfirm=message=>siteDialog({message}).then(Boolean);
const sitePrompt=(message,value='')=>siteDialog({title:message,fields:[{name:'value',label:'',value,required:true}]}).then(r=>r?.value??null);
const siteNotice=message=>{void siteDialog({title:'Information',message:String(message),confirm:'Fermer'});};
const STAGE_SEED=window.__PREPARATION_SEED__||null;
const KEY=STAGE_SEED?'celebrations-demo-preparation-'+String(STAGE_SEED.celebrationId):'ej-original-editor-v1';
const seed={"pages":[{"id":"accueil","name":"Accueil","group":"page","placement":"menu","visibility":"published","blocks":[]}]};
const clone=o=>JSON.parse(JSON.stringify(o));
await window.EJBridge?.prepare?.(KEY,seed);
const localEditorState=createEditorState({STAGE_SEED,KEY,seed,clone,storage:localStorage,search:location.search});
let db=localEditorState.db;
const {stageTab,stageActive}=localEditorState;
let tab=STAGE_SEED?stageTab:'pages',id=stageActive?.id||'home',
 dirty=false,preview=false,target=null,imageCoverTarget=false,selectedBlockId=null,mediaCategory='images';

const LIVE_MEDIA_UPLOAD_HOST=(location.hostname==='ronde-des-archanges-universelle.eu'||location.hostname==='www.ronde-des-archanges-universelle.eu'||location.hostname==='celebrations-m016-admin-preprod.rondes.workers.dev');
const IS_STAGE=!!STAGE_SEED,SHARED_KEY='ej-original-shared-pages-v1',PLANS_KEY='celebrations-demo-planned-v1';
// M021-B: a persisted DISPLAY preference, never a permission or publication policy.
let adminMembersEnabled=false,adminModeLoaded=false,adminModeRevision=null;
// M028: browser-only display preference. No server writes or content changes.
const LANGUAGE_TOOLS_PREF='celebrations-admin-show-language-tools-v1';
let adminLanguagesVisible=false;
try{adminLanguagesVisible=localStorage.getItem(LANGUAGE_TOOLS_PREF)==='1'}catch{}
async function loadAdminMode(){
 if(!IS_STAGE)return;
 try{
  const response=await fetch('/api/site-identity',{credentials:'same-origin',cache:'no-store'});
  const data=await response.json();
  if(!response.ok||data.ok!==true||!Number.isSafeInteger(data.revision))throw Error(data.error||'Réglages indisponibles');
  adminMembersEnabled=data.memberAccessUiEnabled===true;
  adminModeRevision=data.revision;adminModeLoaded=true;
 }catch{adminModeLoaded=false;adminMembersEnabled=false;}
}
function applyAdminMenu(){
 if(!IS_STAGE)return;
 const memberLink=document.querySelector('[data-tab="members-spaces"]');
 if(memberLink)memberLink.hidden=!adminMembersEnabled;
 const languagesLink=document.querySelector('[data-tab="languages-categories"]');
 if(languagesLink){
  // Categories stay accessible in complete mode. Language tools move into Settings.
  languagesLink.hidden=!adminMembersEnabled;
  languagesLink.style.display=adminMembersEnabled?'':'none';
  languagesLink.textContent='◇ Catégories';
 }
}
const {validIso,prettyDate,validTime,validHref,validColor}=createEditorLocalRules();
const ARCHANGELS=['Michaël','Gabriel','Raphaël','Ouriel'];
const editorPageModel=createPageModel();
const editorPageCommands=createEditorPageCommands({model:editorPageModel});
const editorSyncPolicy=createEditorSyncPolicy();
// M004: page translations are private editor drafts, never public snapshots.
const LOCALIZATION_KEY='celebrations-demo-localization-v1';
const emptyLocalization=()=>({registry:createPreparedLanguageRegistry(),pages:{}});
function normalizeLocalization(saved){
 if(!saved)return emptyLocalization();
 const registry=createPreparedLanguageRegistry(saved.registry);
 const pages=saved.pages&&typeof saved.pages==='object'&&!Array.isArray(saved.pages)?clone(saved.pages):{};
 return {registry,pages};
}
let editorLocalization;
try{editorLocalization=normalizeLocalization(JSON.parse(localStorage.getItem(LOCALIZATION_KEY)||'null'))}
catch{editorLocalization=emptyLocalization()}
let celebrationMetadata={};
let editingLanguageId='fr',localeView=null,localeCanonical=null,localeLangId=null;
function clearLocaleView(){localeView=null;localeCanonical=null;localeLangId=null}
function saveLocalizationLocal(){localStorage.setItem(LOCALIZATION_KEY,JSON.stringify(editorLocalization))}
function localizedLabel(p){
 if(!['page','celebration'].includes(p?.group)||editingLanguageId==='fr')return p?.name||'';
 return editorLocalization.pages[p.id]?.[editingLanguageId]?.name||p.name;
}
const archSlug=name=>String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function cycleYear(entry){
 const str=String(entry?.title||entry?.year||entry?.date||'');
 const years=[...str.matchAll(/20\d{2}/g)].map(m=>Number(m[0]));
 return years.length?years.at(-1):2027;
}
function suggestedCycleYear(previous,next){
 const end=cycleYear(previous);
 // Gabriel straddles New Year, so the next Raphaël belongs to its END year.
 return next==='Raphaël'?end:end;
}
function canonicalTitle(archangel,year){
 const n=Math.max(2020,Math.min(2100,Number(year)||2027));
 return archangel+' '+(archangel==='Gabriel'?n+'-'+(n+1):n);
}
function proposedTitle(archangel,date,previous){
 const d=String(date||'');
 let year=/^20\d{2}-\d{2}-\d{2}$/.test(d)?Number(d.slice(0,4)):Number(String(previous?.year||'').slice(0,4))||2027;
 // The archangel cycle does not jump forward one year at Raphaël→Ouriel or Ouriel→Michaël.
 if(previous){
  const expected=suggestedCycleYear(previous,archangel);
  if(archangel==='Raphaël'&&previous.archangel==='Gabriel')year=cycleYear(previous);
  else if(['Ouriel','Michaël','Gabriel'].includes(archangel) &&
    ((previous.archangel==='Raphaël'&&archangel==='Ouriel')||
     (previous.archangel==='Ouriel'&&archangel==='Michaël')||
     (previous.archangel==='Michaël'&&archangel==='Gabriel')))year=Number(String(previous.title||previous.year||'').match(/20\d{2}/)?.[0])||expected;
 }
 return canonicalTitle(archangel,year);
}
function celebrationLabel(entry){
 return String(entry?.title||'').trim()||canonicalTitle(entry.archangel,entry.year||String(entry.date||'').slice(0,4));
}
function currentDateForDraft(entry){
 if(!entry)return '';
 if(entry.id===String(window.__PREPARATION_SEED__?.celebrationId))return currentDates().wednesday||entry.date||'';
 try{
  const saved=JSON.parse(localStorage.getItem('celebrations-demo-preparation-'+entry.id)||'null');
  return saved?.celebrationDates?.wednesday||entry.date||'';
 }catch{return entry.date||''}
}
function savePlannedTitle(id,title){
 const value=String(title||'').trim().slice(0,100);
 if(!value)return false;
 const rows=plannedEntries(),entry=rows.find(x=>x.id===id);
 if(!entry)return false;
 entry.title=value;entry.customTitle=true;
 try{localStorage.setItem(PLANS_KEY,JSON.stringify(rows));return true}catch{return false}
}
function plannedEntries(){
 try{
  const values=JSON.parse(localStorage.getItem(PLANS_KEY)||'[]');
  if(!Array.isArray(values))return [];
  const drafts=values.filter(p=>p&&editorPageModel.validPlannedId(p.id)).slice(0,100);
  // Correct the old automatic Ouriel 2028 after Raphaël 2027, while leaving
  // explicitly user-edited titles untouched. This never silently changes a date.
  for(let i=0;i<drafts.length;i++){
   const p=drafts[i];if(p.customTitle&&p.title)continue;
   const prev=drafts[i-1]||null;
   p.title=proposedTitle(p.archangel,p.date,prev);
  }
  return drafts;
 }catch{return []}
}
function celebrationEntries(){
 return [...(window.__PREPARATION_SEED__?.celebrations||[]).map(p=>({id:String(p.id),archangel:String(p.archangel||''),year:String(p.year||''),kind:'historical',visibility:p.status==='draft'?'draft':'published',title:celebrationMetadata[String(p.id)]?.title||String(p.archangel||'')+' '+String(p.year||'')})),...plannedEntries()];
}
function openCelebration(ref){
 if(!celebrationEntries().some(c=>c.id===String(ref)))return;
 if(dirty){save();if(dirty)return}
 location.assign(editorPageModel.editorUrl(ref));
}
function restoreShared(){
 if(!IS_STAGE)return;
 try{
  const saved=JSON.parse(localStorage.getItem(SHARED_KEY)||'null');
  editorPageCommands.restoreSharedPages(db,saved);
 }catch{}
}
function saveShared(){
 if(!IS_STAGE)return;
 let before={};try{before=JSON.parse(localStorage.getItem(SHARED_KEY)||'{}')}catch{}
 localStorage.setItem(SHARED_KEY,JSON.stringify(editorPageCommands.sharedSnapshot(db,before)));
}
function validWednesday(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}

restoreShared();
// Remove only the generated, unformatted page-name heading (id 1).
// Authored headings, names, links, styles, images and paragraphs are preserved.
function isBoilerplateTitle(p,block){
 return p?.group==='celebration'&&block?.id===1&&block.kind==='heading'&&
  String(block.text||'').trim()===String(p.name||'').trim()&&
  !block.rich&&!block.bold&&!block.italic&&!block.color&&!block.size&&
  (!block.align||block.align==='center');
}
function removeBoilerplateTitles(pages){
 for(const p of pages||[])if(isBoilerplateTitle(p,p.blocks?.[0]))p.blocks.shift();
}
removeBoilerplateTitles(db.pages);
// Keep earlier edits while updating obsolete default labels / site welcome picture.
const homeMedia=window.__PREPARATION_SEED__?.pages?.find(p=>p.id==='neutral-accueil-general')?.blocks.find(b=>b.kind==='image')?.src||'';
for(const p of db.pages||[]){
 if(p.id==='apres-celebration-'+window.__PREPARATION_SEED__?.celebrationId&&p.name==='Après préparation')p.name='Après célébration';
 if(p.id==='neutral-accueil-general'&&homeMedia&&
  p.blocks?.some(b=>b.kind==='heading'&&['Accueil général','Ronde des Archanges Universelle','Bienvenue sur le site de la Ronde des Archanges Universelle'].includes(b.text))&&
  // The original welcome image may now be inside a populated section.
  // Never append a duplicate on reload when the old root image is nested.
  !p.blocks.some(b=>b.kind==='image'||(b.kind==='section'&&
    (b.columns||[]).some(col=>Array.isArray(col)&&col.some(x=>x.kind==='image'))))){
  p.blocks.push({id:99991,kind:'image',text:'Ronde des Archanges Universelle',src:homeMedia,align:'center'});
 }
}


// Dates are scoped to ONE celebration and stored alongside its local draft.
// No automatic rewriting of authored titles or historical event descriptions.
const DAY_SLUGS=['mercredi','jeudi','vendredi','samedi','dimanche'];
function dayIso(wednesday,offset){
 if(!validWednesday(wednesday)||offset<0||offset>4)return '';
 const [year,month,day]=wednesday.split('-').map(Number);
 const dt=new Date(Date.UTC(year,month-1,day+offset));
 return dt.toISOString().slice(0,10);
}
function currentDates(){
 const stored=db.celebrationDates&&typeof db.celebrationDates==='object'?db.celebrationDates:{};
 const seedDate=window.__PREPARATION_SEED__?.start_date||'';
 return {
  wednesday:Object.hasOwn(stored,'wednesday')?stored.wednesday:(validWednesday(seedDate)?seedDate:''),
  preparationDates:Array.isArray(stored.preparationDates)?stored.preparationDates.filter(x=>x===''||validIso(x)).slice(0,30):
   [stored.preparationStart,stored.preparationEnd].filter(validIso)
 };
}
// A time belongs to a particular celebration DAY, not to the entire cycle.
// Desktop and mobile: choose a quarter-hour or type any exact HH:MM.
// Unlike input[type=time], these controls do not expose the browser's awkward minute spinner.
function timeChooser(value,label,saveHour){
 const wrap=n('div','time-chooser'),title=n('span','time-label','Heure');
 const options=n('select','time-quarter-select');
 options.setAttribute('aria-label','Choisir un quart d’heure');
 const empty=n('option','','Choisir une heure');empty.value='';options.append(empty);
 const standard=new Set();
 for(let hour=0;hour<24;hour++)for(const minute of [0,15,30,45]){
  const clock=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
  const choice=n('option','',clock);choice.value=clock;options.append(choice);standard.add(clock);
 }
 const exact=validTime(value)?value:'';
 if(exact&&!standard.has(exact)){const extra=n('option','',exact+' (précis)');extra.value=exact;options.append(extra)}
 options.value=exact;
 const typed=n('input','time-exact-input');
 typed.type='text';typed.inputMode='numeric';typed.autocomplete='off';
 typed.placeholder='HH:MM';typed.maxLength=5;typed.value=exact;
 typed.setAttribute('aria-label',label);typed.title='Saisir une heure précise (ex. 18:32)';
 const normalize=raw=>{
  const match=String(raw||'').trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if(!match)return raw?null:'';
  const result=match[1].padStart(2,'0')+':'+match[2].padStart(2,'0');
  return validTime(result)?result:null;
 };
 options.onchange=()=>{
  typed.value=options.value;
  if(options.value!==exact)saveHour(options.value);
 };
 typed.oninput=()=>{if(validTime(typed.value)&&typed.value!==exact)saveHour(typed.value)};
 typed.onchange=()=>{
  const next=normalize(typed.value);
  if(next===null){siteNotice('Utilisez le format HH:MM (ex. 18:30).');typed.value=exact;return}
  typed.value=next;
  if(next!==exact)saveHour(next);
 };
 typed.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();typed.blur()}};
 wrap.append(title,options,typed);return wrap;
}
function dayTime(p){
 const slug=pageSlug(p);
 if(p?.group!=='celebration'||!DAY_SLUGS.includes(slug))return '';
 const stored=db.celebrationTimes&&typeof db.celebrationTimes==='object'?db.celebrationTimes:{};
 return validTime(stored[slug])?stored[slug]:'';
}
function updateDayTime(p,value){
 if(value&&!validTime(value)){siteNotice('Heure incorrecte.');return}
 const slug=pageSlug(p);
 if(p.group!=='celebration'||!DAY_SLUGS.includes(slug))return;
 db.celebrationTimes={...(db.celebrationTimes||{}),[slug]:value};
 mark();save();
 // The active text editor must keep its DOM while a clock field is edited.
 const summary=document.querySelector('[data-role="celebration-date"]');
 if(summary)summary.textContent=[dateSummary(p),value].filter(Boolean).join(' · ');
}
function stageDate(p){
 if(p?.group!=='celebration')return '';
 const slot=DAY_SLUGS.indexOf(pageSlug(p));
 return slot<0?'':dayIso(currentDates().wednesday,slot);
}
function dateSummary(p){
 if(p?.group!=='celebration')return '';
 const date=stageDate(p);
 if(date)return prettyDate(date);
 if(pageSlug(p)==='preparation'){
  return currentDates().preparationDates.filter(validIso).map(prettyDate).join(' · ');
 }
 return '';
}
function updateDate(key,value){
 if(value&&!validIso(value)){siteNotice('Date invalide.');return}
 const values={...currentDates(),[key]:value};
 db.celebrationDates=values;
 if(key==='wednesday'&&String(window.__PREPARATION_SEED__?.celebrationId).startsWith('plan-')){
  try{
   const drafts=plannedEntries(),entry=drafts.find(p=>p.id===String(window.__PREPARATION_SEED__.celebrationId));
   if(entry){
    entry.date=value;
    if(!entry.customTitle)entry.title=proposedTitle(entry.archangel,value,drafts[drafts.indexOf(entry)-1]);
    localStorage.setItem(PLANS_KEY,JSON.stringify(drafts));
   }
  }catch{}
 }
 mark();save();render();
}
function updatePreparationDate(index,value){
 if(value&&!validIso(value)){siteNotice('Date invalide.');return}
 const values=currentDates(),list=values.preparationDates.slice();
 if(index<0||index>29)return;
 list[index]=value;
 if(value&&list.some((x,i)=>i!==index&&x===value)){siteNotice('Cette date existe déjà.');return}
 db.celebrationDates={...values,preparationDates:list};mark();save();render();
}
function addPreparationDate(){
 const values=currentDates(),dates=values.preparationDates;
 if(dates.length>=30)return;
 db.celebrationDates={...values,preparationDates:dates.length?[...dates,'']:['','']};mark();save();render();
}
function removePreparationDate(index){
 const values=currentDates(),dates=values.preparationDates.slice();
 dates.splice(index,1);db.celebrationDates={...values,preparationDates:dates};mark();save();render();
}
// Older planned celebrations inserted a read-only date line into their page content.
// Remove only the unchanged generated line; customised text is never removed.
function removeGeneratedDates(pages){
 if(!String(window.__PREPARATION_SEED__?.celebrationId||'').startsWith('plan-'))return;
 for(const p of pages||[]){
  if(p.group!=='celebration'||!DAY_SLUGS.some(day=>p.id===day+'-'+window.__PREPARATION_SEED__.celebrationId))continue;
  const original=window.__PREPARATION_SEED__.pages.find(x=>x.id===p.id)?.blocks.find(x=>x.id===2);
  if(!original||!/^Date : \d{4}-\d{2}-\d{2}$/.test(original.text||''))continue;
  p.blocks=p.blocks.filter(x=>!(x.id===2&&x.kind==='text'&&x.text===original.text&&!x.rich&&!x.bold&&!x.italic&&!x.color&&!x.size));
 }
}
removeGeneratedDates(db.pages);
// Old unedited historical date lines can still be in local browser drafts.
for(const p of db.pages||[])for(const b of p.blocks||[]){
 if(b.kind!=='text'||b.rich)continue;
 const match=/^Dates : ([0-9]{4}-[0-9]{2}-[0-9]{2})(?:[ ]*→[ ]*([0-9]{4}-[0-9]{2}-[0-9]{2}))?$/.exec(String(b.text||''));
 if(!match||!validIso(match[1])||(match[2]&&!validIso(match[2])))continue;
 b.text=prettyDate(match[1])+(match[2]?' → '+prettyDate(match[2]):'');
}



const fileRecords=new Map(),assetUrls=new Map(),selectedImageFiles=new Set();let chosenBlock=null,mediaReturnTab='celebrations',storageReady=false;
let mediaUploadState=null;
const MAX_ASSET_BYTES=60*1024*1024;
function fileDb(){return new Promise((resolve,reject)=>{if(!window.indexedDB){reject(Error('Indisponible'));return}const q=indexedDB.open('ej-original-files-v1',1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('files'))q.result.createObjectStore('files',{keyPath:'id'})};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function fileOperation(mode,record){const database=await fileDb();try{return await new Promise((resolve,reject)=>{const tx=database.transaction('files',mode==='list'?'readonly':'readwrite'),store=tx.objectStore('files'),r=mode==='list'?store.getAll():mode==='put'?store.put(record):store.delete(record);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.onerror=()=>reject(tx.error)})}finally{database.close()}}
function rememberFile(a){const prev=assetUrls.get(a.id);if(prev)URL.revokeObjectURL(prev);fileRecords.set(a.id,a);assetUrls.set(a.id,URL.createObjectURL(a.blob))}
// Imported images live in IndexedDB, not in a page. A page only keeps the image ID.
function imageDataBlob(data){
 const m=String(data||'').match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i);
 if(!m||m[2].length>12000000)return null;
 try{
  const binary=atob(m[2]);if(binary.length>8000000)return null;
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:m[1].toLowerCase()});
 }catch{return null}
}
async function migrateEmbeddedImages(){
 // Existing trials stored direct uploads as data URLs inside the page.
 // Move each image once into the SAME local library; never erase the source on a failed write.
 const bySource=new Map(),changes=[];
 for(const p of db.pages||[])for(const block of p.blocks||[]){
  if(block.kind!=='image'||block.assetId||!String(block.src||'').startsWith('data:image/'))continue;
  let asset=bySource.get(block.src);
  if(!asset){
   const blob=imageDataBlob(block.src);
   if(!blob)continue;
   asset={id:crypto.randomUUID(),name:block.text||'Image importée',type:blob.type,size:blob.size,createdAt:new Date().toISOString(),blob};
   try{await fileOperation('put',asset);rememberFile(asset)}catch{continue}
   bySource.set(block.src,asset);
  }
  changes.push({block,asset,original: block.src});
 }
 if(changes.length){
  for(const {block,asset} of changes){block.assetId=asset.id;block.src=''}
  // If the quota blocks draft saving, retain source data to avoid losing the image.
  try{localStorage.setItem(KEY,JSON.stringify(db))}
  catch{for(const {block,original} of changes){block.src=original;delete block.assetId}}
 }
}
async function loadFiles(){
 try{
  (await fileOperation('list')).forEach(rememberFile);
  storageReady=true;await migrateEmbeddedImages();
 }catch{storageReady=false;status.textContent='Stockage local indisponible : vos images existantes ne sont pas effacées.'}
 render();
}
async function importFiles(files){
 if(window.EJBridge?.remote){await window.EJBridge.importFiles(files);globalMedia=await window.EJBridge.listMedia();globalMediaLoaded=true;render();return;}
 if(IS_STAGE&&LIVE_MEDIA_UPLOAD_HOST){
  let success=0;const failures=[];
  for(const file of files){
   const mp3=/\.mp3$/i.test(file.name);
   const actual=mp3&&!file.type?new File([file],file.name,{type:'audio/mpeg'}):file;
   if(mp3)mediaUploadFeedback(0,'Envoi du MP3 : '+file.name+' (0 %)');
   try{
    await uploadToMediaServer(actual,mp3?pct=>
     mediaUploadFeedback(pct,'Envoi du MP3 : '+file.name+' ('+pct+' %)'):null);
    success++;
    if(mp3)mediaUploadFeedback(100,'✓ MP3 importé : '+file.name);
   }catch(e){
    failures.push(file.name+' : '+e.message);
    status.textContent='❌ '+file.name+' : '+e.message;
    if(mp3)mediaUploadFeedback(mediaUploadState?.percent||0,
      '❌ Transfert interrompu : '+e.message);
   }
  }
  status.textContent=(success?'✓ '+success+' fichier(s) conservé(s) sur le serveur. ':'')+
   (failures.length?'❌ '+failures.length+' échec(s) : '+failures.join(' ; '):'');
  render();return;
 }
 if(!storageReady){status.textContent='Stockage indisponible.';return}
 let total=0;
 for(const file of files){
  if(file.size>60_000_000)continue;
  const item={id:crypto.randomUUID(),name:file.name,type:file.type,size:file.size,
   createdAt:new Date().toISOString(),blob:file};
  try{await fileOperation('put',item);rememberFile(item);total++}catch{}
 }
 status.textContent=total+' fichier(s) conservé(s) sur cet appareil.';render();
}

// Open the complete site media library in a modal; do not navigate away.
function chooseFile(x){
 const choosingVideo=x.kind==='video';
 const dialog=n('dialog','image-picker-dialog file-picker-dialog');
 const head=n('div','image-picker-header');
 const title=n('h3','image-picker-title',choosingVideo?'Choisir une vidéo de la médiathèque':'Choisir un fichier du site');
 title.id='file-picker-heading';dialog.setAttribute('aria-labelledby',title.id);
 const close=b('×',()=>dialog.close(),'image-picker-close');
 close.setAttribute('aria-label','Fermer');head.append(title,close);dialog.append(head);
 const search=n('input','file-picker-search');search.type='search';
 search.placeholder='Rechercher un fichier…';search.setAttribute('aria-label','Rechercher un fichier');
 dialog.append(search);
 const tabs=n('div','file-picker-tabs'),grid=n('div','file-picker-results');
 grid.setAttribute('role','group');grid.setAttribute('aria-label','Fichiers disponibles');
 grid.dataset.view='list';
 dialog.append(tabs,grid);
 const hint=n('p','file-picker-hint','Sélectionnez un fichier. Votre page reste ouverte derrière cette fenêtre.');
 dialog.append(hint);
 const categories=choosingVideo?[['videos','Vidéos']]:[['all','Tous'],...FILE_CATEGORIES];
 let filter=choosingVideo?'videos':'all';
 const inventory=()=>mediaCatalogue.pickerItems(
  [...(globalFiles||[]),...publicFiles()],globalMedia
 );
 const select=file=>{
  if(typeof x?.onSelect==='function'){
   if(file.category!=='images'){siteNotice('Choisissez une image.');return}
   x.onSelect(file);dialog.close();return;
  }
  if(!editorMediaCommands.chooseFile(x,file,choosingVideo))return;
  mark();dialog.close();render();
 };
 const draw=()=>{
  const all=inventory();tabs.replaceChildren();
  for(const [type,name] of categories){
   const count=type==='all'?all.length:all.filter(f=>f.category===type).length;
   const choice=b(name+' ('+count+')',()=>{filter=type;draw()},filter===type?'primary sm':'sm');
   choice.setAttribute('aria-pressed',String(filter===type));tabs.append(choice);
  }
  grid.dataset.view=filter==='images'?'gallery':'list';
  grid.replaceChildren();
  const plain=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const results=all.filter(f=>(filter==='all'||f.category===filter)&&plain(f.name).includes(plain(search.value)));
  const labelOf=Object.fromEntries(FILE_CATEGORIES);
  for(const f of results){
   const item=b('',()=>select(f),'file-picker-card');
   item.dataset.kind=f.category;
   item.setAttribute('aria-label','Choisir '+f.name);
   item.title=f.name;
   const visual=n('span','file-picker-icon');
   if(f.category==='images'){
    const img=n('img');img.src=f.src;img.alt='';img.loading='lazy';
    img.onerror=()=>{img.remove();visual.textContent='▧';visual.classList.add('is-unavailable')};
    visual.append(img);
   }else visual.textContent=({pdf:'📄',audios:'♫',videos:'▶',autres:'📎'})[f.category]||'📎';
   const caption=n('span','file-picker-caption');
   const filename=n('strong','file-picker-filename',f.name);
   const type=n('small','file-picker-filetype',labelOf[f.category]||'Fichier');
   caption.append(filename,type);
   item.append(visual,caption);grid.append(item);
  }
  if(!results.length)grid.append(n('p','image-picker-empty',all.length?'Aucun fichier correspondant.':'Chargement des fichiers…'));
 };
 search.oninput=draw;
 const actions=n('div','file-actions image-picker-footer');
 actions.append(b('Annuler',()=>dialog.close(),'sm'));dialog.append(actions);
 document.body.append(dialog);dialog.onclose=()=>dialog.remove();
 dialog.showModal();draw();
 if(!globalFiles)void loadGlobalFiles().then(()=>{if(dialog.open)draw()}).catch(()=>{
  if(dialog.open)hint.textContent='Certains anciens fichiers ne peuvent pas être chargés.';
 });
 if((IS_STAGE||window.EJBridge?.remote)&&!globalMediaLoaded)void refreshGlobalMedia().then(()=>{if(dialog.open)draw()});
}
// This prototype has no server media catalogue: inspect the current unsaved page
// and every other saved staging celebration on this same browser/origin.
function savedPageSets(){
 const all=[{key:KEY,pages:db.pages||[]}];
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  if(key===KEY||!(key==='ej-original-editor-v1'||key?.startsWith('celebrations-demo-preparation-')))continue;
  try{const obj=JSON.parse(localStorage.getItem(key));if(Array.isArray(obj?.pages))all.push({key,pages:obj.pages})}catch{}
 }
 return all;
}
function fileUsages(fileId){
 const matches=[];
 for(const group of savedPageSets()){
  for(const p of group.pages){
   let count=0;
   const visit=blocks=>{for(const block of blocks||[]){if(block?.assetId===fileId||block?.coverAssetId===fileId)count++;
    if(block?.kind==='section')for(const col of block.columns||[])visit(col);}};
   visit(p.blocks);
   if(!count)continue;
   let section='';
   if(group.key.startsWith('celebrations-demo-preparation-')){
    const num=group.key.slice('celebrations-demo-preparation-'.length);
    section=num===String(window.__PREPARATION_SEED__?.celebrationId)
     ?String(window.__PREPARATION_SEED__?.archangel||'Célébration')+' '+String(window.__PREPARATION_SEED__?.year||'') 
     :'Célébration '+num;
   }else section='Ancienne maquette';
   matches.push({page:section+' — '+String(p.name||p.id),count});
  }
 }
 for(const [pageId,versions] of Object.entries(editorLocalization.pages||{}))
  for(const [lang,version] of Object.entries(versions||{})){
   let count=0;
   const visit=blocks=>{for(const block of blocks||[]){
    if(block?.assetId===fileId||block?.coverAssetId===fileId)count++;
    if(block?.kind==='section')for(const col of block.columns||[])visit(col);
   }};
   visit(version.blocks);
   if(count)matches.push({page:'Traduction '+lang+' — '+pageId,count});
  }
 return matches;
}
// Files can only be deleted when no page or event references remain.
// A used file must never be removed, even after an extra confirmation.
async function removeFiles(records){
 const todo=records.filter(r=>r&&fileRecords.has(r.id));
 if(!todo.length)return;
 const stillUsed=todo.filter(r=>fileUsages(r.id).length>0);
 if(stillUsed.length){
  status.textContent='Fichier utilisé : retirez-le de toutes les pages avant de le supprimer.';
  return;
 }
 if(!(await siteConfirm('Supprimer définitivement '+todo.length+' fichier(s) inutilisé(s) de cet appareil ?')))return;
 // Recheck after confirmation, in case a page changed in another tab.
 if(todo.some(r=>fileUsages(r.id).length>0)){
  status.textContent='Suppression annulée : le fichier est utilisé.';return;
 }
 let count=0;
 for(const r of todo){
  try{
   await fileOperation('delete',r.id);
   const old=assetUrls.get(r.id);if(old)URL.revokeObjectURL(old);
   assetUrls.delete(r.id);fileRecords.delete(r.id);selectedImageFiles.delete(r.id);count++;
  }catch{status.textContent='Impossible de supprimer '+r.name;break}
 }
 render();status.textContent=count+' fichier(s) supprimé(s).';
}
async function deleteFile(r){await removeFiles([r])}
function buttonHref(x){return x.assetId?(assetUrls.get(x.assetId)||''):(validHref(x.href)?x.href:'')}

const el=s=>document.getElementById(s),w=el('workspace'),status=el('status');
let memberPanel=null,memberPanelRoot=null;
let privateEdit=null,privateReturn=null,privateBusy=false,privateRedo=[];
const n=(t,c,v)=>{const a=document.createElement(t);if(c)a.className=c;if(v!==undefined)a.textContent=v;return a};
const b=(label,fn,c)=>{const x=n('button','btn '+(c||''),label);x.type='button';x.onclick=fn;return x};
const canonicalPage=()=>db.pages.find(p=>p.id===id)||db.pages[0];
const page=()=>{
 const canonical=canonicalPage();
 if(!IS_STAGE||!['page','celebration'].includes(canonical?.group)||editingLanguageId==='fr')return canonical;
 if(localeView&&localeCanonical===canonical&&localeLangId===editingLanguageId)return localeView;
 const variant=editorLocalization.pages[canonical.id]?.[editingLanguageId];
 // A new language begins with no French blocks and is never auto-translated.
 localeView={...canonical,name:variant?.name??'Titre à traduire',
  blocks:clone(variant?.blocks??[])};
 localeCanonical=canonical;localeLangId=editingLanguageId;
 return localeView;
};
function commitLocalizedView(){
 if(!IS_STAGE||editingLanguageId==='fr'||!localeView||localeView.id!==canonicalPage()?.id)return;
 const canonical=canonicalPage();
 if(!['page','celebration'].includes(canonical.group))return;
 const versions=editorLocalization.pages[canonical.id]||{};
 const before=versions[editingLanguageId]||{};
 const content={...before,name:localeView.name,blocks:localeView.blocks};
 const next=setPageTranslation({...canonical,translations:versions},
  editorLocalization.registry,editingLanguageId,content);
 editorLocalization.pages[canonical.id]=next.translations;
}
const mediaCatalogue=createMediaCatalogue({validHref});
const editorMediaCommands=createEditorMediaCommands();
const FILE_CATEGORIES=mediaCatalogue.categories;
function categoryOfLocal(record){return mediaCatalogue.categoryOfLocal(record)}
function publicFiles(){return mediaCatalogue.publicFiles(window.__PREPARATION_SEED__?.files)}
// The file library is global; each public reference records all celebration/day uses.
const fileSeeds=new Map(),fileGroups=new Map();
let globalFiles=null,globalFilesLoading=null,globalFilesComplete=false,hiddenFileIds=new Set();
let globalMedia=[],remoteMediaLoading=false,globalMediaLoaded=false;
const mediaCategoryOf=m=>mediaCatalogue.mediaCategoryOf(m);
async function refreshGlobalMedia(){
 if(window.EJBridge?.remote){globalMedia=await window.EJBridge.listMedia();globalMediaLoaded=true;remoteMediaLoading=false;if(tab==='media')render();return;}
 if(remoteMediaLoading)return;
 remoteMediaLoading=true;
 try{
  const response=await fetch('/api/editor-media',{cache:'no-store'});
  if(!response.ok)throw Error('Bibliothèque distante indisponible');
  const result=await response.json();
  globalMedia=Array.isArray(result.items)?result.items:[];
  globalMediaLoaded=true;
  if(tab==='media')render();
 }catch{status.textContent='La médiathèque du serveur n’est pas accessible. Les fichiers existants sont conservés.'}
 finally{remoteMediaLoading=false}
}
function mediaUploadFeedback(percent,message){
 mediaUploadState={percent,message};
 const bar=document.getElementById('media-upload-progress');
 const label=document.getElementById('media-upload-feedback');
 if(bar){bar.hidden=false;bar.value=percent}
 if(label){label.hidden=false;label.textContent=message}
}
// M025: MP3s above the old 25 Mo form limit travel in 10 Mo R2 parts.
// Store only upload IDs and confirmed part ETags in this browser, not audio
// bytes, PINs or reusable credentials. Selecting the same file resumes them.
const MAX_MP3_UPLOAD=200_000_000;
const MP3_SINGLE_REQUEST=25_000_000;
async function uploadLargeMp3(file,onProgress){
 if(file.size>MAX_MP3_UPLOAD)throw Error('MP3 trop volumineux (200 Mo maximum).');
 const normalizedName=String(file.name||'');
 if(!/\.mp3$/i.test(normalizedName))throw Error('Choisissez un fichier MP3.');
 const identity=[normalizedName,file.size,file.lastModified].join('|');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
 const fingerprint=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
 const localKey='celebrations-mp3-resume-v1:'+fingerprint;
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem(localKey)||'null')}catch{}
 const endpoint=action=>'/api/editor-media?action='+action;
 async function command(action,payload){
  const response=await fetch(endpoint(action),{
   method:'POST',credentials:'same-origin',
   headers:{'content-type':'application/json'},
   body:JSON.stringify(payload)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok){
   const error=Error(data.error||'Erreur du transfert MP3 ('+response.status+').');
   error.status=response.status;throw error;
  }
  return data;
 }
 function keep(){
  try{localStorage.setItem(localKey,JSON.stringify(saved))}catch{}
 }
 function finish(result){
  localStorage.removeItem(localKey);
  return result.item;
 }
 if(saved?.id&&saved?.uploadId){
  try{
   const info=await command('mpu-status',{id:saved.id,uploadId:saved.uploadId});
   if(info.completed)return {ok:true,item:finish(info),revision:info.revision};
   if(info.size!==file.size||info.name!==normalizedName){
    saved=null;try{localStorage.removeItem(localKey)}catch{}
   }
  }catch(error){
   if([404,410].includes(error.status)){
    saved=null;try{localStorage.removeItem(localKey)}catch{}
   }else throw error;
  }
 }
 if(!saved){
  saved=await command('mpu-start',{name:normalizedName,size:file.size,mime:file.type||'audio/mpeg'});
  saved.uploaded={};keep();
 }
 const count=Math.ceil(file.size/saved.chunkSize);
 if(saved.chunkSize!==10_000_000||saved.parts!==count||count>20)
  throw Error('Paramètres du transfert MP3 inattendus.');
 const verified=()=>Object.keys(saved.uploaded||{}).filter(key=>
  Number(key)>=1&&Number(key)<=count&&/^[a-f0-9]{32}$/i.test(saved.uploaded[key])).length;
 const progress=(number,loaded=0)=>{
  const already=Object.keys(saved.uploaded||{}).reduce((sum,key)=>{
   const index=Number(key);
   if(!Number.isInteger(index)||index<1||index>count||
      !/^[a-f0-9]{32}$/i.test(saved.uploaded[key]))return sum;
   return sum+Math.min(saved.chunkSize,file.size-(index-1)*saved.chunkSize);
  },0);
  const percent=Math.min(99,Math.floor((already+loaded)*100/file.size));
  if(onProgress)onProgress(percent);
  mediaUploadFeedback(percent,'MP3 : '+percent+' % envoyés ('+verified()+'/'+count+' morceaux confirmés).');
 };
 for(let number=1;number<=count;number++){
  if(saved.uploaded?.[number]){progress(number);continue;}
  const begin=(number-1)*saved.chunkSize;
  const chunk=file.slice(begin,Math.min(begin+saved.chunkSize,file.size));
  let error=null;
  for(let attempt=0;attempt<3;attempt++){
   try{
    const part=await new Promise((resolve,reject)=>{
     const xhr=new XMLHttpRequest();
     xhr.open('POST',endpoint('mpu-part'),true);
     xhr.withCredentials=true;xhr.responseType='json';
     xhr.setRequestHeader('content-type','application/octet-stream');
     xhr.setRequestHeader('x-mp3-upload-id',saved.id);
     xhr.setRequestHeader('x-mp3-r2-upload-id',saved.uploadId);
     xhr.setRequestHeader('x-mp3-part-number',String(number));
     xhr.upload.onprogress=event=>{
      if(event.lengthComputable)progress(number,Math.min(chunk.size,event.loaded));
     };
     xhr.onload=()=>{
      const data=xhr.response||{};
      if(xhr.status>=200&&xhr.status<300&&data.ok&&data.etag)
       resolve(data);
      else reject(Error(data.error||'Transfert du morceau '+number+' refusé.'));
     };
     xhr.onerror=()=>reject(Error('Connexion perdue pendant le transfert.'));
     xhr.onabort=()=>reject(Error('Transfert interrompu.'));
     xhr.send(chunk);
    });
    if(!/^[a-f0-9]{32}$/i.test(part.etag))throw Error('Réponse R2 invalide.');
    saved.uploaded[number]=part.etag;keep();progress(number);
    error=null;break;
   }catch(e){error=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,600*(attempt+1)))}
  }
  if(error)throw Error(error.message+' Choisissez à nouveau ce même MP3 pour reprendre.');
 }
 const parts=Array.from({length:count},(_,index)=>({
  partNumber:index+1,etag:saved.uploaded[index+1]
 }));
 mediaUploadFeedback(99,'Tous les morceaux sont envoyés. Vérification du fichier de '+file.size+' octets…');
 let result;
 try{result=await command('mpu-complete',{id:saved.id,uploadId:saved.uploadId,parts})}
 catch(error){
  // R2 may have completed even when the response was lost. Never discard the
  // part manifest: reopening the same file can recheck and finalize safely.
  throw Error(error.message+' Choisissez à nouveau ce MP3 pour terminer.');
 }
 return {ok:true,item:finish(result),revision:result.revision};
}
async function uploadToMediaServer(file,onProgress=null){
 const mp3=/\.mp3$/i.test(String(file.name||''));
 if(mp3&&file.size>MAX_MP3_UPLOAD)
  throw Error('MP3 trop volumineux : 200 Mo maximum.');
 if(mp3&&file.size>MP3_SINGLE_REQUEST){
  const result=await uploadLargeMp3(file,onProgress);
  globalMedia=globalMedia.filter(x=>x.id!==result.item.id).concat({...result.item,canDelete:false});
  serverRevision=result.revision;
  return result.item;
 }
 const form=new FormData();form.append('file',file);
 let result;
 if(onProgress){
  // A real upload event (not a timer) reports bytes transmitted to the server.
  result=await new Promise((resolve,reject)=>{
   const xhr=new XMLHttpRequest();
   xhr.open('POST','/api/editor-media?action=upload',true);
   xhr.responseType='json';
   xhr.withCredentials=true;
   xhr.upload.onprogress=e=>{
    if(e.lengthComputable&&e.total>0)onProgress(Math.min(99,Math.round(e.loaded*100/e.total)));
    if(e.lengthComputable&&e.loaded===e.total)mediaUploadFeedback(99,'Envoi terminé. Vérification de l’enregistrement par le serveur…');
   };
   xhr.onload=()=>{
    const data=xhr.response||{};
    if(xhr.status>=200&&xhr.status<300&&data.ok===true&&data.item)resolve(data);
    else reject(Error(data.error||'Envoi vers le serveur impossible ('+xhr.status+')'));
   };
   xhr.onerror=()=>reject(Error('Connexion interrompue pendant le transfert'));
   xhr.onabort=()=>reject(Error('Transfert annulé'));
   xhr.send(form);
  });
 }else{
  const response=await fetch('/api/editor-media?action=upload',{method:'POST',body:form});
  result=await response.json().catch(()=>({}));
  if(!response.ok||result.ok!==true||!result.item)throw Error(result.error||'Envoi vers le serveur impossible');
 }
 globalMedia=globalMedia.filter(x=>x.id!==result.item.id).concat(result.item);
 serverRevision=result.revision;
 return result.item;
}
async function createExternalMedia(){
 const value=String((await sitePrompt('Lien HTTPS vers une vidéo, un PDF, une image, un audio ou une page :'))||'').trim();
 if(!/^https:\/\//i.test(value))return;
 let url;try{url=new URL(value)}catch{siteNotice('Adresse invalide');return}
 if(url.username||url.password){siteNotice('Adresse invalide');return}
 const choices=['Vidéo','PDF','Image','Audio'];
 const input=String((await sitePrompt('Type : 1 Vidéo, 2 PDF, 3 Image, 4 Audio','1'))||'').trim();
 const type=({1:'video',2:'pdf',3:'image',4:'audio'})[input];
 if(!type){siteNotice('Choisissez 1, 2, 3 ou 4.');return}
 const name=String((await sitePrompt('Nom du média :',url.hostname))||'').trim().slice(0,120);
 const response=await fetch('/api/editor-media?action=external',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({type,src:url.href,name:name||url.hostname})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok){siteNotice(result.error||'Enregistrement impossible');return}
 serverRevision=result.revision;
 globalMedia=globalMedia.filter(x=>x.id!==result.item.id).concat(result.item);
 status.textContent='✓ Lien conservé dans la médiathèque globale';render();
}
async function deleteGlobalMedia(media){
 if(!(await siteConfirm('Supprimer « '+media.name+' » de la médiathèque ? Si ce fichier est encore utilisé, la suppression sera refusée.')))return;
 const response=await fetch('/api/editor-media?action=delete',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({id:media.id})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok){siteNotice(result.error||'Suppression non autorisée');return}
 serverRevision=result.revision;globalMedia=globalMedia.filter(x=>x.id!==media.id);
 status.textContent='✓ Média inutilisé supprimé du catalogue';render();
}

try{hiddenFileIds=new Set(JSON.parse(localStorage.getItem('celebrations-files-hidden-v1')||'[]'))}catch{}
if(IS_STAGE)fileSeeds.set(String(window.__PREPARATION_SEED__.celebrationId),window.__PREPARATION_SEED__);
function fileKey(r){return mediaCatalogue.fileKey(r)}
function filePageRef(seed,step){
 const page=seed.pages.find(p=>p.group==='celebration'&&p.name===step);
 if(!page)return null;
 const cid=String(seed.celebrationId);
 return {celebrationId:cid,name:seed.archangel+' '+seed.year,pageId:page.id,pageName:page.name,
  slug:page.id.endsWith('-'+cid)?page.id.slice(0,-cid.length-1):page.id};
}
function addCatalogueSeed(map,seed){
 for(const record of seed.files||[]){
  const key=fileKey(record);
  let file=map.get(key);
  if(!file){file={...record,uses:[]};map.set(key,file)}
  for(const name of record.pages||[]){
   const use=filePageRef(seed,name);
   if(use&&!file.uses.some(u=>u.celebrationId===use.celebrationId&&u.pageId===use.pageId))file.uses.push(use);
  }
 }
 // Draft attachments can reuse an archive in any celebration; only this device is scanned.
 let stored=null;
 try{stored=String(seed.celebrationId)===String(window.__PREPARATION_SEED__.celebrationId)?db:
  JSON.parse(localStorage.getItem('celebrations-demo-preparation-'+seed.celebrationId)||'null')}catch{}
 if(!stored?.pages)return;
 for(const p of stored.pages.filter(p=>p.group==='celebration')){
  const use=filePageRef(seed,p.name);if(!use)continue;
  for(const block of p.blocks||[]){
   const category=block.kind==='image'?'images':block.kind==='audio'?'audios':
    block.kind==='button'?'pdf':block.kind==='text'?'autres':'';
   if(!category)continue;
   const key=category+':'+String(block.src||block.remoteKey||block.href||'');
   let file=map.get(key);
   if(!file)continue;
   if(!file.uses.some(u=>u.celebrationId===use.celebrationId&&u.pageId===use.pageId))file.uses.push(use);
  }
 }
}
async function loadFileSeed(cid){
 cid=String(cid);
 if(fileSeeds.has(cid))return fileSeeds.get(cid);
 const response=await fetch('/__editor/demo-preparation?celebration='+encodeURIComponent(cid)+'&format=json',{credentials:'same-origin',cache:'no-store'});
 if(!response.ok)throw Error('Célébration indisponible');
 const payload=await response.json();
 if(!payload?.ok||String(payload.seed?.celebrationId)!==cid)throw Error('Célébration incorrecte');
 fileSeeds.set(cid,payload.seed);return payload.seed;
}
function loadGlobalFiles(){
 if(globalFilesLoading)return globalFilesLoading;
 globalFilesLoading=(async()=>{
  const map=new Map(),ids=celebrationEntries().map(x=>String(x.id));
  const settled=await Promise.allSettled(ids.map(id=>loadFileSeed(id)));
  globalFilesComplete=settled.every(result=>result.status==='fulfilled');
  for(let i=0;i<settled.length;i++)if(settled[i].status==='fulfilled')addCatalogueSeed(map,settled[i].value);
  globalFiles=[...map.values()];
  return globalFiles;
 })().catch(()=>{globalFiles=null;return null});
 return globalFilesLoading;
}
function fileUses(r){return mediaCatalogue.fileUses(r)}
function localCategory(r){return categoryOfLocal(r)}
// Historical public media are held in staging R2 and can only be physically
// deleted after their D1 references, including other audience views, are cleared.
// Never offer a misleading local-only "hide" action in place of deletion.
function makeLibraryBlock(r,time){return mediaCatalogue.makeLibraryBlock(r,time,uniqueBlockId())}
function cloudAudioUsages(key){
 const uses=[];
 for(const group of savedPageSets())for(const p of group.pages)
  if((p.blocks||[]).some(b=>b.kind==='audio'&&b.remoteKey===key))uses.push(p.name);
 return [...new Set(uses)];
}
const pageSlug=p=>editorPageModel.pageSlug(p,window.__PREPARATION_SEED__?.celebrationId);
async function createPage(group){
 const entered=await sitePrompt(group==='celebration'?'Nom de la page supplémentaire de la célébration :':group==='footer'?'Titre de la page de bas de page :':'Nom de la page hors célébration :');
 const name=String(entered||'').trim().slice(0,95);
 if(!name)return;
 if(dirty){save();if(dirty)return}
 const uid=crypto.randomUUID();
 const isCelebration=group==='celebration';
 const suffix=window.__PREPARATION_SEED__?.celebrationId||'demo';
 const q=editorPageModel.createPage(group,name,uid,suffix);
 db.pages.push(q);id=q.id;selectedBlockId=null;tab=isCelebration?'celebrations':group==='footer'?'footer':'pages';
 mark();save();render();
 // New pages are immediately written to the shared server as private drafts.
 if(IS_STAGE&&typeof serverSave==='function')void serverSave();
}


/* Colourways are limited to the current archangel and never colour body text. */
const pagePalettes=()=>window.__PREPARATION_SEED__?.palettes;
function selectedPalette(){
 const options=pagePalettes();
 if(!Array.isArray(options)||options.length!==5)return null;
 const index=Number.isInteger(db.themeIndex)&&db.themeIndex>=0&&db.themeIndex<5?db.themeIndex:0;
 return options[0];
}
function applyPalette(){
 const stage=document.querySelector('.stage-editor'),chosen=selectedPalette();
 if(!stage||!chosen||!Array.isArray(chosen.shades)||chosen.shades.length!==5)return;
 if(/^#[0-9a-f]{6}$/i.test(chosen.shades[3]))stage.style.setProperty('--frame-color',chosen.shades[3]);
}
const BLOCK_SIZES=[14,16,18,20,24,28,32,40],ALIGNMENTS=['left','center','right'];
function uniqueBlockId(){return 'block-'+crypto.randomUUID()}
const editorBlockModel=createBlockModel();
const editorBlockCommands=createEditorBlockCommands({model:editorBlockModel});
// Keep only bold, italic and strictly validated inline colours in saved drafts.
function inlineColor(value){
 const v=String(value||'').trim().toLowerCase();
 if(/^#[0-9a-f]{6}$/.test(v))return v;
 const match=v.match(/^rgb\(([^)]+)\)$/);
 if(!match)return '';
 const values=match[1].split(/[\s,]+/).filter(Boolean);
 if(values.length!==3||values.some(n=>!/^\d{1,3}$/.test(n)||Number(n)>255))return '';
 return '#'+values.map(n=>Number(n).toString(16).padStart(2,'0')).join('');
}
function htmlSafe(source){
 const temp=document.createElement('div');
 const raw=document.createElement('template');raw.innerHTML=String(source||'').slice(0,18000);
 let count=0;
 function copy(from,to){
  if(count++>15000)return;
  for(const node of from.childNodes){
   if(node.nodeType===3){to.append(document.createTextNode(node.textContent||''));continue}
   if(node.nodeType!==1)continue;
   const tag=node.tagName.toLowerCase();
   if(['script','style','iframe','svg','object','template'].includes(tag))continue;
   if(tag==='br'){to.append(document.createElement('br'));continue}
   if(['strong','b','em','i'].includes(tag)){
    const child=document.createElement(['strong','b'].includes(tag)?'strong':'em');
    copy(node,child);to.append(child);continue;
   }
   if(tag==='span'||tag==='font'){
    const raw=node.getAttribute('style')||'';
    const specified=raw.match(/(?:^|;)\s*color\s*:\s*([^;]+)(?:;|$)/i);
    const colour=inlineColor(tag==='font'?node.getAttribute('color')||node.style.color:(specified?.[1]||node.style.color));
    if(colour){const child=document.createElement('span');child.style.color=colour;copy(node,child);to.append(child)}
    else copy(node,to);
    continue;
   }
   if(['div','p'].includes(tag)&&to.childNodes.length)to.append(document.createElement('br'));
   copy(node,to);
  }
 }
 copy(raw.content,temp);return temp.innerHTML;
}
// CSP-safe: restore only checked colours via DOM style properties after HTML parsing.
function restoreInlineColours(z){
 for(const span of z.querySelectorAll('span[style]')){
  const raw=span.getAttribute('style')||'';
  const m=raw.match(/(?:^|;)\s*color\s*:\s*([^;]+)(?:;|$)/i);
  const value=inlineColor(m?.[1]);
  if(value){span.removeAttribute('style');span.style.color=value}
 }
}
function saveRich(x,z){if(x.kind==='button'){x.text=z.innerText.slice(0,IS_STAGE?50000:5000)}else{
 const safe=htmlSafe(z.innerHTML).slice(0,18000);x.rich=safe;x.text=z.innerText.slice(0,5000)}
 mark();
}
function sizeOf(x){return BLOCK_SIZES.includes(Number(x.size))?Number(x.size):(x.kind==='heading'?28:16)}
function pageMainTitle(p){
 return p.blocks.flatMap(y=>y.kind==='section'
  ?[...(y.columns?.[0]||[]),...(y.columns?.[1]||[])]:[y]).find(y=>y.kind==='heading');
}
function displayedHeadingSize(x,p){
 if(!['heading','event'].includes(x.kind)||BLOCK_SIZES.includes(Number(x.size)))return sizeOf(x);
 return x.kind==='heading'&&pageMainTitle(p)===x?28:24;
}
function duplicateBlock(x,p,items=p.blocks){
 const copy=editorBlockCommands.duplicateInContainer(x,items,uniqueBlockId(),clone);
 if(!copy)return;
 // Keep exactly the displayed source size without making a second page title.
 if(['heading','event'].includes(x.kind)&&!BLOCK_SIZES.includes(Number(x.size)))
  copy.size=displayedHeadingSize(x,p);
 selectedBlockId=String(copy.id);
 mark();render();
}
// Keep the user's selection when a button or the native mobile colour picker takes focus.
let rememberedSelection=null;
function rangeInEditor(z){
 const sel=window.getSelection();
 if(sel&&sel.rangeCount&&!sel.isCollapsed&&z.contains(sel.anchorNode)&&z.contains(sel.focusNode))
  return sel.getRangeAt(0).cloneRange();
 if(rememberedSelection?.host===z&&z.isConnected&&z.contains(rememberedSelection.range.commonAncestorContainer))
  return rememberedSelection.range.cloneRange();
 return null;
}
document.addEventListener('selectionchange',()=>{
 const sel=window.getSelection();
 if(!sel||!sel.rangeCount)return;
 if(!sel.isCollapsed){
  const a=sel.anchorNode?.nodeType===1?sel.anchorNode:sel.anchorNode?.parentElement;
  const z=a?.closest?.('.ed[contenteditable="true"]');
  if(z&&z.contains(sel.focusNode))rememberedSelection={host:z,range:sel.getRangeAt(0).cloneRange()};
 }
});
function editorFormatToolbar(x,z,box){
 const bar=n('div','formatbar');
 const make=(label,title,fn)=>{
  const bt=b(label,fn,'sm format-button');bt.title=title;bt.setAttribute('aria-label',title);
  bt.addEventListener('mousedown',e=>e.preventDefault());
  bar.append(bt);return bt
 };
 function format(command,prop){
  const range=rangeInEditor(z);
  if(range){
   const tag=prop==='bold'?'strong':'em';
   const element=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
   const existing=element?.closest?.(tag);
   if(existing&&z.contains(existing)&&range.toString()===existing.textContent){
    existing.replaceWith(...existing.childNodes);
    rememberedSelection=null;
   }else{
    const wrapper=document.createElement(tag);
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
    const selected=document.createRange();selected.selectNodeContents(wrapper);
    rememberedSelection={host:z,range:selected};
   }
   saveRich(x,z);
  }else{x[prop]=!x[prop];z.style[prop==='bold'?'fontWeight':'fontStyle']=x[prop]?(prop==='bold'?'700':'italic'):'normal';mark()}
 }
 make('G','Gras (sélection ou bloc)',()=>format('bold','bold'));
 make('I','Italique (sélection ou bloc)',()=>format('italic','italic'));
 const sizes=n('select','format-select');sizes.setAttribute('aria-label','Taille du texte');sizes.title='Taille du paragraphe entier';
 for(const num of BLOCK_SIZES){const opt=n('option','',num+' px');opt.value=String(num);if(num===(Number.parseInt(z.style.fontSize,10)||sizeOf(x)))opt.selected=true;sizes.append(opt)}
 sizes.onchange=()=>{x.size=Number(sizes.value);z.style.fontSize=x.size+'px';mark()};bar.append(sizes);
 const label=n('label','color-picker');label.title='Couleur de la sélection ou de tout le paragraphe';label.append(n('span','','Couleur '));
 const color=n('input');color.type='color';color.setAttribute('aria-label','Couleur du texte');color.value=validColor(x.color)?x.color:'#323744';
 let colourRange=null,colourSpan=null;
 const capture=()=>{colourRange=rangeInEditor(z);colourSpan=null};
 color.addEventListener('pointerdown',capture);
 color.addEventListener('focus',()=>{if(!colourRange)capture()});
 color.oninput=()=>{
  if(colourSpan&&z.contains(colourSpan)){colourSpan.style.color=color.value;saveRich(x,z);return}
  const range=colourRange||rangeInEditor(z);
  if(range&&!range.collapsed&&z.contains(range.commonAncestorContainer)){
   const span=document.createElement('span');span.style.color=color.value;
   span.append(range.extractContents());range.insertNode(span);
   colourSpan=span;
   const selected=document.createRange();selected.selectNodeContents(span);
   rememberedSelection={host:z,range:selected};
   saveRich(x,z);
  }else{
   x.color=color.value;z.style.color=color.value;mark();
  }
 };
 color.addEventListener('change',()=>{colourRange=null;colourSpan=null});
 label.append(color);bar.append(label);
 const align=n('select','format-select');align.setAttribute('aria-label','Alignement');
 for(const [value,name] of [['left','Gauche'],['center','Centré'],['right','Droite']]){const opt=n('option','',name);opt.value=value;if((x.align||'left')===value)opt.selected=true;align.append(opt)}
 align.onchange=()=>{x.align=align.value;box.style.textAlign=align.value;mark()};bar.append(align);
 return bar;
}

// Bounded local editor history. Ctrl+Z and the mobile arrow restore the
// previous authoring state without writing or publishing until Save is clicked.

// Server-side staging synchronization; deliberately separate from local autosave.
// Shared staging copy: a browser displays the last deliberately saved server version.
const SERVER_ENDPOINT='/api/editor-open-draft';
const SERVER_ID=String(window.__PREPARATION_SEED__?.celebrationId||'');
let serverRevision=null,serverRemoteVersion=0,serverSaving=false,serverDiverged=false;
let serverBaseRecord=null,serverBaseShared=null,serverBasePlans=null,serverBaseLocalization=null;
let serverSaveQueued=false,serverLocalEditCounter=0;
const serverSame=(a,b)=>editorSyncPolicy.same(a,b);
const serverHeaders=()=>({});
function serverMessage(message){
 status.textContent=message;
 const old=document.getElementById('server-login-link');if(old)old.remove();
}
async function serverLoad(){
 try{
  const response=await fetch(SERVER_ENDPOINT+'?celebration='+encodeURIComponent(SERVER_ID),{cache:'no-store'});
  if(!response.ok){
   serverMessage('Impossible de charger la version commune : vos modifications locales restent intactes.');return;
  }
  const payload=await response.json();
  serverRevision=payload.revision;if(payload.celebrationMetadata)celebrationMetadata=payload.celebrationMetadata;
  globalMedia=Array.isArray(payload.mediaCatalogue)?payload.mediaCatalogue:globalMedia;
  const remote=payload.record;
  serverBaseRecord=clone(remote);serverBaseShared=clone(payload.shared);
  serverBasePlans=clone(payload.plans||[]);
  serverBaseLocalization=clone(payload.localization??null);
  // Never lose a page with a failed server save merely because it is reloaded.
  let pending=null;
  try{pending=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
  if(pending?._serverPending===true&&Array.isArray(pending.pages)){
   db._serverRevision=serverRevision;db._serverPending=true;
   serverDiverged=true;
   serverMessage('⚠️ Modifications locales non transmises retrouvées. Elles sont conservées. Cliquez sur Enregistrer pour les envoyer au serveur.');
   return;
  }
  if(!remote){
   if(payload.localization){editorLocalization=normalizeLocalization(payload.localization);clearLocaleView();saveLocalizationLocal();}
   serverMessage('Aucune version commune enregistrée. Depuis l’appareil contenant les bonnes pages, cliquez sur Enregistrer.');
   return;
  }
  let local=null,localShared=null,localPlans=null;
  try{local=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
  try{localShared=JSON.parse(localStorage.getItem(SHARED_KEY)||'null')}catch{}
  try{localPlans=JSON.parse(localStorage.getItem(PLANS_KEY)||'null')}catch{}
  const changed=!!local&&JSON.stringify(local.pages?.filter(p=>p.group==='celebration'))!==JSON.stringify(remote.pages);
  const sharedChanged=!!localShared&&Array.isArray(payload.shared?.pages)&&payload.shared.pages.length>0&&
   JSON.stringify(localShared.pages)!==JSON.stringify(payload.shared.pages);
  let localLocalization=null;
  try{localLocalization=JSON.parse(localStorage.getItem(LOCALIZATION_KEY)||'null')}catch{}
  const localizationChanged=!!localLocalization&&
   JSON.stringify(localLocalization)!==JSON.stringify(payload.localization??emptyLocalization());
  // Never silently destroy older browser-specific drafts: keep one recoverable archive.
  if(changed||sharedChanged||localizationChanged){
   try{
    const key='celebrations-last-browser-draft-before-sync-v1';
    if(!localStorage.getItem(key))
     localStorage.setItem(key,JSON.stringify({celebration:SERVER_ID,record:local,shared:localShared,plans:localPlans,localization:localLocalization}));
   }catch{}
  }
  const shared=payload.shared;
  const general=Array.isArray(shared?.pages)?clone(shared.pages):
   db.pages.filter(p=>p.group==='page');
  const ids=new Set(general.map(p=>p.id));
  const homeId=ids.has(shared?.homeId)?shared.homeId:general.find(p=>p.id==='neutral-accueil-general')?.id||general[0]?.id||'neutral-accueil-general';
  db={...db,...clone(remote),pages:general.concat(clone(remote.pages)),
   siteHomeId:homeId,_serverRevision:payload.revision,_serverPending:false};
  if(Array.isArray(shared?.pages))
   localStorage.setItem(SHARED_KEY,JSON.stringify({...shared,pages:general,homeId}));
  editorLocalization=normalizeLocalization(payload.localization);
  clearLocaleView();saveLocalizationLocal();
  if(Array.isArray(payload.plans))localStorage.setItem(PLANS_KEY,JSON.stringify(payload.plans));
  try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}
  serverDiverged=false;
  serverMessage('✓ Version commune chargée depuis le serveur. Même contenu sur tous les appareils.');
 }catch{
  serverMessage('Connexion au serveur impossible. Votre brouillon sur cet appareil est conservé.');
 }
}
// Saving creates a private draft. Publication is an explicit second action
// and updates ONLY the chosen public page or celebration.
async function serverPublish(command,{flushContent=true}={}){
 if(serverSaving){serverMessage('Un enregistrement est en cours. Réessayez après confirmation.');return false;}
 // A visibility choice is not an implicit save of unsaved edits.
 const unsavedContent=dirty||!!db._serverPending;
 if(flushContent&&unsavedContent){
  if(dirty)save();
  await serverSave();
  if(db._serverPending||serverRevision===null)return false;
 }
 if(serverRevision===null){serverMessage('Rechargez la version du serveur avant de publier.');return false}
 try{
  if(command.kind==='celebration'){
   ensureMemberPanel();const record=await memberPanel.readContent();
   if(record.record.spaces?.length||record.record.pages?.some(p=>p.privateManaged)){
    privateCatalogue=await memberPanel.commandContent('celebration-visibility',{visibility:command.visibility});
    serverRevision=privateCatalogue.revision;db._serverRevision=serverRevision;
    let shared={};try{shared=JSON.parse(localStorage.getItem(SHARED_KEY)||'{}')}catch{}
    shared.celebrationVisibility={...shared.celebrationVisibility,[SERVER_ID]:command.visibility};
    localStorage.setItem(SHARED_KEY,JSON.stringify(shared));
    render();serverMessage('Visibilité enregistrée.');return true;
   }
  }
  const response=await fetch('/api/editor-publication',{method:'POST',cache:'no-store',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({celebration:SERVER_ID,expectedRevision:serverRevision,...command})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){
   if(response.status===409)serverRevision=null;
   serverMessage('❌ '+(result.error||'Publication impossible. Le brouillon reste enregistré.'));
   return false;
  }
  serverRevision=result.revision;
  db._serverRevision=serverRevision;
  if(!unsavedContent||flushContent)db._serverPending=false;
  if(command.kind==='page'){
   const item=db.pages.find(p=>p.id===command.pageId);if(item)item.visibility=command.visibility;
  }else if(command.kind==='celebration'){
   let shared={};try{shared=JSON.parse(localStorage.getItem(SHARED_KEY)||'{}')}catch{}
   shared.celebrationVisibility||={};
   shared.celebrationVisibility[SERVER_ID]=command.visibility;
   localStorage.setItem(SHARED_KEY,JSON.stringify(shared));
   const plans=plannedEntries(),plan=plans.find(x=>x.id===SERVER_ID);
   if(plan){plan.visibility=command.visibility;localStorage.setItem(PLANS_KEY,JSON.stringify(plans));}
  }else if(command.kind==='media'){
   const item=globalMedia.find(x=>x.id===command.mediaId);if(item)item.general=command.general;
  }
  localStorage.setItem(KEY,JSON.stringify(db));
  serverMessage(command.kind==='language-registry'?'✓ Langues publiques actualisées.':
   command.kind==='translation'?'✓ Publication de la traduction actualisée.':
   command.visibility==='published'?'✓ Publié : les visiteurs voient cette version.':
   command.visibility==='hidden'||command.visibility==='draft'?'✓ Masqué du site public.':
   '✓ Médiathèque générale actualisée.');
  // Publication is a remote operation, not an undoable local edit. Reset
  // history here so Ctrl+Z can never roll back a published/hidden status.
  if(typeof resetUndoHistory==='function'&&(!unsavedContent||flushContent))resetUndoHistory();
  render();
  if(!flushContent&&unsavedContent)serverMessage('✓ Visibilité modifiée. Le contenu en cours reste à enregistrer.');
  return true;
 }catch(e){serverMessage('❌ Connexion indisponible : aucun changement public effectué.');return false}
}
const serverFileAsDataURL=file=>new Promise((resolve,reject)=>{
 const reader=new FileReader();reader.onload=()=>resolve(reader.result);
 reader.onerror=()=>reject(Error('Lecture image impossible'));reader.readAsDataURL(file);
});
async function serverRecord(){
 const record=clone(db);
 record.pages=record.pages.filter(p=>p.group==='celebration'&&p.id.endsWith('-'+SERVER_ID));
 delete record._serverPending;delete record._serverRevision;
 async function persistImages(blocks){
  for(const block of blocks||[]){
   if(block.kind==='section'){
    for(const column of block.columns||[])await persistImages(column);
    continue;
   }
   for(const [field,source] of [['assetId','src'],['coverAssetId','cover']]){
    if(!block[field])continue;
    const file=fileRecords.get(block[field]);
    if(!file||!file.blob||!/^image\/(?:jpeg|png|webp)$/.test(file.type||'')||file.size>700000)
     throw Error('Une image est uniquement sur cet appareil. Téléchargez-la sur le site avant Enregistrer.');
    block[source]=await serverFileAsDataURL(file.blob);
    delete block[field];
   }
  }
 }
 for(const p of record.pages)await persistImages(p.blocks);
 const localization=clone(editorLocalization);
 for(const versions of Object.values(localization.pages||{}))
  for(const content of Object.values(versions||{}))
   await persistImages(content.blocks);
 return {record,localization};
}
async function serverSave(){
 // Private pages are stored by their own canonical guarded command, never legacy R2.
 if(privateEdit)return savePrivatePage();
 if(serverSaving){serverSaveQueued=true;return false}
 if(serverRevision===null){
  db._serverPending=true;
  serverMessage('❌ Impossible de joindre la version du serveur. Vos modifications sont conservées dans ce navigateur. Connectez-vous à nouveau à l’administration.');
  return false;
 }
 serverSaving=true;
 const button=el('save-btn');button.disabled=true;button.textContent='Enregistrement sur le serveur…';syncSecondarySave();
 button.classList.remove('save-confirmed','save-failed');
 serverMessage('Sauvegarde sécurisée en cours…');
 const started=serverLocalEditCounter;
 try{
  const {record,localization}=await serverRecord(),plans=plannedEntries();
  let shared;
  try{shared=JSON.parse(localStorage.getItem(SHARED_KEY)||'null')}catch{}
  // Always send the CURRENT in-memory page, not a stale localStorage copy.
  // Full browser storage may reject writes while server storage still works.
  shared={...(shared||{}),pages:db.pages.filter(p=>p.group==='page'),
   homeId:db.siteHomeId||'neutral-accueil-general'};
  const selected=(tab==='pages'||tab==='celebrations')?page():null;
  const pageId=selected?.id||null;
  if(serverDiverged){
   // A locally recovered draft must never overwrite newer server work quietly.
   if(!(await siteConfirm('Cette version locale diffère du serveur. Souhaitez-vous envoyer vos modifications ? Une copie locale de secours est conservée.'))){
    serverMessage('Modifications locales conservées ; rien n’a été écrasé sur le serveur.');
    return false;
   }
   serverDiverged=false;
  }
  let response,payload={};
  for(let attempt=0;attempt<2;attempt++){
   response=await fetch(SERVER_ENDPOINT,{method:'POST',cache:'no-store',
    headers:{...serverHeaders(),'content-type':'application/json'},
    body:JSON.stringify({celebration:SERVER_ID,expectedRevision:serverRevision,
     record,plans,shared,localization,...(pageId?{publishPageId:pageId}:{})})});
   payload=await response.json().catch(()=>({}));
   if(response.ok)break;
   if(response.status!==409||attempt===1)
    throw Error(payload.error||('Le serveur a refusé la sauvegarde (HTTP '+response.status+').'));
   const reload=await fetch(SERVER_ENDPOINT+'?celebration='+encodeURIComponent(SERVER_ID),{cache:'no-store'});
   if(!reload.ok)throw Error('Version du serveur indisponible après conflit.');
   const fresh=await reload.json();
   const unchanged=editorSyncPolicy.unchangedRemote(fresh,serverBaseRecord,serverBaseShared,serverBasePlans,serverBaseLocalization);
   serverRevision=fresh.revision;
   if(!unchanged){
    serverDiverged=true;
    throw Error('Une autre version de ces pages existe sur le serveur. Votre travail reste ici. Cliquez à nouveau sur Enregistrer pour décider.');
   }
  }
  if(!response?.ok)throw Error(payload.error||'Enregistrement refusé.');
  serverRevision=payload.revision;if(payload.celebrationMetadata)celebrationMetadata=payload.celebrationMetadata;
  serverBaseRecord=clone(record);serverBaseShared=clone(shared);
  serverBaseLocalization=clone(localization);
  serverBasePlans=clone(plans);
  const stillCurrent=editorSyncPolicy.noNewEdits(started,serverLocalEditCounter);
  db._serverRevision=serverRevision;db._serverPending=!stillCurrent;
  if(stillCurrent)dirty=false;
  if(!stillCurrent)serverSaveQueued=true;
  try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}
  // HTTP 200 is not a reliable success message unless the page can be read
  // back intact from the same server and its expected revision.
  let confirmed=false;
  try{
   const check=await fetch(SERVER_ENDPOINT+'?celebration='+encodeURIComponent(SERVER_ID),{cache:'no-store'});
   if(check.ok){
    const saved=await check.json();
    confirmed=editorSyncPolicy.readbackConfirmed(saved,payload.revision,pageId,record,shared,localization);
    if(confirmed){serverBaseRecord=clone(saved.record);serverBaseShared=clone(saved.shared);
     serverBasePlans=clone(saved.plans||[]);serverBaseLocalization=clone(saved.localization??null);}
   }
  }catch{}
  if(!confirmed){
   db._serverPending=true;
   try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}
   throw Error('Le serveur a accepté l’envoi, mais sa relecture ne confirme pas encore votre page.');
  }
  const live=!!payload.publishedPageId;
  const label=live?'✓ Enregistré et mis à jour sur le site public':
   '✓ Enregistré sur le serveur (brouillon)';
  button.textContent=label;button.classList.add('save-confirmed');syncSecondarySave();
  serverMessage(label+' — contenu revérifié après enregistrement.');
  clearTimeout(saveFeedbackTimer);
  saveFeedbackTimer=setTimeout(()=>{
   button.classList.remove('save-confirmed');
   if(!dirty)button.textContent='Enregistrer';
  },5000);
  return true;
 }catch(e){
  button.textContent='Échec — réessayer';button.classList.add('save-failed');
  db._serverPending=true;
  try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}
  serverMessage('❌ '+(e.message||'Erreur réseau')+' Modifications conservées sur cet appareil.');
  return false;
 }finally{
  serverSaving=false;button.disabled=false;syncSecondarySave();
  if(serverSaveQueued){
   serverSaveQueued=false;
   // Another edit made while the first save was in flight is never discarded.
   if(db._serverPending&&started!==serverLocalEditCounter)
    queueMicrotask(()=>{save();void serverSave()});
  }
 }
}
const UNDO_STEPS=36,UNDO_BYTES=6000000;
const editorUndoPolicy=createEditorUndoPolicy({steps:UNDO_STEPS,bytes:UNDO_BYTES});
let undoStack=[],undoAnchor=null,lastTyping='',lastTypedAt=0,historyReplaying=false;
function undoSnapshot(){return editorUndoPolicy.snapshot(db)}
function updateUndoButton(){
 const bt=document.getElementById('undo-btn');
 if(bt){
  bt.disabled=preview||undoStack.length===0;
  bt.setAttribute('aria-label','Annuler la dernière action');
 }
}
function resetUndoHistory(){
 undoStack=[];privateRedo=[];undoAnchor=undoSnapshot();lastTyping='';lastTypedAt=0;
 updateUndoButton();
}
function typingField(){
 const e=document.activeElement;
 if(!e)return '';
 if(e.isContentEditable||e.closest?.('[contenteditable="true"]'))
  return id+':'+(selectedBlockId||'')+':texte';
 if(e.matches?.('textarea,input[type="text"],input[type="search"],input[type="url"],input:not([type])'))
  return id+':'+(selectedBlockId||'')+':'+(e.getAttribute('aria-label')||e.placeholder||e.type);
 return '';
}
function rememberUndoChange(){
 const current=undoSnapshot();
 if(undoAnchor===null){undoAnchor=current;return}
 if(current===undoAnchor)return;
 if(privateEdit&&!historyReplaying)privateRedo=[];
 const result=editorUndoPolicy.record(undoStack,undoAnchor,current,
  typingField(),Date.now(),lastTyping,lastTypedAt);
 undoAnchor=result.anchor;lastTyping=result.lastTyping;lastTypedAt=result.lastTypedAt;
 updateUndoButton();
}
function undoLastEditorAction(){
 if(preview||!undoStack.length)return false;
 if(editorDragState)editorDragFinish(editorDragState,false);
 if(privateEdit)privateRedo.push(undoSnapshot());
 const prior=JSON.parse(undoStack.pop());
 // Remote publication is NEVER undone; preserve current visibility.
 db.pages=editorUndoPolicy.restorePages(prior.pages,db.pages);
 db.siteHomeId=prior.siteHomeId;
 if(prior.celebrationDates===null)delete db.celebrationDates;
 else db.celebrationDates=prior.celebrationDates;
 if(prior.celebrationTimes===null)delete db.celebrationTimes;
 else db.celebrationTimes=prior.celebrationTimes;
 if(!db.pages.some(p=>p.id===id))
  id=db.pages.find(p=>p.group==='celebration')?.id||db.pages[0]?.id||'home';
 selectedBlockId=null;blockEditSession=null;undoAnchor=undoSnapshot();lastTyping='';lastTypedAt=0;
 historyReplaying=true;mark();historyReplaying=false;render();updateUndoButton();
 status.textContent='↶ Action annulée — cliquez sur Enregistrer pour la conserver.';
 return true;
}
function redoPrivateEditorAction(){
 if(!privateEdit||preview||!privateRedo.length)return false;
 const next=JSON.parse(privateRedo.pop());undoStack.push(undoSnapshot());
 db.pages=editorUndoPolicy.restorePages(next.pages,db.pages);
 db.siteHomeId=next.siteHomeId;
 if(next.celebrationDates===null)delete db.celebrationDates;
 else db.celebrationDates=next.celebrationDates;
 if(next.celebrationTimes===null)delete db.celebrationTimes;
 else db.celebrationTimes=next.celebrationTimes;
 selectedBlockId=null;blockEditSession=null;undoAnchor=undoSnapshot();
 historyReplaying=true;mark();historyReplaying=false;render();
 return true;
}
function ensureUndoButton(){
 const actions=document.querySelector('.stage-editor .topbar .actions');
 if(!actions)return;
 let bt=document.getElementById('undo-btn');
 if(!bt){
  bt=n('button','btn editor-undo-button','↶');
  bt.id='undo-btn';bt.type='button';bt.title='Annuler (Ctrl+Z)';
  bt.onclick=()=>undoLastEditorAction();actions.prepend(bt);
 }
 updateUndoButton();
 if(privateEdit){
  let redo=document.getElementById('redo-btn');
  if(!redo){redo=n('button','btn editor-redo-button','↷');redo.id='redo-btn';redo.type='button';redo.title='Rétablir (Ctrl+Y)';redo.onclick=redoPrivateEditorAction;actions.prepend(redo);}
  redo.disabled=preview||!privateRedo.length;
 }else document.getElementById('redo-btn')?.remove();
}
document.addEventListener('keydown',event=>{
 if(tab==='members-spaces'||preview||!(event.ctrlKey||event.metaKey)||event.altKey)return;
 const key=String(event.key||'').toLowerCase();
 if(privateEdit&&(key==='y'||key==='z'&&event.shiftKey)){
  event.preventDefault();redoPrivateEditorAction();return;
 }
 if(event.shiftKey||key!=='z')return;
 const focus=document.activeElement;
 // Text fields keep their familiar native Ctrl+Z. Outside them, page
 // operations (move, add, delete, format) use our own history.
 if(focus&&(focus.isContentEditable||focus.closest?.('[contenteditable="true"]')||
  focus.matches?.('input,textarea')))return;
 if(undoStack.length){event.preventDefault();undoLastEditorAction()}
});
function syncSecondarySave(){
 const secondary=document.querySelector('.stage-editor .m022-save'),primary=el('save-btn');
 if(secondary&&primary){secondary.disabled=primary.disabled;secondary.textContent=primary.textContent;}
}
function saveCurrentContent(){if(IS_STAGE){save();void serverSave()}else save(true)}
function mark(){
 commitLocalizedView();
 if(IS_STAGE&&!privateEdit){serverLocalEditCounter++;db._serverPending=true;}
 dirty=true;rememberUndoChange();el('save-btn').textContent='Enregistrer •';
 syncSecondarySave();status.textContent='Modifications non enregistrées';
}
let saveFeedbackTimer=null;
function save(explicit=false){
 // Private M005 pages must NEVER enter localStorage or legacy editor R2.
 if(privateEdit){if(explicit)void savePrivatePage();return;}
 try{
  localStorage.setItem(KEY,JSON.stringify(db));saveShared();saveLocalizationLocal();dirty=false;
  window.EJBridge?.queueSave?.(clone(db));
  const button=el('save-btn');
  button.textContent='Enregistrer';button.classList.remove('save-failed');
  status.textContent='✓ Enregistré dans ce navigateur.';
  syncSecondarySave();refreshBlockEditBaseline();
  if(explicit===true){
   button.textContent='✓ Enregistré';button.classList.add('save-confirmed');
   const toast=el('editor-save-toast');if(toast){toast.textContent='✓ Enregistré';toast.hidden=false}
   clearTimeout(saveFeedbackTimer);
   saveFeedbackTimer=setTimeout(()=>{
    button.classList.remove('save-confirmed');
    if(!dirty)button.textContent='Enregistrer';
    if(toast)toast.hidden=true;
   },2800);
  }
 }catch{
  const button=el('save-btn');button.textContent='Échec';button.classList.add('save-failed');
  status.textContent='Enregistrement impossible : vérifiez l’espace disponible.';
 }
}
function enter(t,p){if(!adminMembersEnabled&&['members-spaces','participants','languages-categories'].includes(t))return;if(privateEdit){if(t==='members-spaces')closePrivatePage();return;}if(['members-spaces','participants','languages-categories'].includes(t))preview=false;if(dirty){save();if(dirty)return}if(p)id=p;clearLocaleView();selectedBlockId=null;blockEditSession=null;tab=t;render();}
let blockEditSession=null;
function refreshBlockEditBaseline(){
 if(!blockEditSession)return;
 const p=db.pages.find(p=>String(p.id)===blockEditSession.pageId);
 const location=p&&editorElementLocation(p,blockEditSession.blockId);
 if(!location){blockEditSession=null;return}
 blockEditSession.before=clone(location.block);
 blockEditSession.snapshot=undoSnapshot();
 blockEditSession.dirty=dirty;
 blockEditSession.pending=!!db._serverPending;
 blockEditSession.undoLength=undoStack.length;
}
function selectBlock(box){
 if(preview)return;
 const blockId=String(box.dataset.id),p=page();
 if(!blockEditSession||blockEditSession.blockId!==blockId||
    blockEditSession.pageId!==String(p.id)){
  const location=editorElementLocation(p,blockId);
  blockEditSession=location?{
   blockId,pageId:String(p.id),before:clone(location.block),
   snapshot:undoSnapshot(),dirty,pending:!!db._serverPending,
   undoLength:undoStack.length
  }:null;
 }
 selectedBlockId=blockId;
 const canvas=box.closest('.canvas');
 if(canvas)canvas.querySelectorAll('.block').forEach(el=>el.classList.toggle('is-selected',el===box));
}
function cancelBlockEdit(box){
 if(serverSaving){status.textContent='Enregistrement en cours : réessayez ensuite.';return}
 const session=blockEditSession,p=page();
 const location=editorElementLocation(p,box.dataset.id);
 if(session&&session.pageId===String(p.id)&&session.blockId===String(box.dataset.id)&&location){
  if(JSON.stringify(location.block)!==JSON.stringify(session.before)){
   location.array[location.index]=clone(session.before);
   if(undoSnapshot()===session.snapshot){
    // Reverting just this block must not create a phantom unsaved edit.
    dirty=session.dirty;
    db._serverPending=!!db._serverPending&&session.pending;
    if(undoStack.length>=session.undoLength)undoStack.length=session.undoLength;
    undoAnchor=undoSnapshot();lastTyping='';lastTypedAt=0;
    updateUndoButton();
    el('save-btn').textContent=dirty||db._serverPending?'Enregistrer •':'Enregistrer';
   }else{
    // Other edits remain untouched and are still saved through the normal path.
    mark();
   }
  }
 }
 selectedBlockId=null;blockEditSession=null;
 render();
 status.textContent='Modification de ce bloc annulée — vous restez dans l’administration.';
}
// New labels are visual hints, not text the visitor would see or save.
const STARTER_TEXT={heading:'Nouveau titre',text:'Votre paragraphe',button:'Mon bouton',event:'Titre de l’événement'};
async function validateBlock(box,button){
 if(button.disabled)return;
 // Important for the precise-time input: blur commits a freshly typed HH:MM.
 const focused=document.activeElement;
 if(focused&&box.contains(focused)&&focused!==button&&typeof focused.blur==='function')focused.blur();
 const needsSave=dirty||!!db._serverPending;
 button.disabled=true;button.textContent='Validation…';
 try{
  if(IS_STAGE&&typeof serverSave==='function'){
   if(dirty)save();
   if(dirty)return; // local persistence failed
   if(needsSave){
    await serverSave();
    // The server may refuse a conflict or be unreachable. Keep the editor open.
    if(db._serverPending)return;
   }
  }else{
   save(true);
   if(dirty)return;
  }
  // Do not hide an element the user has switched away from during the request.
  if(!box.isConnected||selectedBlockId!==String(box.dataset.id))return;
  selectedBlockId=null;blockEditSession=null;
  button.blur();
  // A full rerender removes the previously focused editor and its toolbar.
  // It can be re-opened with a new tap on the heading or paragraph.
  if(typeof render==='function')render();
  else box.classList.remove('is-selected');
 }finally{
  button.disabled=false;button.textContent='✓ Valider';
 }
}
// Pointer drag-and-drop moves the *original* block object between existing
// containers. No text/photo/video is copied, serialized or rewritten in transit.
const editorDragModel=createEditorDragModel({createSection:editorBlockModel.createSection});
function editorElementLocation(p,blockId){return editorDragModel.locate(p,blockId)}
function moveEditorElement(p,blockId,sectionId='',columnIndex=0,anchorId=null,after=false){
 return editorDragModel.move(p,blockId,sectionId,columnIndex,anchorId,after);
}
function moveEditorIntoBlock(p,sourceId,targetId,after=true){
 return editorDragModel.intoBlock(p,sourceId,targetId,after,()=>uniqueBlockId());
}
let editorDragState=null;
function editorDropTarget(p,x,y){
 const hit=document.elementFromPoint(x,y);
 const canvas=hit?.closest('.canvas');
 if(!canvas)return null;
 const block=hit.closest('.block[data-id]');
 if(block){
  const loc=editorElementLocation(p,block.dataset.id);
  if(!loc)return null;
  const rect=block.getBoundingClientRect(),after=y>=rect.top+rect.height/2;
  // Before this change, a drop over a historical standalone title or image
  // only moved ABOVE or BELOW it. The user expects it to go INSIDE the block.
  // Hover its central region to group both items into one editable zone.
  const edge=Math.min(16,rect.height*.18);
  if(!loc.sectionId&&y>rect.top+edge&&y<rect.bottom-edge){
   return {mode:'into-block',anchorId:block.dataset.id,after,
    indicator:block,indicatorClass:'editor-drop-into'};
  }
  return {sectionId:loc.sectionId,columnIndex:loc.columnIndex,
   anchorId:block.dataset.id,after,indicator:block,
   indicatorClass:after?'editor-drop-after':'editor-drop-before'};
 }
 const column=hit.closest('.section-column[data-column-index]');
 if(column){
  const section=column.closest('.content-section[data-section-id]');
  if(!section)return null;
  const col=Number(column.dataset.columnIndex);
  if(!Number.isInteger(col)||col<0||col>1)return null;
  const children=[...column.children].filter(el=>el.matches('.block[data-id]'));
  const next=children.find(el=>y<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2);
  return {sectionId:section.dataset.sectionId,columnIndex:col,
   anchorId:next?.dataset.id||null,after:false,
   indicator:next||column,indicatorClass:next?'editor-drop-before':'editor-drop-column'};
 }
 const insert=hit.closest('.section-insert[data-insert-index]');
 if(insert){
  const index=Number(insert.dataset.insertIndex);
  if(Number.isInteger(index)&&index>=0&&index<=p.blocks.length){
   const anchor=p.blocks[index];
   return {sectionId:'',columnIndex:0,anchorId:anchor?.id??null,
    after:false,indicator:insert,indicatorClass:'editor-drop-insert'};
  }
 }
 const section=hit.closest('.content-section[data-section-id]');
 if(section){
  // Dropping over a zone header, the empty center or its layout tools should
  // target that zone rather than merely placing the element beside the zone.
  const rect=section.getBoundingClientRect(),isTwo=section.dataset.layout==='columns';
  const col=isTwo&&x>=rect.left+rect.width/2?1:0;
  const cell=section.querySelector('.section-column[data-column-index="'+col+'"]')||section;
  return {sectionId:section.dataset.sectionId,columnIndex:col,anchorId:null,
   after:false,indicator:cell,indicatorClass:'editor-drop-column'};
 }
 // Blank space in the page canvas is also a valid destination.
 const next=[...canvas.children].filter(el=>el.matches('.block[data-id],.content-section[data-section-id]'))
  .find(el=>y<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2);
 return {sectionId:'',columnIndex:0,
  anchorId:next?.dataset.id||next?.dataset.sectionId||null,after:false,
  indicator:next||canvas,indicatorClass:next?'editor-drop-before':'editor-drop-column'};
}
function editorDragClearTarget(state){
 if(state?.target?.indicator)state.target.indicator.classList.remove(state.target.indicatorClass);
 state.target=null;
}
function editorDragShowTarget(state,target){
 if(state.target?.indicator===target?.indicator&&state.target?.indicatorClass===target?.indicatorClass)return;
 editorDragClearTarget(state);
 if(target?.indicator){
  state.target=target;
  target.indicator.classList.add(target.indicatorClass);
 }
}
function editorDragActivate(state){
 if(editorDragState!==state||state.active)return;
 state.active=true;
 if(state.timer)clearTimeout(state.timer);
const original=state.box;
 if(state.isTouch){
  // Mobile: a tap edits, but a long press turns into a drag, never both.
  // Suppress the synthetic click after a long press.
  original._suppressClickUntil=Date.now()+850;
  const active=document.activeElement;
  if(active&&original.contains(active)&&active.isContentEditable)active.blur();
  if(selectedBlockId===state.sourceId){
   selectedBlockId=null;blockEditSession=null;
   original.classList.remove('is-selected');
  }
 }
 if(document.getSelection)document.getSelection()?.removeAllRanges();
 original.classList.add('editor-drag-source');
 const label=original.querySelector('.ed,.editor-event-display,.picture img');
 const summary=String(label?.innerText||label?.alt||original.dataset.kind||'Élément')
  .replace(/\s+/g,' ').trim().slice(0,65);
 const ghost=document.createElement('div');ghost.className='editor-drag-ghost';
 ghost.textContent='⠿ '+(summary||'Élément');ghost.setAttribute('aria-hidden','true');
 document.body.append(ghost);state.ghost=ghost;
 document.body.classList.add('editor-reordering');
 editorDragUpdate(state,state.startX,state.startY);
}
function editorDragUpdate(state,x,y){
 if(!state.active)return;
 state.lastX=x;state.lastY=y;
 if(state.ghost)state.ghost.style.transform='translate('+Math.min(x+12,innerWidth-200)+'px,'+
   Math.min(y+15,innerHeight-62)+'px)';
 editorDragShowTarget(state,editorDropTarget(state.page,x,y));
 const margin=65;
 if(y<margin)window.scrollBy(0,-20);
 else if(y>innerHeight-margin)window.scrollBy(0,20);
}
function editorDragFinish(state,shouldMove=false){
 if(!state||editorDragState!==state)return false;
 editorDragState=null;
 if(state.timer)clearTimeout(state.timer);
 const destination=state.target;
 editorDragClearTarget(state);
 state.box?.classList.remove('editor-drag-source');
 state.ghost?.remove();
 document.body.classList.remove('editor-reordering');
 if(state.onMove)document.removeEventListener('pointermove',state.onMove);
 if(state.onUp)document.removeEventListener('pointerup',state.onUp);
 if(state.onCancel)document.removeEventListener('pointercancel',state.onCancel);
 try{
  if(state.handle?.hasPointerCapture?.(state.pointerId))
   state.handle.releasePointerCapture(state.pointerId);
 }catch{}
 if(!shouldMove||!state.active||!destination||preview)return false;
 const changed=destination.mode==='into-block'?
  moveEditorIntoBlock(state.page,state.sourceId,destination.anchorId,destination.after):
  moveEditorElement(state.page,state.sourceId,destination.sectionId,
   destination.columnIndex,destination.anchorId,destination.after);
 if(changed){
  selectedBlockId=null;blockEditSession=null;
  mark();render();
  status.textContent='Élément déplacé dans le brouillon — cliquez sur Enregistrer pour le conserver.';
 }
 return changed;
}
function startEditorPointerDrag(e,box,x,p,handle){
 if(!editorDragModel.pointerAllowed(e,preview))return;
 e.stopPropagation();
 if(editorDragState)editorDragFinish(editorDragState,false);
 const state={page:p,box,handle,sourceId:String(x.id),pointerId:e.pointerId,
  isTouch:e.pointerType==='touch'||e.pointerType==='pen',
  startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,
  active:false,target:null,ghost:null,timer:null};
 editorDragState=state;
 try{handle.setPointerCapture?.(e.pointerId)}catch{}
 state.onMove=ev=>{
  if(editorDragState!==state||ev.pointerId!==state.pointerId)return;
  if(!state.active){
   const intent=editorDragModel.pointerIntent(state,ev);
   if(intent==='cancel'){editorDragFinish(state,false);return}
   if(intent==='wait')return;
   editorDragActivate(state);
  }
  if(ev.cancelable)ev.preventDefault();
  editorDragUpdate(state,ev.clientX,ev.clientY);
 };
 state.onUp=ev=>{
  if(ev.pointerId!==state.pointerId)return;
  if(state.active)editorDragUpdate(state,ev.clientX,ev.clientY);
  editorDragFinish(state,true);
 };
 state.onCancel=ev=>{if(ev.pointerId===state.pointerId)editorDragFinish(state,false)};
 document.addEventListener('pointermove',state.onMove,{passive:false});
 document.addEventListener('pointerup',state.onUp);
 document.addEventListener('pointercancel',state.onCancel);
 if(state.isTouch)state.timer=setTimeout(()=>{
  if(editorDragState===state)editorDragActivate(state);
 },430);
}
function editorMoveHandle(box,x,p){
 const handle=n('button','editor-move-handle','⠿');
 handle.type='button';handle.title='Glisser pour déplacer cet élément';
 handle.setAttribute('aria-label','Déplacer : glisser cet élément vers un autre bloc ou une autre colonne');
 handle.setAttribute('aria-grabbed','false');
 handle.draggable=false;handle.ondragstart=e=>e.preventDefault();
 handle.oncontextmenu=e=>e.preventDefault();
 handle.onpointerdown=e=>startEditorPointerDrag(e,box,x,p,handle);
 handle.onkeydown=e=>{if(e.key==='Escape'&&editorDragState){
  editorDragFinish(editorDragState,false);e.preventDefault()
 }};
 return handle;
}
function enableTouchLongPressDragging(box,x,p){
 // On devices without hover the whole unselected element is the drag target.
 // Keep ordinary taps and editing controls intact.
 box.addEventListener('pointerdown',e=>{
  if(preview||!['touch','pen'].includes(e.pointerType)||
     box.classList.contains('is-selected'))return;
  if(e.target.closest('.editor-move-handle,.tools,button,input,select,textarea,a,.existing-block-add,.formatbar,.custom-divider-settings,.block-validate-actions,.link-line,.block-edit-actions'))return;
  startEditorPointerDrag(e,box,x,p,box);
 });
 box.addEventListener('touchmove',e=>{
  // A held element can move without triggering page scrolling; ordinary scroll stays native.
  if(editorDragState?.box===box&&editorDragState.active&&e.cancelable)e.preventDefault();
 },{passive:false});
 box.addEventListener('contextmenu',e=>{
  if(editorDragState?.box===box&&editorDragState.isTouch)e.preventDefault();
 });
}
function visibilityEyeIcon(willHide){
 // Actual SVG eye (with an optional slash), never a device-dependent glyph.
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('class','visibility-eye-icon');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('fill','none');
 svg.setAttribute('stroke','currentColor');
 svg.setAttribute('stroke-width','1.8');
 svg.setAttribute('stroke-linecap','round');
 svg.setAttribute('stroke-linejoin','round');
 svg.setAttribute('aria-hidden','true');
 const eye=document.createElementNS(ns,'path');
 eye.setAttribute('d','M2 12c2.4-4 5.8-6 10-6s7.6 2 10 6c-2.4 4-5.8 6-10 6S4.4 16 2 12Z');
 const iris=document.createElementNS(ns,'circle');
 iris.setAttribute('cx','12');iris.setAttribute('cy','12');iris.setAttribute('r','3');
 svg.append(eye,iris);
 if(willHide){
  const slash=document.createElementNS(ns,'path');
  slash.setAttribute('d','M3 21 21 3');
  slash.setAttribute('stroke-width','2.5');
  svg.append(slash);
 }
 return svg;
}
function block(x,p,items=p.blocks,section=null){
 const box=n('div','block');box.style.textAlign=ALIGNMENTS.includes(x.align)?x.align:'left';box.dataset.id=x.id;box.dataset.kind=x.kind;
 if(x.hideOnSite){
  box.classList.add('hidden-on-public');
  if(!preview)box.append(n('small','hidden-public-note','Invisible aux visiteurs'));
 }
 if(x.kind!=='event'&&x.atTime&&validTime(x.atTime))box.append(n('time','block-insert-time',x.atTime));
 if(!preview){
  // Desktop mouse hover shows the grip; mobile long press starts the same drag.
  // Editing controls and media are unchanged until an actual drop.
  box.append(editorMoveHandle(box,x,p));
  enableTouchLongPressDragging(box,x,p);
  const tools=n('div','tools'),i=items.indexOf(x);
  const buttons=[
   ['↑','Monter',()=>{if(i>0){items.splice(i,1);items.splice(i-1,0,x);mark();render()}}],
   ['↓','Descendre',()=>{if(i<items.length-1){items.splice(i,1);items.splice(i+1,0,x);mark();render()}}],
   ['⧉','Dupliquer',()=>duplicateBlock(x,p,items)],
   ['✕','Supprimer',async ()=>{if((await siteConfirm(x.kind==='image'?'Retirer cette image de la page ? Elle restera dans la bibliothèque de fichiers.':'Supprimer cet élément ?'))){items.splice(items.indexOf(x),1);mark();render()}}]
  ];
  buttons.splice(2,0,[null,
   x.hideOnSite===true?'Afficher cet élément aux visiteurs':'Masquer cet élément aux visiteurs',
   ()=>{
    x.hideOnSite=x.hideOnSite!==true;
    mark();render();
   }]);
  if(section&&section.layout==='columns'){
   const other=section.columns[0]===items?1:0;
   buttons.splice(2,0,[other===0?'←':'→','Déplacer '+(other===0?'à gauche':'à droite'),()=>{
    items.splice(items.indexOf(x),1);section.columns[other].push(x);mark();render();
   }]);
  }
  for(const [txt,title,fn] of buttons){
   const bt=n('button',title==='Supprimer'?'danger':'',txt===null?'':txt);
   if(txt===null)bt.append(visibilityEyeIcon(x.hideOnSite!==true));
   bt.type='button';bt.title=title;bt.setAttribute('aria-label',title);bt.onclick=fn;tools.append(bt);
  }
  box._tools=tools;
 }
 if(['heading','text','button','event'].includes(x.kind)){
  const href=x.kind==='button'?buttonHref(x):'';
  if(x.kind==='button'&&preview&&href){const a=n('a','link-block',x.text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';box.append(a)}
  else{
   const z=n('div','ed '+(x.kind==='heading'||x.kind==='event'?'heading':x.kind==='text'?'text':'link-block'));
   if(x.kind!=='button'&&typeof x.rich==='string'&&x.rich){z.innerHTML=htmlSafe(x.rich);restoreInlineColours(z)}else z.textContent=x.text||'';
   z.contentEditable=String(!preview);z.dataset.placeholder=STARTER_TEXT[x.kind]||'Touchez pour écrire…';z.setAttribute('role','textbox');
   if(x.kind!=='button'){
    // A single main heading per page; later headings are readable subheadings.
    const isPrimary=x.kind==='heading'&&pageMainTitle(p)===x;
    if(x.kind==='heading'||x.kind==='event')z.classList.add(isPrimary?'heading-primary':'heading-secondary');
    z.style.fontSize=displayedHeadingSize(x,p)+'px';
    if(x.bold)z.style.fontWeight='700';
    if(x.italic)z.style.fontStyle='italic';
    if(validColor(x.color))z.style.color=x.color;
   }
   z.onfocus=()=>{
    selectBlock(box);
    // Older drafts contain real starter labels. One tap selects the whole
    // label so the next keystroke replaces it, including on Android.
    if(!preview&&!x.rich&&x.text===STARTER_TEXT[x.kind])
     requestAnimationFrame(()=>{
      if(!z.isConnected||document.activeElement!==z||z.innerText!==STARTER_TEXT[x.kind])return;
      const range=document.createRange(),selection=window.getSelection();
      if(!selection)return;
      range.selectNodeContents(z);selection.removeAllRanges();selection.addRange(range);
     });
   };
   z.addEventListener('pointerdown',()=>{if(rememberedSelection?.host===z)rememberedSelection=null});
   z.addEventListener('keydown',()=>{if(rememberedSelection?.host===z)rememberedSelection=null});
   z.oninput=()=>{rememberedSelection=null;saveRich(x,z)};
   z.onpaste=e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))};
   if(x.kind==='event'){
    const line=n('div','editor-event-display');
    if(validTime(x.atTime))line.append(n('time','editor-event-hour',x.atTime+' — '));
    line.append(z);box.append(line);
   }else box.append(z);
   if(x.kind!=='button'&&!preview)box.append(editorFormatToolbar(x,z,box));
   if(x.kind==='event'&&!preview){
    const timeRow=timeChooser(x.atTime,'Heure de l’événement',hour=>{
     x.atTime=hour;mark();
     // Do not recreate a focused contenteditable while its blur event fires.
     const line=box.querySelector('.editor-event-display');
     let marker=line?.querySelector('time.editor-event-hour');
     if(!hour){if(marker)marker.remove()}
     else if(marker)marker.textContent=hour+' — ';
     else if(line){marker=n('time','editor-event-hour',hour+' — ');line.prepend(marker)}
    });
    timeRow.classList.add('event-time');box.append(timeRow);
   }
  }
  if(x.kind==='button'&&!preview){
   const row=n('div','link-line'),inp=n('input','link-input');inp.type='url';inp.value=x.assetId?'':x.href||'';inp.placeholder='Adresse https:// ou /';inp.setAttribute('aria-label','Adresse du bouton');
   inp.onchange=()=>{const v=inp.value.trim();if(v&&!validHref(v)){siteNotice('Adresse incorrecte : utilisez https:// ou un chemin commençant par /');inp.value=x.href||'';return}x.href=v;delete x.assetId;x.displayAsButton=true;delete x.cover;delete x.coverAssetId;mark();render()};
   row.append(inp);const pick=b('📎 Choisir un fichier',()=>chooseFile(x),'sm');pick.dataset.action='choose-asset';row.append(pick);
   if(x.assetId)row.append(n('small','file-chosen','Fichier : '+(fileRecords.get(x.assetId)?.name||'introuvable')));
   box.append(row);
   const actions=n('div','block-edit-actions');
   if(videoInfo(x.href)||/\.(?:mp4|webm|ogg)(?:[?#]|$)/i.test(String(x.href||''))){
    actions.append(b('Afficher comme vidéo avec titre',()=>{
     x.kind='video';delete x.displayAsButton;delete x.assetId;mark();render();
    },'sm'));
   }
   if(actions.childElementCount)box.append(actions);
   if(x.displayAsButton!==true&&validHref(x.href)&&/^https:\/\//.test(x.href)){
    const previewLink=n('div','editor-link-preview');
    const vi=videoInfo(x.href),cover=(x.coverAssetId?assetUrls.get(x.coverAssetId):x.cover)||vi?.thumbnail;
    if(cover){const img=n('img');img.src=cover;img.alt='Miniature';previewLink.append(img)}
    else previewLink.append(websiteThumb(x.href,x.text));
    box.append(previewLink);
   }
  }
 }
 if(x.kind==='audio'){
  const wrap=n('div','audio-block');
  const key=x.remoteKey;
  const src=key&&/^editor-trials\/audio\/[0-9a-f-]{36}\.mp3$/.test(key)
    ?'/api/editor-trial-audio?action=stream&key='+encodeURIComponent(key)
    :window.EJBridge?.remote&&/^https:\/\//.test(String(x.src||''))?x.src:(/^\/media\/(?!.*\.\.)[^?#]+\.mp3$/i.test(String(x.src||''))?x.src:'');
  if(src){
   const audio=n('audio','audio-player');audio.controls=true;audio.preload='none';audio.src=src;
   wrap.append(audio);box.append(wrap);
  }
  if(!preview){
   const title=n('label','audio-title-field','Titre de l’audio');
   const input=n('input');input.type='text';input.maxLength=180;
   input.value=String(x.text||'').replace(/^MP3 à choisir$/,'');
   input.setAttribute('aria-label','Titre du lecteur audio');
   input.onchange=()=>{x.text=input.value.trim().slice(0,180);mark()};
   title.append(input);box.append(title);
   const actions=n('div','block-edit-actions');
   actions.append(b('Choisir un MP3',e=>{
    e.stopPropagation();mediaReturnTab=tab;mediaCategory='audios';
    chosenBlock=x;tab='media';render();
   },'sm'));
   box.append(actions);
  }
 }
 if(x.kind==='video'){
  const href=validHref(x.href)?x.href:'',v=videoInfo(href),cover=(x.coverAssetId?(assetUrls.get(x.coverAssetId)||''):x.cover)||v?.thumbnail||'';
  const visual=n('div','editor-video-preview');
  if(cover){const img=n('img');img.src=cover;img.alt=x.text||'Vidéo';img.loading='lazy';visual.append(img)}
  else if(href)visual.append(websiteThumb(href,x.text||'Lien vidéo'));
  else visual.append(n('span','','▶ Vidéo'));
  box.append(visual);
  // A video title is a plain caption below the thumbnail, never a link button.
  const videoCaption=n('div','editor-video-title',x.text||'');
  videoCaption.hidden=!String(x.text||'').trim();box.append(videoCaption);
  if(!preview){
   const row=n('div','link-line'),inp=n('input','link-input');inp.type='url';
   inp.value=x.href||'';inp.placeholder='Lien YouTube, Vimeo, site ou vidéo';
   inp.setAttribute('aria-label','Lien de la vidéo');
   inp.oninput=()=>{
    const entered=inp.value.trim();
    if(entered&&!validHref(entered))return;
    x.href=entered;mark();
    const v=videoInfo(entered),source=(x.coverAssetId?assetUrls.get(x.coverAssetId):x.cover)||v?.thumbnail;
    visual.replaceChildren();
    if(source){const img=n('img');img.src=source;img.alt=x.text||'Vidéo';img.loading='lazy';visual.append(img)}
    else if(entered)visual.append(websiteThumb(entered,x.text||'Lien vidéo'));
    else visual.append(n('span','','▶ Vidéo'));
   };
   inp.onchange=()=>{if(inp.value&&!validHref(inp.value)){siteNotice('Lien invalide');inp.value=x.href||''}};
   row.append(inp,b('📎 Choisir une vidéo du site',()=>chooseFile(x),'sm'));
   box.append(row);
   const title=n('input','link-input');title.value=x.text||'';title.placeholder='Titre de la vidéo';
   title.setAttribute('aria-label','Titre de la vidéo');
   title.oninput=()=>{x.text=title.value;videoCaption.textContent=x.text;
    videoCaption.hidden=!String(x.text||'').trim();mark()};
   box.append(title);
   const actions=n('div','block-edit-actions');
   actions.append(b('Miniature',()=>showImagePicker(x,true),'sm'));box.append(actions);
  }
 }
if(x.kind==='divider'){
  const color=validColor(x.color)?x.color:'#858c94';
  const thickness=Number.isInteger(x.thickness)&&x.thickness>=1&&x.thickness<=8?x.thickness:1;
  const lineWidth=Number.isInteger(x.widthPct)&&x.widthPct>=20&&x.widthPct<=100?x.widthPct:60;
  const previewLine=n('div','custom-divider-line');
  previewLine.style.backgroundColor=color;
  previewLine.style.height=thickness+'px';previewLine.style.width=lineWidth+'%';
  previewLine.setAttribute('role','separator');previewLine.setAttribute('aria-label','Trait de séparation');
  const holder=n('div','custom-divider-preview');holder.append(previewLine);box.append(holder);
  if(!preview){
   const settings=n('div','custom-divider-settings');
   const colorInput=n('input');colorInput.type='color';colorInput.value=color;
   colorInput.setAttribute('aria-label','Couleur du trait de séparation');
   colorInput.oninput=()=>{
    x.color=colorInput.value;previewLine.style.backgroundColor=x.color;mark();
   };
   const thicknessInput=n('select');thicknessInput.setAttribute('aria-label','Épaisseur du trait de séparation');
   for(let i=1;i<=8;i++){
    const option=n('option','',i+' px');option.value=String(i);option.selected=i===thickness;
    thicknessInput.append(option);
   }
   thicknessInput.onchange=()=>{
    x.thickness=Number(thicknessInput.value);previewLine.style.height=x.thickness+'px';mark();
   };
   const lengthInput=n('input');lengthInput.type='range';lengthInput.min='20';lengthInput.max='100';
   lengthInput.step='5';lengthInput.value=String(lineWidth);
   lengthInput.setAttribute('aria-label','Longueur du trait de séparation en pourcentage');
   const lengthText=n('span','divider-length-label',lineWidth+' %');
   lengthInput.oninput=()=>{
    x.widthPct=Number(lengthInput.value);
    previewLine.style.width=x.widthPct+'%';lengthText.textContent=x.widthPct+' %';mark();
   };
   const label=(caption,input)=>{
    const field=n('label','custom-divider-field',caption);field.append(input);return field;
   };
   settings.append(label('Couleur',colorInput),label('Épaisseur',thicknessInput),
    label('Longueur',lengthInput),lengthText);
   box.append(settings);
  }
}
if(x.kind==='image'){
  const pic=n('div','picture');
  // A stale browser-local ID MUST NOT shadow an existing hosted photo URL.
  // This was one reason a photo could appear live but look blank in the editor.
  const localUrl=x.assetId?(assetUrls.get(x.assetId)||''):'';
  const hostedUrl=typeof x.src==='string'&&validHref(x.src)?x.src:'';
  const src=localUrl||hostedUrl;
  const imageSize=Number.isInteger(x.widthPct)&&x.widthPct>=20&&x.widthPct<=100?x.widthPct:100;
  pic.style.width=imageSize+'%';pic.style.maxWidth='100%';
  pic.style.minHeight='0';pic.style.background='none';pic.style.marginInline='auto';
  if(src){
   const img=n('img');img.src=src;img.alt=x.text||'Image';img.loading='eager';
   img.style.width='100%';img.style.height='auto';img.style.objectFit='contain';
   img.onerror=()=>{
    // Retry the durable server image when a device-only blob is stale.
    if(localUrl&&hostedUrl&&img.src!==new URL(hostedUrl,location.href).href){
     img.src=hostedUrl;return;
    }
    pic.classList.add('image-load-error');
    img.hidden=true;
    if(pic.querySelector('.image-load-note'))return;
    const info=n('div','image-load-note');
    info.append(n('strong','','L’image n’a pas pu se charger dans l’administration.'));
    info.append(n('p','','Vous pouvez la réutiliser depuis la version du site ou choisir une autre image.'));
    info.append(b('Reprendre l’image du site',e=>{
     e.stopPropagation();void restorePageImageFromPublished(p,x);
    },'sm'));
    pic.append(info);
   };
   pic.append(img);
  }else{
   pic.append(n('span','','＋ Image'));
   if(!preview&&x.assetId){
    const restore=b('Reprendre l’image du site',e=>{
     e.stopPropagation();void restorePageImageFromPublished(p,x);
    },'sm');restore.className+=' image-restore';pic.append(restore);
   }
  }
  box.append(pic);
  if(!preview){
   pic.classList.add('image-choose');
   pic.title=src?'Ajuster la taille de l’image':'Choisir une image';
   pic.setAttribute('role','button');pic.tabIndex=0;
   pic.setAttribute('aria-label',src?'Sélectionner l’image pour régler sa taille':'Choisir une image');
   const activate=e=>{e.stopPropagation();if(src)selectBlock(box);else showImagePicker(x)};
   pic.onclick=activate;
   pic.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(e)}};
   if(src){
    const sizing=n('div','image-size-control'),label=n('label','image-size-label','Taille de l’image');
    const input=n('input','image-size-slider'),value=n('output','image-size-value',imageSize+' %');
    input.type='range';input.min='20';input.max='100';input.step='5';input.value=String(imageSize);
    input.id='image-size-'+String(x.id).replace(/[^a-z0-9-]/gi,'-');
    input.setAttribute('aria-label','Taille de l’image en pourcentage');
    label.htmlFor=input.id;value.htmlFor=input.id;
    const resize=()=>{
     const size=Number(input.value);
     if(!Number.isFinite(size)||size<20||size>100)return;
     x.widthPct=Math.round(size);pic.style.width=size+'%';value.textContent=size+' %';
     mark();
     status.textContent='Taille réglée à '+size+' % dans le brouillon. Pour voir le changement sur le site public, utilisez « Publier cette taille ».';
    };
    input.oninput=resize;input.onchange=resize;
    sizing.append(label,input,value);
    // Publishing remains a separate explicit action; the Validate button
    // continues to save privately without altering the visitor site.
    if(IS_STAGE){
     const publish=b('Publier cette taille',async e=>{
      e.stopPropagation();publish.disabled=true;
      const success=await serverPublish({kind:'page',pageId:p.id,visibility:'published'});
      publish.disabled=false;
      if(success){
       selectedBlockId=null;render();
       status.textContent='✓ Taille publiée : la page visible par les visiteurs est mise à jour.';
      }
     },'sm image-publish-size');
     publish.setAttribute('aria-label','Publier cette nouvelle taille sur le site des visiteurs');
     publish.title='Enregistrer la taille et mettre à jour la page publique';
     sizing.append(publish);
    }
    box.append(sizing);
   }
   const actions=n('div','block-edit-actions image-direct-actions');
   const upload=b('Télécharger une image',e=>{e.stopPropagation();startImageUpload(x)},'sm');
   upload.dataset.action='upload-image';actions.append(upload);
   const pick=b('Images du site',e=>{e.stopPropagation();showImagePicker(x)},'sm');
   pick.dataset.action='choose-asset';actions.append(pick);
   if(src){
    const remove=b('Supprimer l’image',e=>{e.stopPropagation();removeImageFromBlock(x)},'block-remove-image');
    remove.dataset.action='remove-image';actions.append(remove);
   }
   box.append(actions);
  }
 }
 if(box._tools)box.append(box._tools);
 if(!preview){
  const row=n('div','block-validate-actions');
  row.setAttribute('role','group');row.setAttribute('aria-label','Terminer la modification');
  // Image removal is shown directly under the picture, not in the Validate dock.
  const validate=b('✓ Valider',e=>{e.stopPropagation();void validateBlock(box,validate)},'block-validate-button');
  validate.setAttribute('aria-label','Valider cet élément et enregistrer le brouillon');
  const cancel=b('Annuler',e=>{e.stopPropagation();cancelBlockEdit(box)},'block-cancel-button');
  cancel.setAttribute('aria-label','Annuler les modifications de cet élément sans quitter l’administration');
  row.append(cancel,validate);box.append(row);
 }
 // Older single-element blocks get the green plus without losing any data.
 // The actual section conversion only occurs after choosing a new item.
 if(!preview&&!section&&items===p.blocks&&p.blocks.includes(x))
   box.append(existingBlockAddControls(x,p,box));
 if(!preview){
   box.onclick=e=>{
    if(Date.now()<(box._suppressClickUntil||0)){e.preventDefault();e.stopPropagation();return}
    selectBlock(box);
   };
   if(selectedBlockId===String(x.id))box.classList.add('is-selected');
 }
 return box;
}
function videoInfo(href){
 try{
  const u=new URL(String(href||'')),host=u.hostname.toLowerCase();
  let id='';
  if(['youtu.be','www.youtu.be'].includes(host))id=u.pathname.split('/')[1];
  else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host))
   id=u.searchParams.get('v')||(u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)||[])[1];
  if(/^[\w-]{11}$/.test(id||''))return {provider:'youtube',id,thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',embed:'https://www.youtube-nocookie.com/embed/'+id};
  if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
   const m=u.pathname.match(/(?:\/video)?\/(\d{6,12})(?:\/|$)/);
   if(m)return {provider:'vimeo',id:m[1],thumbnail:'https://vumbnail.com/'+m[1]+'.jpg',embed:'https://player.vimeo.com/video/'+m[1]};
  }
 }catch{}
 return null;
}
function websiteThumb(href,title){
 const card=n('div','site-thumbnail');
 try{
  const url=new URL(href);
  const favicon=n('img','site-preview-icon');favicon.src=url.origin+'/favicon.ico';favicon.alt='';
  favicon.onerror=()=>favicon.remove();card.append(favicon);
  card.append(n('span','site-preview-domain',url.hostname));
 }catch{}
 card.append(n('strong','site-preview-title',title||'Site'));return card;
}
function startImageUpload(x,cover=false){
 target=x;imageCoverTarget=cover;
 const picker=el('image-input');
 if(picker)picker.click();
}
// A draft may still hold a local device-only assetId while the original
// public photo already has a stable /media/ URL. Do not silently overwrite the
// draft: offer an explicit restoration button using the published/archived page.
const mediaBlocks=blocks=>{
 const output=[];
 for(const item of blocks||[]){
  if(item?.kind==='section'){for(const column of item.columns||[])output.push(...mediaBlocks(column))}
  else if(item)output.push(item);
 }
 return output;
};
function findImageByHeading(page,image,source){
 if(!page||!source)return '';
 const current=mediaBlocks(page.blocks),target=mediaBlocks(source.blocks);
 const pos=current.indexOf(image);
 const before=pos<0?current:current.slice(0,pos);
 const heading=before.slice().reverse().find(b=>b.kind==='heading')?.text;
 if(heading){
  const at=target.findIndex(b=>b.kind==='heading'&&String(b.text||'').trim()===String(heading).trim());
  if(at>=0){
   const next=target.slice(at+1).findIndex(b=>b.kind==='heading');
   const group=target.slice(at+1,next>=0?at+1+next:undefined);
   const found=group.find(b=>b.kind==='image'&&validHref(b.src));
   if(found)return found.src;
  }
 }
 const same=target.find(b=>String(b.id)===String(image.id)&&b.kind==='image'&&validHref(b.src));
 return same?.src||'';
}
async function restorePageImageFromPublished(page,image){
 let url='';
 for(const candidate of window.__PREPARATION_SEED__?.pages||[]){
  if(candidate.id===page.id){url=findImageByHeading(page,image,candidate);if(url)break}
 }
 if(!url){
  try{
   const cid=String(window.__PREPARATION_SEED__?.celebrationId||'101');
   const res=await fetch('/api/editor-publication?celebration='+encodeURIComponent(cid),{cache:'no-store'});
   if(res.ok){
    const result=await res.json();
    const published=[...(result.record?.pages||[]),...(result.shared?.pages||[])];
    const same=published.find(p=>p.id===page.id);
    if(same)url=findImageByHeading(page,image,same);
   }
  }catch{}
 }
 if(!url){siteNotice('Impossible de retrouver automatiquement cette image. Choisissez-la dans « Images du site ».');return}
 image.src=url;delete image.assetId;
 mark();render();
}
async function removeImageFromBlock(x){
 if(!(await siteConfirm('Retirer cette image de la page ? Elle restera dans la médiathèque.')))return;
 x.src='';delete x.assetId;x.text='';delete x.widthPct;
 mark();render();
}
function showImagePicker(x,cover=false){
 const dialog=n('dialog','image-picker-dialog');
 const header=n('div','image-picker-header');
 const title=n('h3','image-picker-title',cover?'Choisir une miniature':'Images du site');
 title.id='image-picker-heading';
 dialog.setAttribute('aria-labelledby',title.id);
 const close=b('×',()=>dialog.close(),'image-picker-close');
 close.setAttribute('aria-label','Fermer la fenêtre');
 close.title='Fermer';header.append(title,close);dialog.append(header);
 const grid=n('div','image-picker-grid');
 grid.setAttribute('role','group');grid.setAttribute('aria-label','Images disponibles');
 dialog.append(grid);
 const actions=n('div','file-actions image-picker-footer');
 actions.append(b('Télécharger une image',()=>{
  dialog.close();startImageUpload(x,cover);
 },'primary sm'));
 // A web image keeps its external URL. Nothing is copied or removed remotely.
 actions.append(b('Lien d’une image web',async ()=>{
  const entered=String((await sitePrompt('Adresse HTTPS de l’image :'))||'').trim();
  if(!entered)return;
  let url;try{url=new URL(entered)}catch{siteNotice('Adresse invalide');return}
  if(url.protocol!=='https:'||url.username||url.password){siteNotice('Lien HTTPS requis');return}
  if(cover){x.cover=url.href;delete x.coverAssetId}
  else{x.src=url.href;delete x.assetId}
  mark();dialog.close();render();
 },'sm'));
 actions.append(b('Annuler',()=>dialog.close(),'sm'));
 dialog.append(actions);
 const choose=(source)=>{
  editorMediaCommands.chooseImage(x,source,cover);
  mark();dialog.close();render();
 };
 const populate=()=>{
  grid.replaceChildren();
  const {entries,local}=mediaCatalogue.imageItems({
   historical:[...(globalFiles||[]),...publicFiles()],
   pages:[...(db.pages||[]),...(window.__PREPARATION_SEED__?.pages||[])],
   globalMedia,fileRecords:[...fileRecords.values()],assetUrls
  });
  function imageCard(name,url,onChoose){
   const item=b('',onChoose,'sm image-picker-card');
   item.title=name;item.setAttribute('aria-label','Choisir '+name);
   const preview=n('span','image-picker-thumbnail');
   const thumb=n('img');thumb.src=url;thumb.alt=name;thumb.loading='eager';
   // A card has one bounded thumbnail and one separately readable filename.
   // Raw image + text children in an implicit grid produced stacked fragments.
   thumb.onerror=()=>{preview.classList.add('image-picker-unavailable')};
   preview.append(thumb);
   const label=n('span','image-picker-filename',name);
   item.append(preview,label);
   return item;
  }
  for(const image of entries){
   grid.append(imageCard(image.name,image.src,()=>choose({src:image.src})));
  }
  for(const record of local){
   grid.append(imageCard(record.name,record.src,()=>choose({assetId:record.assetId})));
  }
  if(!grid.childElementCount)grid.append(n('p','image-picker-empty','Aucune image disponible'));
 };
 document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
 populate();if(!globalFiles)loadGlobalFiles().then(()=>{if(dialog.open)populate()});
 if(IS_STAGE&&!globalMediaLoaded)void refreshGlobalMedia().then(()=>{
  if(dialog.open)populate();
 });
}
function createContent(kind){return editorBlockModel.createContent(kind,uniqueBlockId(),STARTER_TEXT)}
function add(kind){const p=page(),x=createContent(kind);selectedBlockId=String(x.id);p.blocks.push(x);mark();render()}
function toggleInsertionMenu(menu,trigger,title){
 const mobile=window.matchMedia('(max-width:650px), (hover:none), (pointer:coarse)').matches;
 if(!mobile){
  menu.hidden=!menu.hidden;
  trigger.setAttribute('aria-expanded',String(!menu.hidden));
  return;
 }
 const open=document.querySelector('dialog.editor-insert-dialog[open]');
 if(open)open.close();
 const modal=n('dialog','editor-insert-dialog');
 modal.setAttribute('aria-label',title);
 const header=n('div','editor-insert-dialog-header');
 header.append(n('h3','',title),
  b('Fermer',()=>modal.close(),'editor-insert-dialog-close'));
 const options=n('div','editor-insert-dialog-options');
 const parent=menu.parentNode,next=menu.nextSibling;
 menu.hidden=false;
 options.append(menu);modal.append(header,options);
 document.body.append(modal);
 trigger.setAttribute('aria-expanded','true');
 const onChoice=event=>{
  if(event.target.closest('button'))
   queueMicrotask(()=>{if(modal.open)modal.close()});
 };
 menu.addEventListener('click',onChoice,true);
 modal.addEventListener('click',event=>{
  if(event.target===modal)modal.close();
 });
 modal.addEventListener('close',()=>{
  menu.removeEventListener('click',onChoice,true);
  menu.hidden=true;
  if(parent.isConnected)parent.insertBefore(menu,next?.parentNode===parent?next:null);
  trigger.setAttribute('aria-expanded','false');
  modal.remove();
 },{once:true});
 modal.showModal();
}
function existingBlockAddControls(original,p,box){
 const controls=n('div','existing-block-add'),menu=n('div','existing-block-add-menu');
 const add=b('＋',event=>{
  event.stopPropagation();
  toggleInsertionMenu(menu,add,'Ajouter un élément dans ce bloc');
 },'section-add-green existing-block-add-button');
 add.title='Ajouter dans ce bloc';
 add.setAttribute('aria-label','Ajouter dans ce bloc');
 add.setAttribute('aria-expanded','false');
 menu.hidden=true;
 for(const [label,kind] of [['Titre','heading'],['Image','image'],['Texte','text'],
   ['Titre événement','event'],['Bouton','button'],['Vidéo','video'],['Lecteur audio','audio'],['Trait de séparation','divider']]){
  menu.append(b(label,event=>{
   event.stopPropagation();
   const index=p.blocks.indexOf(original);
   if(index<0)return;
   const added=createContent(kind);
   // Keep the original item and its saved rich text, photos and formatting.
   const section=editorBlockCommands.wrapRootBlock(p,original,added,uniqueBlockId());
   if(!section)return;
   selectedBlockId=String(added.id);
   mark();render();
  },'sm'));
 }
 controls.append(add,menu);
 return controls;
}
function addSection(p,index,layout){
 const section=editorBlockModel.createSection(uniqueBlockId(),layout,[[],[]]);
 p.blocks.splice(index,0,section);selectedBlockId=null;mark();render();
}
// Presets are ordinary editable sections, not separate locked widgets:
function addResourcePreset(p,index,kind='resource'){
 const {section,selectedIndex}=editorBlockModel.createResourcePreset(kind,uniqueBlockId(),createContent);
 p.blocks.splice(index,0,section);
 selectedBlockId=String(section.columns[selectedIndex][0].id);
 mark();render();
}
function sectionMenu(p,index){
 const wrap=n('div','section-insert'),menu=n('div','section-insert-choices');
 wrap.dataset.insertIndex=String(index);
 const toggle=b('＋',event=>{event.stopPropagation();toggleInsertionMenu(menu,toggle,'Ajouter un bloc')},'section-add-blue');
 toggle.title='Ajouter une zone';toggle.setAttribute('aria-label','Ajouter une zone');
 menu.hidden=true;
 menu.append(b('Bloc seul',()=>addSection(p,index,'single'),'sm'),
             b('Deux colonnes',()=>addSection(p,index,'columns'),'sm'),
             b('Ressource : image + document',()=>addResourcePreset(p,index,'resource'),'sm'),
             b('Vidéo : titre + lecteur',()=>addResourcePreset(p,index,'video'),'sm'),
             b('Lecteur audio',()=>{
              const audio=createContent('audio');
              const section=editorBlockModel.createSection(uniqueBlockId(),'single',[[audio],[]]);
              p.blocks.splice(index,0,section);selectedBlockId=String(audio.id);mark();render();
             },'sm'),
             b('Document : titre + PDF',()=>addResourcePreset(p,index,'documents'),'sm'),
             b('Trait de séparation',()=>{
              const divider=createContent('divider');p.blocks.splice(index,0,divider);
              selectedBlockId=String(divider.id);mark();render();
             },'sm'));
 menu.addEventListener('click',e=>e.stopPropagation());
 wrap.append(toggle,menu);return wrap;
}
function sectionStyle(section){return editorBlockModel.sectionStyle(section,validColor)}
function sectionFrame(box,section){
 const st=sectionStyle(section);box.dataset.frame=st.border;
 if(st.border!=='none'){
  box.style.border=st.width+'px solid '+st.color;
  box.style.borderRadius=st.border==='round'?'16px':'0';
 }
 if(st.shadow)box.style.boxShadow='0 5px 19px #16243329';
}
function sectionSettings(section){
 const details=n('details','section-settings'),summary=n('summary','','⚙');
 summary.title='Présentation du bloc';summary.setAttribute('aria-label','Présentation du bloc');details.append(summary);
 const fields=n('div','section-settings-fields'),current=sectionStyle(section);
 const line=(label,input)=>{const row=n('label','',label);row.append(input);fields.append(row)};
 const presentation=n('select');presentation.setAttribute('aria-label','Présentation du bloc');
 for(const [key,label] of [['','Classique'],['resource','Ressource : image et texte'],
  ['video','Vidéo'],['documents','Liste de documents'],
  ['intro','Introduction'],['text','Section de texte']]){
  const option=n('option','',label);option.value=key;
  option.selected=(section.presentation||'')===key;presentation.append(option);
 }
 presentation.onchange=()=>{section.presentation=presentation.value||undefined;mark();render()};
 line('Présentation',presentation);
 const border=n('select');border.setAttribute('aria-label','Forme du cadre');
 for(const [value,label] of [['none','Sans cadre'],['round','Cadre arrondi'],['square','Cadre carré']]){
  const option=n('option','',label);option.value=value;option.selected=value===current.border;border.append(option)
 }
 border.onchange=()=>{section.style=editorBlockModel.patchSectionStyle(section,{border:border.value},validColor);mark();render()};
 line('Cadre',border);
 const color=n('input');color.type='color';color.value=current.color;color.setAttribute('aria-label','Couleur du cadre');
 color.onchange=()=>{section.style=editorBlockModel.patchSectionStyle(section,{color:color.value},validColor);mark();render()};
 line('Couleur',color);
 const width=n('select');width.setAttribute('aria-label','Épaisseur du trait');
 for(let i=1;i<=5;i++){const option=n('option','',i+' px');option.value=String(i);option.selected=i===current.width;width.append(option)}
 width.onchange=()=>{section.style=editorBlockModel.patchSectionStyle(section,{width:Number(width.value)},validColor);mark();render()};
 line('Épaisseur',width);
 const shadow=n('input');shadow.type='checkbox';shadow.checked=current.shadow;shadow.setAttribute('aria-label','Ombrage');
 shadow.onchange=()=>{section.style=editorBlockModel.patchSectionStyle(section,{shadow:shadow.checked},validColor);mark();render()};
line('Ombre',shadow);
 const hidden=section.hideOnSite===true;
 const visibility=b('',event=>{
  event.stopPropagation();
  section.hideOnSite=section.hideOnSite!==true;
  mark();render();
 },'section-visibility-toggle');
 visibility.setAttribute('aria-label',hidden?'Afficher le bloc entier aux visiteurs':'Masquer le bloc entier aux visiteurs');
 visibility.append(visibilityEyeIcon(!hidden),
  n('span','',hidden?'Afficher ce bloc entier':'Masquer ce bloc entier'));
 fields.append(visibility);
 details.append(fields);return details;
}
// The default is top for free columns; historical image/resource cards remain
// centered unless the owner chooses an explicit alignment. These values are
// stored on the section, not on its headings, images, or buttons.
function columnVerticalAlign(section,index){return editorBlockModel.columnVerticalAlign(section,index)}
function columnButtonLayout(section,index){return editorBlockModel.columnButtonLayout(section,index)}
function columnPresentationSettings(section,index){
 const details=n('details','section-column-presentation');
 const side=index===0?'gauche':'droite';
 const summary=n('summary','','↕');
 summary.title='Disposition de la colonne '+side;
 summary.setAttribute('aria-label','Disposition de la colonne '+side);
 details.append(summary);
 const fields=n('div','section-column-presentation-fields');
 const makeChoice=(title,choices,current,commit)=>{
  const line=n('label','',title),select=n('select');
  select.setAttribute('aria-label',title+' — colonne '+side);
  for(const [value,name] of choices){
   const option=n('option','',name);option.value=value;option.selected=value===current;
   select.append(option);
  }
  select.onchange=()=>{commit(select.value);mark();render()};
  line.append(select);fields.append(line);
 };
 if(section.layout==='columns')makeChoice('Alignement vertical',
  [['top','Haut'],['center','Centre'],['bottom','Bas']],
  columnVerticalAlign(section,index),value=>{
   section.columnAlignments=[columnVerticalAlign(section,0),columnVerticalAlign(section,1)];
   section.columnAlignments[index]=value;
  });
 makeChoice('Disposition des boutons',
  [['stack','Les uns sous les autres'],['row','Côte à côte']],
  columnButtonLayout(section,index),value=>{
   section.columnButtonLayouts=[columnButtonLayout(section,0),columnButtonLayout(section,1)];
   section.columnButtonLayouts[index]=value;
  });
 details.append(fields);return details;
}
function sectionColumn(section,p,index,single=false){
 const items=section.columns[index],cell=n('div','section-column');
 cell.dataset.columnIndex=String(index);cell.dataset.sectionId=String(section.id);
 cell.dataset.verticalAlign=columnVerticalAlign(section,index);
 cell.dataset.buttonLayout=columnButtonLayout(section,index);
 let controls=null;
 if(!preview&&!single){
  controls=n('div','section-column-actions');const menu=n('div','section-element-menu');
  const add=b('＋',event=>{
   event.stopPropagation();
   toggleInsertionMenu(menu,add,'Ajouter un élément à '+(index===0?'gauche':'droite'));
  },'section-add-green');
  add.title='Ajouter un élément';add.setAttribute('aria-label','Ajouter '+(index===0?'à gauche':'à droite'));
  menu.hidden=true;
  for(const [label,kind] of [['Titre','heading'],['Image','image'],['Texte','text'],
   ['Titre événement','event'],['Bouton','button'],['Vidéo','video'],['Lecteur audio','audio'],['Trait de séparation','divider']]){
   menu.append(b(label,()=>{
    const x=createContent(kind);items.push(x);selectedBlockId=String(x.id);mark();render();
   },'sm'));
  }
  controls.append(add,columnPresentationSettings(section,index));
  if(index===0)controls.append(sectionSettings(section));controls.append(menu);
 }
 for(const x of items)cell.append(block(x,p,items,section));
 if(controls)cell.append(controls);
 return cell;
}
function renderSection(section,p){
 if(!Array.isArray(section.columns))section.columns=[[],[]];
const wrap=n('div','content-section');wrap.dataset.sectionId=section.id;
 if(section.hideOnSite===true){
  wrap.classList.add('hidden-on-public');
  if(!preview)wrap.append(n('small','hidden-public-note','Bloc entier invisible aux visiteurs'));
 }
 wrap.dataset.layout=section.layout==='columns'?'columns':'single';
 wrap.dataset.presentation=['resource','video','documents','intro','text'].includes(section.presentation)?section.presentation:'';
 sectionFrame(wrap,section);
 if(!preview){
  const tools=n('div','section-root-actions');
  const layoutButton=b('▣',()=>{
   section.layout=editorBlockModel.nextLayout(section.layout);mark();render();
  },'sm section-layout-toggle');
  layoutButton.title='Passer à '+(section.layout==='columns'?'un bloc seul':'deux colonnes');
  layoutButton.setAttribute('aria-label',layoutButton.title);tools.append(layoutButton);
  tools.append(b('✕',async ()=>{if((await siteConfirm('Supprimer cette zone et son contenu ?'))){p.blocks=p.blocks.filter(x=>x!==section);mark();render()}},'sm'));
  wrap.append(tools);
 }
 const grid=n('div','section-columns');
 if(section.layout==='columns'){
  grid.append(sectionColumn(section,p,0),sectionColumn(section,p,1));
 }else{
  const only=sectionColumn(section,p,0);
  for(const x of section.columns[1])only.append(block(x,p,section.columns[1],section));
  grid.append(only);
 }
 wrap.append(grid);return wrap;
}
async function removeCustomPage(q){
 if(!IS_STAGE||!q||!db.pages.some(p=>p.id===q.id))return;
 const plan=editorPageCommands.deletionPlan(db,q,STAGE_SEED?.celebrationId);
 const {general}=plan;
 if(!plan.allowed){siteNotice('Cette page est protégée et ne peut pas être supprimée.');return}
 if(!(await siteConfirm('Supprimer la page « '+q.name+' » ? Cette suppression sera enregistrée sur le serveur.')))return;
 if(stateOfPage(q)==='published'){
  const hidden=await serverPublish({kind:'page',pageId:q.id,visibility:'hidden'});
  if(!hidden){siteNotice('La page est encore publique. Suppression annulée.');return}
 }
 if(general){
  let original={};try{original=JSON.parse(localStorage.getItem(SHARED_KEY)||'{}')}catch{}
  const deleted=editorPageCommands.rememberDeletedPage(original,q.id);
  localStorage.setItem(SHARED_KEY,JSON.stringify({...original,deletedPageIds:deleted}));
 }
 const next=editorPageCommands.removeConfirmedPage(db,q,id,plan);
 if(next===null)return;
 id=next;
 if(general&&typeof editorLocalization!=='undefined')delete editorLocalization.pages[q.id];
 if(typeof clearLocaleView==='function')clearLocaleView();selectedBlockId=null;mark();save();render();
 void serverSave();
}
function moveGeneralPage(p,dir){
 if(dirty){save();if(dirty)return}
 if(!editorPageCommands.moveGeneralPage(db,p,dir))return;
 mark();save();render();
}
function makeHome(p){db.siteHomeId=p.id;mark();save();render()}

// Saving a draft never makes new pages public. These actions publish or hide
// a single chosen page, or the entire celebration, on the server.
const VISIBILITY_LABELS=editorPageModel.visibilityLabels;
function stateOfPage(p){return editorPageModel.pageVisibility(p)}
function sharedVisibility(){
 try{return JSON.parse(localStorage.getItem(SHARED_KEY)||'{}').celebrationVisibility||{}}catch{return {}}
}
function celebrationState(entry){
 return editorPageModel.celebrationVisibility(entry,sharedVisibility());
}
function historicallyPrivate(kind,q){
 const policy=kind==='celebration'?
  (privateCatalogue?.celebrationAccessPolicy||q?.accessPolicy):
  (privateCatalogue?.record?.pages?.find(p=>p.id===q?.id)?.accessPolicy||q?.accessPolicy);
 return q?.privateManaged===true||(policy&&policy.mode!=='PUBLIC');
}
function publicationActions(kind,q){
 if(!adminMembersEnabled&&historicallyPrivate(kind,q))
  return n('p','m021-private-warning','Ce contenu est déjà privé. Réactivez la gestion des membres dans Paramètres pour modifier sa publication ou ses autorisations.');
 const outer=n('div','publication-status-controls');
 const current=kind==='page'?stateOfPage(q):celebrationState(q);
 const badge=n('span','publication-badge state-'+current);
 badge.setAttribute('role','img');badge.setAttribute('aria-label',VISIBILITY_LABELS[current]);outer.append(badge);
 const field=n('label','editor-language-choice','Visibilité'),select=n('select');
 select.setAttribute('aria-label','Visibilité '+(kind==='page'?'de la page':'de la célébration'));
 for(const [value,label]of [['draft','Brouillon'],['published','Visible'],['hidden','Masqué']]){
  const option=n('option','',label);option.value=value;select.append(option);
 }
 select.value=current;
 select.onchange=async()=>{
  const chosen=select.value;
  if(chosen===current)return;
  if(chosen==='hidden'&&!await siteConfirm('Masquer ce contenu pour les visiteurs ?')){
   select.value=current;return;
  }
  select.disabled=true;badge.textContent='En cours…';
  const success=await serverPublish(editorPageModel.publicationIntent(kind,q,chosen),{flushContent:false});
  if(success){q.visibility=chosen;render();}
  else{select.value=current;badge.textContent='';select.disabled=false;}
 };
 field.append(select);outer.append(field);
 return outer;
}
function attachPagePublicationControls(list,group){
 if(!IS_STAGE||preview)return;
 for(const p of db.pages.filter(q=>q.group===group)){
  const choose=[...list.querySelectorAll('button.item')].find(x=>x.dataset.pageId===p.id);
  if(!choose)continue;
  let row=choose.closest('.general-page-row');
  if(!row){row=n('div','general-page-row');choose.replaceWith(row);row.append(choose)}
  // Always expose useful actions: historical stages are protected from
  // destructive deletion but can be edited or hidden and shown again.
  const opts=n('details','page-options');
  const summary=n('summary','','⋯');
  summary.setAttribute('aria-label','Actions pour la page '+p.name);
  summary.title='Modifier et gérer la visibilité de cette page';
  const menu=n('div','page-options-menu');
  menu.append(b('Modifier cette page',()=>enter('celebrations',p.id),'sm'));
  menu.append(publicationActions('page',p));
  const deletion=editorPageCommands.deletionPlan(db,p,STAGE_SEED?.celebrationId);
  if(deletion.allowed){
   const remove=b('Supprimer la page',()=>removeCustomPage(p),'sm');
   remove.classList.add('danger');menu.append(remove);
  }else{
   menu.append(n('small','page-options-protected',
    'Page historique protégée : utilisez « Masqué » pour la retirer du site.'));
  }
  opts.append(summary,menu);row.append(opts);
  const state=stateOfPage(p),badge=n('span','inline-page-state state-'+state);
  badge.setAttribute('role','img');badge.setAttribute('aria-label',VISIBILITY_LABELS[state]);
  badge.title=VISIBILITY_LABELS[state];row.insertBefore(badge,opts);
 }
}

function pageWorkspace(group,mount=w){
 if(!privateEdit&&IS_STAGE){ensureMemberPanel();if(adminMembersEnabled)privatePageButtons(group,mount);}
 const listed=editorPageModel.groupPages(db.pages,group);
 if(!listed.length){
  if(group!=='footer'){const empty=n('section','panel');empty.append(n('h2','',group==='celebration'?'Pages de la célébration':'Pages'),n('p','','Aucune page pour le moment.'),b('＋ Ajouter une page',()=>createPage(group),'sm primary'));mount.append(empty);}
  if(group==='footer'){
   const empty=n('section','panel footer-page-empty');
   empty.append(n('h2','','Pages de bas de page'),
    n('p','','Créez une page (mentions légales, confidentialité…) ; son titre deviendra un lien en bas du site une fois publiée.'),
    b('＋ Page de bas de page',()=>createPage('footer'),'sm primary'));
   mount.append(empty);return;
  }
  return;
 }
 if(!listed.some(q=>q.id===id)){
  id=editorPageModel.activePageId(db.pages,group,id);
 }
 const p=page(),layout=n('div','layout'),side=n('aside','panel');
 if(group==='footer')side.append(n('h2','','Pages de bas de page'));
 if(p.group==='celebration'&&IS_STAGE&&!privateEdit){
  const dates=currentDates(),timing=n('div','celebration-date-time'),field=n('label','date-field','Date du mercredi :');
  const input=n('input','celebration-wednesday');input.type='date';input.value=dates.wednesday;
  input.setAttribute('aria-label','Mercredi de la célébration');
  input.onchange=()=>updateDate('wednesday',input.value);
  field.append(input);timing.append(field);
  if(DAY_SLUGS.includes(pageSlug(p))){
   const clock=timeChooser(dayTime(p),'Heure du '+pageSlug(p),hour=>updateDayTime(p,hour));
   clock.dataset.day=pageSlug(p);clock.classList.add('celebration-day-hour');
   timing.append(clock);
  }
  side.append(timing);
  if(dates.wednesday){
   const week=n('div','week-dates');
   week.textContent=prettyDate(dates.wednesday)+' – '+prettyDate(dayIso(dates.wednesday,4));
   side.append(week);
  }
 }
 const list=n('div',group==='celebration'?'list':'list general-pages-list');
 if(group==='celebration'){
  for(const q of editorPageModel.groupPages(db.pages,'celebration')){
   const date=stageDate(q),label='✧ '+q.name+(date?' · '+prettyDate(date):'');
   const choose=b(label,()=>enter('celebrations',q.id));
   choose.className='item'+(q.id===p.id?' active':'');choose.dataset.pageId=q.id;list.append(choose);
  }
  if(!privateEdit)attachPagePublicationControls(list,'celebration');side.append(list);
  if(!privateEdit){const actions=n('div','foot');actions.append(b('＋ Page',()=>createPage('celebration')));side.append(actions);}
 }else{
  for(const q of editorPageModel.groupPages(db.pages,group)){
   const row=n('div','general-page-row'),
     choose=b(localizedLabel(q),()=>enter(group==='footer'?'footer':'pages',q.id));
   choose.className='item page-name'+(q.id===p.id?' active':'');choose.dataset.pageId=q.id;row.append(choose);
   if(IS_STAGE&&!preview){
    const options=n('details','page-options'),summary=n('summary','','⋯');
    summary.setAttribute('aria-label','Options de la page '+q.name);
    summary.title='Options';options.append(summary);
    const commands=n('div','page-options-menu');
    const up=b('Monter',()=>moveGeneralPage(q,-1),'sm');up.disabled=editorPageModel.groupPages(db.pages,group)[0]===q;
    const down=b('Descendre',()=>moveGeneralPage(q,1),'sm');down.disabled=editorPageModel.groupPages(db.pages,group).at(-1)===q;
    commands.append(up,down);
    if(group==='page'&&q.id!==(db.siteHomeId||'neutral-accueil-general')){
     const home=b('Définir comme accueil',()=>makeHome(q),'sm');commands.append(home);
    }
    if(/^neutral-[0-9a-f-]{30,45}$/.test(q.id)){
     const remove=b('Supprimer la page',()=>removeCustomPage(q),'sm');
     remove.classList.add('danger');commands.append(remove);
    }
    options.append(commands);row.append(options);
   }
   list.append(row);
  }
  attachPagePublicationControls(list,'page');side.append(list);
  const actions=n('div','foot');actions.append(b(group==='footer'?'＋ Page de bas de page':'＋ Page',()=>createPage(group)));
  side.append(actions);
 }
 layout.append(side);
 const right=n('section'),head=n('div','editor-head'),info=n('div');
 head.append(info);right.append(head);
 
 if(window.__EJ_PAGES_ONLY__&&!preview&&p.group==='page'){
  const row=n('div','editor-language-row m020-settings');
  row.append(n('strong','','Réglages de la page'));
  const nameField=n('label','editor-language-choice m024-page-name','Nom de la page');
  const nameInput=n('input');nameInput.type='text';nameInput.maxLength=95;nameInput.value=p.name;
  nameInput.setAttribute('aria-label','Renommer cette page');
  nameInput.onchange=()=>{
   const name=nameInput.value.trim().slice(0,95);
   if(!name){nameInput.value=p.name;return}
   p.name=name;mark();render();
  };
  nameField.append(nameInput);row.append(nameField);
  const visLabel=n('label','editor-language-choice','Visibilité');
  const vis=n('select');vis.setAttribute('aria-label','Visibilité de la page');
  for(const [value,label] of [['draft','Brouillon'],['published','Publiée'],['hidden','Masquée']]){
   const o=n('option','',label);o.value=value;vis.append(o);
  }
  vis.value=['draft','hidden','published'].includes(p.visibility)?p.visibility:'published';
  vis.onchange=()=>{p.visibility=vis.value;mark();render()};
  visLabel.append(vis);row.append(visLabel);
  const placeLabel=n('label','editor-language-choice','Emplacement');
  const place=n('select');place.setAttribute('aria-label','Emplacement de la page');
  for(const [value,label] of [['menu','Menu principal'],['footer','Bas de page'],['none','Hors menu']]){
   const option=n('option','',label);option.value=value;place.append(option);
  }
  place.value=['menu','footer','none'].includes(p.placement)?p.placement:'menu';
  place.onchange=()=>{p.placement=place.value;mark();render()};
  placeLabel.append(place);row.append(placeLabel);
  row.append(b('↑',()=>{const position=db.pages.indexOf(p);if(position>0){db.pages.splice(position,1);db.pages.splice(position-1,0,p);mark();render()}},'sm'));
  row.append(b('↓',()=>{const position=db.pages.indexOf(p);if(position<db.pages.length-1){db.pages.splice(position,1);db.pages.splice(position+1,0,p);mark();render()}},'sm'));
  if(p.id!==db.siteHomeId)row.append(b('Définir comme accueil',()=>{db.siteHomeId=p.id;mark();render()},'sm'));
  row.append(b('Dupliquer',()=>{
   const copy=clone(p);copy.id='neutral-'+crypto.randomUUID();
   copy.name=p.name+' (copie)';copy.visibility='draft';copy.blocks=clone(p.blocks||[]);
   db.pages.splice(db.pages.indexOf(p)+1,0,copy);id=copy.id;mark();render();
  },'sm'));
  if(p.id!==db.siteHomeId)row.append(b('Supprimer',async ()=>{
   if(!(await siteConfirm('Supprimer cette page ?')))return;
   const position=db.pages.indexOf(p);
   if(position>=0)db.pages.splice(position,1);
   id=db.pages.find(q=>q.group==='page')?.id||'accueil';mark();render();
  },'sm danger'));
  right.append(row);
 }
if(IS_STAGE&&!privateEdit&&!preview&&['page','celebration'].includes(p.group)){
  const row=n('div','editor-language-row m020-settings');
  row.append(n('strong','','Réglages de la page'));
  if(editingLanguageId==='fr'&&editorPageModel.removablePage(canonicalPage(),STAGE_SEED?.celebrationId).allowed){
   const rename=n('label','editor-language-choice m024-page-name','Nom de la page');
   const nameInput=n('input');nameInput.type='text';nameInput.maxLength=95;
   nameInput.value=canonicalPage().name;nameInput.setAttribute('aria-label','Renommer cette page');
   nameInput.onchange=()=>{
    const result=editorPageCommands.renameEditablePage(db,canonicalPage(),nameInput.value,STAGE_SEED?.celebrationId);
    if(!result.ok){siteNotice(result.error);nameInput.value=canonicalPage().name;return;}
    if(result.changed){
     mark();
     // Keep the focused Save button mounted: rerendering on input blur would
     // swallow the very click intended to persist the new page name.
     const nav=layout.querySelector('[data-page-id="'+CSS.escape(canonicalPage().id)+'"]');
     if(nav){
      const date=p.group==='celebration'?stageDate(canonicalPage()):null;
      nav.textContent=p.group==='celebration'?
       '✧ '+canonicalPage().name+(date?' · '+prettyDate(date):''):canonicalPage().name;
     }
    }
   };
   rename.append(nameInput);row.append(rename);
  }
  row.append(publicationActions('page',canonicalPage()));
  if(adminMembersEnabled)row.append(accessControls('page',canonicalPage()));
  if(adminLanguagesVisible){
   const label=n('label','editor-language-choice','Langue'),picker=n('select');picker.setAttribute('aria-label','Langue');
   for(const lang of editorLocalization.registry.languages){const opt=n('option','',lang.name);opt.value=lang.id;picker.append(opt)}picker.value=editingLanguageId;
   picker.onchange=()=>{if(dirty){save();if(dirty)return}editingLanguageId=picker.value;clearLocaleView();selectedBlockId=null;render()};
   label.append(picker);row.append(label);
  }
   // The celebration already has a clear “＋ Page” action.
   if(p.group!=='celebration')row.append(b('Dupliquer',()=>m018DuplicatePage(canonicalPage()),'sm'));
   row.append(b('Enregistrer',saveCurrentContent,'sm m022-save'));
   right.append(row);
  if(editingLanguageId!=='fr'){
   const field=n('label','editor-language-title','Titre de la page dans cette langue');
   const input=n('input');input.type='text';input.maxLength=180;input.value=p.name;
   input.setAttribute('aria-label','Titre traduit de la page');
   input.onchange=()=>{
    const next=input.value.trim();
    if(!next){input.value=p.name;return}
    page().name=next;mark();render();
   };
   field.append(input);right.append(field);
   const exists=!!editorLocalization.pages[p.id]?.[editingLanguageId];
   right.append(n('small','editor-language-note','Cette version sera publiée avec sa page.'));
  }
 }
 if(p.group==='celebration'&&IS_STAGE&&!privateEdit&&pageSlug(p)==='preparation'&&!preview){
  const dates=currentDates().preparationDates,fields=n('div','preparation-dates');
  fields.append(n('strong','','Dates de préparation'));
  for(let index=0;index<Math.max(1,dates.length);index++){
   const line=n('div','prep-date-row'),input=n('input');
   input.type='date';input.value=dates[index]||'';input.dataset.preparationIndex=String(index);
   input.setAttribute('aria-label','Date de préparation '+(index+1));
   input.onchange=()=>updatePreparationDate(index,input.value);
   line.append(input);
   if(dates.length>0){
    const remove=b('×',()=>removePreparationDate(index),'sm');
    remove.setAttribute('aria-label','Supprimer date de préparation '+(index+1));line.append(remove);
   }
   fields.append(line);
  }
  fields.append(b('＋ Date',addPreparationDate,'sm'));
  right.append(fields);
 }
 const date=dateSummary(p),time=dayTime(p),when=[date,time].filter(Boolean).join(' · ');
 if(when){const info=n('div','page-date',when);info.dataset.role='celebration-date';right.append(info)}
 const outer=n('div','canvas-wrap'),canvas=n('div','canvas');

 if(!preview)canvas.append(sectionMenu(p,0));
 p.blocks.forEach((x,index)=>{
  const element=x.kind==='section'?renderSection(x,p):block(x,p);
  // The insertion target belongs to this block: moving the pointer onto
  // its blue + keeps the parent hovered and the control clickable.
  if(!preview)element.append(sectionMenu(p,index+1));
  canvas.append(element);
 });
 outer.append(canvas);right.append(outer);

 layout.append(right);mount.append(layout);
}
// M018-C: only the editorial content is copied, never participant entitlements.
 function m018DuplicatePage(q){
  if(!IS_STAGE||privateEdit||preview||!q)return;
  if(dirty){save();if(dirty)return}
  const group=q.placement==='footer'?'footer':q.group;
  const copy=editorPageModel.createPage(group,String(q.name||'Page')+' (copie)',crypto.randomUUID(),STAGE_SEED.celebrationId);
  copy.blocks=clone(q.blocks||[]);
  db.pages.splice(db.pages.indexOf(q)+1,0,copy);
  if(editorLocalization.pages[q.id])editorLocalization.pages[copy.id]=clone(editorLocalization.pages[q.id]);
  id=copy.id;tab=group==='page'?'pages':group;
  editingLanguageId='fr';clearLocaleView();selectedBlockId=null;
  mark();save();render();void serverSave();
  status.textContent='Copie en brouillon : aucun droit ni inscription transféré.';
 }
 async function m018CopyContentVersion(target){
  if(!IS_STAGE||privateEdit||target==='fr'||target===editingLanguageId)return;
  if(dirty){save();if(dirty)return}
  const canonical=canonicalPage();
  if(!canonical||!editorLocalization.registry.languages.some(lang=>lang.id===target))return;
  const source=editingLanguageId==='fr'?
   {name:canonical.name,blocks:clone(canonical.blocks||[])}:
   editorLocalization.pages[canonical.id]?.[editingLanguageId];
  if(!source){siteNotice('Cette version ne contient pas encore de contenu enregistré.');return}
  const current=editorLocalization.pages[canonical.id]||{};
  if(current[target]&&!(await siteConfirm('Remplacer le contenu de cette langue par une copie ?')))return;
  try{
   const next=setPageTranslation({...canonical,translations:current},
    editorLocalization.registry,target,{name:source.name,blocks:clone(source.blocks||[])});
   editorLocalization.pages[canonical.id]=next.translations;
   editingLanguageId=target;clearLocaleView();mark();save();render();void serverSave();
   status.textContent='Contenu copié dans cette langue, sans nouveaux droits.';
  }catch(error){siteNotice(error.message||String(error))}
 }
function pages(){pageWorkspace('page')}
function footerPages(){pageWorkspace('footer')}
// Creating a DIFFERENT celebration remains an explicit action, unlike language/category variants.
 async function m018DuplicateCelebration(entry){
  if(!IS_STAGE||privateEdit||!entry)return;
  if(dirty){save();if(dirty)return}
  const choice=await siteDialog({title:'Dupliquer la célébration',fields:[{name:'date',label:'Date du mercredi :',type:'date',value:currentDateForDraft(entry)||entry.date||privateCatalogue?.record?.celebrationDates?.wednesday||currentDates().wednesday||'',required:true},{name:'title',label:'Titre',value:celebrationLabel(entry)+' (copie)',required:true}],confirm:'Créer le brouillon'});
  const date=choice?.date;
  if(!date)return;
  if(!validIso(date)){siteNotice('Choisissez une date valide.');return}
  try{
   ensureMemberPanel();if(dirty||db._serverPending){save();await serverSave();if(db._serverPending)return}
   const result=await memberPanel.commandContent('create-celebration',{archangel:entry.archangel,date,title:choice.title,copy:true});
   location.assign(editorPageModel.editorUrl(result.targetCelebration));
  }catch(error){siteNotice('Copie impossible : '+(error.message||error))}

 }
function celebrations(){
 if(!IS_STAGE){pageWorkspace('celebration');return}
 const selector=n('label','celebration-choice-field'),select=n('select','celebration-select');
 select.setAttribute('aria-label','Choisir la célébration');
 for(const entry of celebrationEntries()){
  const option=n('option','',celebrationLabel(entry));
  option.value=entry.id;option.selected=entry.id===String(window.__PREPARATION_SEED__.celebrationId);select.append(option);
 }
 select.onchange=()=>openCelebration(select.value);
 selector.append(select);w.append(selector);
 const selectedEntry=celebrationEntries().find(x=>x.id===String(window.__PREPARATION_SEED__.celebrationId));
 if(selectedEntry&&!preview){
  const publication=n('div','celebration-publication-controls');
  publication.append(n('strong','','Visibilité de cette célébration'));
  publication.append(publicationActions('celebration',selectedEntry));
if(adminMembersEnabled){
  publication.append(accessControls('celebration',selectedEntry));
  publication.append(b('Versions par catégorie',()=>showContentVersions(),'sm'));
 }
   publication.append(b('Dupliquer',()=>duplicateChoice(selectedEntry),'sm'));
  w.append(publication);
 }
 const current=plannedEntries().find(p=>p.id===String(window.__PREPARATION_SEED__.celebrationId));
 if(current){
  const line=n('label','celebration-title-edit','Titre de la célébration'),input=n('input');
  input.type='text';input.maxLength=100;input.value=celebrationLabel(current);
  input.setAttribute('aria-label','Titre de la célébration');
  input.onchange=()=>{
   if(!savePlannedTitle(current.id,input.value)){input.value=celebrationLabel(current);return}
   input.classList.add('saved');select.selectedOptions[0].textContent=input.value.trim();
   if(IS_STAGE){
    db._serverPending=true;
    localStorage.setItem(KEY,JSON.stringify(db));
    status.textContent='Titre modifié : cliquez sur Enregistrer pour le serveur';
   }else status.textContent='✓ Titre enregistré dans ce navigateur';
  };
  line.append(input);w.append(line);
  const chosen=String(currentDateForDraft(current)||'');
  const year=String(celebrationLabel(current)).match(/20\d{2}/)?.[0]||'';
  if(year&&chosen&&year!==chosen.slice(0,4)){
   const warning=n('small','celebration-date-warning','Date à vérifier : '+chosen.slice(0,4)+' (titre '+year+')');
   w.append(warning);
  }
 }
 const workspace=n('div','celebration-editor');
 w.append(workspace);
 pageWorkspace('celebration',workspace);
 const last=plannedEntries().at(-1)?.archangel||window.__PREPARATION_SEED__?.archangel||'Michaël';
 const index=ARCHANGELS.findIndex(x=>archSlug(x)===archSlug(last));
 const next=ARCHANGELS[((index<0?3:index)+1)%4];
 const details=n('details','new-celebration'),summary=n('summary','','＋ Nouvelle célébration');
 details.append(summary);
 const form=n('form','trial-planning'),label=n('label','','Date du mercredi :'),date=n('input');
 date.type='date';date.required=true;date.setAttribute('aria-label','Date du mercredi');
 label.append(date);form.append(label);
 const lastEntry=plannedEntries().at(-1)||celebrationEntries().find(p=>p.id===String(window.__PREPARATION_SEED__.celebrationId));
 const titleRow=n('label','celebration-title-field','Titre'),name=n('input');
 name.type='text';name.maxLength=100;name.setAttribute('aria-label','Titre proposé');
 const initial=proposedTitle(next,'',lastEntry);
 name.value=initial;titleRow.append(name);form.append(titleRow);
 date.onchange=()=>{
  if(name.value===initial||name.dataset.auto==='true'){
   name.value=proposedTitle(next,date.value,lastEntry);name.dataset.auto='true';
  }
 };
 name.oninput=()=>name.dataset.auto='false';
 const create=n('button','btn primary','Créer '+next);create.type='submit';form.append(create);
 form.onsubmit=async e=>{
  e.preventDefault();if(!validIso(date.value)){siteNotice('Choisissez une date valide.');return}
  const title=String(name.value||'').trim();if(!title){name.focus();return}
  try{
   ensureMemberPanel();if(dirty||db._serverPending){save();await serverSave();if(db._serverPending)return}
   const result=await memberPanel.commandContent('create-celebration',{archangel:next,date:date.value,title,copy:false});
   location.assign(editorPageModel.editorUrl(result.targetCelebration));
  }catch(error){siteNotice('Création impossible : '+(error.message||error))}

 };
 details.append(form);w.append(details);
}
// Media usage is obtained from the shared server's draft AND published pages.
// Local scans cover edits not yet sent to the server.
function mediaLinksFor(record,related=[]){
 const entries=[],seen=new Set(),currentId=String(window.__PREPARATION_SEED__?.celebrationId||'101');
 function push(use){
  if(!use||!use.pageName)return;
  const cid=String(use.celebrationId||currentId),slug=String(use.slug||use.pageId||'');
  const key=(use.group==='page'?'page:':'celebration:'+cid+':')+String(use.pageId||slug);
  if(!slug||seen.has(key))return;
  seen.add(key);
  entries.push({name:use.group==='page'?use.pageName:
    String(use.name||'Célébration')+' · '+use.pageName,
   href:'/__editor/voir-le-site?celebration='+encodeURIComponent(cid)+'&page='+encodeURIComponent(slug)});
 }
 for(const use of record.uses||[])push(use);
 for(const use of related)push(use);
 function visit(blocks,page,cid){
  for(const block of blocks||[]){
   if(block?.kind==='section'){for(const col of block.columns||[])visit(col,page,cid);continue}
   if(block?.src===record.src||block?.href===record.src||block?.cover===record.src)
    push({pageId:page.id,pageName:page.name,celebrationId:cid,group:page.group,
     slug:page.group==='page'?page.id:(page.id.endsWith('-'+cid)?page.id.slice(0,-cid.length-1):page.id),
     name:String(window.__PREPARATION_SEED__?.archangel||'Célébration')+' '+String(window.__PREPARATION_SEED__?.year||'')});
  }
 }
 for(const page of db.pages||[])visit(page.blocks,page,currentId);
 return entries;
}
function libraryTypeLabel(record){
 const name=String(record.name||'')+' '+String(record.src||'');
 if(/\.pdf(?:[?#\s]|$)/i.test(name))return 'PDF';
 if(/\.txt(?:[?#\s]|$)/i.test(name))return 'Texte';
 if(/\.csv(?:[?#\s]|$)/i.test(name))return 'Tableau CSV';
 if(/\.(?:doc|docx|odt|rtf)(?:[?#\s]|$)/i.test(name))return 'Document';
 if(/\.zip(?:[?#\s]|$)/i.test(name))return 'Archive ZIP';
 if(/\.json(?:[?#\s]|$)/i.test(name))return 'Données';
 return 'Fichier';
}
function libraryTitle(card,name,src){
 const heading=n('h3','media-card-title');
 if(src){
  const link=n('a','media-open-link',name);link.href=src;
  link.target='_blank';link.rel='noopener noreferrer';heading.append(link);
 }else heading.textContent=name;
 card.append(heading);
}
function libraryPicture(card,name,src,unused){
 if(!src)return;
 const link=n('a','media-picture-link'+(unused?' is-unused':''));link.href=src;
 link.target='_blank';link.rel='noopener noreferrer';link.title='Voir '+name;
 const img=n('img','library-thumb');img.src=src;img.alt=name;img.loading='lazy';link.append(img);
 if(unused)link.append(n('span','media-unused-ribbon','Inutilisé'));
 card.append(link);
}
function libraryUnusedText(card,unused,hasImage){
 if(unused&&!hasImage)card.append(n('span','media-unused-text','Inutilisé'));
}
function libraryLocationLinks(card,links){
 const box=n('div','file-usage-links');
 for(const item of links){
  const link=n('a','file-location-link',item.name+' ↗');
  link.href=item.href;link.target='_blank';link.rel='noopener noreferrer';box.append(link);
 }
 card.append(box);
}
function attachChosenAudio(record){
 if(!chosenBlock||chosenBlock.kind!=='audio')return false;
 const src=String(record.src||'');
 if(!/^\/media\/(?!.*\.\.)[^?#]+\.(?:mp3|wav)$/i.test(src)){
  status.textContent='Choisissez un MP3 ou WAV hébergé sur le site.';
  return false;
 }
 chosenBlock.src=src;delete chosenBlock.remoteKey;
 if(!chosenBlock.text||chosenBlock.text==='MP3 à choisir')chosenBlock.text=String(record.name||'Enregistrement audio').slice(0,180);
 chosenBlock=null;selectedBlockId=null;
 mark();tab=mediaReturnTab;render();
 status.textContent='✓ Lecteur audio ajouté. Enregistrez puis publiez la page.';
 return true;
}
// Preview the existing URL: same cookies, ACL and Range gateway as the site.
function libraryPreview(card,name,src,category){
 if(!src||!['audios','videos','pdf'].includes(category))return;
 const box=n('div','library-preview');
 if(category==='pdf'){
  const url=new URL(src,location.href);
  if(url.origin===location.origin||url.protocol==='blob:'){
  const details=n('details'),summary=n('summary','','Prévisualiser le PDF');
  details.append(summary);
  details.addEventListener('toggle',()=>{
   if(!details.open||details.dataset.loaded)return;
   // Embedded documents stay on the authenticated origin. External PDFs open by link.
   const url=new URL(src,location.href);
   if(url.origin!==location.origin&&url.protocol!=='blob:')return;
   const frame=n('iframe');frame.title='Aperçu : '+name;frame.src=src;
   frame.loading='lazy';details.append(frame);details.dataset.loaded='true';
  });box.append(details);
  }
 }else{
  const player=n(category==='audios'?'audio':'video');
  player.controls=true;player.preload='metadata';player.src=src;
  player.setAttribute('aria-label',name);
  if(category==='videos')player.playsInline=true;
  player.addEventListener('play',()=>document.querySelectorAll('.library-preview audio,.library-preview video').forEach(other=>{if(other!==player)other.pause()}));
  player.addEventListener('error',()=>{
   if(!box.querySelector('.hint'))box.append(n('p','hint','Lecture indisponible : vérifiez votre connexion, votre accès ou le format du fichier.'));
  });box.append(player);
 }
 const open=n('a','media-open-link','Ouvrir '+(category==='pdf'?'le PDF':'le fichier')+' ↗');
 open.href=src;open.target='_blank';open.rel='noopener noreferrer';box.append(open);card.append(box);
}
let mediaSearch='';
function media(){
 if((IS_STAGE||window.EJBridge?.remote)&&!remoteMediaLoading&&!globalMediaLoaded)void refreshGlobalMedia();
 if(!globalFilesLoading)
  loadGlobalFiles().then(()=>{if(tab==='media'&&!document.querySelector('.audio-import-section[open]'))render()});
 // Ignore historical inline paragraphs, obsolete descriptions and navigation links.
 const historical=(globalFiles||publicFiles().map(r=>({...r,uses:
  (r.pages||[]).map(name=>filePageRef(window.__PREPARATION_SEED__,name)).filter(Boolean)})))
  .filter(r=>typeof r.src==='string'&&r.src.length>0&&r.category!=='links');
 const {local,remote,usedUrls,countFor}=mediaCatalogue.libraryCollections(
  historical,[...fileRecords.values()],globalMedia);
 const tabs=n('div','file-category-tabs');
 for(const [value,label] of [['images','Images'],['audios','Audios'],['videos','Vidéos'],['autres','Documents']]){
  const count=countFor(value)+(value==='autres'?countFor('pdf'):0);
  const button=b(label+' ('+count+')',()=>{mediaCategory=value;render()},
   mediaCategory===value?'primary sm':'sm');
  button.dataset.fileCategory=value;button.setAttribute('aria-pressed',String(mediaCategory===value));tabs.append(button);
 }
 w.append(tabs);
 w.append(n('h2','page-title','Médiathèque de l’administration'));
 const external=b('＋ Référencer un média externe',()=>void createExternalMedia(),'sm');
 w.append(external);
 w.append(n('p','hint','Import serveur : JPG, PNG, WebP, PDF, MP3, WAV, TXT et DOCX. Pour les vidéos, référencez un lien externe.'));
 const importButton=b(mediaCategory==='audios'?'＋ Importer un MP3':'＋ Importer',()=>{
  const picker=el('asset-file-picker');
  picker.accept=mediaCategory==='audios'?'.mp3,audio/mpeg':
   '.pdf,.txt,.docx,.jpg,.jpeg,.png,.webp,.mp3,.wav';
  picker.click();
 },'sm');
 importButton.disabled=!IS_STAGE&&!storageReady;importButton.dataset.action='upload-file';w.append(importButton);
 if(mediaCategory==='audios'){
  const label=n('p','media-upload-feedback',mediaUploadState?.message||'Importez des MP3 jusqu’à 200 Mo sans compression. Au-delà de 25 Mo, l’envoi s’effectue en morceaux et peut reprendre après une interruption.');
  label.id='media-upload-feedback';label.setAttribute('role','status');label.setAttribute('aria-live','polite');w.append(label);
  const bar=n('progress','media-upload-progress');
  bar.id='media-upload-progress';bar.max=100;
  bar.value=mediaUploadState?.percent||0;bar.hidden=!mediaUploadState;
  bar.setAttribute('aria-label','Progression de l’import MP3');w.append(bar);
 }
 const search=n('input','media-search');search.type='search';search.placeholder='Rechercher un fichier';
 search.setAttribute('aria-label','Rechercher un fichier');search.value=mediaSearch;w.append(search);
 const cards=n('div','cards');
 const filterCards=()=>{const query=mediaSearch.trim().toLocaleLowerCase('fr');let visible=0;for(const card of cards.children){card.hidden=!card.querySelector('h3')?.textContent.toLocaleLowerCase('fr').includes(query);if(!card.hidden)visible++}empty.hidden=visible>0;};
 search.oninput=()=>{mediaSearch=search.value;filterCards()};
 const matches=category=>category===mediaCategory||mediaCategory==='autres'&&category==='pdf';
 for(const record of remote.filter(x=>matches(mediaCategoryOf(x))&&!usedUrls.has(x.src))){
  const refs=mediaLinksFor(record);
  const unused=record.canDelete===true&&refs.length===0;
  const hasImage=record.type==='image';
  const card=n('article','card global-media-card'+(unused?' unused-file':''));
  card.dataset.mediaId=record.id;card.dataset.usage=unused?'unused':'used';
  libraryTitle(card,record.name,record.src);
  card.append(n('small','media-format-label',
   ({image:'Image',pdf:'PDF',audio:'Audio',video:'Vidéo'})[record.type]||'Fichier'));
  if(hasImage)libraryPicture(card,record.name,record.src,unused);
  libraryPreview(card,record.name,record.src,record.category||mediaCategoryOf(record));
  libraryUnusedText(card,unused,hasImage);
  libraryLocationLinks(card,refs);
  const controls=n('div','file-actions');
  if(chosenBlock&&mediaCategory==='audios'&&record.type==='audio')
   controls.append(b('Insérer dans le lecteur',()=>attachChosenAudio(record),'sm primary'));
  if(unused)controls.append(b('Supprimer si inutilisé',()=>void deleteGlobalMedia(record),'sm'));
  card.append(controls);cards.append(card);
 }
 for(const record of historical.filter(x=>matches(x.category))){
  const remoteCopy=remote.find(x=>x.src===record.src&&mediaCategoryOf(x)===mediaCategory);
  const refs=mediaLinksFor(remoteCopy||record,fileUses(record));
  // The historical collection is not an authoritative inventory of every
  // unpublished, multilingual or private reference. Never mark it unused.
  const unused=false;
  const hasImage=record.category==='images';
  const card=n('article','card historic-file'+(unused?' unused-file':''));
  card.dataset.publicFileId=record.id;card.dataset.fileCategory=record.category;
  card.dataset.usage=unused?'unused':'used';
  libraryTitle(card,record.name,record.src);
  if(record.category==='autres')
   card.append(n('small','media-format-label',libraryTypeLabel(record)));
  if(hasImage)libraryPicture(card,record.name,record.src,unused);
  libraryPreview(card,record.name,record.src,record.category||mediaCategoryOf(record));
  libraryUnusedText(card,unused,hasImage);
  libraryLocationLinks(card,refs);
  if(chosenBlock&&mediaCategory==='audios'&&record.category==='audios')
   card.append(b('Insérer dans le lecteur',()=>attachChosenAudio(record),'sm primary'));
  if(unused){
   const info=n('small','delete-pending','Suppression après vérification des références');
   card.append(info);
  }
  cards.append(card);
 }
 for(const record of local.filter(x=>matches(localCategory(x)))){
  const localUrl=assetUrls.get(record.id)||'';
  const refs=fileUsages(record.id),unused=refs.length===0,hasImage=mediaCategory==='images';
  const card=n('article','card'+(unused?' unused-file':''));card.dataset.fileId=record.id;
  card.dataset.usage=unused?'unused':'used';
  libraryTitle(card,record.name,localUrl);
  card.append(n('small','media-origin-label',Math.round(record.size/1024)+' Ko'));
  if(mediaCategory==='autres')
   card.append(n('small','media-format-label',libraryTypeLabel(record)));
  if(hasImage)libraryPicture(card,record.name,localUrl,unused);
  libraryPreview(card,record.name,localUrl,String(record.type||'').startsWith('video/')?'videos':localCategory(record));
  libraryUnusedText(card,unused,hasImage);
  const locations=n('div','file-usage-links');
  for(const use of refs)locations.append(n('p','',use.page));
  card.append(locations);
  if(unused){
   const actions=n('div','file-actions'),del=b('Supprimer',()=>deleteFile(record),'sm');
   del.dataset.action='delete-unused-file';actions.append(del);card.append(actions);
  }
  cards.append(card);
 }
 const empty=n('p','hint','Aucun fichier ne correspond à votre recherche.');w.append(cards,empty);filterCards();
 if(mediaCategory==='audios'&&window.__STAGING_AUDIO__&&!LIVE_MEDIA_UPLOAD_HOST){
  const details=n('details','audio-import-section'),summary=n('summary','','Importer MP3 / WAV');
  details.append(summary);w.append(details);
  details.addEventListener('toggle',()=>{
   if(!details.open||details.dataset.loaded)return;
   details.dataset.loaded='true';
   // The file library manages files; insertion takes place only from a page editor.
   window.__STAGING_AUDIO__.render(details,{usages:cloudAudioUsages});
  });
 }
 if(globalFilesLoading&&!globalFiles)w.append(n('p','file-loading','Chargement…'));
}
/* Entire administration guide: static instructions, no remote services or writes.
   Each topic documents controls that exist in the live editor. */
const GUIDE_TOPICS=[
 {group:'Premiers pas',title:'Se connecter à l’administration',
  info:'Le site est public ; la modification des pages demande une connexion.',
  steps:['Depuis le site, choisissez « Administration » (ou ouvrez /admin.html).','Saisissez le code d’accès qui vous a été remis, puis « Ouvrir l’administration ».','Une fois connecté, choisissez Pages, Pages de bas de page, Célébrations ou Médiathèque.','La connexion est conservée pendant une durée limitée sur votre navigateur : si le formulaire réapparaît, reconnectez-vous.'],
  note:'Ne mettez pas le code d’accès dans les textes publics du site.'},
 {group:'Premiers pas',title:'Comprendre les onglets et les boutons du haut',
  info:'Chaque onglet ouvre directement son espace de travail.',
  steps:['Pages : accueil général et autres pages indépendantes des célébrations.','Pages de bas de page : pages dont les titres s’affichent en bas du site, après publication.','Célébrations : programme et pages de chaque célébration.','Médiathèque de l’administration : fichiers conservés à usage privé jusqu’à insertion et publication.','Paramètres : dépliez « Gestion des langues (facultatif) » pour afficher les outils de traduction. Par défaut, les pages s’éditent simplement en français.','Catégories : accessibles séparément dans le menu uniquement si la gestion des membres est activée.','Mode d’emploi : ce guide, consultable à tout moment.','Aperçu : masquer les outils pour contrôler la page en cours. « Revenir à l’édition » permet de poursuivre.','Voir le site : ouvrir la page côté visiteur dans un nouvel onglet. « Enregistrer » conserve les modifications.']},
 {group:'Premiers pas',title:'Enregistrer et retrouver les mêmes pages sur deux appareils',
  info:'La page en cours peut changer visuellement avant d’être publiée dans la version commune.',
  steps:['Modifiez votre page ou votre bloc.','Appuyez sur « Enregistrer » en haut de l’administration.','Attendez un message confirmant « Enregistré sur le serveur ».','Rouvrez ou actualisez le site sur votre autre téléphone ou ordinateur.'],
  note:'« Enregistré dans ce navigateur » ne signifie pas « enregistré sur le serveur ». Les fichiers importés localement constituent un cas particulier : consultez aussi la rubrique Fichiers.'},
 {group:'Premiers pas',title:'Utiliser l’éditeur sur téléphone',
  info:'Les commandes sont identiques mais les zones et colonnes se placent les unes sous les autres.',
  steps:['Choisissez l’onglet puis la page à modifier.','Touchez un titre, un texte ou une image pour sélectionner son élément.','Si le clavier masque les boutons, fermez-le avec la commande Retour du téléphone.','Faites défiler la page pour voir les + et les menus de la zone.','En deux colonnes, elles s’empilent verticalement sur un écran étroit, mais restent côte à côte sur ordinateur.'],
  note:'Le + bleu et le + vert ne font pas la même chose : voir les rubriques consacrées aux zones.'},
 {group:'Pages et célébrations',title:'Modifier l’accueil général ou une page indépendante',
  info:'L’onglet Pages réunit les pages qui ne dépendent pas d’une célébration.',
  steps:['Ouvrez « Pages ».','Choisissez « Accueil général » ou une autre page dans la liste.','Touchez les textes, images et blocs pour les modifier.','Utilisez « + Page » pour créer une nouvelle page et lui donner un nom.','Enregistrez.'],
  note:'Les pages générales ne sont pas une copie des pages de chaque célébration.'},
 {group:'Pages et célébrations',title:'Changer l’ordre ou la page d’accueil',
  info:'Les options ⋯ des pages générales permettent de les organiser.',
  steps:['Dans Pages, repérez la page souhaitée.','Touchez « ⋯ » à côté de son nom.','Choisissez « Monter » ou « Descendre » pour la déplacer.','Utilisez « Définir comme accueil » si cette option est proposée.','Appuyez sur « Enregistrer » et vérifiez avec « Voir le site ».'],
  note:'La page déjà définie comme accueil n’affiche pas l’option pour se définir elle-même.'},
 {group:'Pages et célébrations',title:'Créer ou supprimer une page générale',
  info:'Seules les pages que vous créez peuvent être supprimées par ce menu.',
  steps:['Dans Pages, touchez « + Page » et indiquez son nom.','Pour supprimer une page créée, ouvrez « ⋯ » près de son nom puis « Supprimer la page ».','Lisez la confirmation avant de valider.','Enregistrez, puis contrôlez le résultat sur le site.'],
  note:'Les anciennes pages historiques sont protégées contre cette suppression.'},
 {group:'Pages et célébrations',title:'Choisir une célébration et ses étapes',
  info:'Chaque célébration possède ses propres pages, notamment Préparation et les jours de la semaine.',
  steps:['Ouvrez « Célébrations ».','Choisissez la célébration dans la liste déroulante.','Touchez la page à modifier : accueil de la célébration, préparation, mercredi, jeudi, vendredi, samedi, dimanche ou après célébration.','Modifiez le contenu puis enregistrez.'],
  note:'Vérifiez la célébration sélectionnée avant de modifier les dates ou les horaires.'},
 {group:'Pages et célébrations',title:'Créer une nouvelle célébration',
  info:'La commande « + Nouvelle célébration » prépare le prochain cycle.',
  steps:['Ouvrez Célébrations et développez « + Nouvelle célébration ».','Choisissez la date du mercredi de départ.','Contrôlez le titre proposé, ou personnalisez-le si besoin.','Touchez « Créer » puis ouvrez les pages de cette nouvelle célébration.','Complétez le programme et enregistrez.'],
  note:'Le jour de départ doit être un mercredi. Le titre automatiquement proposé suit le cycle des archanges.'},
 {group:'Pages et célébrations',title:'Modifier les dates et les horaires',
  info:'Les dates du programme et les heures d’événements sont des réglages distincts.',
  steps:['Dans Célébrations, choisissez le mercredi de la célébration : les dates des cinq jours en découlent.','Dans la page Préparation, utilisez « + Date » pour ajouter une date et × pour en retirer une.','Pour mercredi, jeudi, vendredi, samedi ou dimanche, sélectionnez l’heure de la page dans la liste par quarts d’heure ou saisissez une heure exacte au format HH:MM.','Un « Titre événement » peut aussi posséder son horaire propre, indépendant de l’heure de la page.','Enregistrez votre travail.'],
  note:'Les dates de préparation identiques sont refusées ; la saisie d’heure accepte notamment 18:30 et 18:32.'},
 {group:'Pages et célébrations',title:'Créer ou supprimer une page supplémentaire dans une célébration',
  info:'On peut ajouter une page au programme d’une célébration donnée.',
  steps:['Choisissez la célébration, puis « + Page » dans la liste de ses pages.','Donnez un nom à cette page supplémentaire.','Ajoutez les éléments souhaités et enregistrez.','Pour supprimer uniquement une page supplémentaire, utilisez « ⋯ » près de son nom puis « Supprimer la page ».'],
  note:'Les étapes historiques du programme ne se suppriment pas via ce menu.'},
 {group:'Pages et célébrations',title:'Créer des pages de bas de page',
  info:'Le titre d’une page publiée devient automatiquement un lien à côté d’Administration, tout en bas du site.',
  steps:['Ouvrez « Pages de bas de page ».','Cliquez sur « + Page de bas de page » et saisissez son titre.','Rédigez la page avec les mêmes outils que les pages générales.','Enregistrez le brouillon puis publiez la page pour faire apparaître son lien.','Les pages de bas de page ne figurent pas dans le menu principal.']},
 {group:'Pages et célébrations',title:'Médiathèques visibles par les visiteurs',
  info:'La médiathèque générale a été retirée du site public. Chaque célébration garde sa médiathèque.',
  steps:['Les fichiers restent accessibles dans la médiathèque de l’administration.','La médiathèque des visiteurs se limite aux fichiers insérés dans les pages publiées de cette célébration.','Les images des pages générales et des pages de bas de page ne sont pas ajoutées à la médiathèque d’une célébration.','Un élément ou un bloc masqué aux visiteurs ne doit pas être affiché dans leur médiathèque.']},
 {group:'Construire les blocs',title:'Différence entre le + bleu et le + vert',
  info:'C’est la distinction essentielle pour construire une page.',
  steps:['Le + BLEU apparaît au bas du bloc survolé sur ordinateur et ajoute une nouvelle zone ; sur téléphone, utilisez le + affiché après sélection.','Après le + bleu, choisissez « Bloc seul » ou « Deux colonnes ».','Le + VERT apparaît au survol d’un élément et ajoute un élément DANS la zone : titre, texte, image, bouton, vidéo, audio ou titre d’événement.','Répétez le + vert autant de fois que nécessaire pour composer votre zone.'],
  note:'Pour mettre une image et du texte dans un même cadre, utilisez le + vert, pas un nouveau + bleu.'},
 {group:'Construire les blocs',title:'Ajouter quelque chose dans un bloc déjà rempli',
  info:'Un ancien bloc avec seulement un titre, une image ou un texte peut devenir un bloc composé.',
  steps:['Touchez l’élément déjà présent pour le sélectionner.','Le petit + vert « Ajouter dans ce bloc » apparaît à l’intérieur du bloc.','Choisissez « Titre », « Image », « Texte », « Titre événement », « Bouton » ou « Vidéo ».','Le nouvel élément rejoint l’ancien dans le MÊME bloc, sans supprimer ni remplacer l’original.','Pour ajouter un troisième élément, utilisez le + vert de cette zone.'],
  note:'Après le premier ajout, le bloc simple devient une zone contenant plusieurs éléments. Aucun nouveau + bleu n’est nécessaire.'},
 {group:'Construire les blocs',title:'Créer une zone en deux colonnes',
  info:'Deux colonnes permettent de mettre, par exemple, une image à gauche et du texte à droite.',
  steps:['Touchez le + bleu à l’endroit voulu.','Choisissez « Deux colonnes ».','Utilisez le + vert de la colonne gauche ou droite pour ajouter ses éléments.','Touchez un élément et utilisez ← ou → pour le déplacer d’une colonne à l’autre.','Sur téléphone, les deux colonnes sont montrées l’une sous l’autre.'],
  note:'Chaque colonne garde son contenu et son ordre.'},
 {group:'Construire les blocs',title:'Passer de deux colonnes à une, et inversement',
  info:'Le petit bouton ▣ change la disposition de la zone.',
  steps:['Sur une zone, touchez ▣ « Passer à un bloc seul » ou « Passer à deux colonnes ».','En mode une colonne, tous les éléments des deux anciennes colonnes restent visibles, les uns à la suite des autres.','Si vous repassez à deux colonnes, les éléments retrouvent leur colonne d’origine.','Enregistrez après avoir choisi la disposition.'],
  note:'Changer la disposition ne supprime ni le texte ni les images.'},
 {group:'Construire les blocs',title:'Déplacer, dupliquer ou supprimer un élément',
  info:'Les commandes apparaissent quand on sélectionne l’élément.',
  steps:['Touchez l’élément à modifier.','↑ Monter et ↓ Descendre changent son ordre dans la même zone.','⧉ Dupliquer crée une copie immédiatement après l’élément.','✕ Supprimer retire cet élément après confirmation.','Dans une zone à deux colonnes, ← et → déplacent l’élément dans l’autre colonne.'],
  note:'Le bouton ✕ d’une zone entière est différent : il supprime toute cette zone et son contenu, après confirmation.'},
 {group:'Construire les blocs',title:'Ajouter un cadre, une bordure ou une ombre',
  info:'Le bouton ⚙ d’une zone règle le cadre du bloc complet.',
  steps:['Ouvrez les paramètres ⚙ de la zone.','Cadre : choisissez « Sans cadre », « Cadre arrondi » ou « Cadre carré ».','Choisissez la couleur et l’épaisseur du trait (1 à 5 px).','Activez ou désactivez « Ombre ».','Enregistrez et vérifiez dans l’aperçu.'],
  note:'Ces paramètres concernent toute la zone, pas seulement un paragraphe.'},
 {group:'Textes, images et liens',title:'Écrire et mettre en forme un titre ou un texte',
  info:'On peut écrire directement dans la page, sans formulaire séparé.',
  steps:['Touchez le titre ou le paragraphe, puis écrivez avec le clavier.','Sélectionnez des mots pour leur appliquer G (gras), I (italique) ou une couleur.','Sans sélection, ces commandes peuvent s’appliquer au bloc de texte entier.','La liste « px » change la taille du texte ; la liste d’alignement choisit Gauche, Centré ou Droite.','Touchez ailleurs, puis enregistrez.'],
  note:'Un titre principal et un titre secondaire peuvent avoir une taille différente ; vous pouvez toujours régler la taille manuellement.'},
 {group:'Textes, images et liens',title:'Ajouter, choisir ou remplacer une image',
  info:'Une image peut être choisie parmi les images du site ou envoyée depuis votre appareil.',
  steps:['Ajoutez « Image » avec le + vert de la zone concernée.','Touchez « Télécharger une image » pour choisir un fichier sur votre appareil, ou « Images du site » pour réutiliser une image déjà présente.','Une croix × et le bouton Annuler ferment la liste des images du site.','Pour remplacer une image existante, sélectionnez-la puis choisissez l’une de ces deux actions.','Enregistrez et vérifiez la page publique.'],
  note:'Les téléchargements directs d’images dans cet éditeur acceptent JPG, PNG ou WebP, jusqu’à 8 Mo. Les fichiers provenant du stockage local de l’appareil ne deviennent pas automatiquement des URL publiques.'},
 {group:'Textes, images et liens',title:'Réduire ou agrandir une image',
  info:'Le curseur règle la largeur d’affichage, sans déformer le fichier original.',
  steps:['Touchez une image déjà présente pour la sélectionner.','Repérez « Taille de l’image » et déplacez le curseur de 20 % à 100 %.','L’image change immédiatement de largeur ; sa hauteur s’adapte.','Utilisez « ↔ Aligner » si vous voulez aussi changer son alignement.','Cliquez sur « ✓ Valider » pour conserver ce réglage.'],
  note:'Le curseur ne réduit pas les dimensions ni le poids du fichier d’origine.'},
 {group:'Textes, images et liens',title:'Ajouter un bouton ou un lien vers un document',
  info:'Un bouton peut ouvrir un site HTTPS ou un chemin interne du site.',
  steps:['Ajoutez « Bouton » avec le + vert.','Touchez son libellé pour remplacer « Mon bouton » par le texte voulu.','Saisissez une adresse commençant par https:// ou un chemin du site commençant par /.','Pour associer un fichier, utilisez « 📎 Choisir un fichier ».','Utilisez « Miniature » pour choisir une image de présentation, et « ↔ Aligner » pour sa position.','Enregistrez puis testez le lien dans « Voir le site ».'],
  note:'Ne changez pas les URL de fichiers historiques qui ont déjà été envoyées par e-mail.'},
 {group:'Textes, images et liens',title:'Ajouter une vidéo ou une miniature',
  info:'La page peut montrer un aperçu de vidéo relié à son adresse.',
  steps:['Ajoutez « Vidéo » avec le + vert.','Renseignez le lien YouTube, Vimeo ou HTTPS de la vidéo.','Donnez un titre à la vidéo si le champ est proposé.','Choisissez ou remplacez la miniature si cette commande apparaît.','Enregistrez et testez le lien depuis la vue du site.'],
  note:'La vidéo reste hébergée à son adresse d’origine ; le lien ne télécharge pas nécessairement une vidéo sur le serveur Célébrations.'},
 {group:'Textes, images et liens',title:'Ajouter un titre d’événement et son heure',
  info:'Un événement dispose d’un titre et peut afficher une heure avant son texte.',
  steps:['Dans la zone souhaitée, appuyez sur le + vert puis « Titre événement ».','Touchez le texte « Titre de l’événement » pour le remplacer.','Choisissez son heure dans la liste (par pas de 15 minutes) ou saisissez HH:MM.','Enregistrez.'],
  note:'L’heure de l’événement est distincte de l’horaire général affiché pour le jour de la célébration.'},
 {group:'Fichiers et audio',title:'Comprendre l’onglet Fichiers et les catégories',
  info:'Le catalogue regroupe les ressources publiques existantes et certains fichiers importés sur l’appareil.',
  steps:['Ouvrez « Fichiers ».','Choisissez la catégorie : Images, PDF, Audios ou Autres.','Utilisez « Ouvrir » pour consulter une ressource.','Les liens d’utilisation indiquent dans quelles célébrations et pages certains fichiers publics sont référencés.','Utilisez « Insérer » pour associer un fichier à une page.'],
  note:'Les fichiers historiques disposent d’adresses publiques déjà utilisées : il faut les conserver.'},
 {group:'Fichiers et audio',title:'Insérer un fichier dans une célébration et à une heure',
  info:'Le bouton « Insérer » ouvre un petit formulaire.',
  steps:['Dans Fichiers, choisissez la catégorie et la ressource.','Touchez « Insérer ».','Sélectionnez la célébration et la page/jour souhaités.','Choisissez une heure si la ressource doit être placée dans le programme à un horaire précis.','Validez « Insérer », puis ouvrez la page pour vérifier son emplacement.','Appuyez sur « Enregistrer » pour enregistrer le brouillon commun.'],
  note:'L’insertion sur d’autres célébrations peut d’abord créer un brouillon local dans votre navigateur : vérifiez toujours la confirmation serveur de la célébration cible.'},
 {group:'Fichiers et audio',title:'Importer de nouveaux fichiers',
  info:'« + Importer » ajoute des fichiers à la bibliothèque locale du navigateur.',
  steps:['Dans Médiathèque, choisissez Audios puis « + Importer un MP3 » pour un audio ; les autres catégories utilisent « + Importer ».','Choisissez un ou plusieurs fichiers compatibles : images, PDF, MP3, WAV, texte ou document.','Le MP3 affiche sa progression réelle pendant le transfert (25 Mo maximum sur le site officiel). À la fin, il apparaît dans Audios.','Utilisez ensuite « Insérer » si vous voulez le placer dans une page.'],
  note:'Important : cet import classique conserve le fichier sur CET APPAREIL (limite de 60 Mo par fichier). Il ne garantit pas qu’il sera disponible sur un autre appareil ni en public. Pour un lien durable, privilégiez un fichier déjà publié dans le catalogue du site.'},
 {group:'Fichiers et audio',title:'Ajouter un MP3, convertir un WAV et l’écouter',
  info:'Les ressources audio peuvent être lues et insérées dans le programme.',
  steps:['Dans Médiathèque, choisissez « Audios » pour retrouver les MP3.','Dans la page à modifier, ajoutez « Lecteur audio » à un bloc, puis « Choisir un MP3 ». Depuis Audios, cliquez sur « Insérer dans le lecteur ».','La rubrique « Importer MP3 / WAV » de l’atelier de test n’est pas l’import officiel : sur le site, utilisez « Importer un MP3 » et sa barre de progression.','Le lecteur possède les commandes de lecture et un titre personnalisable. Enregistrez puis publiez la page.'],
  note:'Certaines commandes de stockage audio nécessitent une connexion spécifique au service audio : si l’interface la demande, ne confondez pas avec le simple code de l’administration.'},
 {group:'Fichiers et audio',title:'Supprimer un fichier sans casser ses liens',
  info:'Les fichiers utilisés sont protégés contre une suppression accidentelle.',
  steps:['Dans Fichiers, repérez les ressources et leurs utilisations.','Un fichier local inutilisé peut afficher « Supprimer » et demander confirmation.','Si un fichier est encore utilisé, retirez d’abord ses références des pages concernées.','Pour les fichiers publics historiques, la suppression physique n’est pas proposée avant vérification des références.'],
  note:'Retirer une image d’une page avec « Supprimer l’image » ne supprime pas son fichier de la bibliothèque. Ne remplacez pas un ancien lien PDF par un nouveau chemin si ce lien a déjà été transmis.'},
 {group:'Vérification et sécurité',title:'Aperçu, vue du site et mise en ligne',
  info:'Vérifiez le résultat avant de partager une page.',
  steps:['Dans l’éditeur, utilisez « Aperçu » pour masquer les commandes sans changer de page.','Appuyez sur « Revenir à l’édition » pour poursuivre les modifications.','Utilisez « Voir le site » pour ouvrir la version visible par les visiteurs.','Après un changement, cliquez sur « Enregistrer », attendez le message du serveur puis actualisez la vue publique.'],
  note:'« Aperçu » ne sauvegarde pas et ne publie pas à lui seul vos modifications.'},
 {group:'Vérification et sécurité',title:'Vérifier les liens anciens et les fichiers manquants',
  info:'Les URL des fichiers envoyés dans des e-mails doivent continuer à fonctionner.',
  steps:['Ouvrez la page publique et testez les boutons et les liens des documents.','Pour une image manquante, vérifiez qu’elle pointe vers une image publique existante.','Ne renommez pas les chemins des anciens fichiers PDF, MP3 ou images sans disposer d’une redirection contrôlée.','Dans le doute, ne supprimez pas le fichier : signalez son adresse pour une vérification.'],
  note:'Une image seulement stockée localement dans un navigateur peut ne pas apparaître sur un autre appareil.'},
 {group:'Vérification et sécurité',title:'En cas de problème ou de bouton introuvable',
  info:'Quelques vérifications simples suffisent souvent à retrouver une commande.',
  steps:['Touchez d’abord le bloc : beaucoup de commandes n’apparaissent que lorsqu’il est sélectionné.','Fermez le clavier du téléphone pour voir le bas du bloc et le petit + vert.','Si vous cherchez un nouveau bloc, regardez le + bleu situé entre les zones.','Actualisez l’administration si vous voyez encore l’ancienne interface.','Vérifiez le message sous l’éditeur : une sauvegarde locale et une sauvegarde serveur ne sont pas équivalentes.'],
  note:'Évitez de supprimer ou réinitialiser quoi que ce soit pour résoudre un problème d’affichage.'}
];
function celebrationsUserGuide(){
 const root=n('section','editor-guide'),header=n('header','guide-intro');
 header.append(n('h1','','Mode d’emploi du site'),n('p','',
  'Toutes les commandes de l’administration, expliquées pas à pas. Touchez une rubrique pour lire les instructions.'));
 const bar=n('div','guide-controls'),input=n('input','guide-search');
 input.type='search';input.placeholder='Rechercher : image, colonne, PDF, enregistrement…';
 input.setAttribute('aria-label','Rechercher dans le mode d’emploi');
 const count=n('span','guide-count');
 const all=b('Tout ouvrir',()=>setAll(true),'sm'),none=b('Tout fermer',()=>setAll(false),'sm');
 bar.append(input,all,none,count);root.append(header,bar);
 const results=n('div','guide-results'),empty=n('p','guide-empty','Aucune rubrique trouvée. Essayez un autre mot.');
 root.append(results,empty);w.append(root);
 const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const topics=[];
 for(const topic of GUIDE_TOPICS){
  const details=n('details','guide-topic'),summary=n('summary','guide-topic-title',topic.title);
  const description=n('p','guide-topic-info',topic.info);
  const ordered=n('ol','guide-topic-steps');
  for(const step of topic.steps)ordered.append(n('li','',step));
  details.append(summary,description,ordered);
  if(topic.note)details.append(n('p','guide-topic-note','À retenir : '+topic.note));
  topics.push({topic,details,haystack:fold([topic.group,topic.title,topic.info,
    ...topic.steps,topic.note||''].join(' '))});
 }
 function setAll(open){
  for(const x of topics)if(!x.details.hidden)x.details.open=open;
 }
 function display(){
  const query=fold(input.value.trim()),words=query.split(/\s+/).filter(Boolean);
  results.replaceChildren();
  let shown=0,group='',groupRoot=null;
  for(const item of topics){
   const visible=words.every(word=>item.haystack.includes(word));
   item.details.hidden=!visible;
   if(!visible)continue;
   if(group!==item.topic.group){
    group=item.topic.group;
    const wrapper=n('section','guide-group');
    const heading=n('h2','',group);
    groupRoot=n('div','guide-group-topics');
    wrapper.append(heading,groupRoot);results.append(wrapper);
   }
   item.details.open=words.length>0;
   groupRoot.append(item.details);shown++;
  }
  count.textContent=shown+' rubrique'+(shown>1?'s':'');
  empty.hidden=shown>0;
 }
 input.addEventListener('input',display);
 display();
}

function celebrationsSettings(){
 // A single persisted switch; changing it never writes access policies.
 const mode=n('section','settings-actions m021b-admin-mode');
 const modeCss=n('style');modeCss.nonce=document.querySelector('script[nonce]')?.nonce||'';
 modeCss.textContent='.m021b-admin-mode{border:1px solid #cad7d8;border-radius:12px;padding:14px;margin:0 0 16px;max-width:790px}.m021b-mode-choice{display:flex;align-items:center;gap:12px;min-height:46px;cursor:pointer;font-weight:600}.m021b-mode-choice input{flex:0 0 auto;min-width:22px;min-height:22px;accent-color:#246a59}.m021b-admin-mode p{margin:.4rem 0;line-height:1.45}.m021-private-warning{color:#805316;background:#fff7dd;padding:.6rem;border-radius:8px;font-size:.93rem}.stage-editor [data-tab="members-spaces"][hidden]{display:none!important}@media(max-width:600px){.m021b-admin-mode{padding:12px}.m021b-mode-choice{align-items:flex-start}}';
 const modeTitle=n('h2','','Mode de l’administration'),modeLabel=n('label','m021b-mode-choice');
 const modeCheck=n('input');modeCheck.type='checkbox';modeCheck.checked=adminMembersEnabled;
 modeCheck.disabled=!adminModeLoaded;
 modeCheck.setAttribute('aria-label','Activer la gestion des membres et des accès privés');
 modeLabel.append(modeCheck,n('span','','Activer la gestion des membres et des accès privés'));
 const modeHelp=n('p','',adminMembersEnabled?
  'Mode complet : membres, catégories et autorisations privées accessibles.':
  'Mode simplifié : uniquement les fonctions nécessaires au site public.');
 const modeStatus=n('p');modeStatus.setAttribute('role','status');
 if(!adminModeLoaded)modeStatus.textContent='Réglage indisponible : actualisez la page avant de le modifier.';
 mode.append(modeCss,modeTitle,modeLabel,modeHelp,modeStatus);
 w.append(mode);
 modeCheck.onchange=async()=>{
  const desired=modeCheck.checked;
  modeCheck.disabled=true;modeStatus.textContent='Enregistrement du mode…';
  try{
   // Obtain the current revision, refusing to overwrite newer editor data.
   const fresh=await fetch('/api/site-identity',{credentials:'same-origin',cache:'no-store'});
   const snapshot=await fresh.json();
   if(!fresh.ok||!snapshot.ok)throw Error(snapshot.error||'Réglage indisponible');
   if(snapshot.memberAccessUiEnabled!==adminMembersEnabled)
    throw Error('Le mode a changé sur un autre appareil. Actualisez les paramètres.');
   const response=await fetch('/api/site-identity',{method:'POST',credentials:'same-origin',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({expectedRevision:snapshot.revision,memberAccessUiEnabled:desired})});
   const result=await response.json();
   if(!response.ok||!result.ok)throw Error(result.error||'Enregistrement refusé');
   adminModeRevision=result.revision;adminMembersEnabled=result.memberAccessUiEnabled===true;
   modeStatus.textContent='✓ Mode enregistré.';
   render(); // Existing menu and form commands update immediately.
  }catch(error){
   modeCheck.checked=adminMembersEnabled;
   modeStatus.textContent='❌ '+(error.message||error);
  }finally{modeCheck.disabled=false;}
 };

 // Native disclosure reuses the existing multilingual editor under Settings.
 // Changing this local display setting never calls serverSave().
 const languagesBox=n('details','settings-actions m028-language-settings');
 // Keep the panel visible after adding/renaming a language, which rerenders Settings.
 languagesBox.open=adminLanguagesVisible;
 const summary=n('summary','','🌍 Gestion des langues (facultatif)');
 const languageHelp=n('p','','Les langues déjà publiées restent accessibles. Cette préférence affiche seulement les outils sur cet appareil.');
 const languageLabel=n('label','m021b-mode-choice');
 const languageCheck=n('input');languageCheck.type='checkbox';languageCheck.checked=adminLanguagesVisible;
 languageCheck.setAttribute('aria-label','Afficher les outils de traduction');
 languageLabel.append(languageCheck,n('span','','Afficher les outils de traduction dans les pages'));
 const languageStatus=n('p','');languageStatus.setAttribute('role','status');
 const languageTools=n('div','m028-language-tools');languageTools.hidden=!adminLanguagesVisible;
 m018LanguagesCategories(languageTools);
 languageCheck.onchange=()=>{
  adminLanguagesVisible=languageCheck.checked;
  if(!adminLanguagesVisible){
   // A hidden picker must never leave the page editing an invisible translation.
   commitLocalizedView();editingLanguageId='fr';clearLocaleView();
  }
  try{localStorage.setItem(LANGUAGE_TOOLS_PREF,adminLanguagesVisible?'1':'0')}
  catch{languageStatus.textContent='Préférence temporaire : stockage local indisponible.';languageTools.hidden=!adminLanguagesVisible;return}
  languageTools.hidden=!adminLanguagesVisible;
  languageStatus.textContent=adminLanguagesVisible?
   '✓ Outils multilingues affichés sur cet appareil.':
   '✓ Outils multilingues masqués sur cet appareil. Les contenus restent inchangés.';
 };
 languagesBox.append(summary,languageHelp,languageLabel,languageStatus,languageTools);
 w.append(languagesBox);
}
function m018LanguagesCategories(parent=w){
  const panel=n('section','m018-language-panel');
  panel.append(n('h2','','Langues'));
  panel.append(n('p','','Les huit langues sont prêtes. Une langue apparaît sur le site dès qu’un contenu publié est accessible. Les textes des pages sont rédigés par l’administrateur.'));
  const form=n('form','m018-language-form');
  const input=n('input');input.type='text';input.required=true;input.maxLength=120;
  input.placeholder='Nom de la langue';input.setAttribute('aria-label','Nom de la nouvelle langue');
  const add=n('button','btn sm','＋ Ajouter une langue');add.type='submit';
  form.append(input,add);
  form.onsubmit=event=>{
   event.preventDefault();const name=input.value.trim();if(!name)return;
   const labels={francais:'fr',anglais:'en',espagnol:'es',allemand:'de',italien:'it',
    portugais:'pt',neerlandais:'nl',polonais:'pl',russe:'ru',arabe:'ar',chinois:'zh'};
   const key=name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
   const code=labels[key]||'und-'+crypto.randomUUID().replaceAll('-','').slice(0,8);
   try{
    editorLocalization.registry=addLanguage(editorLocalization.registry,{id:code,name,flag:'',active:true});
    mark();save();void serverSave();render();
   }catch(e){siteNotice(e.message||String(e))}
  };
  panel.append(form);
  const rows=n('div','m018-language-list');
  for(const language of editorLocalization.registry.languages){
   const row=n('div','m018-language-entry');
   const name=n('input');name.value=language.name;name.maxLength=120;
   name.setAttribute('aria-label','Renommer '+language.name);
   const rename=b('Renommer',()=>{
    try{
     editorLocalization.registry=renameLanguage(editorLocalization.registry,language.id,name.value.trim());
     mark();save();void serverSave();render();
    }catch(e){siteNotice(e.message||String(e))}
   },'sm');
   row.append(name,rename);rows.append(row);
  }
  panel.append(rows);
  parent.append(panel);

 }
let privateCatalogue=null,availableCategories=[];
function ensureMemberPanel(){
 if(memberPanel)return;
 memberPanelRoot=n('div','real-member-spaces');
 memberPanel=M012B.mount(memberPanelRoot,{celebrations:celebrationEntries(),currentCelebrationId:String(STAGE_SEED.celebrationId),
  styleNonce:document.querySelector('script[nonce]')?.nonce,css:M012B.css,onEditPage:openPrivatePage,
  onCategories:types=>{availableCategories=types;},
  onSessionChange:active=>{if(!active&&privateEdit)closePrivatePage(true);}});
 void memberPanel.readContent().then(value=>{privateCatalogue=value;if(['pages','footer','celebrations'].includes(tab))render()}).catch(()=>{});
}
function memberSpaces(){
 if(!IS_STAGE||typeof M012B==='undefined')return;
 if(!adminMembersEnabled)return;
 ensureMemberPanel();
 // The existing complete-mode entry now shows categories only.
 if(tab==='languages-categories')memberPanel.showCategories();
 else memberPanel.showMembers();
 w.append(memberPanelRoot);
}
async function refreshPrivateCatalogue(){
 privateCatalogue=await memberPanel.readContent();
}
async function editAccess(kind,p){
 try{
  ensureMemberPanel();
  if(dirty||db._serverPending){save();await serverSave();if(db._serverPending)return}
  const current=await memberPanel.readContent(),types=await memberPanel.categories();
  const old=kind==='celebration'?current.celebrationAccessPolicy:p.accessPolicy||{mode:'PUBLIC'};
  const active=types.filter(t=>!t.disabled);
  const fields=[{name:'mode',label:'Accès',radio:true,value:old.mode==='PUBLIC'?'PUBLIC':'PRIVATE',options:[['PUBLIC','Public'],['PRIVATE','Privé']]}];
  if(active.length)fields.push({name:'scope',label:'Si privé',radio:true,value:old.mode==='SELECTED_TYPES'?'selected':'registered',options:[['registered','Tous les inscrits à cette célébration'],['selected','Catégories sélectionnées']]},{name:'types',label:'Catégories',multiple:true,value:old.typeIds||[],options:active.map(t=>[t.id,t.name])});
  const result=await siteDialog({title:kind==='celebration'?'Accès à la célébration':'Accès à la page',fields,confirm:'Enregistrer'});
  if(!result)return;
  const accessPolicy=result.mode==='PUBLIC'?{mode:'PUBLIC'}:result.scope==='selected'?{mode:'SELECTED_TYPES',typeIds:result.types}:{mode:'ALL_PRIVATE_TYPES'};
  if(accessPolicy.mode==='SELECTED_TYPES'&&!accessPolicy.typeIds.length){siteNotice('Choisissez au moins une catégorie.');return}
  await memberPanel.commandContent(kind==='celebration'?'celebration-access':'page-access',{...(kind==='page'?{id:p.id}:{}),accessPolicy});
  await serverLoad();await refreshPrivateCatalogue();render();
  status.textContent=kind==='page'?'Accès enregistré. Publiez la page quand elle sera prête.':'Accès enregistré.';
 }catch(e){siteNotice('Enregistrement impossible : '+e.message)}
}
function privatePageButtons(group,mount){
 for(const p of privateCatalogue?.record?.pages||[]){
  if(!p.privateManaged)continue;
  const pg=p.group==='page'?(p.placement==='footer'?'footer':'page'):'celebration';
  if(pg!==group)continue;
  const row=n('div','general-page-row');row.append(b(p.name+' · Privé',()=>openManagedPage(p.id)),b('Accès',()=>editAccess('page',p),'sm'));mount.append(row);
 }
}
async function openManagedPage(pageId,language='fr'){
 try{
  await refreshPrivateCatalogue();
  const canonical=()=>privateCatalogue.record.pages.find(x=>x.id===pageId);
  const localized=()=>language==='fr'?clone(canonical()):{...clone(canonical()),name:canonical().translations?.[language]?.name||'Titre à rédiger',blocks:clone(canonical().translations?.[language]?.blocks||[])};
  if(!canonical())return;
  const command=async(action,fields)=>{privateCatalogue=await memberPanel.commandContent(action,fields);return localized()};
  openPrivatePage({languageId:language,page:localized(),
   save:async({name,blocks})=>{const original=clone(canonical());if(language==='fr'){original.name=name;original.blocks=blocks}else original.translations={...original.translations,[language]:{name,blocks}};return command('save',{pages:[original]})},
   reload:async()=>{await refreshPrivateCatalogue();return localized()},
   publish:()=>command('publish',{kind:'page',id:pageId}),unpublish:(visibility='draft')=>command('unpublish',{kind:'page',id:pageId,visibility}),
   isPublished:()=>privateCatalogue.pageReleases.some(r=>r.pageId===pageId)});
 }catch(e){siteNotice(e.message)}
}
async function showContentVersions(){
 try{
  ensureMemberPanel();if(dirty){save();await serverSave();if(db._serverPending)return}
  availableCategories=await memberPanel.categories();await refreshPrivateCatalogue();
  w.replaceChildren();w.append(b('← Célébrations',()=>{tab='celebrations';render()}));
  memberPanel.showSpaces();w.append(memberPanelRoot);
 }catch(e){siteNotice('Versions indisponibles : '+e.message)}
}
async function duplicateChoice(entry){
 if(!entry)return;
 if(!adminMembersEnabled)return m018DuplicateCelebration(entry);
 if(dirty||db._serverPending){
  siteNotice('Enregistrez vos modifications de contenu avant de créer une version.');
  return;
 }
 try{
  ensureMemberPanel();
  const pages=db.pages.filter(p=>p.group==='celebration'&&
   p.id.endsWith('-'+String(STAGE_SEED.celebrationId)))
   .map(p=>({name:p.name,group:p.group,blocks:clone(p.blocks||[]),
    translations:clone(editorLocalization.pages[p.id]||{})}));
  const created=await memberPanel.duplicateCelebrationVersion(pages,celebrationLabel(entry));
  if(created)status.textContent='✓ Version créée en brouillon : '+celebrationLabel(entry)+' — '+created.category+' — '+created.language+' ('+created.pages+' pages).';
 }catch(e){siteNotice('Duplication impossible : '+(e.message||e))}
}
function accessControls(kind,p){
 const box=n('div','m020-access'),label=n('label','editor-language-choice','Accès'),select=n('select');
 select.setAttribute('aria-label','Accès '+(kind==='page'?'de la page':'à la célébration'));
 const currentSpace=p.spaceId?privateCatalogue?.record.spaces.find(s=>s.id===p.spaceId):null;
 const original=currentSpace?
  (currentSpace.visibility==='PUBLIC'?{mode:'PUBLIC'}:
   currentSpace.accessPolicy.mode==='PUBLIC'?{mode:'ALL_PRIVATE_TYPES'}:currentSpace.accessPolicy):
  kind==='celebration'?privateCatalogue?.celebrationAccessPolicy:p.accessPolicy;
 let confirmed=clone(original||{mode:'PUBLIC'}),busy=false;
 for(const [value,title]of [['PUBLIC','Public'],['PRIVATE','Privé']]){
  const option=n('option','',title);option.value=value;select.append(option);
 }
 const categories=n('fieldset');categories.append(n('legend','','Catégories'));
 const all=n('input');all.type='checkbox';
 const allLabel=n('label','','Tous les inscrits à cette célébration');allLabel.prepend(all);categories.append(allLabel);
 const checks=[];
 for(const type of availableCategories.filter(t=>!t.disabled)){
  const check=n('input');check.type='checkbox';check.value=type.id;
  const item=n('label','',type.name);item.prepend(check);categories.append(item);checks.push(check);
 }
 const toggle=()=>{categories.hidden=select.value!=='PRIVATE'};
 const restore=()=>{
  select.value=confirmed.mode==='PUBLIC'?'PUBLIC':'PRIVATE';
  all.checked=confirmed.mode!=='SELECTED_TYPES';
  checks.forEach(c=>{c.checked=!!confirmed.typeIds?.includes(c.value)});
  toggle();
 };
 const policyFromFields=()=>{
  const typeIds=checks.filter(c=>c.checked).map(c=>c.value);
  return select.value==='PUBLIC'?{mode:'PUBLIC'}:
   all.checked?{mode:'ALL_PRIVATE_TYPES'}:
   typeIds.length?{mode:'SELECTED_TYPES',typeIds}:null;
 };
 const widens=(before,after)=>
  before.mode!=='PUBLIC'&&(after.mode==='PUBLIC'||
   before.mode==='SELECTED_TYPES'&&(after.mode==='ALL_PRIVATE_TYPES'||
    after.mode==='SELECTED_TYPES'&&after.typeIds.some(id=>!before.typeIds?.includes(id))));
 async function autoSaveAccess(){
  if(busy)return;
  const next=policyFromFields();
  if(!next){status.textContent='Sélectionnez une catégorie ou « Tous les inscrits ». ';return}
  if(JSON.stringify(next)===JSON.stringify(confirmed))return;
  // Access changes must not trigger a hidden content save or discard local edits.
  if(dirty||db._serverPending||privateBusy){
   restore();siteNotice('Enregistrez d’abord vos modifications de contenu avant de changer les accès.');return;
  }
  if(widens(confirmed,next)&&!await siteConfirm('Cette modification élargit les accès au contenu. Confirmer ?')){
   restore();return;
  }
  busy=true;for(const input of [select,all,...checks])input.disabled=true;
  try{
   ensureMemberPanel();
   if(currentSpace){
    const spaces=clone(privateCatalogue.record.spaces);
    const target=spaces.find(s=>s.id===currentSpace.id);
    if(!target)throw Error('Espace introuvable');
    target.visibility=next.mode==='PUBLIC'?'PUBLIC':'PRIVATE';
    target.accessPolicy=next.mode==='ALL_PRIVATE_TYPES'?{mode:'PUBLIC'}:next;
    await memberPanel.commandContent('save',{spaces});
   }else{
    await memberPanel.commandContent(kind==='page'?'page-access':'celebration-access',{
     ...(kind==='page'?{id:p.id}:{}),accessPolicy:next
    });
   }
   confirmed=clone(next);
   if(privateEdit)await closePrivatePage(true);
   else await serverLoad();
   await refreshPrivateCatalogue();render();
   status.textContent='✓ Accès enregistré automatiquement.';
  }catch(error){
   restore();
   status.textContent='❌ Changement d’accès refusé : '+(error.message||error);
  }finally{
   busy=false;for(const input of [select,all,...checks])input.disabled=false;
  }
 }
 select.onchange=()=>{toggle();void autoSaveAccess()};
 all.onchange=()=>{if(all.checked)checks.forEach(c=>c.checked=false);void autoSaveAccess()};
 checks.forEach(check=>{check.onchange=()=>{
  if(check.checked)all.checked=false;
  void autoSaveAccess();
 }});
 restore();label.append(select);box.append(label,categories);
 return box;
}
async function openPrivatePage(controller){
 if(privateEdit||!controller?.page||dirty)return;
 try{await refreshPrivateCatalogue()}catch(e){siteNotice(e.message);return}
 if(privateEdit)return;
 privateReturn={db,id,tab};privateEdit=controller;
 db={...db,pages:[{...clone(controller.page),group:controller.page.group||'celebration'}],_serverPending:false};
 id=controller.page.id;tab='celebrations';preview=false;dirty=false;
 selectedBlockId=null;blockEditSession=null;clearLocaleView();editingLanguageId='fr';
 resetUndoHistory();render();
}
async function closePrivatePage(force=false){
 if(!privateEdit||privateBusy)return;
 if(!force&&dirty&&!(await siteConfirm('Abandonner les modifications de cette page non enregistrées ?')))return;
 db=privateReturn.db;id=privateReturn.id;tab=privateReturn.tab;
 privateReturn=null;privateEdit=null;dirty=false;preview=false;
 selectedBlockId=null;blockEditSession=null;clearLocaleView();resetUndoHistory();
 await serverLoad();await refreshPrivateCatalogue();render();
}
async function savePrivatePage(){
 if(!privateEdit||privateBusy)return false;
 const current=page();
 privateBusy=true;
 try{
  const saved=await privateEdit.save({name:current.name,blocks:clone(current.blocks)});
  if(!saved||saved.id!==id)throw Error('Confirmation de page invalide');
  db.pages=[{...clone(saved),group:saved.group||'celebration'}];dirty=false;db._serverPending=false;
  resetUndoHistory();render();status.textContent='✓ Page enregistrée.';
  return true;
 }catch(e){status.textContent='❌ Enregistrement canonique refusé : '+(e.message||e);return false}
 finally{privateBusy=false;render();}
}
async function reloadPrivatePage(){
 if(!privateEdit||privateBusy||dirty&&!(await siteConfirm('Abandonner les modifications non enregistrées ?')))return;
 privateBusy=true;
 try{const loaded=await privateEdit.reload();db.pages=[{...clone(loaded),group:loaded.group||'celebration'}];dirty=false;resetUndoHistory();render();status.textContent='✓ Page rechargée.';}
 catch(e){status.textContent='❌ Rechargement refusé : '+(e.message||e)}
 finally{privateBusy=false;render();}
}
async function publishPrivatePage(action,visibility='draft'){
 if(!privateEdit||privateBusy)return;
 if(dirty&&!await savePrivatePage())return;
 privateBusy=true;
 try{await privateEdit[action](visibility);if(action==='unpublish')page().visibility=visibility;render();status.textContent=action==='publish'?'✓ Page publiée explicitement.':'✓ Page dépubliée.';}
 catch(e){status.textContent='❌ Publication refusée : '+(e.message||e)}
 finally{privateBusy=false;render();}
}
function privatePageWorkspace(){
 const selectors=n('div','editor-language-row');
 const langLabel=n('label','editor-language-choice','Langue'),lang=n('select');lang.setAttribute('aria-label','Langue');
 lang.value=privateEdit.languageId||'fr';
 lang.onchange=async()=>{if(dirty&&!await savePrivatePage())return;const language=lang.value,title=page().name,type=privateCatalogue.record.spaces.find(s=>s.id===page().spaceId)?.accessPolicy.typeIds?.[0]||'',pid=page().id,sid=page().spaceId;await closePrivatePage(true);if(sid)await memberPanel.openVersion(type,language,title);else await openManagedPage(pid,language)};
 langLabel.append(lang);selectors.append(langLabel);
 if(adminMembersEnabled)selectors.append(accessControls('page',page()));
 else selectors.append(n('p','m021-private-warning','Page privée existante : les droits sont conservés. Réactivez le mode complet pour les modifier.'));
 const visibilityLabel=n('label','editor-language-choice','Visibilité'),visibility=n('select');visibility.setAttribute('aria-label','Visibilité de la page');
 for(const [value,label]of [['draft','Brouillon'],['published','Visible'],['hidden','Masqué']]){const option=n('option','',label);option.value=value;visibility.append(option)}visibility.value=privateEdit.isPublished()?'published':page().visibility==='hidden'?'hidden':'draft';
 visibility.onchange=()=>void publishPrivatePage(visibility.value==='published'?'publish':'unpublish',visibility.value);visibilityLabel.append(visibility);selectors.prepend(visibilityLabel);w.append(selectors);
 const actions=n('div','member-spaces-actions');
 const back=b('← Célébrations',()=>closePrivatePage());
 const saveButton=b('Enregistrer',()=>void savePrivatePage());
 const reload=b('Recharger',()=>void reloadPrivatePage());
 const publish=b('Publier cette page',()=>void publishPrivatePage('publish'));
 const unpublish=b('Dépublier cette page',()=>void publishPrivatePage('unpublish'));
 back.disabled=privateBusy;saveButton.disabled=privateBusy;
 reload.disabled=privateBusy;publish.disabled=privateBusy;unpublish.disabled=privateBusy;
 actions.append(back,saveButton,reload);
 w.append(actions,n('h2','',page().name));
 const editor=n('div','celebration-editor');w.append(editor);pageWorkspace(page().group==='page'?(page().placement==='footer'?'footer':'page'):'celebration',editor);
}

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
function render(){
 if(!adminMembersEnabled&&['members-spaces','participants','languages-categories'].includes(tab))tab='pages';
 applyAdminMenu();
 const inMembers=['members-spaces','participants','languages-categories'].includes(tab);
 document.querySelector('.stage-editor')?.classList.toggle('is-catalogue',inMembers);
 const result=renderEditorFrame({IS_STAGE,document,STAGE_SEED,page,pageSlug,stateOfPage,editorDragState,editorDragFinish,undoAnchor,resetUndoHistory,ensureUndoButton,applyPalette,w,tab,preview,el,pages,footerPages,celebrations:privateEdit?privatePageWorkspace:celebrations,media,userGuide,settings,memberSpaces});
 for(const key of ['save-btn','preview-btn','undo-btn','status']){
  const control=el(key);if(control)control.hidden=inMembers||!!privateEdit&&key==='save-btn';
 }
 if((inMembers||privateEdit)&&el('view-site-btn'))el('view-site-btn').hidden=true;
 syncSecondarySave();
 return result;
}
bindEditorShell({document,window,el,enter,onPreview:()=>{preview=!preview;selectedBlockId=null;blockEditSession=null;render()},isPreview:()=>preview,deselect:()=>{selectedBlockId=null;blockEditSession=null;document.querySelectorAll('.canvas .block.is-selected').forEach(box=>box.classList.remove('is-selected'))},shouldWarnBeforeUnload:()=>{if(memberPanel?.changed)return true;if(dirty||(IS_STAGE&&(db._serverPending||serverSaving)))return true;return false}});
el('save-btn').onclick=saveCurrentContent;
el('image-input').onchange=async function(){
 const file=this.files&&this.files[0],x=target;this.value='';
 if(!file||!x)return;
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>8000000){
  siteNotice('Image JPG, PNG ou WebP de moins de 8 Mo.');return;
 }
 const source=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=source});
  const ratio=Math.min(1,1200/Math.max(img.width,img.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.width*ratio));
  canvas.height=Math.max(1,Math.round(img.height*ratio));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));
  if(!blob)throw Error('Conversion de l’image impossible');
  if(IS_STAGE&&LIVE_MEDIA_UPLOAD_HOST){
   const record=await uploadToMediaServer(new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'}));
   if(imageCoverTarget){x.cover=record.src;delete x.coverAssetId}
   else{x.src=record.src;delete x.assetId;x.text=file.name}
   mark();render();
  }else{
   const record={id:crypto.randomUUID(),name:file.name,type:'image/jpeg',size:blob.size,
    createdAt:new Date().toISOString(),blob};
   await fileOperation('put',record);rememberFile(record);
   if(imageCoverTarget){x.coverAssetId=record.id;x.cover=''}
   else{x.assetId=record.id;x.src='';x.text=file.name}
   mark();render();
  }
 }catch(e){siteNotice('L’image n’a pas été ajoutée : '+(e.message||e)+'. Le contenu précédent est intact.')}
 finally{URL.revokeObjectURL(source);target=null;imageCoverTarget=false}
};

const uploadPicker=n('input');uploadPicker.id='asset-file-picker';uploadPicker.type='file';uploadPicker.accept=IS_STAGE&&LIVE_MEDIA_UPLOAD_HOST?'.pdf,.txt,.docx,.jpg,.jpeg,.png,.webp,.mp3,.wav':'.pdf,.txt,.doc,.docx,.odt,.rtf,.csv,image/*,audio/*,video/*';uploadPicker.multiple=true;uploadPicker.hidden=true;document.body.append(uploadPicker);
uploadPicker.onchange=async()=>{const files=[...uploadPicker.files];uploadPicker.value='';await importFiles(files)};
if(IS_STAGE){await loadAdminMode();await serverLoad();if(db._serverPending){serverDiverged=false;await serverSave();}}
render();loadFiles();

})();
//# sourceURL=ej-verbatim-compiled-celebrations.js
