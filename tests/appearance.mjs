import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const index=read("index.html"),admin=read("assets/admin.js"),html=read("admin.html");
const publicCss=read("assets/celebrations-original-public.css");
const adminCss=read("assets/celebrations-original-admin.css");
assert.ok(publicCss.length>25000,"feuilles CSS publiques d'origine conservées");
assert.ok(adminCss.length>100000,"feuilles CSS administratives d'origine conservées");
for(const selector of [".site-menu-bar",".general-navigation",".site-paper",".trial-heading",".trial-audio",".footer-pages"])
 assert.ok(publicCss.includes(selector),"sélecteur d'origine : "+selector);
for(const selector of [".shell{",".rail{",".topbar{",".navbtn{",".panel{",".stage-editor"])
 assert.ok(adminCss.includes(selector),"sélecteur de l'éditeur d'origine : "+selector);
assert.match(index,/class="site-menu-bar"/);
assert.match(index,/class="general-navigation"/);
assert.match(index,/class="site-paper"/);
assert.match(index,/class="footer-pages"/);
assert.match(index,/celebrations-public-verbatim[.]css/);
assert.match(html,/celebrations-editor-verbatim[.]css/);
assert.match(html,/class="shell stage-editor"/);
assert.match(html,/Pages de bas de page/);
assert.match(html,/Médiathèque \(administration\)/);
assert.match(html,/Aperçu du brouillon/);
assert.match(html,/Mode d’emploi/);
assert.doesNotMatch(html,/data-tab="celebrations"|data-tab="members-spaces"|data-tab="languages-categories"/);
assert.doesNotMatch(index,/jwyayfkssyagvnablttg|celebrations-media|ronde\.workers\.dev/);
const canvas=read("assets/editor-canvas.js");
assert.match(canvas,/canvas-wrap/);
assert.match(canvas,/section-add-blue/);
const blockEditor=read("assets/editor-block-editor.js");
const insertModel=read("assets/editor-sections.js");
const publicRenderer=read("assets/page-renderer.js");
assert.match(blockEditor,/contentEditable/);
assert.match(canvas,/section-column-actions/);
assert.match(canvas,/section-insert-choices/);
assert.match(canvas,/section-add-green/);
assert.match(canvas,/section-add-blue/);
assert.match(insertModel,/Ressource/);
assert.match(publicRenderer,/trial-content-section/);
assert.match(html,/ej-original-bridge[.]js/);
assert.match(html,/class="shell stage-editor"/);
assert.match(html,/data-tab="footer"/);
assert.doesNotMatch(html,/data-tab="celebrations"|data-tab="members-spaces"|data-tab="languages-categories"/);
const upstreamEditor=read("assets/celebrations-editor-verbatim.js");
const upstreamCss=read("assets/celebrations-editor-verbatim.css");
const provenance=JSON.parse(read("assets/ej-source-provenance.json"));
assert.equal(provenance.source,"ludodulac/Celebrations");
assert.equal(provenance.sha,"f4cc58653dd68d8a4c3e0fa614a93969987d47da");
assert.ok(upstreamEditor.length>350000,"véritable éditeur complet copié");
assert.ok(upstreamCss.length>95000,"CSS canonique complet copié");
for(const fragment of ["function sectionMenu(","function sectionColumn(","function renderSection(","function block(","function chooseFile(","function editorFormatToolbar(","function enableTouchLongPressDragging("])
 assert.ok(upstreamEditor.includes(fragment),"composant source conservé : "+fragment);
console.log("Conformité visuelle au site source et séparation des projets : OK");

/* Les fichiers sont versionnés afin de ne pas récupérer l'ancienne barre basse ;
   les VRAIES commandes sont déplacées vers les réglages collants de la page. */
const newHtml=read("admin.html"),newCss=read("assets/ej-admin-layout.css"),
  newBridge=read("assets/ej-original-bridge.js"),
  patch=read("scripts/patch-page-controls.mjs");
assert.match(newHtml,/data-ej-ui-version="2026-11-13-compact"/);
assert.match(newHtml,/assets\/ej-admin-layout\.css\?v=ej-20261113-compact/);
assert.match(newHtml,/<a id="view-site-btn" class="navbtn ej-site-link"/);
assert.match(newHtml,/aria-label="Commandes de la page"/);
assert.doesNotMatch(newHtml,/<header class="topbar"/);
assert.match(newCss,/position:sticky!important/);
assert.match(newCss,/\.ej-page-settings-head/);
assert.match(newCss,/#ej-original-shell \.topbar\{\n position:sticky!important/);
assert.match(newBridge,/celebrations-editor-verbatim\.js\?v=ej-20261113-compact/);
assert.match(patch,/ej-page-toolbar-slot/);
assert.match(patch,/const ejToolbar=document\.querySelector/);

/* Le nouveau bandeau n'affiche pas les champs tant qu'on ne clique pas sur
   l'engrenage, et les deux interfaces conservent leur gestion au survol. */
const hover=read("assets/ej-hover-menu.js");
assert.match(newHtml,/class="ej-admin-home-link" href="admin.html"/);
assert.match(patch,/details\.open=window\.__EJ_SETTINGS_EXPANDED__===true/);
assert.match(newCss,/bandeau compact/);
assert.match(index,/assets\/ej-hover-menu\.js\?v=ej-20261113-compact/);
assert.match(hover,/pointerenter/);
assert.match(hover,/pointerleave/);
assert.match(patch,/const ejHoverAnchor/);
