from __future__ import annotations

import shutil
from pathlib import Path
from typing import Callable

from models import DraftProduct
from utils import atomic_write_json, ensure_dir, file_ext_from_upload, pad6, slugify_ascii, strip_html


LogFn = Callable[[str], None]
ProgressFn = Callable[[int], None]


class PublishError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _load_catalog(catalog_root: Path):
    products_index_path = catalog_root / "index.products.json"
    search_index_path = catalog_root / "index.search.json"
    manufacturers_path = catalog_root / "taxonomies" / "manufacturers.json"
    categories_path = catalog_root / "taxonomies" / "categories.json"

    if not products_index_path.exists():
        raise PublishError("catalog_missing", f"Fichier manquant: {products_index_path}")
    if not manufacturers_path.exists():
        raise PublishError("catalog_missing", f"Fichier manquant: {manufacturers_path}")
    if not categories_path.exists():
        raise PublishError("catalog_missing", f"Fichier manquant: {categories_path}")

    products_index = _read_json(products_index_path)
    search_index = _read_json(search_index_path) if search_index_path.exists() else []

    manufacturers = _read_json(manufacturers_path)
    categories = _read_json(categories_path)

    return {
        "products_index_path": products_index_path,
        "search_index_path": search_index_path,
        "manufacturers_path": manufacturers_path,
        "categories_path": categories_path,
        "products_index": products_index,
        "search_index": search_index,
        "manufacturers": manufacturers,
        "categories": categories,
    }


def _read_json(path: Path):
    import json

    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _category_maps(categories_payload: dict):
    cats = categories_payload.get("categories")
    if not isinstance(cats, list):
        cats = []

    by_id: dict[int, dict] = {}
    for c in cats:
        if not isinstance(c, dict):
            continue
        cid = c.get("id")
        try:
            n = int(cid)
        except Exception:
            continue
        by_id[n] = c

    return by_id


def _manufacturer_map(manufacturers_payload: dict):
    mans = manufacturers_payload.get("manufacturers")
    if not isinstance(mans, list):
        mans = []

    by_id: dict[int, dict] = {}
    for m in mans:
        if not isinstance(m, dict):
            continue
        mid = m.get("id")
        try:
            n = int(mid)
        except Exception:
            continue
        by_id[n] = m

    return by_id


def _compute_category_paths(category_ids: list[int], categories_by_id: dict[int, dict]) -> list[list[dict]]:
    # Retourne une liste de breadcrumbs (du root jusqu'à la catégorie)
    # et inclut aussi les chemins ancêtres successifs comme dans l'export existant.
    paths: list[list[dict]] = []

    for cid in category_ids:
        chain: list[dict] = []
        cur = categories_by_id.get(int(cid))
        guard = 0
        while cur and guard < 50:
            try:
                cur_id = int(cur.get("id"))
            except Exception:
                break
            name = str(cur.get("name") or "").strip() or str(cur_id)
            chain.append({"id": cur_id, "name": name})

            pid = cur.get("id_parent")
            try:
                pid_n = int(pid)
            except Exception:
                pid_n = 0
            if pid_n <= 0:
                break
            cur = categories_by_id.get(pid_n)
            guard += 1

        chain = list(reversed(chain))
        # Ajoute tous les sous-chemins suffixes (comportement observé)
        for i in range(len(chain)):
            sub = chain[: len(chain) - i]
            if sub and sub not in paths:
                paths.append(sub)

    return paths


def _validate_draft(catalog_root: Path, draft: DraftProduct, log: LogFn) -> None:
    if not isinstance(draft.name, str) or not draft.name.strip():
        raise PublishError("invalid_draft", "name requis")
    if not isinstance(draft.short_html, str) or not draft.short_html.strip():
        raise PublishError("invalid_draft", "short_html requis")
    if not isinstance(draft.long_html, str) or not draft.long_html.strip():
        raise PublishError("invalid_draft", "long_html requis")

    if draft.price_ht is None or float(draft.price_ht) < 0:
        raise PublishError("invalid_draft", "price_ht doit être >= 0")

    if not isinstance(draft.category_ids, list) or len(draft.category_ids) < 1:
        raise PublishError("invalid_draft", "category_ids doit contenir au moins 1 id")

    # Vérifie que les IDs existent
    data = _load_catalog(catalog_root)
    cats_by_id = _category_maps(data["categories"])
    mans_by_id = _manufacturer_map(data["manufacturers"])

    if int(draft.manufacturer_id) not in mans_by_id:
        raise PublishError("invalid_draft", "manufacturer_id inexistant")

    missing = [cid for cid in draft.category_ids if int(cid) not in cats_by_id]
    if missing:
        raise PublishError("invalid_draft", f"category_ids inexistants: {missing}")

    log("Contrat draft OK")


