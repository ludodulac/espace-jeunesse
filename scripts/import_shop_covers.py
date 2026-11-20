"""Importe uniquement les couvertures accessibles et réellement décodables.
Les fichiers sont conservés dans le dépôt, et les échecs sont consignés.
Les droits de reproduction des couvertures restent à confirmer auprès des éditeurs.
"""
import io, json, pathlib, re, urllib.request
from PIL import Image, UnidentifiedImageError

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "assets" / "couvertures"
DEST.mkdir(parents=True, exist_ok=True)
catalogue = json.loads((ROOT / "data" / "shop-starter.json").read_text())
entries = {p["id"]: p.get("imageUrl", "") for p in catalogue["products"] if p.get("imageUrl") and p.get("collectionId") != "animaux-totems"}
entries.update({
 "selection-dieux-nordiques": "https://apostrophe-epernay.fr/cache/images/product/5f33669afb4bbcc27ed8584ea2ab4473-0338826-couverture1-xcgzbqmbjstc-dxlz46pu9rnrktzrm1t6qe3wzfgxebekote889h7g-cover-full.jpg",
 "selection-dieux-egyptiens": "https://covers.openlibrary.org/b/isbn/9782344049358-L.jpg?default=false",
 "selection-legende-licornes": "https://servimg.eyrolles.com/static/media/5153/9791026405153_internet_h1400.jpg",
 "selection-creatures-pop-up": "https://static.fnac-static.com/multimedia/PE/Images/FR/NR/72/a5/22/19047794/1507-1/tsp20260408085439/Creatures-Pop-up.jpg",
 "selection-grande-ronde-renards": "https://media.hachette.fr/imgArticle/GLENATJEUNESSE/2022/9782344052426-001-X.jpeg?source=web",
 "selection-magicienne": "https://www.mediatheque-la-tremblade.fr/images/covers/LA-MAGICIENNE_DAHMAN-MYRIAM-9782344048061.jpg",
 "selection-loki": "https://covers.openlibrary.org/b/isbn/9782344069950-L.jpg?default=false",
 "selection-lancelot": "https://media.hachette.fr/imgArticle/GLENAT/2023/9782344048849-001-X.jpeg?source=web",
 "selection-gilgamesh": "https://www.bd-tek.com/images/album/66/66981%2Cgilgamesh-tome-1-3-les-freres-ennemis.jpg",
})
# La couverture affichée sur la capture utilisateur correspond à cet ISBN.
entries["livre-nordique-asgard"] = "https://covers.openlibrary.org/b/isbn/9782344062036-L.jpg?default=false"
manifest = {}
failures = {}
for key, source in entries.items():
 try:
  req = urllib.request.Request(source, headers={"User-Agent":"Mozilla/5.0 (compatible; EspaceJeunesseCoverImport/1.0)","Accept":"image/avif,image/webp,image/png,image/jpeg,image/*"})
  with urllib.request.urlopen(req, timeout=18) as response:
   raw = response.read(7_000_001)
  if len(raw) > 7_000_000:
   raise ValueError("Fichier trop volumineux")
  im = Image.open(io.BytesIO(raw))
  im.load()
  if im.width < 140 or im.height < 170:
   raise ValueError("Image trop petite")
  if im.width/im.height > 1.5:
   raise ValueError("Format incompatible avec une couverture")
  im = im.convert("RGB")
  im.thumbnail((900, 1300))
  target = DEST / (re.sub(r"[^a-z0-9-]", "-", key.lower()) + ".jpg")
  im.save(target, "JPEG", quality=85, optimize=True)
  manifest[key] = "assets/couvertures/" + target.name
  print("OK", key, im.size)
 except Exception as exc:
  failures[key] = str(exc)[:180]
  print("ÉCHEC", key, failures[key])
(DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n")
(DEST / "echecs.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2)+"\n")
print(f"Importées : {len(manifest)} / {len(entries)}")
