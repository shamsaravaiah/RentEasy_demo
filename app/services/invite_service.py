import uuid
from typing import Any

from app.database import get_db, save_db
from app.schemas.common import ContractEventType, ContractStatus
from app.services import auth_service, contract_service
from app.utils.security import generate_invite_token, hash_invite_token, now_utc


def create_invite(
    contract_id: str,
    creator_user_id: str,
    invitee_email: str | None = None,
) -> tuple[str, str | None] | None:
    """Returns (raw_token, expires_at) or None if not allowed. If invitee_email is set, that user will see this invite in their Received (pending) list."""
    data = get_db()
    contract = contract_service.get_contract_by_id(contract_id)
    if not contract or contract["creator_user_id"] != creator_user_id:
        return None
    normalized_email = invitee_email.strip().lower() if invitee_email else None
    for inv in data["contract_invites"]:
        if inv["contract_id"] == contract_id:
            # Idempotent: return existing. We don't store raw token, so we cannot return same URL.
            # PRD says "return existing or rotate". For idempotent we need to store raw token once or
            # generate a new token each time. Easiest: idempotent = create one invite per contract,
            # but we only have token_hash. So we cannot return the same invite URL on second call.
            # So we'll "rotate" on duplicate: create new token and replace (or keep one invite per contract
            # and generate new token, update hash). Actually PRD: "if invite already exists, either return
            # existing (idempotent) or rotate token (simpler: idempotent)". So idempotent = return existing.
            # To return existing we must have stored raw token somewhere. So let's store token_prefix (first 8 chars)
            # and for idempotent we'd need to return a deterministic URL. That's not possible without storing
            # raw token. So I'll do: one invite per contract, and on second POST we generate a NEW token
            # and update the invite (rotate). That way we only have one active invite per contract.
            raw = generate_invite_token()
            token_hash = hash_invite_token(raw)
            inv["token_hash"] = token_hash
            inv["used_at"] = None
            inv["expires_at"] = None
            inv["invitee_email"] = normalized_email
            save_db(data)
            if contract["status"] == ContractStatus.DRAFT.value:
                contract_service.set_contract_status(contract_id, ContractStatus.INVITED.value)
            return (raw, inv.get("expires_at"))
    raw = generate_invite_token()
    token_hash = hash_invite_token(raw)
    invite = {
        "id": str(uuid.uuid4()),
        "contract_id": contract_id,
        "token_hash": token_hash,
        "expires_at": None,
        "used_at": None,
        "invitee_email": normalized_email,
        "created_at": now_utc(),
    }
    data["contract_invites"].append(invite)
    if contract["status"] == ContractStatus.DRAFT.value:
        contract_service.set_contract_status(contract_id, ContractStatus.INVITED.value)
    save_db(data)
    # Event
    data2 = get_db()
    event = {
        "id": str(uuid.uuid4()),
        "contract_id": contract_id,
        "actor_user_id": creator_user_id,
        "type": ContractEventType.INVITE_CREATED.value,
        "metadata": None,
        "created_at": now_utc(),
    }
    data2.setdefault("contract_events", []).append(event)
    save_db(data2)
    return (raw, None)


def get_contract_by_token(raw_token: str) -> dict[str, Any] | None:
    """Returns contract dict if valid, not expired, and not already used (accept/decline). Marks VIEWED event."""
    token_hash = hash_invite_token(raw_token)
    data = get_db()
    for inv in data["contract_invites"]:
        if inv["token_hash"] != token_hash:
            continue
        if inv.get("used_at"):
            return None  # invite already used (accepted or declined)
        if inv.get("expires_at"):
            from datetime import datetime, timezone
            exp = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                return None  # expired -> 410
        contract = contract_service.get_contract_by_id(inv["contract_id"])
        if not contract:
            return None
        # Optional: append VIEWED event (actor null)
        event = {
            "id": str(uuid.uuid4()),
            "contract_id": contract["id"],
            "actor_user_id": None,
            "type": ContractEventType.VIEWED.value,
            "metadata": None,
            "created_at": now_utc(),
        }
        data.setdefault("contract_events", []).append(event)
        save_db(data)
        return contract
    return None


def get_invite_by_token(raw_token: str) -> dict[str, Any] | None:
    token_hash = hash_invite_token(raw_token)
    data = get_db()
    for inv in data["contract_invites"]:
        if inv["token_hash"] == token_hash:
            return inv
    return None


def is_invite_expired(invite: dict[str, Any]) -> bool:
    if not invite.get("expires_at"):
        return False
    from datetime import datetime, timezone
    exp = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
    return datetime.now(timezone.utc) > exp


