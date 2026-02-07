"""
End-to-end test: creator signs up, creates contract and invite link;
invitee signs up, views preview, accepts; both are bound; both sign.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_full_flow_creator_invite_accept_both_sign():
    # 1) Creator signs up (and is "signed in" via token)
    signup_creator = client.post(
        "/api/auth/signup",
        json={
            "email": "landlord@example.com",
            "password": "Secret123!",
        },
    )
    assert signup_creator.status_code == 201, signup_creator.json()
    creator_token = signup_creator.json()["token"]
    creator_headers = {"Authorization": f"Bearer {creator_token}"}

    # 2) Creator creates contract (binary: I am the Landlord)
    create_contract = client.post(
        "/api/contracts",
        headers=creator_headers,
        json={
            "property_address": "Storgatan 1",
            "creator_side": "LANDLORD",
            "rent_amount": 10000,
            "deposit_amount": 10000,
            "currency": "SEK",
            "start_date": "2026-03-01",
            "end_date": None,
            "terms_text": "Standard terms.",
        },
    )
    assert create_contract.status_code == 201
    contract = create_contract.json()
    contract_id = contract["id"]
    assert contract["status"] == "DRAFT"
    assert contract["creator_side"] == "LANDLORD"
    assert contract["landlord_name"] == "landlord@example.com"
    assert contract["tenant_name"] == "Pending"

    # 3) Creator creates invite link
    invite_resp = client.post(
        f"/api/contracts/{contract_id}/invite",
        headers=creator_headers,
    )
    assert invite_resp.status_code == 201
    invite_url = invite_resp.json()["invite_url"]
    invite_token = invite_url.rstrip("/").split("/invite/")[-1]

    # 4) Invitee (other party) signs up
    signup_tenant = client.post(
        "/api/auth/signup",
        json={
            "email": "tenant@example.com",
            "password": "Secret456!",
        },
    )
    assert signup_tenant.status_code == 201
    tenant_token = signup_tenant.json()["token"]
    tenant_headers = {"Authorization": f"Bearer {tenant_token}"}
    tenant_user_id = signup_tenant.json()["user"]["id"]

    # 5) Invitee views contract from link (no auth)
    preview = client.get(f"/api/invites/{invite_token}")
    assert preview.status_code == 200
    assert preview.json()["contract"]["property_address"] == "Storgatan 1"
    assert preview.json()["requires_auth_to_accept"] is True

    # 6) Invitee accepts -> both bound to contract
    accept_resp = client.post(
        f"/api/invites/{invite_token}/accept",
        headers=tenant_headers,
    )
    assert accept_resp.status_code == 200
    accepted = accept_resp.json()["contract"]
    assert accepted["status"] == "ACCEPTED"
    assert accepted["counterparty_user_id"] == tenant_user_id
    assert accepted["accepted_at"] is not None
    assert accepted["tenant_name"] == "tenant@example.com"

    # 7) Both can fetch full contract
    get_creator = client.get(f"/api/contracts/{contract_id}", headers=creator_headers)
    get_tenant = client.get(f"/api/contracts/{contract_id}", headers=tenant_headers)
    assert get_creator.status_code == 200
    assert get_tenant.status_code == 200

    # 8) Creator signs
    sign_creator = client.post(
        f"/api/contracts/{contract_id}/sign",
        headers=creator_headers,
    )
    assert sign_creator.status_code == 200
    assert sign_creator.json()["contract"]["creator_signed_at"] is not None
    assert sign_creator.json()["contract"]["counterparty_signed_at"] is None

    # 9) Invitee signs -> contract fully signed
    sign_tenant = client.post(
        f"/api/contracts/{contract_id}/sign",
        headers=tenant_headers,
    )
    assert sign_tenant.status_code == 200
    full_signed = sign_tenant.json()["contract"]
    assert full_signed["status"] == "SIGNED"
    assert full_signed["creator_signed_at"] is not None
    assert full_signed["counterparty_signed_at"] is not None
