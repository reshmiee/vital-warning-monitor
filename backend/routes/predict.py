from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
import sys, os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.schemas import (
    PatientInferenceRequest, InferenceResponse,
    PerMinuteScore, FeatureContribution,
)
from backend.model_loader import get_predictor
from backend.supabase_client import fetch_recent_vitals
from model.inference import DeteriorationRiskPredictor, run_inference
import httpx

router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post(
    "/run",
    response_model=InferenceResponse,
    summary="Run deterioration-risk inference for a patient",
    description=(
        "Accepts a patient_id, fetches the last 30 minutes of vitals from Supabase, "
        "runs the full feature-engineering + XGBoost inference pipeline, and returns: "
        "risk score, alert flag, tier, per-minute breakdown, "
        "SHAP feature contributions (sorted by influence), and raw feature values."
    ),
)
async def run_prediction(
    body: PatientInferenceRequest,
    predictor: DeteriorationRiskPredictor = Depends(get_predictor),
) -> InferenceResponse:
    # -- Step 1: fetch vitals from Supabase -----------------------------------
    try:
        readings = await fetch_recent_vitals(body.patient_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase returned {exc.response.status_code}: {exc.response.text}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Supabase: {exc}")

    if not readings:
        raise HTTPException(
            status_code=404,
            detail=f"No vitals found for patient '{body.patient_id}' in the last 30 minutes.",
        )

    # -- Step 2: run inference (feature engineering + model + SHAP) -----------
    payload = {
        "patient_id": body.patient_id,
        "window_minutes": 30,
        "readings": readings,
    }
    try:
        result = run_inference(payload, predictor=predictor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    # -- Step 3: return typed response ----------------------------------------
    return InferenceResponse(
        patient_id=result["patient_id"],
        evaluated_at_minute=result["evaluated_at_minute"],
        risk_score=result["risk_score"],
        deterioration_alert=result["deterioration_alert"],
        risk_tier=result["risk_tier"],
        optimal_threshold=result["optimal_threshold"],
        per_minute_scores=[PerMinuteScore(**m) for m in result["per_minute_scores"]],
        feature_contributions=[
            FeatureContribution(**c) for c in result.get("feature_contributions", [])
        ],
        feature_values=result.get("feature_values", {}),
    )