def create_product(
    catalog_root: Path,
    draft: DraftProduct,
    image_file,
    pdf_file,
    log: LogFn,
    progress: ProgressFn,
) -> dict:
    progress(1)
    _validate_draft(catalog_root, draft, log)

    data = _load_catalog(catalog_root)
    products_index = data["products_index"]
    search_index = data["search_index"]

    if not isinstance(products_index, list):
        raise PublishError("catalog_invalid", "index.products.json: tableau attendu")
    if not isinstance(search_index, list):
        raise PublishError("catalog_invalid", "index.search.json: tableau attendu")

    cats_by_id = _category_maps(data["categories"])
    mans_by_id = _manufacturer_map(data["manufacturers"])

    next_id = 1
    for p in products_index:
        if not isinstance(p, dict):
            continue
        try:
            pid = int(p.get("id"))
        except Exception:
            continue
        if pid >= next_id:
            next_id = pid + 1

    slug = slugify_ascii(draft.name)
    if not slug:
        slug = f"produit-{next_id}"

    manufacturer_name = str(mans_by_id[int(draft.manufacturer_id)].get("name") or "").strip()
    categories = []
    for cid in draft.category_ids:
        c = cats_by_id[int(cid)]
        categories.append({"id": int(cid), "name": str(c.get("name") or "").strip() or str(cid)})

    category_paths = _compute_category_paths([int(x) for x in draft.category_ids], cats_by_id)

    # Paths
    assets_dir = catalog_root / "assets" / "products" / f"{next_id}__{slug}"
    images_dir = assets_dir / "images"
    pdf_dir = assets_dir / "pdf"

    products_dir = catalog_root / "products"
    product_path = products_dir / f"{pad6(next_id)}.json"

    ensure_dir(images_dir)
    ensure_dir(products_dir)

    # Image
    if image_file is None:
        raise PublishError("invalid_draft", "image_file requis")

    ext = file_ext_from_upload(getattr(image_file, "filename", None))
    cover_rel = f"assets/products/{next_id}__{slug}/images/cover-large_default.{ext}"
    cover_abs = catalog_root / cover_rel

    log(f"Écriture image: {cover_rel}")
    with cover_abs.open("wb") as out:
        shutil.copyfileobj(image_file.file, out)

    progress(45)

    pdfs = []
    if pdf_file is not None:
        ensure_dir(pdf_dir)
        pdf_rel = f"assets/products/{next_id}__{slug}/pdf/fiche.pdf"
        pdf_abs = catalog_root / pdf_rel
        log(f"Écriture PDF: {pdf_rel}")
        with pdf_abs.open("wb") as out:
            shutil.copyfileobj(pdf_file.file, out)
        pdfs = [pdf_rel]

    progress(65)

    product_json = {
        "id": next_id,
        "slug": slug,
        "active": bool(draft.active),
        "reference": (draft.reference or None),
        "name": draft.name,
        "specs": [
            {"name": (s.name or "").strip(), "value": (s.value or "").strip()}
            for s in (draft.specs or [])
            if (s.name or "").strip() and (s.value or "").strip()
        ],
        "descriptions": {"short_html": draft.short_html, "long_html": draft.long_html},
        "pricing": {"currency": "CHF", "price_ht": float(draft.price_ht), "price_ttc": None, "promo": None},
        "manufacturer": {"id": int(draft.manufacturer_id), "name": manufacturer_name},
        "categories": categories,
        "category_paths": category_paths,
        "media": {
            "images": [
                {
                    "type": "admin",
                    "source_id_image": None,
                    "files": [cover_rel],
                }
            ],
            "pdfs": pdfs,
            "attachments_meta": [],
            "pdfs_missing": False if pdfs else True,
        },
        "relations": {"accessories": [int(x) for x in (draft.accessories or []) if isinstance(x, int) or str(x).isdigit()]},
    }

    log(f"Écriture produit: products/{pad6(next_id)}.json")
    atomic_write_json(product_path, product_json)

    progress(78)

    # Index update
    idx_item = {
        "id": next_id,
        "slug": slug,
        "active": bool(draft.active),
        "name": draft.name,
        "price_ht": float(draft.price_ht),
        "manufacturer_name": manufacturer_name,
        "category_ids": [int(x) for x in draft.category_ids],
        "cover_image": cover_rel,
    }

    products_index.append(idx_item)

    # search haystack
    cat_names = " ".join([c["name"] for c in categories if c.get("name")])
    hay = " ".join(
        [
            draft.name,
            cat_names,
            manufacturer_name,
            strip_html(draft.short_html),
        ]
    ).strip()

    # remplace si déjà présent par sécurité
    search_index = [x for x in search_index if not (isinstance(x, dict) and int(x.get("id", -1)) == next_id)]
    search_index.append({"id": next_id, "haystack": hay})

    log("Écriture atomique des index")
    try:
        atomic_write_json(data["products_index_path"], products_index)
        atomic_write_json(data["search_index_path"], search_index)
    except Exception as e:
        # Rollback: on ne laisse pas un produit référencé/partiellement créé.
        log(f"Échec écriture index, rollback: {e}")
        try:
            if product_path.exists():
                product_path.unlink()
        except Exception:
            pass
        try:
            if assets_dir.exists():
                shutil.rmtree(assets_dir)
        except Exception:
            pass
        raise

    progress(100)
    return {"id": next_id, "slug": slug}


