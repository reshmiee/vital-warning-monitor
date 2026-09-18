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
    shap_value: float = Field(..., description="Signed SHAP contribution to the log-odds. Positive pushes toward deterioration.")
    abs_shap_value: float = Field(..., description="Absolute magnitude of the SHAP contribution.")


class InferenceResponse(BaseModel):
    patient_id: str
    evaluated_at_minute: int = Field(..., description="Last minute of the evaluated window.")
    risk_score: float = Field(..., description="Deterioration probability at the final minute [0, 1].")
    deterioration_alert: bool = Field(..., description="True when risk_score >= optimal_threshold.")
    risk_tier: str = Field(..., description="LOW | MODERATE | HIGH | CRITICAL.")
    optimal_threshold: float
    per_minute_scores: List[PerMinuteScore]
    feature_contributions: List[FeatureContribution] = Field(
        default_factory=list,
        description="All 191 engineered features sorted by absolute SHAP value descending. "
                    "Shows what drove the risk score at the final minute.",
    )
    feature_values: Dict[str, float] = Field(
        default_factory=dict,
        description="Raw computed value of every feature at the final minute, keyed by feature name.",
    )