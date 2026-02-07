import uuid
from typing import Any

from app.database import get_db, save_db
from app.schemas.auth import UserResponse
from app.utils.security import hash_password, verify_password, now_utc


def get_user_by_email(email: str) -> dict[str, Any] | None:
    data = get_db()
    for u in data["users"]:
        if u["email"] == email.lower():
            return u
    return None


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    data = get_db()
    for u in data["users"]:
        if u["id"] == user_id:
            return u
    return None


def create_user(
    email: str,
    password: str,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
) -> dict[str, Any]:
    data = get_db()
    email_lower = email.lower()
    for u in data["users"]:
        if u["email"] == email_lower:
            raise ValueError("Email already registered")
    now = now_utc()
    user = {
        "id": str(uuid.uuid4()),
        "email": email_lower,
        "password_hash": hash_password(password),
        "first_name": first_name or None,
        "last_name": last_name or None,
        "phone": phone or None,
        "created_at": now,
        "updated_at": now,
    }
    data["users"].append(user)
    save_db(data)
    return user


def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return user


def user_to_response(user: dict[str, Any]) -> UserResponse:
    return UserResponse(
        id=user["id"],
        email=user["email"],
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        phone=user.get("phone"),
    )
