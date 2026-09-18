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
3. Standalone CLI demo simulating real-time patient monitoring and triage.
"""

from __future__ import annotations
import json
import os
import sys
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from xgboost import XGBClassifier

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
        # Ensure row alignment with feat_df
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
    [Rank, PatientCaseID, Minute, RiskScore, RiskTier, Alert, PulseRate, SpO2, SystolicBP, RespRate, Temperature]
    """
    if predictor is None:
        predictor = DeteriorationRiskPredictor()

    if at_minute is not None:
        # Filter data up to at_minute for all patients so trailing windows can be computed properly
        sub_df = vitals_df[vitals_df["Minute"] <= at_minute].copy()
    else:
        sub_df = vitals_df.copy()

    # Predict risk on the window
    scored_df = predictor.predict_risk(sub_df)

    if at_minute is not None:
        # Select exact minute row for each patient
        current_rows = scored_df[scored_df["Minute"] == at_minute].copy()
    else:
        # Select latest available minute for each patient
        idx_latest = scored_df.groupby("PatientCaseID")["Minute"].idxmax()
        current_rows = scored_df.loc[idx_latest].copy()

    if current_rows.empty:
        raise ValueError(f"No patient vitals found at minute {at_minute}.")

    # Sort descending by risk score
    ranked = current_rows.sort_values(by="risk_score", ascending=False).reset_index(drop=True)
    ranked["triage_rank"] = ranked.index + 1

    display_cols = [
        "triage_rank",
        "PatientCaseID",
        "Minute",
        "risk_score",
        "risk_tier",
        "deterioration_alert",
        "PulseRate",
        "SpO2",
        "SystolicBP",
        "RespRate",
        "Temperature",
    ]
    return ranked[display_cols]


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

    # Also show scoring on the latest available observation for each patient
    print("\nEvaluating latest available patient state across all cases:")
    latest_triage = rank_patients_by_risk(df, at_minute=None, predictor=predictor)
    latest_fmt = latest_triage.copy()
    latest_fmt["risk_score"] = latest_fmt["risk_score"].map(lambda x: f"{x * 100:5.1f}%")
    print(latest_fmt.to_string(index=False))


if __name__ == "__main__":
    main()
