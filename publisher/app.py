from __future__ import annotations

import io
import os
import threading
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse

from models import DraftProduct, JobError, JobState
from publish_core import PublishError, create_product, delete_product, update_product
from utils import ensure_dir, now_stamp

app = FastAPI(title="Medilec Catalog Publisher", version="0.1")


def detect_catalog_root() -> Path:
    env = os.environ.get("CATALOG_ROOT")
    if env:
        p = Path(env).expanduser().resolve()
    else:
        repo_root = Path(__file__).resolve().parent.parent
        p = repo_root / "public" / "catalog"
    if not p.exists() or not p.is_dir():
        raise RuntimeError(f"CATALOG_ROOT introuvable: {p}")
    return p


CATALOG_ROOT = detect_catalog_root()
REPORTS_DIR = CATALOG_ROOT / "reports"
ensure_dir(REPORTS_DIR)

EXPECTED_ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")
if not EXPECTED_ADMIN_TOKEN:
    # Contrat: on refuse de démarrer sans token
    raise RuntimeError("ADMIN_TOKEN non configuré côté publisher")


class _InMemUpload:
    def __init__(self, filename: str | None, data: bytes):
        self.filename = filename or ""
        self.file = io.BytesIO(data)


def require_admin_token(x_admin_token: str | None = Header(default=None)):
    if not x_admin_token or x_admin_token != EXPECTED_ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


_jobs_lock = threading.Lock()
_jobs: dict[str, dict] = {}


def _job_log(job_id: str, line: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job["logs"].append(str(line))
        job["last_log"] = str(line)


def _job_progress(job_id: str, pct: int):
    pct2 = max(0, min(100, int(pct)))
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job["progress"] = pct2


def _set_job_state(job_id: str, **patch):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job.update(patch)


def _write_job_log_file(job_id: str) -> Path:
    stamp = now_stamp()
    path = REPORTS_DIR / f"publish_{stamp}_{job_id}.log"
    with _jobs_lock:
        lines = list(_jobs.get(job_id, {}).get("logs") or [])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def _run_job(job_id: str, kind: str, fn):
    _set_job_state(job_id, status="running", progress=1)
    _job_log(job_id, f"Job {job_id} start ({kind})")

    try:
        result = fn()
        _job_progress(job_id, 100)
        _set_job_state(job_id, status="success", result=result, error=None)
        _job_log(job_id, "SUCCESS")
    except PublishError as e:
        _set_job_state(
            job_id,
            status="error",
            error={"code": e.code, "message": e.message},
        )
        _job_log(job_id, f"ERROR {e.code}: {e.message}")
    except Exception as e:
        _set_job_state(
            job_id,
            status="error",
            error={"code": "internal", "message": str(e)},
        )
        _job_log(job_id, f"ERROR internal: {e}")
    finally:
        try:
            _write_job_log_file(job_id)
        except Exception:
            # fail-soft
            pass


def _new_job() -> str:
    job_id = uuid.uuid4().hex[:12]
    with _jobs_lock:
        _jobs[job_id] = {
            "status": "queued",
            "progress": 0,
            "logs": [],
            "last_log": "",
            "result": None,
            "error": None,
        }
    return job_id


@app.get("/api/catalog/ping")
def ping():
    return {"ok": True}


@app.post("/api/catalog/products")
def create(
    payload: str = Form(...),
    image: UploadFile = File(...),
    pdf: UploadFile | None = File(default=None),
    _auth=Depends(require_admin_token),
):
    try:
        draft = DraftProduct.model_validate_json(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"payload invalide: {e}")

    # IMPORTANT: on copie les uploads en mémoire avant de retourner la réponse,
    # sinon Starlette peut fermer les streams de fichiers.
    try:
        image_bytes = image.file.read()
    finally:
        try:
            image.file.close()
        except Exception:
            pass

    pdf_mem = None
    if pdf is not None:
        try:
            pdf_bytes = pdf.file.read()
        finally:
            try:
                pdf.file.close()
            except Exception:
                pass
        pdf_mem = _InMemUpload(pdf.filename, pdf_bytes)

    image_mem = _InMemUpload(image.filename, image_bytes)

    job_id = _new_job()

    def do():
        return create_product(
            CATALOG_ROOT,
            draft,
            image_mem,
            pdf_mem,
            log=lambda s: _job_log(job_id, s),
            progress=lambda p: _job_progress(job_id, p),
        )

    th = threading.Thread(target=_run_job, args=(job_id, "create", do), daemon=True)
    th.start()

    return {"jobId": job_id}


@app.put("/api/catalog/products/{product_id}")
def update(
    product_id: int,
    payload: str = Form(...),
    image: UploadFile | None = File(default=None),
    pdf: UploadFile | None = File(default=None),
    remove_pdf: str | None = Form(default=None),
    _auth=Depends(require_admin_token),
):
    try:
        draft = DraftProduct.model_validate_json(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"payload invalide: {e}")

    remove = str(remove_pdf or "").strip().lower() in {"1", "true", "yes", "on"}

    image_mem = None
    if image is not None:
        try:
            image_bytes = image.file.read()
        finally:
            try:
                image.file.close()
            except Exception:
                pass
        image_mem = _InMemUpload(image.filename, image_bytes)

    pdf_mem = None
    if pdf is not None:
        try:
            pdf_bytes = pdf.file.read()
        finally:
            try:
                pdf.file.close()
            except Exception:
                pass
        pdf_mem = _InMemUpload(pdf.filename, pdf_bytes)

    job_id = _new_job()

    def do():
        return update_product(
            CATALOG_ROOT,
            int(product_id),
            draft,
            image_mem,
            pdf_mem,
            remove,
            log=lambda s: _job_log(job_id, s),
            progress=lambda p: _job_progress(job_id, p),
        )

    th = threading.Thread(target=_run_job, args=(job_id, "update", do), daemon=True)
    th.start()

    return {"jobId": job_id}


@app.delete("/api/catalog/products/{product_id}")
def delete(
    product_id: int,
    _auth=Depends(require_admin_token),
):
    job_id = _new_job()

    def do():
        return delete_product(
            CATALOG_ROOT,
            int(product_id),
            log=lambda s: _job_log(job_id, s),
            progress=lambda p: _job_progress(job_id, p),
        )

    th = threading.Thread(target=_run_job, args=(job_id, "delete", do), daemon=True)
    th.start()

    return {"jobId": job_id}


@app.get("/api/catalog/jobs/{job_id}")
def get_job(job_id: str):
    with _jobs_lock:
        raw = _jobs.get(job_id)
        if not raw:
            raise HTTPException(status_code=404, detail="job introuvable")
        state = JobState(
            status=raw["status"],
            progress=int(raw.get("progress") or 0),
            last_log=str(raw.get("last_log") or ""),
            result=raw.get("result"),
            error=JobError(**raw["error"]) if raw.get("error") else None,
        )
    return state.model_dump()


@app.get("/api/catalog/jobs/{job_id}/log", response_class=PlainTextResponse)
def get_job_log(job_id: str):
    with _jobs_lock:
        raw = _jobs.get(job_id)
        if not raw:
            raise HTTPException(status_code=404, detail="job introuvable")
        lines = list(raw.get("logs") or [])
    return "\n".join(lines) + ("\n" if lines else "")
