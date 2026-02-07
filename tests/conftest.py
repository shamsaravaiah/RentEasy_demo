"""
Set a temporary DB path before the app is loaded so tests don't touch real data.
Reset DB to initial state before each test for isolation.
"""
import copy
import json
import os
import tempfile

import pytest

# Must set env before any app import so config picks up the path
_temp_db = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
_temp_db.close()
os.environ["DEALROOM_DB_PATH"] = _temp_db.name
os.environ["DEALROOM_USE_FIRESTORE"] = "false"  # tests use JSON, not Firestore

# Write initial DB so the path exists and is valid before any import
INITIAL_DB = {
    "users": [],
    "contracts": [],
    "contract_invites": [],
    "contract_events": [],
}
with open(_temp_db.name, "w", encoding="utf-8") as f:
    json.dump(INITIAL_DB, f, indent=2)


@pytest.fixture(autouse=True)
def reset_db():
    """Reset JSON DB to initial state before each test."""
    from app.database import INITIAL_DB as APP_INITIAL_DB, save_db

    save_db(copy.deepcopy(APP_INITIAL_DB))
    yield
