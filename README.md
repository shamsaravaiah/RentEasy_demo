# Deal Room Backend

Minimal backend for landlord/tenant contracts: create contract, share invite link, accept, and sign. Two parties only; JWT auth; JSON file storage.

## Setup

```bash
cd /Users/sham_sara/Desktop/Rent_Easy_python
python -m venv RentEasy
source RentEasy/bin/activate   # Windows: RentEasy\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  

## Config

- `DEALROOM_JWT_SECRET` – JWT signing secret (default: change-me-in-production-use-env)
- `DEALROOM_BASE_URL` – base URL for invite links (default: https://app.com)
- `DEALROOM_DB_PATH` – path to `db.json` (default: `./data/db.json`)

Data is stored in `data/db.json` (created on first run).

## API Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health |
| GET | `/api/invites/{token}` | No | Contract preview by invite link |
| POST | `/api/auth/signup` | No | Register |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/contracts` | Yes | Create contract |
| GET | `/api/contracts` | Yes | List created (`?type=created`) or received (`?type=received`) |
| GET | `/api/contracts/{id}` | Yes | Get contract (creator/counterparty only) |
| PATCH | `/api/contracts/{id}` | Yes | Update contract (creator, before accept) |
| POST | `/api/contracts/{id}/invite` | Yes | Create invite link |
| POST | `/api/contracts/{id}/sign` | Yes | Sign contract |
| POST | `/api/contracts/{id}/cancel` | Yes | Cancel (creator, not signed) |
| POST | `/api/invites/{token}/accept` | Yes | Accept invite (bind as counterparty) |

Auth: `Authorization: Bearer <jwt>`.

## Tests

Uses a temporary JSON DB (no real data). Run:

```bash
source RentEasy/bin/activate
pip install -r requirements.txt   # includes pytest, httpx
pytest tests/ -v
```

**`tests/test_contract_flow.py`** – one E2E test: creator signup → create contract → create invite link → invitee signup → invitee views preview → invitee accepts → both fetch contract → creator signs → invitee signs → contract fully signed.
