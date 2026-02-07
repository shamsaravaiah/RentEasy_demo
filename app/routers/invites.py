from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user_id, get_optional_user_id
from app.schemas.contract import InvitePreviewResponse, AcceptResponse, PendingInvitesResponse, PendingInviteItem
from app.services import auth_service, invite_service
from app.services.contract_mappers import contract_to_preview, contract_to_response

router = APIRouter(prefix="/invites", tags=["invites"])


@router.get("/pending", response_model=PendingInvitesResponse)
def list_pending_invites(
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """List invites sent to the current user's email (pending accept/decline). Shown in Received section."""
    user = auth_service.get_user_by_id(user_id)
    if not user or not user.get("email"):
        return PendingInvitesResponse(items=[])
    items = invite_service.list_pending_invites_for_user(user["email"])
    return PendingInvitesResponse(
        items=[
            PendingInviteItem(
                contract_id=item["contract_id"],
                contract=contract_to_preview(item["contract"]),
            )
            for item in items
        ],
    )


@router.get("/{token}", response_model=InvitePreviewResponse)
def get_invite_preview(
    token: str,
    user_id: Annotated[str | None, Depends(get_optional_user_id)],
):
    """Public: view contract by invite token. Auth optional; if present, returns current_user_is_creator."""
    contract = invite_service.get_contract_by_token(token)
    if not contract:
        inv = invite_service.get_invite_by_token(token)
        if inv and invite_service.is_invite_expired(inv):
            raise HTTPException(
                status_code=status.HTTP_410_GONE, detail="Invite expired"
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invite",
        )
    current_user_is_creator = (
        user_id is not None and contract["creator_user_id"] == user_id
    )
    return InvitePreviewResponse(
        contract=contract_to_preview(contract),
        requires_auth_to_accept=True,
        current_user_is_creator=current_user_is_creator,
    )


@router.post("/{token}/accept", response_model=AcceptResponse)
def accept_invite(
    token: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    contract = invite_service.accept_invite(token, user_id)
    if not contract:
        inv = invite_service.get_invite_by_token(token)
        if not inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite"
            )
        if invite_service.is_invite_expired(inv):
            raise HTTPException(
                status_code=status.HTTP_410_GONE, detail="Invite expired"
            )
        if inv.get("used_at"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite already used",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Cannot accept (e.g. you are the creator or "
                "contract already has counterparty)"
            ),
        )
    return AcceptResponse(contract=contract_to_response(contract))


@router.post("/{token}/decline")
def decline_invite(
    token: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """Decline the invite (invitee only). Marks invite used, status DECLINED."""
    ok = invite_service.decline_invite(token, user_id)
    if not ok:
        inv = invite_service.get_invite_by_token(token)
        if not inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite"
            )
        if invite_service.is_invite_expired(inv):
            raise HTTPException(
                status_code=status.HTTP_410_GONE, detail="Invite expired"
            )
        if inv.get("used_at"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite already used or declined",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Cannot decline (e.g. you are the creator or "
                "invite already accepted)"
            ),
        )
    return {"status": "declined"}
