import uuid
from typing import Any

from app.database import get_db, save_db
from app.schemas.common import ContractStatus, ContractEventType
from app.schemas.contract import CreateContractRequest, UpdateContractRequest
from app.services import auth_service
from app.utils.security import now_utc

PENDING = "Pending"


def _user_display_name(user: dict[str, Any] | None) -> str:
    """First name + last name, or email if no names."""
    if not user:
        return ""
    first = (user.get("first_name") or "").strip()
    last = (user.get("last_name") or "").strip()
    name = f"{first} {last}".strip()
    return name if name else (user.get("email") or "")


def create_contract(creator_user_id: str, payload: CreateContractRequest) -> dict[str, Any]:
    data = get_db()
    now = now_utc()
    creator = auth_service.get_user_by_id(creator_user_id)
    creator_display = _user_display_name(creator) if creator else creator_user_id
    if payload.creator_side == "LANDLORD":
        landlord_name = creator_display
        tenant_name = PENDING
    else:
        landlord_name = PENDING
        tenant_name = creator_display
    contract = {
        "id": str(uuid.uuid4()),
        "creator_user_id": creator_user_id,
        "counterparty_user_id": None,
        "status": ContractStatus.DRAFT.value,
        "creator_side": payload.creator_side,
        "property_address": payload.property_address,
        "landlord_name": landlord_name,
        "tenant_name": tenant_name,
        "rent_amount": int(payload.rent_amount),
        "deposit_amount": int(payload.deposit_amount),
        "currency": payload.currency,
        "start_date": payload.start_date.isoformat(),
        "end_date": payload.end_date.isoformat() if payload.end_date else None,
        "terms_text": payload.terms_text,
        "accepted_at": None,
        "creator_signed_at": None,
        "counterparty_signed_at": None,
        "created_at": now,
        "updated_at": now,
    }
    data["contracts"].append(contract)
    save_db(data)
    _append_event(data, contract["id"], creator_user_id, ContractEventType.CREATED, None)
    return contract


def get_contract_by_id(contract_id: str) -> dict[str, Any] | None:
    data = get_db()
    for c in data["contracts"]:
        if c["id"] == contract_id:
            return c
    return None


def update_contract(contract_id: str, user_id: str, payload: UpdateContractRequest) -> dict[str, Any] | None:
    data = get_db()
    for c in data["contracts"]:
        if c["id"] != contract_id:
            continue
        if c["creator_user_id"] != user_id:
            return None
        if c["status"] not in (ContractStatus.DRAFT.value, ContractStatus.INVITED.value) or c.get("accepted_at"):
            return None
        now = now_utc()
        if payload.property_address is not None:
            c["property_address"] = payload.property_address
        if payload.rent_amount is not None:
            c["rent_amount"] = int(payload.rent_amount)
        if payload.deposit_amount is not None:
            c["deposit_amount"] = int(payload.deposit_amount)
        if payload.currency is not None:
            c["currency"] = payload.currency
        if payload.start_date is not None:
            c["start_date"] = payload.start_date.isoformat()
        if payload.end_date is not None:
            c["end_date"] = payload.end_date.isoformat() if payload.end_date else None
        if payload.terms_text is not None:
            c["terms_text"] = payload.terms_text
        c["updated_at"] = now
        save_db(data)
        return c
    return None


def list_contracts_created(user_id: str, status: str | None, cursor: str | None, limit: int = 50) -> tuple[list[dict], str | None]:
    data = get_db()
    items = [c for c in data["contracts"] if c["creator_user_id"] == user_id]
    if status:
        items = [c for c in items if c["status"] == status]
    items.sort(key=lambda x: x["created_at"], reverse=True)
    start = 0
    if cursor:
        for i, c in enumerate(items):
            if c["id"] == cursor:
                start = i + 1
                break
    page = items[start : start + limit + 1]
    next_cursor = page[limit].get("id") if len(page) > limit else None
    return (page[:limit], next_cursor)


