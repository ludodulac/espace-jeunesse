import assert from "node:assert/strict";
import {chromium} from "playwright";
const BASE="http://127.0.0.1:8899/admin.html";
const browser=await chromium.launch({headless:true});
let failures=[];
for(const [label,width,height,hasTouch] of [["ordinateur",1280,900,false],["smartphone",390,844,true]]){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch,isMobile:hasTouch});
 const page=await ctx.newPage();
 // Le navigateur de test utilise le mode local, jamais le Worker de production.
 await page.route("**/config.js",route=>route.fulfill({contentType:"application/javascript",body:"window.ESPACE_JEUNESSE_CONFIG = {apiBase: \"\"};"}));
 page.on("pageerror",err=>{failures.push(label+": "+err.message);console.error("JS ERROR",label,err.stack||err.message)});
 page.on("console",msg=>{if(msg.type()==="error")console.error("CONSOLE",label,msg.text())});
 page.on("requestfailed",req=>console.error("REQ FAILED",req.url(),req.failure()?.errorText));
 await page.goto(BASE,{waitUntil:"networkidle"});
 try{await page.locator(".canvas").waitFor({timeout:8000})}catch(e){console.error("DOM",label,(await page.locator("body").innerText()).slice(0,1600));console.error("SCRIPTS",await page.locator("script").evaluateAll(nodes=>nodes.map(n=>n.src)));throw e}
 assert.equal(await page.locator('[data-tab="celebrations"],[data-tab="members-spaces"],[data-tab="languages-categories"]').count(),0);
 assert.ok(await page.locator('[data-tab="pages"]').isVisible());
 assert.ok(await page.locator('[data-tab="footer"]').isVisible());
 assert.ok(await page.locator('[data-tab="media"]').isVisible());
 // Barre basse permanente : une seule commande Voir le site, placée dans
 // le rail gauche ; Annuler, Aperçu et Enregistrer restent toujours visibles.
 assert.equal(await page.locator('#view-site-btn').count(),1);
 assert.ok(await page.locator('.rail nav #view-site-btn').isVisible(),label+" : Voir le site absent du menu");
 assert.equal(await page.locator('.topbar #view-site-btn').count(),0);
 const toolbar=page.locator('#ej-original-shell .topbar');
 assert.ok(await toolbar.isVisible());
 assert.ok(await page.locator('.topbar #undo-btn').isVisible());
 assert.equal(await page.locator('.topbar #undo-btn').getAttribute('aria-label'),'Annuler la dernière action');
 assert.ok(await page.locator('.topbar #preview-btn').isVisible());
 assert.ok(await page.locator('.topbar #save-btn').isVisible());
 await page.evaluate(()=>{document.body.style.minHeight='2200px';window.scrollTo(0,1200)});
 const footerBox=await toolbar.boundingBox();
 assert.ok(footerBox.y>height-140&&footerBox.y+footerBox.height<=height+2,
  label+" : la barre d'actions ne reste pas fixée au bas de l'écran");
 const pad=await page.locator('.main').evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom));
 assert.ok(pad>=112,label+" : marge de protection sous le dernier élément absente");
 await page.locator('#preview-btn').click();
 assert.match(await page.locator('#preview-btn').innerText(),/Revenir à l’édition/);
 assert.ok(await page.locator('#save-btn').isVisible());
 await page.locator('#preview-btn').click();
 assert.match(await page.locator('#preview-btn').innerText(),/Aperçu du brouillon/);
 await page.evaluate(()=>{document.body.style.minHeight='';window.scrollTo(0,0)});

 // Dot de statut accessible sur chaque page : publié, brouillon, masqué.
 const initialDot=page.locator('.general-pages-list .ej-page-status-row .inline-page-state').first();
 assert.ok(await initialDot.isVisible(),label+" : indicateur de publication absent");
 assert.equal(await initialDot.getAttribute("aria-label"),"Publiée sur le site");
 const selector=page.locator('.editor-language-row select[aria-label="Visibilité de la page"]');
 await selector.selectOption("draft");
 assert.equal(await page.locator('.ej-page-status-row .inline-page-state.state-draft').count(),1);
 await page.locator('.editor-language-row select[aria-label="Visibilité de la page"]').selectOption("hidden");
 assert.equal(await page.locator('.ej-page-status-row .inline-page-state.state-hidden').count(),1);
 await page.locator('.editor-language-row select[aria-label="Visibilité de la page"]').selectOption("published");
 assert.equal(await page.locator('.ej-page-status-row .inline-page-state.state-published').count(),1);
 const sideBox=await page.locator('#workspace>.layout>aside.panel').boundingBox();
 const canvasBox=await page.locator('#workspace>.layout .canvas').boundingBox();
 if(!hasTouch){
  assert.ok(sideBox.x<300,label+" : le volet pages n'est pas dans la colonne de gauche");
  assert.ok(canvasBox.x>=300,label+" : le compositeur n'est pas dans la colonne centrale");
  assert.ok(canvasBox.width>600,label+" : compositeur trop étroit");
 }else{
  assert.ok(sideBox.y<canvasBox.y,label+" : liste des pages doit rester au-dessus de l'éditeur");
 }


 // Les trois points doivent ouvrir un menu intégralement visible SANS
 // devoir descendre dans le petit défilement de la colonne de gauche.
 const dotMenu=page.locator('.ej-page-status-row .page-options').first();
 const threeDots=dotMenu.locator('summary');
 const parentScrollBefore=await page.locator('#workspace>.layout>aside.panel').evaluate(el=>el.scrollTop);
 await threeDots.click();
 if(!hasTouch){
  const popup=dotMenu.locator('.ej-page-flyout:popover-open');
  await popup.waitFor();
  assert.ok(await popup.getByRole("button",{name:"Dupliquer"}).isVisible());
  assert.ok(await popup.locator('select[aria-label^="Visibilité de"]').isVisible());
  const b=await popup.boundingBox();
  assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,
   label+" : menu des trois points coupé par la colonne gauche ou par l'écran");
  assert.equal(await page.locator('#workspace>.layout>aside.panel').evaluate(el=>el.scrollTop),
   parentScrollBefore,label+" : la colonne de pages défile inutilement");
  await page.keyboard.press("Escape");
  await page.locator('.ej-page-flyout:popover-open').waitFor({state:'hidden'});
 }else{
  assert.ok(await dotMenu.getByRole("button",{name:"Dupliquer"}).isVisible());
  await threeDots.click();
 }
 const plus=page.locator(".canvas .section-add-blue").first();
 // Les contrôles bas restent devant : sur mobile, faire défiler la cible
 // AU-DESSUS de la barre avant de vérifier les vrais clics du compositeur.
 await plus.scrollIntoViewIfNeeded();
 await page.evaluate(()=>{
  const button=document.querySelector(".canvas .section-add-blue");
  const rect=button.getBoundingClientRect();
  const safeLimit=window.innerHeight-130;
  if(rect.bottom>safeLimit)window.scrollBy(0,rect.bottom-safeLimit+35);
 });
 await plus.click();
 let palette=hasTouch?page.locator("dialog.editor-insert-dialog[open]"):page.locator(".section-insert-choices:not([hidden])");
 await palette.getByRole("button",{name:"Deux colonnes"}).click();
 await page.locator('.content-section[data-layout="columns"]').first().waitFor();
 assert.equal(await page.locator(".content-section .section-column").count(),2);
 const green=page.locator(".content-section .section-column").first().locator(".section-add-green").first();
 await green.scrollIntoViewIfNeeded();
 await page.evaluate(()=>{
  const button=document.querySelector(".content-section .section-column .section-add-green");
  const rect=button.getBoundingClientRect();
  const safeLimit=window.innerHeight-130;
  if(rect.bottom>safeLimit)window.scrollBy(0,rect.bottom-safeLimit+35);
 });
 await green.click();
 palette=hasTouch?page.locator("dialog.editor-insert-dialog[open]"):page.locator(".section-element-menu:not([hidden])");
 await palette.getByRole("button",{name:"Titre",exact:true}).click();
 const title=page.locator(".section-column .block .ed").first();
 await title.fill("Le vrai moteur original");
 await page.locator("#save-btn").click();
 await page.reload({waitUntil:"networkidle"});
 await page.locator(".canvas").waitFor();
 assert.equal(await page.getByText("Le vrai moteur original",{exact:true}).count(),1);
 const colors=await page.evaluate(()=>[
  getComputedStyle(document.querySelector(".section-add-blue")).backgroundColor,
  getComputedStyle(document.querySelector(".section-add-green")).backgroundColor,
  document.documentElement.scrollWidth,innerWidth
 ]);
 assert.equal(colors[0],"rgb(17, 106, 219)");
 assert.equal(colors[1],"rgb(24, 154, 70)");
 assert.ok(colors[2]<=colors[3]+3,label+" déborde horizontalement");
 console.log(label+" : vrai moteur Célébrations, zones, éléments, sauvegarde locale, couleurs OK");
 // Vérifier le vrai moteur PUBLIC, ses titres, son menu et sa galerie absente.
 const visitor=await ctx.newPage();
 await visitor.route("**/config.js",route=>route.fulfill({contentType:"application/javascript",body:"window.ESPACE_JEUNESSE_CONFIG = {apiBase: \"\"};"}));
 visitor.on("pageerror",err=>{failures.push(label+" VISITEUR: "+err.message);console.error("PUBLIC JS ERROR",err.stack||err.message)});
 await visitor.goto("http://127.0.0.1:8899/index.html",{waitUntil:"networkidle"});
 try{await visitor.locator(".trial-heading").first().waitFor({timeout:10000})}
 catch(error){console.error("PUBLIC DOM",(await visitor.locator("body").innerText()).slice(0,1400));throw error}
 assert.ok((await visitor.locator("#stage-main").innerText()).includes("Bienvenue dans l'Espace Jeunesse"));
 assert.equal(await visitor.locator('#site-identity').count(),0,label+" : ancien gros en-tête encore visible");
 assert.ok(await visitor.locator('.site-menu-bar .site-menu-group #site-title').isVisible(),
  label+" : titre absent de la barre Menu permanente");

 await visitor.locator("#menu-toggle").click();
 await visitor.locator("#general-navigation button").first().waitFor();
 const nav=(await visitor.locator("#general-navigation").innerText()).toLowerCase();
 assert.ok(nav.includes("accueil"),label+" : lien accueil manquant");
 assert.ok(!nav.includes("célébration"),label+" : ancien menu Célébrations encore visible");
 assert.ok(!nav.includes("médiathèque"),label+" : médiathèque publique interdite");
 assert.equal(await visitor.locator("#member-connection:visible").count(),0);
 assert.ok(await visitor.locator(".trial-content-section").count()>0);
 console.log(label+" : véritable visiteur Célébrations épuré, page accueil, menu, blocs = OK");
 await ctx.close();
}
await browser.close();
assert.deepEqual(failures,[]);
