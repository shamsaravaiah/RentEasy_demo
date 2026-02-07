from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status

from app.dependencies import get_current_user_id
from app.schemas.contract import (
    CreateContractRequest,
    UpdateContractRequest,
    ContractResponse,
    ContractListResponse,
    ContractListItem,
    CreateInviteRequest,
    CreateInviteResponse,
    AcceptResponse,
    SignResponse,
)
from app.services import contract_service
from app.services.contract_mappers import (
    contract_to_response,
    contract_to_list_item,
)
from app.services import invite_service
from app.config import settings

router = APIRouter(prefix="/contracts", tags=["contracts"])


def _ensure_party(contract: dict | None, user_id: str) -> None:
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    if contract["creator_user_id"] != user_id and contract.get("counterparty_user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a party to this contract")


@router.post("", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
def create_contract(
    body: CreateContractRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    contract = contract_service.create_contract(user_id, body)
    return contract_to_response(contract)


@router.get("/{contract_id}", response_model=ContractResponse)
def get_contract(
    contract_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    contract = contract_service.get_contract_by_id(contract_id)
    _ensure_party(contract, user_id)
    return contract_to_response(contract)


@router.patch("/{contract_id}", response_model=ContractResponse)
def update_contract(
    contract_id: str,
    body: UpdateContractRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    contract = contract_service.update_contract(contract_id, user_id, body)
    if not contract:
        c = contract_service.get_contract_by_id(contract_id)
        if not c:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        if c["creator_user_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only creator can update")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract cannot be updated (already accepted or invalid status)",
        )
    return contract_to_response(contract)


@router.get("", response_model=ContractListResponse)
def list_contracts(
    type: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    status: str | None = Query(None, description="Filter by contract status"),
    cursor: str | None = None,
    limit: int = 50,
):
    if type == "created":
        items, next_cursor = contract_service.list_contracts_created(user_id, status, cursor, limit)
    elif type == "received":
        items, next_cursor = contract_service.list_contracts_received(user_id, status, cursor, limit)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="type must be 'created' or 'received'")
    return ContractListResponse(
        items=[contract_to_list_item(c) for c in items],
        next_cursor=next_cursor,
    )


@router.post("/{contract_id}/invite", response_model=CreateInviteResponse, status_code=status.HTTP_201_CREATED)
def create_invite(
    contract_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    body: Annotated[CreateInviteRequest | None, Body()] = None,
):
    invitee_email = body.invitee_email if body else None
    result = invite_service.create_invite(contract_id, user_id, invitee_email=invitee_email)
    if not result:
        contract = contract_service.get_contract_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only creator can create invite")
    raw_token, expires_at = result
    invite_url = f"{settings.base_url}/invite/{raw_token}"
    return CreateInviteResponse(invite_url=invite_url, expires_at=expires_at)


@router.post("/{contract_id}/accept-invite", response_model=AcceptResponse)
def accept_invite_by_contract(
    contract_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """Accept a contract invite by contract id (when invite was sent to your email). No link visit required."""
    contract = invite_service.accept_invite_by_contract(contract_id, user_id)
    if not contract:
        c = contract_service.get_contract_by_id(contract_id)
        if not c:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        if c.get("counterparty_user_id"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract already accepted")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending invite for this contract sent to your email",
        )
    return AcceptResponse(contract=contract_to_response(contract))


@router.post("/{contract_id}/decline-invite")
def decline_invite_by_contract(
    contract_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """Decline a contract invite by contract id (when invite was sent to your email). No link visit required."""
    ok = invite_service.decline_invite_by_contract(contract_id, user_id)
    if not ok:
        c = contract_service.get_contract_by_id(contract_id)
        if not c:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        if c.get("counterparty_user_id"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract already accepted")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending invite for this contract sent to your email",
        )
    return {"ok": True}


@router.post("/{contract_id}/sign", response_model=SignResponse)
def sign_contract(
    contract_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    contract = contract_service.sign_contract(contract_id, user_id)
    if not contract:
        c = contract_service.get_contract_by_id(contract_id)
        if not c:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        if c["creator_user_id"] != user_id and c.get("counterparty_user_id") != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a party to this contract")
        if c["status"] == "SIGNED":
            return SignResponse(contract=contract_to_response(c))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract must be ACCEPTED to sign",
        )
    return SignResponse(contract=contract_to_response(contract))


@router.post("/{contract_id}/cancel", response_model=ContractResponse)
def cancel_contract(
    contract_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    contract = contract_service.cancel_contract(contract_id, user_id)
    if not contract:
        c = contract_service.get_contract_by_id(contract_id)
        if not c:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        if c["creator_user_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only creator can cancel")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel (contract already signed)",
        )
    return contract_to_response(contract)
