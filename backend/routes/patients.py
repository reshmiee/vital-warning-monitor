import asyncio, time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException

from backend.supabase_client import fetch_recent_vitals
from backend.model_loader import get_predictor
from model.inference import DeteriorationRiskPredictor, run_inference, _payload_to_internal_df
from model.forecast import compute_news2_score, run_full_forecast

router = APIRouter(prefix="/patients", tags=["Patients"])

_PATIENTS_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0.0}

# Canonical patient demographics mapped to beds in Ward 4B
PATIENT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "P001": {"bedNumber": "4B-01", "patientName": "Ahmed, Sara", "demographics": "F, 58", "ward": "Ward 4B", "department": "General Medicine"},
    "P002": {"bedNumber": "4B-02", "patientName": "Nguyen, Linh", "demographics": "F, 50", "ward": "Ward 4B", "department": "General Medicine"},
    "P003": {"bedNumber": "4B-03", "patientName": "O'Connor, Liam", "demographics": "M, 81", "ward": "Ward 4B", "department": "General Medicine"},
    "P004": {"bedNumber": "4B-04", "patientName": "Taylor, Emma", "demographics": "F, 29", "ward": "Ward 4B", "department": "General Medicine"},
    "P005": {"bedNumber": "4B-05", "patientName": "Khan, Aisha", "demographics": "F, 34", "ward": "Ward 4B", "department": "General Medicine"},
    "P006": {"bedNumber": "4B-06", "patientName": "Roberts, James", "demographics": "M, 45", "ward": "Ward 4B", "department": "General Medicine"},
    "P007": {"bedNumber": "4B-07", "patientName": "Wilson, Margaret", "demographics": "F, 72", "ward": "Ward 4B", "department": "General Medicine"},
    "P008": {"bedNumber": "4B-08", "patientName": "Brown, Thomas", "demographics": "M, 69", "ward": "Ward 4B", "department": "General Medicine"},
    "P009": {"bedNumber": "4B-09", "patientName": "Wilkins, Robert", "demographics": "M, 68", "ward": "Ward 4B", "department": "General Medicine"},
    "P010": {"bedNumber": "4B-10", "patientName": "Chen, Mei", "demographics": "F, 65", "ward": "Ward 4B", "department": "General Medicine"},
}


