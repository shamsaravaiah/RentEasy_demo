"""
Database layer: JSON file (default, tests) or Firestore (production).
Use USE_FIRESTORE=true or FIREBASE_CREDENTIALS env to enable Firestore.
All access goes through get_db() / save_db() to keep consistency.
"""
import json
import threading
from pathlib import Path
from typing import Any

from app.config import get_firebase_credentials, settings

_lock = threading.Lock()

COLLECTIONS = ("users", "contracts", "contract_invites", "contract_events")

INITIAL_DB = {
    "users": [],
    "contracts": [],
    "contract_invites": [],
    "contract_events": [],
}

# Lazy-initialized Firestore client
_firestore_db = None


def _use_firestore() -> bool:
    """True if Firestore credentials are available and we should use Firestore."""
    creds = get_firebase_credentials()
    return creds is not None


def _get_firestore():
    """Initialize and return Firestore client. Requires _use_firestore() True."""
    global _firestore_db
    if _firestore_db is not None:
        return _firestore_db
    import firebase_admin
    from firebase_admin import credentials, firestore

    creds_dict = get_firebase_credentials()
    if not creds_dict:
        raise RuntimeError("Firestore requested but no Firebase credentials")
    cred = credentials.Certificate(creds_dict)
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(cred)
    _firestore_db = firestore.client()
    return _firestore_db


# ---- JSON implementation (default for tests) ----


def _ensure_db_file() -> Path:
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    if not settings.db_path.exists():
        content = json.dumps(INITIAL_DB, indent=2)
        settings.db_path.write_text(content, encoding="utf-8")
    return settings.db_path


# Global cache state
_json_cache = None
_json_mtime = 0.0


def _get_db_json() -> dict[str, Any]:
    global _json_cache, _json_mtime
    path = _ensure_db_file()
    
    # Check if file has changed
    current_mtime = path.stat().st_mtime
    if _json_cache is not None and current_mtime == _json_mtime:
        return _json_cache

    # Reload from disk
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    
    # Update cache
    _json_cache = data
    _json_mtime = current_mtime
    return data


def _save_db_json(data: dict[str, Any]) -> None:
    global _json_cache, _json_mtime
    path = _ensure_db_file()
    
    # Write to disk
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    
    # Update cache to match what we just wrote
    _json_cache = data
    _json_mtime = path.stat().st_mtime


# ---- Firestore implementation ----


def _doc_to_dict(doc) -> dict[str, Any]:
    d = doc.to_dict() or {}
    d["id"] = doc.id
    return d


def _get_db_firestore() -> dict[str, Any]:
    db = _get_firestore()
    result = {c: [] for c in COLLECTIONS}
    for coll_name in COLLECTIONS:
        coll = db.collection(coll_name)
        for doc in coll.stream():
            result[coll_name].append(_doc_to_dict(doc))
    return result


def _save_db_firestore(data: dict[str, Any]) -> None:
    db = _get_firestore()
    for coll_name in COLLECTIONS:
        coll = db.collection(coll_name)
        items = data.get(coll_name, [])
        ids_in_data = {
            item["id"] for item in items
            if isinstance(item, dict) and "id" in item
        }

        # Set/update documents
        for item in items:
            if not isinstance(item, dict) or "id" not in item:
                continue
            doc_id = item["id"]
            coll.document(doc_id).set(item)

        # Delete documents no longer in data
        for doc in coll.stream():
            if doc.id not in ids_in_data:
                coll.document(doc.id).delete()


# ---- Public API ----


def get_db() -> dict[str, Any]:
    """Load full DB. Caller should not mutate and then forget to save."""
    with _lock:
        if _use_firestore():
            return _get_db_firestore()
        return _get_db_json()


def save_db(data: dict[str, Any]) -> None:
    """Write full DB atomically."""
    with _lock:
        if _use_firestore():
            _save_db_firestore(data)
        else:
            _save_db_json(data)