def list_contracts_received(user_id: str, status: str | None, cursor: str | None, limit: int = 50) -> tuple[list[dict], str | None]:
    data = get_db()
    items = [c for c in data["contracts"] if c.get("counterparty_user_id") == user_id]
    if status:
        items = [c for c in items if c["status"] == status]
    items.sort(key=lambda x: x["created_at"], reverse=True)
    start = 0
    if cursor:
        for i, c in enumerate(items):
            if c["id"] == cursor:
                start = i + 1
                break
    page = items[start : start + limit + 1]
    next_cursor = page[limit].get("id") if len(page) > limit else None
    return (page[:limit], next_cursor)


def sign_contract(contract_id: str, user_id: str) -> dict[str, Any] | None:
    data = get_db()
    for c in data["contracts"]:
        if c["id"] != contract_id:
            continue
        if c["creator_user_id"] != user_id and c.get("counterparty_user_id") != user_id:
            return None
        if c["status"] == ContractStatus.SIGNED.value:
            save_db(data)
            return c
        if c["status"] not in (ContractStatus.ACCEPTED.value, ContractStatus.SIGNED.value):
            return None
        now = now_utc()
        if c["creator_user_id"] == user_id and not c.get("creator_signed_at"):
            c["creator_signed_at"] = now
            _append_event(data, contract_id, user_id, ContractEventType.SIGNED_CREATOR, None)
        elif c.get("counterparty_user_id") == user_id and not c.get("counterparty_signed_at"):
            c["counterparty_signed_at"] = now
            _append_event(data, contract_id, user_id, ContractEventType.SIGNED_COUNTERPARTY, None)
        if c.get("creator_signed_at") and c.get("counterparty_signed_at"):
            c["status"] = ContractStatus.SIGNED.value
        c["updated_at"] = now
        save_db(data)
        return c
    return None


def cancel_contract(contract_id: str, user_id: str) -> dict[str, Any] | None:
    """Only the creator can cancel. Status becomes CANCELLED. Not allowed if already SIGNED."""
    data = get_db()
    for c in data["contracts"]:
        if c["id"] != contract_id:
            continue
        if c["creator_user_id"] != user_id:
            return None
        if c["status"] == ContractStatus.SIGNED.value:
            return None
        now = now_utc()
        c["status"] = ContractStatus.CANCELLED.value
        c["updated_at"] = now
        save_db(data)
        _append_event(data, contract_id, user_id, ContractEventType.CANCELLED, None)
        return c
    return None


def set_contract_status(contract_id: str, status: str) -> None:
    data = get_db()
    for c in data["contracts"]:
        if c["id"] == contract_id:
            c["status"] = status
            c["updated_at"] = now_utc()
            save_db(data)
            return


def set_contract_accepted(contract_id: str, counterparty_user_id: str) -> dict[str, Any] | None:
    data = get_db()
    now = now_utc()
    counterparty = auth_service.get_user_by_id(counterparty_user_id)
    counterparty_display = _user_display_name(counterparty) if counterparty else counterparty_user_id
    for c in data["contracts"]:
        if c["id"] != contract_id:
            continue
        if c.get("counterparty_user_id"):
            return None
        c["counterparty_user_id"] = counterparty_user_id
        c["accepted_at"] = now
        c["status"] = ContractStatus.ACCEPTED.value
        c["updated_at"] = now
        if c.get("tenant_name") == PENDING:
            c["tenant_name"] = counterparty_display
        if c.get("landlord_name") == PENDING:
            c["landlord_name"] = counterparty_display
        save_db(data)
        _append_event(data, contract_id, counterparty_user_id, ContractEventType.ACCEPTED, None)
        return c
    return None


def _append_event(data: dict, contract_id: str, actor_user_id: str | None, event_type: ContractEventType, metadata: dict | None) -> None:
    from app.database import save_db
    event = {
        "id": str(uuid.uuid4()),
        "contract_id": contract_id,
        "actor_user_id": actor_user_id,
        "type": event_type.value,
        "metadata": metadata,
        "created_at": now_utc(),
    }
    data.setdefault("contract_events", []).append(event)
    save_db(data)
