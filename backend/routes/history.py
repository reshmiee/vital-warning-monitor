from __future__ import annotations
from typing import Any, Dict, List
from fastapi import APIRouter
from backend.routes.patients import list_patients

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", summary="Get recent alerts across all patients in Ward 4B")
async def get_alerts() -> List[Dict[str, Any]]:
    patients = await list_patients()
    alerts: List[Dict[str, Any]] = []

    for patient in patients:
        tier = patient.get("tier", "low")
        score = patient.get("currentScore", 0)
        why = patient.get("whyOneLine", "Stable")
        bed = patient.get("bedNumber", "")
        name = patient.get("patientName", "")

        if tier in ["high", "medium"]:
            alerts.append({
                "time": "14:02",
                "bedNumber": bed,
                "patientName": name,
                "event": f"Flagged {tier}",
                "tier": tier,
                "score": score,
                "details": f"NEWS2 {score} — {why}"
            })

    # Add general recent history events
    alerts.append({
        "time": "09:30",
        "bedNumber": "4B-07",
        "patientName": "Wilson, Margaret",
        "event": "Observations updated",
        "tier": "neutral",
        "score": 6,
        "details": "SpO₂ 94% → 91%, RR 20 → 24"
    })
    alerts.append({
        "time": "08:15",
        "bedNumber": "4B-02",
        "patientName": "Nguyen, Linh",
        "event": "Resolved",
        "tier": "low",
        "score": 2,
        "details": "NEWS2 returned to baseline (2)"
    })

    return alerts
