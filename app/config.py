import json
import os
from pathlib import Path
from typing import Any

from pydantic import model_validator
from pydantic_settings import BaseSettings


PRODUCTION_FRONTEND_URL = "https://renteasy-demo-frontend.onrender.com"


class Settings(BaseSettings):
    app_name: str = "DealRoom API"
    base_url: str = "http://localhost:5173"  # frontend URL for invite links; set DEALROOM_BASE_URL in prod
    jwt_secret: str = "change-me-in-production-use-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    invite_token_bytes: int = 32
    db_path: Path = Path(__file__).resolve().parent.parent / "data" / "db.json"

    # Firebase: set USE_FIRESTORE=true or FIREBASE_CREDENTIALS to use Firestore instead of JSON
    use_firestore: bool = False
    firebase_credentials_path: Path | None = (
        Path(__file__).resolve().parent / "renteasy-e4317-firebase-adminsdk-fbsvc-d06a94b453.json"
    )
    firebase_credentials_json: str | None = None  # FIREBASE_CREDENTIALS env: full JSON string for Render/prod

    class Config:
        env_prefix = "DEALROOM_"
        env_file = ".env"
        extra = "ignore"

    @model_validator(mode="after")
    def use_production_frontend_on_render(self):
        if os.environ.get("RENDER") and self.base_url == "http://localhost:5173":
            self.base_url = PRODUCTION_FRONTEND_URL
        return self


def get_firebase_credentials() -> dict[str, Any] | None:
    """Return credentials dict for Firebase Admin SDK, or None if not configured."""
    s = settings
    # 1. FIREBASE_CREDENTIALS env (for Render, no prefix)
    raw = os.environ.get("FIREBASE_CREDENTIALS") or s.firebase_credentials_json
    if raw:
        return json.loads(raw)
    # 2. Credentials file when USE_FIRESTORE or DEALROOM_USE_FIRESTORE is set
    if s.use_firestore and s.firebase_credentials_path and s.firebase_credentials_path.exists():
        return json.loads(s.firebase_credentials_path.read_text(encoding="utf-8"))
    return None


settings = Settings()
