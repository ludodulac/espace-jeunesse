import assert from "node:assert/strict";
import {chromium} from "playwright";

const base="http://127.0.0.1:8899/";
const browser=await chromium.launch({headless:true});
const errors=[];
async function run(label,viewport,mobile){
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage();
 page.on("pageerror",err=>errors.push(label+": "+err.message));
 await page.goto(base+"admin.html",{waitUntil:"networkidle"});
 await page.locator(".page-list button").first().waitFor();
 // Sélectionner la page encore vierge et y créer une vraie zone 2 colonnes.
 await page.locator(".page-list button").filter({hasText:"Découvrir"}).first().click();
 const canvas=page.locator(".canvas");
 await canvas.waitFor();
 const blue=canvas.locator(".section-add-blue").first();
 await blue.click({force:true});
 if(mobile){
  await page.locator("dialog.editor-insert-dialog[open]").waitFor();
  await page.locator("dialog.editor-insert-dialog[open]").getByRole("button",{name:"Deux colonnes"}).click();
 }else{
  await canvas.getByRole("button",{name:"Deux colonnes"}).click();
 }
 await page.locator('.content-section[data-layout="columns"]').first().waitFor();
 assert.equal(await page.locator('.content-section[data-layout="columns"]').count(),1);
 assert.equal(await page.locator(".content-section .section-column").count(),2);
 const left=page.locator(".content-section .section-column").first();
 let green=left.locator(".section-add-green").first();
 await green.click({force:true});
 if(mobile){
  await page.locator("dialog.editor-insert-dialog[open]").getByRole("button",{name:"Titre",exact:true}).click();
 }else{
  await left.locator(".section-element-menu").getByRole("button",{name:"Titre",exact:true}).click();
 }
 await left.locator('.block[data-kind="heading"]').first().waitFor();
 await left.locator('[contenteditable="true"]').first().fill("Essai exact des deux colonnes");
 // Colonne droite : insertion d'un document PDF, comme sur Célébrations.
 const right=page.locator(".content-section .section-column").nth(1);
 green=right.locator(".section-add-green").first();await green.click({force:true});
 if(mobile)await page.locator("dialog.editor-insert-dialog[open]").getByRole("button",{name:"PDF / document"}).click();
 else await right.locator(".section-element-menu").getByRole("button",{name:"PDF / document"}).click();
 await right.locator('.block[data-kind="document"]').waitFor();
 await right.locator('.block[data-kind="document"]').first().click();
 const urlInput=right.locator('.block[data-kind="document"] input[type="url"]');
 await urlInput.fill("https://example.com/test.pdf");await urlInput.press("Tab");
 await page.getByRole("button",{name:"Enregistrer",exact:true}).first().click();
 await page.getByText(/Aperçu enregistré uniquement/).waitFor();
 // L'intégrité des éléments et colonnes doit survivre au rechargement.
 await page.reload({waitUntil:"networkidle"});
 await page.locator(".page-list button").filter({hasText:"Découvrir"}).first().click();
 assert.equal(await page.locator(".content-section .section-column").count(),2);
 assert.equal(await page.locator('.block[data-kind="heading"]').count(),1);
 assert.equal(await page.locator('.block[data-kind="document"]').count(),1);
 // Vérifier les vrais plus colorés, pas des boutons gris substitués.
 const colors=await page.evaluate(()=>{
   const blue=document.querySelector(".section-add-blue"),green=document.querySelector(".section-add-green");
   return [getComputedStyle(blue).backgroundColor,getComputedStyle(green).backgroundColor,document.documentElement.scrollWidth,innerWidth];
 });
 assert.equal(colors[0],"rgb(17, 106, 219)",label+" : bleu source");
 assert.equal(colors[1],"rgb(24, 154, 70)",label+" : vert source");
 assert.ok(colors[2]<=colors[3]+3,label+" : aucun débordement horizontal");
 await page.getByRole("button",{name:"Aperçu du brouillon"}).first().click();
 await page.getByText("Essai exact des deux colonnes").waitFor();
 await page.getByRole("link",{name:/test.pdf|Document/}).count();
 await context.close();console.log(label+" : 2 colonnes, bleu, vert, PDF, sauvegarde locale, mobile = OK");
}
try{
 await run("Desktop",{width:1280,height:900},false);
 await run("Mobile",{width:390,height:844},true);
 assert.deepEqual(errors,[]);
}finally{await browser.close()}
