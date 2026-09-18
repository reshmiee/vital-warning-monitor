from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
import sys, os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.schemas import (
    PatientInferenceRequest, InferenceResponse,
    PerMinuteScore, FeatureContribution,
    PatientTrend, VitalForecasts, News2Forecast,
)
from backend.model_loader import get_predictor
from backend.supabase_client import fetch_recent_vitals
from model.inference import DeteriorationRiskPredictor, run_inference, _payload_to_internal_df
from model.forecast import run_full_forecast
import httpx

router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post(
    "/run",
    response_model=InferenceResponse,
    summary="Run deterioration inference, 15-min vital & NEWS2 forecasts, and trajectory trend for a patient",
    description=(
        "Accepts a patient_id, fetches the last 30 minutes of vitals from Supabase, and returns:\n"
        "1. Trained XGBoost deterioration prediction (risk_score, alert, risk_tier, per_minute_scores)\n"
        "2. SHAP feature contributions explaining what drove the score\n"
        "3. 15-minute forward forecasts for all 5 vitals with clinical danger zones (NORMAL, WARNING, DANGER)\n"
        "4. 15-minute forward NEWS2 forecast categorized into SAFE, MONITOR, or CRITICAL zones\n"
        "5. Patient trajectory classification (IMPROVING / STABLE / WORSENING) with clinical explanation"
    ),
)
async def run_prediction(
    body: PatientInferenceRequest,
    predictor: DeteriorationRiskPredictor = Depends(get_predictor),
) -> InferenceResponse:
    # -- Step 1: fetch vitals from Supabase -----------------------------------
    try:
        readings = await fetch_recent_vitals(body.patient_id, minutes=body.minutes)
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
            detail=f"No vitals found for patient '{body.patient_id}' in the last {body.minutes} minutes.",
        )

    # -- Step 2: run model inference & SHAP explanation ----------------------
    payload = {
        "patient_id": body.patient_id,
        "window_minutes": body.minutes,
        "readings": readings,
    }
    try:
        result = run_inference(payload, predictor=predictor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    # -- Step 3: run 15-minute VAR forecasts, NEWS2 trajectory & trend -------
    try:
        vitals_df = _payload_to_internal_df(payload)
        forecast_result = run_full_forecast(vitals_df)
    except Exception as exc:
        # Graceful fallback: model predictions still return even if forecasting encounters an issue
        forecast_result = None

    # -- Step 4: package full response ---------------------------------------
    trend_obj = PatientTrend(**forecast_result["trend"]) if forecast_result else None
    vital_fc_obj = VitalForecasts(**forecast_result["vital_forecasts"]) if forecast_result else None
    news2_fc_obj = News2Forecast(**forecast_result["news2_forecast"]) if forecast_result else None

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
        trend=trend_obj,
        vital_forecasts=vital_fc_obj,
        news2_forecast=news2_fc_obj,
    )