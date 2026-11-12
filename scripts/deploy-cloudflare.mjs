/**
 * Provisionnement ciblé exclusivement Espace Jeunesse.
 * Se lance depuis le dépôt NOUVEAU ludodulac/espace-jeunesse.
 * Aucun recours aux ressources / dépôts de Célébrations.
 */
import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {randomBytes} from "node:crypto";
import {resolve} from "node:path";

const ACCOUNT=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const TOKEN=process.env.CLOUDFLARE_API_TOKEN||"";
const PASSWORD=process.env.EJ_ADMIN_PASSWORD||"";
const NEW_D1="espace-jeunesse-db";
const NEW_R2="espace-jeunesse-media";
const NEW_WORKER="espace-jeunesse-api";
const GH_PAGES_ORIGIN="https://ludodulac.github.io";
const GH_PAGES_SITE=GH_PAGES_ORIGIN+"/espace-jeunesse/";
const WRANGLER_CONFIG=resolve("worker/wrangler-ci.toml");

if(!/^[a-f0-9]{32}$/i.test(ACCOUNT))throw Error("EJ_CLOUDFLARE_ACCOUNT_ID absent ou invalide dans les secrets du nouveau dépôt.");
if(TOKEN.length<20)throw Error("EJ_CLOUDFLARE_API_TOKEN absent ou invalide dans les secrets du nouveau dépôt.");
if(PASSWORD.length<12)throw Error("EJ_ADMIN_PASSWORD doit avoir au moins 12 caractères. Ce mot de passe est propre à Espace Jeunesse.");
if(!process.env.GITHUB_REPOSITORY||process.env.GITHUB_REPOSITORY.toLowerCase()!=="ludodulac/espace-jeunesse")
  throw Error("Protection : ce déploiement est réservé au dépôt ludodulac/espace-jeunesse.");
const run=(command,args,extra={})=>execFileSync(command,args,{cwd:resolve("."),stdio:"inherit",env:process.env,...extra});
function fail(message,code){throw Error(message+(code?" (HTTP "+code+")":""))}
async function cf(path,opts={}){
  const url="https://api.cloudflare.com/client/v4"+path;
  const response=await fetch(url,{...opts,headers:{
     Authorization:"Bearer "+TOKEN,
     "Content-Type":"application/json",
     ...opts.headers
  }});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.success){
    const detail=(data?.errors||[]).map(e=>e.message||e.code).join(", ");
    fail("Cloudflare a refusé l'opération "+opts.method?.toUpperCase()+" "+path+": "+(detail||"droits du jeton ou service indisponible"),response.status);
  }
  return data.result;
}
async function findD1(){
  const result=await cf("/accounts/"+ACCOUNT+"/d1/database?per_page=100");
  const found=(Array.isArray(result)?result:result?.databases||[]).find(item=>item.name===NEW_D1);
  if(found)return found.uuid;
  const created=await cf("/accounts/"+ACCOUNT+"/d1/database",{method:"POST",body:JSON.stringify({name:NEW_D1})});
  if(!created?.uuid)throw Error("Nouvelle D1 créée, mais identifiant introuvable.");
  return created.uuid;
}
async function ensureR2(){
  const response=await cf("/accounts/"+ACCOUNT+"/r2/buckets?per_page=100");
  const buckets=Array.isArray(response)?response:response?.buckets||[];
  if(buckets.some(item=>item.name===NEW_R2))return;
  await cf("/accounts/"+ACCOUNT+"/r2/buckets",{method:"POST",body:JSON.stringify({name:NEW_R2})});
}
async function getWorkersSubdomain(){
  const result=await cf("/accounts/"+ACCOUNT+"/workers/subdomain");
  const subdomain=String(result?.subdomain||"");
  if(!/^[a-z0-9][a-z0-9-]{1,62}$/i.test(subdomain))
     throw Error("Le sous-domaine workers.dev n'est pas encore activé dans Cloudflare.");
  return subdomain;
}
function wrangler(args,{input}={}){
  const env={...process.env,CLOUDFLARE_ACCOUNT_ID:ACCOUNT,CLOUDFLARE_API_TOKEN:TOKEN};
  execFileSync("npx",["--yes","wrangler@4",...args],{stdio:input?["pipe","inherit","inherit"]:"inherit",input,env,cwd:resolve(".")});
}
async function main(){
  console.log("Installation d'un NOUVEAU site Espace Jeunesse — aucun changement dans Célébrations.");
  const dbId=await findD1();
  console.log("Nouvelle D1 identifiée : "+NEW_D1);
  await ensureR2();
  console.log("R2 indépendant prêt : "+NEW_R2);
  const template=readFileSync("worker/wrangler.toml","utf8");
  if(!template.includes('REPLACE_WITH_NEW_D1_DATABASE_ID')||!template.includes('espace-jeunesse-db')||!template.includes('espace-jeunesse-media')||!template.includes('espace-jeunesse-api'))
    throw Error("La configuration n'est pas celle d'Espace Jeunesse : arrêt.");
  writeFileSync(WRANGLER_CONFIG,template.replace("REPLACE_WITH_NEW_D1_DATABASE_ID",dbId));
  wrangler(["d1","execute",NEW_D1,"--remote","--file",resolve("worker/schema.sql"),"--config",WRANGLER_CONFIG]);
  wrangler(["deploy","--config",WRANGLER_CONFIG]);
  // Les secrets ne sont JAMAIS écrits dans GitHub ni affichés dans le journal.
  wrangler(["secret","put","ADMIN_PASSWORD","--config",WRANGLER_CONFIG],{input:PASSWORD+"\n"});
  wrangler(["secret","put","SESSION_SECRET","--config",WRANGLER_CONFIG],{input:randomBytes(48).toString("base64url")+"\n"});
  const subdomain=await getWorkersSubdomain();
  const workerUrl="https://"+NEW_WORKER+"."+subdomain+".workers.dev";
  const check=await fetch(workerUrl+"/api/site");
  if(!check.ok)throw Error("Le Worker existe, mais la vérification de la lecture publique a échoué : "+check.status);
  const data=await check.json();
  if(!Array.isArray(data.pages))throw Error("L'API du Worker ne renvoie pas les pages attendues.");
  const currentConfig=readFileSync("config.js","utf8");
  const newConfig="/* API de stockage privée, projet indépendant Espace Jeunesse. */\nwindow.ESPACE_JEUNESSE_CONFIG = { apiBase: "+JSON.stringify(workerUrl)+" };\n";
  if(newConfig!==currentConfig){
    writeFileSync("config.js",newConfig);
    run("git",["config","user.email","41898282+github-actions[bot]@users.noreply.github.com"]);
    run("git",["config","user.name","github-actions[bot]"]);
    run("git",["add","config.js"]);
    run("git",["commit","-m","Connecter Espace Jeunesse à son Worker Cloudflare indépendant"]);
    run("git",["push","origin","HEAD:main"]);
  }
  console.log("Administration Espace Jeunesse activée. Site public : "+GH_PAGES_SITE);
  console.log("URL de l'éditeur : "+GH_PAGES_SITE+"admin.html");
}
main().catch(e=>{console.error(e.message||e);process.exitCode=1});
