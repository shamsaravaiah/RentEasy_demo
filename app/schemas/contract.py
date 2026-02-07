from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import ContractStatus

CreatorSide = Literal["LANDLORD", "TENANT"]


class CreateContractRequest(BaseModel):
    property_address: str
    creator_side: CreatorSide  # I am the Landlord | I am the Tenant
    rent_amount: int  # whole units only, no decimals
    deposit_amount: int
    currency: str = "SEK"
    start_date: date
    end_date: date | None = None
    terms_text: str = ""


class UpdateContractRequest(BaseModel):
    property_address: str | None = None
    rent_amount: int | None = None
    deposit_amount: int | None = None
    currency: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    terms_text: str | None = None


class ContractPreviewResponse(BaseModel):
    """Safe fields returned for GET /invites/{token} (no creator/counterparty ids)."""
    id: str
    status: str
    property_address: str
    rent_amount: int
    deposit_amount: int
    currency: str
    start_date: date
    end_date: date | None
    terms_text: str


class ContractResponse(BaseModel):
    """Full contract for creator/counterparty."""
    id: str
    creator_user_id: str
    counterparty_user_id: str | None
    status: str
    creator_side: str  # LANDLORD | TENANT
    property_address: str
    landlord_name: str
    tenant_name: str | None
    rent_amount: int
    deposit_amount: int
    currency: str
    start_date: date
    end_date: date | None
    terms_text: str
    accepted_at: str | None
    creator_signed_at: str | None
    counterparty_signed_at: str | None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class ContractListItem(BaseModel):
    """Short form for list endpoints."""
    id: str
    status: str
    property_address: str
    rent_amount: int
    currency: str
    start_date: date
    created_at: str


class ContractListResponse(BaseModel):
    items: list[ContractListItem]
    next_cursor: str | None = None


class InvitePreviewResponse(BaseModel):
    contract: ContractPreviewResponse
    requires_auth_to_accept: bool = True
    current_user_is_creator: bool = False


class CreateInviteRequest(BaseModel):
    """Optional body when creating an invite. If invitee_email is set, the invite appears in that user's Received (pending) list."""
    invitee_email: str | None = None


class CreateInviteResponse(BaseModel):
    invite_url: str
    expires_at: str | None = None


class PendingInviteItem(BaseModel):
    """One pending invite for the current user (invite sent to their email)."""
    contract_id: str
    contract: ContractPreviewResponse


class PendingInvitesResponse(BaseModel):
    items: list[PendingInviteItem]


class AcceptResponse(BaseModel):
    contract: ContractResponse


class SignResponse(BaseModel):
    contract: ContractResponse
