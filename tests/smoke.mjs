import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const required=["index.html","admin.html","config.js","assets/site.css","assets/site.js","assets/shared.js","assets/admin.js","assets/editor-canvas.js","assets/editor-sections.js","assets/editor-block-editor.js","assets/page-renderer.js","data/site.json","worker/src/index.js","worker/schema.sql","worker/wrangler.toml"];
for(const path of required)assert.ok(existsSync(new URL("../"+path,import.meta.url)),path+" existe");
for(const path of ["config.js","assets/site.js","assets/shared.js","assets/admin.js","assets/editor-canvas.js","assets/editor-sections.js","assets/editor-block-editor.js","assets/page-renderer.js","worker/src/index.js"]){
 execFileSync(process.execPath,["--check",new URL("../"+path,import.meta.url).pathname]);
}
const site=JSON.parse(read("data/site.json"));
assert.ok(site.pages.some(p=>p.id===site.homeId&&p.status==="published"));
assert.ok(site.pages.some(p=>p.placement==="footer"));
assert.ok(site.pages.every(p=>["published","draft","hidden"].includes(p.status)));
const pages=read("assets/site.js");
assert.match(pages,/status==="published"/);
assert.match(pages,/placement==="footer"/);
const admin=read("assets/admin.js");
for(const section of ["pages","menu","media","settings"])assert.ok(admin.includes(section));
assert.match(admin,/Inutilisés/);
const worker=read("worker/src/index.js");
for(const api of ["/api/site","/api/admin/state","/api/admin/media","/api/admin/uploads/init"])assert.ok(worker.includes(api));
assert.match(worker,/200\*1024\*1024/);
for(const path of ["index.html","admin.html","config.js","assets/site.js","assets/shared.js","assets/admin.js","worker/src/index.js","worker/wrangler.toml"]){
 assert.doesNotMatch(read(path),/jwyayfkssyagvnablttg|celebrations-exit-production|celebrations-media|ronde\.workers\.dev/i,path+" doit rester indépendant");
}
console.log("Tests de structure Espace Jeunesse : OK");