def update_product(
    catalog_root: Path,
    product_id: int,
    draft: DraftProduct,
    image_file_opt,
    pdf_file_opt,
    remove_pdf: bool,
    log: LogFn,
    progress: ProgressFn,
) -> dict:
    progress(1)
    _validate_draft(catalog_root, draft, log)

    data = _load_catalog(catalog_root)
    products_index = data["products_index"]
    search_index = data["search_index"]

    if not isinstance(products_index, list):
        raise PublishError("catalog_invalid", "index.products.json: tableau attendu")
    if not isinstance(search_index, list):
        raise PublishError("catalog_invalid", "index.search.json: tableau attendu")

    pid = int(product_id)
    product_path = catalog_root / "products" / f"{pad6(pid)}.json"
    if not product_path.exists():
        raise PublishError("not_found", f"Produit introuvable: {pid}")

    existing = _read_json(product_path)
    slug = str(existing.get("slug") or "").strip()
    if not slug:
        raise PublishError("catalog_invalid", "Produit existant sans slug")

    cats_by_id = _category_maps(data["categories"])
    mans_by_id = _manufacturer_map(data["manufacturers"])

    manufacturer_name = str(mans_by_id[int(draft.manufacturer_id)].get("name") or "").strip()
    categories = []
    for cid in draft.category_ids:
        c = cats_by_id[int(cid)]
        categories.append({"id": int(cid), "name": str(c.get("name") or "").strip() or str(cid)})

    category_paths = _compute_category_paths([int(x) for x in draft.category_ids], cats_by_id)

    assets_dir = catalog_root / "assets" / "products" / f"{pid}__{slug}"
    images_dir = assets_dir / "images"
    pdf_dir = assets_dir / "pdf"

    ensure_dir(images_dir)

    # Image (optionnelle)
    cover_rel = None
    if image_file_opt is not None:
        ext = file_ext_from_upload(getattr(image_file_opt, "filename", None))
        cover_rel = f"assets/products/{pid}__{slug}/images/cover-large_default.{ext}"
        cover_abs = catalog_root / cover_rel
        log(f"Remplacement image: {cover_rel}")
        with cover_abs.open("wb") as out:
            shutil.copyfileobj(image_file_opt.file, out)

        # nettoyage éventuel d'autres cover-large_default.*
        for p in images_dir.glob("cover-large_default.*"):
            if p.name != Path(cover_rel).name:
                try:
                    p.unlink()
                except Exception:
                    pass

    progress(45)

    # PDF (optionnel)
    pdfs = []
    if remove_pdf:
        if pdf_dir.exists():
            for p in pdf_dir.glob("*.pdf"):
                try:
                    p.unlink()
                except Exception:
                    pass
    if pdf_file_opt is not None:
        ensure_dir(pdf_dir)
        pdf_rel = f"assets/products/{pid}__{slug}/pdf/fiche.pdf"
        pdf_abs = catalog_root / pdf_rel
        log(f"Remplacement PDF: {pdf_rel}")
        with pdf_abs.open("wb") as out:
            shutil.copyfileobj(pdf_file_opt.file, out)
        pdfs = [pdf_rel]
    else:
        pdf_path = pdf_dir / "fiche.pdf"
        if pdf_path.exists():
            pdfs = [f"assets/products/{pid}__{slug}/pdf/fiche.pdf"]

    progress(65)

    # cover_image: garde l'existant si pas de nouvelle image
    if not cover_rel:
        cover_rel = None
        # essaie de retrouver via index existant
        for item in products_index:
            if isinstance(item, dict) and int(item.get("id", -1)) == pid:
                cover_rel = str(item.get("cover_image") or "").strip() or None
                break
        # fallback: cherche un cover-large_default.*
        if not cover_rel:
            found = next(iter(images_dir.glob("cover-large_default.*")), None)
            if found:
                cover_rel = f"assets/products/{pid}__{slug}/images/{found.name}"

    if not cover_rel:
        raise PublishError("catalog_invalid", "Image de couverture introuvable (fournissez une image)")

    product_json = {
        "id": pid,
        "slug": slug,
        "active": bool(draft.active),
        "reference": (draft.reference or None),
        "name": draft.name,
        "specs": [
            {"name": (s.name or "").strip(), "value": (s.value or "").strip()}
            for s in (draft.specs or [])
            if (s.name or "").strip() and (s.value or "").strip()
        ],
        "descriptions": {"short_html": draft.short_html, "long_html": draft.long_html},
        "pricing": {"currency": "CHF", "price_ht": float(draft.price_ht), "price_ttc": None, "promo": None},
        "manufacturer": {"id": int(draft.manufacturer_id), "name": manufacturer_name},
        "categories": categories,
        "category_paths": category_paths,
        "media": {
            "images": [
                {
                    "type": "admin",
                    "source_id_image": None,
                    "files": [cover_rel],
                }
            ],
            "pdfs": pdfs,
            "attachments_meta": [],
            "pdfs_missing": False if pdfs else True,
        },
        "relations": {"accessories": [int(x) for x in (draft.accessories or []) if isinstance(x, int) or str(x).isdigit()]},
    }

    log(f"Réécriture produit: products/{pad6(pid)}.json")
    atomic_write_json(product_path, product_json)

    progress(78)

    # Update index.products (remplacement)
    new_item = {
        "id": pid,
        "slug": slug,
        "active": bool(draft.active),
        "name": draft.name,
        "price_ht": float(draft.price_ht),
        "manufacturer_name": manufacturer_name,
        "category_ids": [int(x) for x in draft.category_ids],
        "cover_image": cover_rel,
    }

    replaced = False
    for i, item in enumerate(products_index):
        if isinstance(item, dict) and int(item.get("id", -1)) == pid:
            products_index[i] = new_item
            replaced = True
            break
    if not replaced:
        products_index.append(new_item)

    cat_names = " ".join([c["name"] for c in categories if c.get("name")])
    hay = " ".join(
        [
            draft.name,
            cat_names,
            manufacturer_name,
            strip_html(draft.short_html),
        ]
    ).strip()

    search_index = [x for x in search_index if not (isinstance(x, dict) and int(x.get("id", -1)) == pid)]
    search_index.append({"id": pid, "haystack": hay})

    log("Écriture atomique des index")
    try:
        atomic_write_json(data["products_index_path"], products_index)
        atomic_write_json(data["search_index_path"], search_index)
    except Exception as e:
        # Rollback: on restaure le produit précédent si les index n'ont pas pu être mis à jour.
        log(f"Échec écriture index, rollback produit: {e}")
        try:
            atomic_write_json(product_path, existing)
        except Exception:
            pass
        raise

    progress(100)
    return {"id": pid, "slug": slug}


