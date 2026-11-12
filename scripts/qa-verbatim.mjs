import assert from "node:assert/strict";
import {chromium} from "playwright";
const BASE="http://127.0.0.1:8899/admin-identique.html";
const browser=await chromium.launch({headless:true});
let failures=[];
for(const [label,width,height,hasTouch] of [["ordinateur",1280,900,false],["smartphone",390,844,true]]){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch,isMobile:hasTouch});
 const page=await ctx.newPage();
 page.on("pageerror",err=>{failures.push(label+": "+err.message);console.error("JS ERROR",label,err.stack||err.message)});
 page.on("console",msg=>{if(msg.type()==="error")console.error("CONSOLE",label,msg.text())});
 page.on("requestfailed",req=>console.error("REQ FAILED",req.url(),req.failure()?.errorText));
 await page.goto(BASE,{waitUntil:"networkidle"});
 try{await page.locator(".canvas").waitFor({timeout:8000})}catch(e){console.error("DOM",label,(await page.locator("body").innerText()).slice(0,1600));console.error("SCRIPTS",await page.locator("script").evaluateAll(nodes=>nodes.map(n=>n.src)));throw e}
 assert.equal(await page.locator('[data-tab="celebrations"],[data-tab="members-spaces"],[data-tab="languages-categories"]').count(),0);
 assert.ok(await page.locator('[data-tab="pages"]').isVisible());
 assert.ok(await page.locator('[data-tab="footer"]').isVisible());
 assert.ok(await page.locator('[data-tab="media"]').isVisible());
 const plus=page.locator(".canvas .section-add-blue").first();
 await plus.click({force:true});
 let palette=hasTouch?page.locator("dialog.editor-insert-dialog[open]"):page.locator(".section-insert-choices:not([hidden])");
 await palette.getByRole("button",{name:"Deux colonnes"}).click();
 await page.locator('.content-section[data-layout="columns"]').first().waitFor();
 assert.equal(await page.locator(".content-section .section-column").count(),2);
 const green=page.locator(".content-section .section-column").first().locator(".section-add-green").first();
 await green.click({force:true});
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
 visitor.on("pageerror",err=>{failures.push(label+" VISITEUR: "+err.message);console.error("PUBLIC JS ERROR",err.stack||err.message)});
 await visitor.goto("http://127.0.0.1:8899/index-identique.html",{waitUntil:"networkidle"});
 try{await visitor.locator(".trial-heading").first().waitFor({timeout:10000})}
 catch(error){console.error("PUBLIC DOM",(await visitor.locator("body").innerText()).slice(0,1400));throw error}
 assert.ok((await visitor.locator("#stage-main").innerText()).includes("Bienvenue dans l'Espace Jeunesse"));
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
