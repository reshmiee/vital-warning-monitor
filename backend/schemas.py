from __future__ import annotations
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class VitalReading(BaseModel):
    minute: int
    ts: Optional[str] = None
    pulse_rate: float
    spo2: float
    systolic_bp: float
    resp_rate: float
    temperature: float
    warning_label: Optional[bool] = None


class PatientInferenceRequest(BaseModel):
    patient_id: str = Field(..., description="Unique patient identifier (e.g. P001).")


class InferenceRequest(BaseModel):
    patient_id: str
    window_minutes: int = 30
    readings: List[VitalReading]


class PerMinuteScore(BaseModel):
    minute: int
    risk_score: float
    deterioration_alert: bool
    risk_tier: str


class FeatureContribution(BaseModel):
    rank: int = Field(..., description="1 = most influential feature.")
    feature: str = Field(..., description="Engineered feature name.")
    feature_value: float = Field(..., description="Computed value of this feature at the final minute.")
    shap_value: float = Field(..., description="Signed SHAP contribution to log-odds. Positive pushes toward deterioration.")
    abs_shap_value: float = Field(..., description="Absolute magnitude of the SHAP contribution.")


# ---------------------------------------------------------------------------
# Forecasting & Trend schemas (Next 15 minutes)
# ---------------------------------------------------------------------------

class VitalForecastStep(BaseModel):
    minute_offset: int = Field(..., description="Steps into the future (1..15).")
    predicted_minute: int = Field(..., description="Actual absolute minute index.")
    value: float = Field(..., description="Predicted vital value.")
    zone: str = Field(..., description="Clinical zone: NORMAL, WARNING, or DANGER.")


class VitalForecasts(BaseModel):
    var_fit_quality: str = Field(..., description="VAR or PERSISTENCE_FALLBACK.")
    vitals: Dict[str, List[VitalForecastStep]] = Field(
        ...,
        description="Forecast arrays for PulseRate, SpO2, SystolicBP, RespRate, Temperature.",
    )


class News2ForecastStep(BaseModel):
    minute_offset: int
    predicted_minute: int
    news2_score: int
    zone: str = Field(..., description="SAFE (0-4), MONITOR (5-6), or CRITICAL (>=7).")


class News2Forecast(BaseModel):
    current_score: int
    current_zone: str
    forecast: List[News2ForecastStep]
    peak_score: int
    peak_zone: str
    peak_at_minute_offset: int
    zone_summary: str


class VitalTrendDetail(BaseModel):
    slope_15min: float
    direction: str
    current: float
    start: float
    delta: float


class PatientTrend(BaseModel):
    direction: str = Field(..., description="IMPROVING, STABLE, or WORSENING.")
    confidence: str = Field(..., description="HIGH, MODERATE, or LOW.")
    explanation: str = Field(..., description="Clinical narrative explaining the patient trajectory.")
    news2_current: int
    news2_start: int
    news2_delta: int
    vital_trends: Dict[str, VitalTrendDetail]


# ---------------------------------------------------------------------------
# Full Combined Response
# ---------------------------------------------------------------------------

class InferenceResponse(BaseModel):
    patient_id: str
    evaluated_at_minute: int = Field(..., description="Last minute of the evaluated window.")
    risk_score: float = Field(..., description="Deterioration probability at final minute [0, 1].")
    deterioration_alert: bool = Field(..., description="True when risk_score >= optimal_threshold.")
    risk_tier: str = Field(..., description="LOW | MODERATE | HIGH | CRITICAL.")
    optimal_threshold: float
    per_minute_scores: List[PerMinuteScore]
    feature_contributions: List[FeatureContribution] = Field(
        default_factory=list,
        description="All 191 features ranked by absolute SHAP value descending.",
    )
    feature_values: Dict[str, float] = Field(
        default_factory=dict,
        description="Raw computed values of all 191 features at the final minute.",
    )
    trend: Optional[PatientTrend] = Field(
        None,
        description="Patient trajectory classification (IMPROVING / STABLE / WORSENING) with clinical explanation.",
    )
    vital_forecasts: Optional[VitalForecasts] = Field(
        None,
        description="15-minute forward forecasts for all 5 vitals with clinical danger zones.",
    )
    news2_forecast: Optional[News2Forecast] = Field(
        None,
        description="15-minute forward NEWS2 forecasts categorized into SAFE, MONITOR, or CRITICAL zones.",
    )