def delete_product(
    catalog_root: Path,
    product_id: int,
    log: LogFn,
    progress: ProgressFn,
) -> dict:
    progress(1)
    data = _load_catalog(catalog_root)
    products_index = data["products_index"]
    search_index = data["search_index"]

    if not isinstance(products_index, list):
        raise PublishError("catalog_invalid", "index.products.json: tableau attendu")
    if not isinstance(search_index, list):
        raise PublishError("catalog_invalid", "index.search.json: tableau attendu")

    pid = int(product_id)
    product_path = catalog_root / "products" / f"{pad6(pid)}.json"

    slug = None
    for item in products_index:
        if isinstance(item, dict) and int(item.get("id", -1)) == pid:
            slug = str(item.get("slug") or "").strip() or None
            break

    # On écrit d'abord les index (atomique) pour éviter un état « index supprimé partiellement ».
    products_index2 = [x for x in products_index if not (isinstance(x, dict) and int(x.get("id", -1)) == pid)]
    search_index2 = [x for x in search_index if not (isinstance(x, dict) and int(x.get("id", -1)) == pid)]

    log("Écriture atomique des index")
    atomic_write_json(data["products_index_path"], products_index2)
    atomic_write_json(data["search_index_path"], search_index2)

    progress(55)

    if product_path.exists():
        log(f"Suppression produit: products/{pad6(pid)}.json")
        try:
            product_path.unlink()
        except Exception as e:
            raise PublishError("delete_failed", f"Impossible de supprimer le produit: {e}")

    progress(75)

    if slug:
        assets_dir = catalog_root / "assets" / "products" / f"{pid}__{slug}"
        if assets_dir.exists():
            log(f"Suppression assets: assets/products/{pid}__{slug}/")
            try:
                shutil.rmtree(assets_dir)
            except Exception as e:
                raise PublishError("delete_failed", f"Impossible de supprimer les assets: {e}")

    progress(100)
    return {"id": pid, "slug": slug or ""}
