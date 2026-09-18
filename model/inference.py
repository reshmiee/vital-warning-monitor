"""
Real-time Inference and Patient Risk Ranking Module
===================================================
Provides:
1. DeteriorationRiskPredictor: loads the trained XGBoost model and configuration,
   processes streaming multi-patient vitals through feature extraction, and computes
   calibrated risk probabilities (0.0 - 1.0).
2. rank_patients_by_risk: evaluates current patient vitals at a target minute,
   computes live deterioration probabilities, and returns a prioritized clinical
   triage ranking across all monitored patients.
3. run_inference(payload): main public function — accepts the raw DB payload JSON
   and returns a typed result dict. This is what the backend route calls.
4. Standalone CLI demo simulating real-time patient monitoring and triage.
"""

from __future__ import annotations
import json
import os
import sys
import warnings
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from xgboost import XGBClassifier

try:
    import shap
    _SHAP_AVAILABLE = True
except ImportError:
    _SHAP_AVAILABLE = False

# Ensure workspace root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.features import engineer_features, VITAL_COLS


class DeteriorationRiskPredictor:
    """
    Online & Batch Clinical Deterioration Risk Predictor.
    Loads trained XGBoost model and configuration to score incoming vitals data.
    """

    def __init__(
        self,
        model_path: str = "model/xgboost_deterioration_model.json",
        config_path: str = "model/model_config.json",
    ):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}. Train model first.")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found at {config_path}. Train model first.")

        with open(config_path, "r") as f:
            self.config = json.load(f)

        self.feature_names = self.config["feature_names"]
        self.optimal_threshold = self.config.get("optimal_threshold", 0.5)

        self.model = XGBClassifier()
        self.model.load_model(model_path)

        # Build SHAP explainer once — TreeExplainer is fast for XGBoost
        self._shap_explainer = None
        if _SHAP_AVAILABLE:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                self._shap_explainer = shap.TreeExplainer(self.model)

    def compute_shap(self, X_row: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Computes SHAP values for a single feature row (the final minute of the window).
        Returns a list of dicts sorted by absolute SHAP value descending:
            {
              "rank":            int,
              "feature":         str,
              "feature_value":   float,   # actual computed value of this feature
              "shap_value":      float,   # signed contribution to log-odds
              "abs_shap_value":  float,
            }
        Returns an empty list if shap is not installed.
        """
        if self._shap_explainer is None:
            return []

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            sv = self._shap_explainer.shap_values(X_row)

        # shap >= 0.50: returns ndarray of shape (n_samples, n_features)
        # shap <  0.50: returns list [neg_class_array, pos_class_array]
        sv_arr = np.array(sv)
        if sv_arr.ndim == 3:
            # old list-of-arrays packed into ndarray → take positive class
            row_vals = sv_arr[1][0]
        elif sv_arr.ndim == 2:
            # new API: shape (n_samples, n_features)
            row_vals = sv_arr[0]
        else:
            row_vals = sv_arr.flatten()

        feature_row = X_row.iloc[0]
        contributions = []
        for feat, shap_val, feat_val in zip(self.feature_names, row_vals, feature_row.values):
            contributions.append(
                {
                    "feature": feat,
                    "feature_value": round(float(feat_val), 6),
                    "shap_value": round(float(shap_val), 6),
                    "abs_shap_value": round(abs(float(shap_val)), 6),
                }
            )

        contributions.sort(key=lambda x: x["abs_shap_value"], reverse=True)
        for i, c in enumerate(contributions):
            c["rank"] = i + 1

        return contributions

    def predict_risk(self, vitals_df: pd.DataFrame) -> pd.DataFrame:
        """
        Takes raw/streamed vitals dataframe:
        [PatientCaseID, Minute, PulseRate, SpO2, SystolicBP, RespRate, Temperature]
        Computes rolling VAR and multi-scale features online without future label leakage,
        and returns the input rows augmented with:
        - risk_score: float probability [0.0, 1.0]
        - deterioration_alert: bool (risk_score >= optimal_threshold)
        - risk_tier: 'LOW', 'MODERATE', 'HIGH', or 'CRITICAL'
        """
        required_cols = ["PatientCaseID", "Minute"] + VITAL_COLS
        for col in required_cols:
            if col not in vitals_df.columns:
                raise ValueError(f"Missing required column '{col}' in input vitals dataframe.")

        # Compute engineered features without target label
        feat_df = engineer_features(vitals_df, include_label=False)

        # Ensure all model feature columns exist
        for col in self.feature_names:
            if col not in feat_df.columns:
                feat_df[col] = 0.0

        X = feat_df[self.feature_names].copy()
        risk_probs = self.model.predict_proba(X)[:, 1]

        # Attach predictions
        output_df = vitals_df.copy().reset_index(drop=True)
        output_df["risk_score"] = risk_probs
        output_df["deterioration_alert"] = risk_probs >= self.optimal_threshold

        def get_risk_tier(score: float) -> str:
            if score >= 0.70:
                return "CRITICAL"
            elif score >= self.optimal_threshold:
                return "HIGH"
            elif score >= 0.15:
                return "MODERATE"
            else:
                return "LOW"

        output_df["risk_tier"] = output_df["risk_score"].apply(get_risk_tier)
        return output_df


def rank_patients_by_risk(
    vitals_df: pd.DataFrame,
    at_minute: Optional[int] = None,
    predictor: Optional[DeteriorationRiskPredictor] = None,
) -> pd.DataFrame:
    """
    Ranks all monitored patients at a given timestamp (or their latest available minute)
    by deterioration risk score in descending order.

    Returns a prioritized triage DataFrame:
    [triage_rank, PatientCaseID, Minute, risk_score, risk_tier, deterioration_alert,
     PulseRate, SpO2, SystolicBP, RespRate, Temperature]
    """
    if predictor is None:
        predictor = DeteriorationRiskPredictor()

    if at_minute is not None:
        sub_df = vitals_df[vitals_df["Minute"] <= at_minute].copy()
    else:
        sub_df = vitals_df.copy()

    scored_df = predictor.predict_risk(sub_df)

    if at_minute is not None:
        current_rows = scored_df[scored_df["Minute"] == at_minute].copy()
    else:
        idx_latest = scored_df.groupby("PatientCaseID")["Minute"].idxmax()
        current_rows = scored_df.loc[idx_latest].copy()

    if current_rows.empty:
        raise ValueError(f"No patient vitals found at minute {at_minute}.")

    ranked = current_rows.sort_values(by="risk_score", ascending=False).reset_index(drop=True)
    ranked["triage_rank"] = ranked.index + 1

    display_cols = [
        "triage_rank", "PatientCaseID", "Minute", "risk_score", "risk_tier",
        "deterioration_alert", "PulseRate", "SpO2", "SystolicBP", "RespRate", "Temperature",
    ]
    return ranked[display_cols]


# ---------------------------------------------------------------------------
# DB-payload → internal column name mapping
# The DB sends snake_case keys; the training pipeline used PascalCase column names.
# ---------------------------------------------------------------------------
_READING_KEY_MAP: Dict[str, str] = {
    "pulse_rate":  "PulseRate",
    "spo2":        "SpO2",
    "systolic_bp": "SystolicBP",
    "resp_rate":   "RespRate",
    "temperature": "Temperature",
    "minute":      "Minute",
}


def _payload_to_internal_df(payload: Dict[str, Any]) -> pd.DataFrame:
    """
    Converts the raw DB payload dict into the internal DataFrame shape expected by
    engineer_features():
        PatientCaseID | Minute | PulseRate | SpO2 | SystolicBP | RespRate | Temperature
    """
    patient_id: str = payload["patient_id"]
    readings: List[Dict[str, Any]] = payload["readings"]

    rows = []
    for reading in readings:
        row: Dict[str, Any] = {"PatientCaseID": patient_id}
        for db_key, internal_key in _READING_KEY_MAP.items():
            row[internal_key] = reading[db_key]
        rows.append(row)

    df = pd.DataFrame(rows)
    df = df.sort_values("Minute").reset_index(drop=True)

    for col in VITAL_COLS:
        df[col] = df[col].astype(float)
    df["Minute"] = df["Minute"].astype(int)

    return df


# ---------------------------------------------------------------------------
# Public inference entry point – called by the backend route
# ---------------------------------------------------------------------------

def run_inference(
    payload: Dict[str, Any],
    predictor: Optional[DeteriorationRiskPredictor] = None,
) -> Dict[str, Any]:
    """
    Full inference pipeline from raw DB payload to structured result.

    Parameters
    ----------
    payload   : dict — the exact JSON body received from the backend / DB.
                Expected shape:
                {
                  "patient_id": str,
                  "window_minutes": int,
                  "readings": [
                    {
                      "minute": int,
                      "ts": str,
                      "pulse_rate": float,
                      "spo2": float,
                      "systolic_bp": float,
                      "resp_rate": float,
                      "temperature": float,
                      "warning_label": bool
                    },
                    ...
                  ]
                }

    predictor : optional pre-loaded DeteriorationRiskPredictor instance.
                Pass a singleton here in production to avoid reloading the model
                on every request. If None, a fresh instance is created from disk.

    Returns
    -------
    dict:
        patient_id            : str
        evaluated_at_minute   : int   — last minute in the sliding window
        risk_score            : float — deterioration probability at the final minute [0.0, 1.0]
        deterioration_alert   : bool  — True when risk_score >= optimal_threshold
        risk_tier             : str   — "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
        optimal_threshold     : float
        per_minute_scores     : list[dict] — per-minute breakdown for all input readings
        feature_contributions : list[dict] — all 191 features sorted by |SHAP| descending
                                  each entry: {rank, feature, feature_value, shap_value, abs_shap_value}
        feature_values        : dict[str, float] — raw computed value of every feature at the final minute
    """
    if predictor is None:
        predictor = DeteriorationRiskPredictor()

    # ── Step 1: map DB payload → internal DataFrame ──────────────────────────
    vitals_df = _payload_to_internal_df(payload)

    # ── Step 2: feature engineering — identical pipeline to training ─────────
    feat_df = engineer_features(vitals_df, include_label=False)

    # ── Step 3: align to model feature list and score ────────────────────────
    for col in predictor.feature_names:
        if col not in feat_df.columns:
            feat_df[col] = 0.0

    X = feat_df[predictor.feature_names].copy().astype(float)
    risk_probs: np.ndarray = predictor.model.predict_proba(X)[:, 1]

    # ── Step 4: build per-minute result list ─────────────────────────────────
    def _tier(score: float) -> str:
        if score >= 0.70:
            return "CRITICAL"
        elif score >= predictor.optimal_threshold:
            return "HIGH"
        elif score >= 0.15:
            return "MODERATE"
        return "LOW"

    per_minute_scores: List[Dict[str, Any]] = []
    for idx in range(len(feat_df)):
        score = float(risk_probs[idx])
        per_minute_scores.append(
            {
                "minute": int(feat_df["Minute"].iloc[idx]),
                "risk_score": round(score, 6),
                "deterioration_alert": bool(score >= predictor.optimal_threshold),
                "risk_tier": _tier(score),
            }
        )

    # ── Step 5: summary at the final (latest) minute of the window ───────────
    last_score = float(risk_probs[-1])
    last_minute = int(feat_df["Minute"].iloc[-1])

    # ── Step 6: SHAP feature contributions for the final minute ─────────────
    X_last = X.iloc[[-1]]  # single-row DataFrame, shape (1, 191)
    feature_contributions = predictor.compute_shap(X_last)

    # ── Step 7: raw feature values dict for the final minute ─────────────────
    feature_values: Dict[str, float] = {
        feat: round(float(X_last[feat].iloc[0]), 6)
        for feat in predictor.feature_names
    }

    return {
        "patient_id": payload["patient_id"],
        "evaluated_at_minute": last_minute,
        "risk_score": round(last_score, 6),
        "deterioration_alert": bool(last_score >= predictor.optimal_threshold),
        "risk_tier": _tier(last_score),
        "optimal_threshold": round(predictor.optimal_threshold, 6),
        "per_minute_scores": per_minute_scores,
        "feature_contributions": feature_contributions,
        "feature_values": feature_values,
    }


def main():
    raw_path = os.path.join("data", "raw", "combined_5_patients_vitals.csv")
    print(f"Loading vitals stream from {raw_path} for live inference simulation...")
    df = pd.read_csv(raw_path)

    predictor = DeteriorationRiskPredictor()
    print(f"Loaded trained deterioration model. Decision alert threshold: {predictor.optimal_threshold:.3f}")

    # Simulate ranking at timestamp t = 100
    target_minute = 100
    print(f"\nEvaluating patient deterioration risk across ICU cohort at Minute = {target_minute}...")
    triage_table = rank_patients_by_risk(df, at_minute=target_minute, predictor=predictor)

    print("\n" + "=" * 95)
    print(f" PATIENT DETERIORATION RISK TRIAGE DASHBOARD (Minute {target_minute})")
    print("=" * 95)
    formatted = triage_table.copy()
    formatted["risk_score"] = formatted["risk_score"].map(lambda x: f"{x * 100:5.1f}%")
    print(formatted.to_string(index=False))
    print("=" * 95)

    print("\nEvaluating latest available patient state across all cases:")
    latest_triage = rank_patients_by_risk(df, at_minute=None, predictor=predictor)
    latest_fmt = latest_triage.copy()
    latest_fmt["risk_score"] = latest_fmt["risk_score"].map(lambda x: f"{x * 100:5.1f}%")
    print(latest_fmt.to_string(index=False))


if __name__ == "__main__":
    main()