def accept_invite(raw_token: str, user_id: str) -> dict[str, Any] | None:
    """Bind counterparty and set accepted_at. Returns contract or None."""
    inv = get_invite_by_token(raw_token)
    if not inv:
        return None
    if is_invite_expired(inv):
        return None
    if inv.get("used_at"):
        return None
    contract = contract_service.get_contract_by_id(inv["contract_id"])
    if not contract:
        return None
    if contract.get("counterparty_user_id"):
        return None
    if contract["creator_user_id"] == user_id:
        return None
    updated = contract_service.set_contract_accepted(contract["id"], user_id)
    if not updated:
        return None
    data = get_db()
    now = now_utc()
    for i in data["contract_invites"]:
        if i["id"] == inv["id"]:
            i["used_at"] = now
            save_db(data)
            break
    return updated


def decline_invite(raw_token: str, user_id: str) -> bool:
    """Mark invite as declined: set invite used_at and contract status DECLINED. Caller must not be creator. Returns True if declined."""
    inv = get_invite_by_token(raw_token)
    if not inv:
        return False
    if is_invite_expired(inv):
        return False
    if inv.get("used_at"):
        return False
    contract = contract_service.get_contract_by_id(inv["contract_id"])
    if not contract:
        return False
    if contract.get("counterparty_user_id"):
        return False  # already accepted
    if contract["creator_user_id"] == user_id:
        return False  # creator cannot decline their own invite
    # Mark invite as used and set contract to DECLINED (no counterparty bound)
    contract_service.set_contract_status(contract["id"], ContractStatus.DECLINED.value)
    data = get_db()
    now = now_utc()
    for i in data["contract_invites"]:
        if i["id"] == inv["id"]:
            i["used_at"] = now
            save_db(data)
            return True
    return False


def list_pending_invites_for_user(user_email: str) -> list[dict[str, Any]]:
    """Returns list of { contract_id, contract } for invites sent to this email that are not yet used."""
    if not user_email:
        return []
    email_lower = user_email.strip().lower()
    data = get_db()
    out = []
    for inv in data["contract_invites"]:
        if inv.get("invitee_email") != email_lower:
            continue
        if inv.get("used_at"):
            continue
        if is_invite_expired(inv):
            continue
        contract = contract_service.get_contract_by_id(inv["contract_id"])
        if not contract or contract.get("counterparty_user_id"):
            continue
        out.append({"contract_id": inv["contract_id"], "contract": contract})
    return out


def _get_invite_by_contract_and_invitee_email(contract_id: str, invitee_email: str) -> dict[str, Any] | None:
    """Find invite for this contract sent to this email, not used."""
    if not invitee_email:
        return None
    email_lower = invitee_email.strip().lower()
    data = get_db()
    for inv in data["contract_invites"]:
        if inv["contract_id"] != contract_id:
            continue
        if inv.get("invitee_email") != email_lower:
            continue
        if inv.get("used_at"):
            return None
        if is_invite_expired(inv):
            return None
        return inv
    return None


def accept_invite_by_contract(contract_id: str, user_id: str) -> dict[str, Any] | None:
    """Accept invite by contract_id when current user's email matches invitee_email. Returns contract or None."""
    user = auth_service.get_user_by_id(user_id)
    if not user or not user.get("email"):
        return None
    inv = _get_invite_by_contract_and_invitee_email(contract_id, user["email"])
    if not inv:
        return None
    contract = contract_service.get_contract_by_id(contract_id)
    if not contract or contract.get("counterparty_user_id"):
        return None
    if contract["creator_user_id"] == user_id:
        return None
    updated = contract_service.set_contract_accepted(contract_id, user_id)
    if not updated:
        return None
    data = get_db()
    now = now_utc()
    for i in data["contract_invites"]:
        if i["id"] == inv["id"]:
            i["used_at"] = now
            save_db(data)
            break
    return updated


def decline_invite_by_contract(contract_id: str, user_id: str) -> bool:
    """Decline invite by contract_id when current user's email matches invitee_email."""
    user = auth_service.get_user_by_id(user_id)
    if not user or not user.get("email"):
        return False
    inv = _get_invite_by_contract_and_invitee_email(contract_id, user["email"])
    if not inv:
        return False
    contract = contract_service.get_contract_by_id(contract_id)
    if not contract or contract.get("counterparty_user_id"):
        return False
    if contract["creator_user_id"] == user_id:
        return False
    contract_service.set_contract_status(contract_id, ContractStatus.DECLINED.value)
    data = get_db()
    now = now_utc()
    for i in data["contract_invites"]:
        if i["id"] == inv["id"]:
            i["used_at"] = now
            save_db(data)
            return True
    return False
