from datetime import date

from app.schemas.contract import (
    ContractPreviewResponse,
    ContractResponse,
    ContractListItem,
)
from app.services import auth_service
from app.services.contract_service import _user_display_name

PENDING = "Pending"


def _resolved_landlord_tenant_names(c: dict) -> tuple[str, str | None]:
    """Resolve landlord_name and tenant_name from user records so we always return names, not emails."""
    creator_side = c.get("creator_side") or "LANDLORD"
    creator = auth_service.get_user_by_id(c["creator_user_id"]) if c.get("creator_user_id") else None
    counterparty = auth_service.get_user_by_id(c["counterparty_user_id"]) if c.get("counterparty_user_id") else None
    creator_display = _user_display_name(creator) if creator else (c.get("landlord_name") or c.get("tenant_name") or "")
    counterparty_display = _user_display_name(counterparty) if counterparty else None
    if creator_side == "LANDLORD":
        landlord_name = creator_display
        tenant_name = counterparty_display if counterparty_display else c.get("tenant_name")
    else:
        landlord_name = counterparty_display if counterparty_display else c.get("landlord_name")
        tenant_name = creator_display
    return (landlord_name or "", tenant_name)


def contract_to_response(c: dict) -> ContractResponse:
    creator_side = c.get("creator_side") or "LANDLORD"
    landlord_name, tenant_name = _resolved_landlord_tenant_names(c)
    return ContractResponse(
        id=c["id"],
        creator_user_id=c["creator_user_id"],
        counterparty_user_id=c.get("counterparty_user_id"),
        status=c["status"],
        creator_side=creator_side,
        property_address=c["property_address"],
        landlord_name=landlord_name,
        tenant_name=tenant_name,
        rent_amount=int(round(float(c["rent_amount"]))),
        deposit_amount=int(round(float(c["deposit_amount"]))),
        currency=c["currency"],
        start_date=date.fromisoformat(c["start_date"]),
        end_date=date.fromisoformat(c["end_date"]) if c.get("end_date") else None,
        terms_text=c["terms_text"],
        accepted_at=c.get("accepted_at"),
        creator_signed_at=c.get("creator_signed_at"),
        counterparty_signed_at=c.get("counterparty_signed_at"),
        created_at=c["created_at"],
        updated_at=c["updated_at"],
    )


def contract_to_preview(c: dict) -> ContractPreviewResponse:
    return ContractPreviewResponse(
        id=c["id"],
        status=c["status"],
        property_address=c["property_address"],
        rent_amount=int(round(float(c["rent_amount"]))),
        deposit_amount=int(round(float(c["deposit_amount"]))),
        currency=c["currency"],
        start_date=date.fromisoformat(c["start_date"]),
        end_date=date.fromisoformat(c["end_date"]) if c.get("end_date") else None,
        terms_text=c["terms_text"],
    )


def contract_to_list_item(c: dict) -> ContractListItem:
    return ContractListItem(
        id=c["id"],
        status=c["status"],
        property_address=c["property_address"],
        rent_amount=int(round(float(c["rent_amount"]))),
        currency=c["currency"],
        start_date=date.fromisoformat(c["start_date"]),
        created_at=c["created_at"],
    )
