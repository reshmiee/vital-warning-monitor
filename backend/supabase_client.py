from __future__ import annotations
import os
from typing import Any, Dict, List
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "https://vioeccjwxvwycauncjnz.supabase.co")
SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "")

_RPC_ENDPOINT = f"{SUPABASE_URL}/rest/v1/rpc/get_patient_recent_vitals"

# Default headers required by every Supabase REST call
def _headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }


async def fetch_recent_vitals(patient_id: str) -> List[Dict[str, Any]]:
    """
    Calls the Supabase RPC get_patient_recent_vitals with the given patient_id.
    Returns the list of reading dicts as returned by the database.

    The RPC is expected to return rows with at least:
        minute, ts, pulse_rate, spo2, systolic_bp, resp_rate, temperature, warning_label

    Raises:
        httpx.HTTPStatusError  if Supabase returns a non-2xx response.
        ValueError             if the response body is not a list.
    """
    if not SUPABASE_ANON_KEY:
        raise RuntimeError(
            "SUPABASE_ANON_KEY is not set. "
            "Add it to your .env file or environment before starting the server."
        )

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            _RPC_ENDPOINT,
            headers=_headers(),
            json={"patient_id": patient_id},
        )
        response.raise_for_status()

    data = response.json()
    if not isinstance(data, list):
        raise ValueError(
            f"Unexpected response shape from Supabase RPC. "
            f"Expected list, got {type(data).__name__}: {data}"
        )

    return data