async def _fetch_and_summarize_patient(patient_id: str) -> Dict[str, Any]:
    meta = PATIENT_REGISTRY.get(patient_id, {
        "bedNumber": f"4B-{patient_id}",
        "patientName": f"Patient {patient_id}",
        "demographics": "N/A",
        "ward": "Ward 4B",
        "department": "General Medicine"
    })

    try:
        readings = await asyncio.wait_for(fetch_recent_vitals(patient_id, minutes=10), timeout=3.5)
    except Exception:
        readings = []

    if readings:
        latest = readings[-1]
        earliest = readings[0]

        hr = round(float(latest.get("pulse_rate", 75)), 1)
        spo2 = round(float(latest.get("spo2", 98)), 1)
        sbp = round(float(latest.get("systolic_bp", 120)), 1)
        rr = round(float(latest.get("resp_rate", 16)), 1)
        temp = round(float(latest.get("temperature", 36.8)), 1)

        # Calculate NEWS2
        score = compute_news2_score({
            "PulseRate": hr,
            "SpO2": spo2,
            "SystolicBP": sbp,
            "RespRate": rr,
            "Temperature": temp
        })

        # Calculate Trends
        hr_diff = hr - float(earliest.get("pulse_rate", hr))
        spo2_diff = spo2 - float(earliest.get("spo2", spo2))
        rr_diff = rr - float(earliest.get("resp_rate", rr))
        sbp_diff = sbp - float(earliest.get("systolic_bp", sbp))
        temp_diff = temp - float(earliest.get("temperature", temp))

        hr_status = "rising" if hr_diff > 3 else ("falling" if hr_diff < -3 else "stable")
        spo2_status = "falling" if spo2_diff < -1 else ("rising" if spo2_diff > 1 else "stable")
        rr_status = "rising" if rr_diff > 2 else ("falling" if rr_diff < -2 else "stable")
        bp_status = "falling" if sbp_diff < -5 else ("rising" if sbp_diff > 5 else "stable")
        temp_status = "rising" if temp_diff > 0.3 else ("falling" if temp_diff < -0.3 else "stable")

        # Overall trend
        if score >= 7 or rr_status == "rising" or spo2_status == "falling":
            overall_trend = "rising"
        elif score <= 2:
            overall_trend = "stable"
        else:
            overall_trend = "stable"

        # Why one-liner
        why_reasons = []
        if rr >= 21: why_reasons.append("RR high")
        elif rr_status == "rising": why_reasons.append("RR rising")
        if spo2 < 94: why_reasons.append("SpO₂ low")
        elif spo2_status == "falling": why_reasons.append("SpO₂ falling")
        if sbp <= 100: why_reasons.append("SBP low")
        if hr >= 100: why_reasons.append("Tachycardia")
        if temp >= 38.1: why_reasons.append("Temperature elevated")
        why_one_line = ", ".join(why_reasons) if why_reasons else "All vitals in range"

        tier = "high" if score >= 7 else ("medium" if score >= 5 else "low")

        vitals_obj = {
            "respiratoryRate": int(round(rr)),
            "rrStatus": rr_status,
            "oxygenSaturation": int(round(spo2)),
            "spo2Status": spo2_status,
            "systolicBP": int(round(sbp)),
            "bpStatus": bp_status,
            "pulse": int(round(hr)),
            "pulseStatus": hr_status,
            "temperature": temp,
            "tempStatus": temp_status,
        }
    else:
        score = 2
        tier = "low"
        overall_trend = "stable"
        why_one_line = "Awaiting recent vitals"
        vitals_obj = {
            "respiratoryRate": 16, "rrStatus": "stable",
            "oxygenSaturation": 98, "spo2Status": "stable",
            "systolicBP": 120, "bpStatus": "stable",
            "pulse": 72, "pulseStatus": "stable",
            "temperature": 36.8, "tempStatus": "stable",
        }

    return {
        "id": patient_id,
        "bedNumber": meta["bedNumber"],
        "patientName": meta["patientName"],
        "demographics": meta["demographics"],
        "ward": meta["ward"],
        "department": meta["department"],
        "currentScore": score,
        "tier": tier,
        "trend": overall_trend,
        "whyOneLine": why_one_line,
        "lastUpdated": "Just now",
        "vitals": vitals_obj,
        "alerts": [
            {"time": "Recent", "event": f"NEWS2 {score}", "tier": tier, "details": why_one_line}
        ] if tier in ["high", "medium"] else []
    }


@router.get("", summary="Get all ward patients with live vitals and calculated NEWS2 scores")
async def list_patients() -> List[Dict[str, Any]]:
    now = time.time()
    if _PATIENTS_CACHE["data"] and (now - _PATIENTS_CACHE["timestamp"]) < 15.0:
        return _PATIENTS_CACHE["data"]

    tasks = [_fetch_and_summarize_patient(pid) for pid in PATIENT_REGISTRY.keys()]
    patients = list(await asyncio.gather(*tasks))
    _PATIENTS_CACHE["data"] = patients
    _PATIENTS_CACHE["timestamp"] = now
    return patients


@router.get("/{patient_id}", summary="Get single patient summary")
async def get_patient(patient_id: str) -> Dict[str, Any]:
    # Support lookup by bedNumber e.g. "4B-07" or patient_id e.g. "P007"
    target_id = patient_id
    if "-" in patient_id:
        for pid, meta in PATIENT_REGISTRY.items():
            if meta["bedNumber"].lower() == patient_id.lower():
                target_id = pid
                break

    return await _fetch_and_summarize_patient(target_id)
