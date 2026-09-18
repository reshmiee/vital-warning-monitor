"""
Vital Signs Forecasting and Trend Assessment Module
====================================================
Provides three independent capabilities on top of the trained inference pipeline:

1. forecast_vitals_15min(vitals_df)
   Fits a fresh VAR model on the full 30-minute window and generates
   15-step-ahead forecasts for all 5 vitals.  Returns per-minute predicted
   values with clinical zone labels (NORMAL / WARNING / DANGER).

2. forecast_news2_15min(vital_fc_rows)
   Applies the standard NEWS2 scoring formula to each of the 15 forecast
   rows and classifies them into SAFE / MONITOR / CRITICAL zones.

3. classify_patient_trend(vitals_df, feat_df)
   Compares the first and second halves of the 30-minute window using
   NEWS2 trajectory, individual vital slopes, and VAR residual behaviour
   to label the patient as IMPROVING / STABLE / WORSENING and generates
   a plain-English explanation.

All functions are pure (no model weights needed) except the VAR fitting
which is done fresh on the input window.
"""

from __future__ import annotations
import warnings
from typing import Any, Dict, List, Tuple
import numpy as np
import pandas as pd
from statsmodels.tsa.api import VAR

import sys, os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.features import VITAL_COLS, compute_news2_score

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# ---------------------------------------------------------------------------
# Clinical zone definitions per vital
# ---------------------------------------------------------------------------

VITAL_ZONES: Dict[str, List[Dict]] = {
    "PulseRate": [
        {"label": "DANGER",  "cond": lambda v: v < 40 or v > 130},
        {"label": "WARNING", "cond": lambda v: (40 <= v <= 50) or (111 <= v <= 130)},
        {"label": "NORMAL",  "cond": lambda v: True},
    ],
    "SpO2": [
        {"label": "DANGER",  "cond": lambda v: v < 92},
        {"label": "WARNING", "cond": lambda v: 92 <= v <= 95},
        {"label": "NORMAL",  "cond": lambda v: True},
    ],
    "SystolicBP": [
        {"label": "DANGER",  "cond": lambda v: v < 90 or v >= 180},
        {"label": "WARNING", "cond": lambda v: (90 <= v <= 100) or (160 <= v < 180)},
        {"label": "NORMAL",  "cond": lambda v: True},
    ],
    "RespRate": [
        {"label": "DANGER",  "cond": lambda v: v < 9 or v > 24},
        {"label": "WARNING", "cond": lambda v: (9 <= v <= 11) or (21 <= v <= 24)},
        {"label": "NORMAL",  "cond": lambda v: True},
    ],
    "Temperature": [
        {"label": "DANGER",  "cond": lambda v: v < 35.0 or v >= 39.1},
        {"label": "WARNING", "cond": lambda v: (35.0 <= v <= 36.0) or (38.1 <= v <= 39.0)},
        {"label": "NORMAL",  "cond": lambda v: True},
    ],
}

# NEWS2 clinical zones
NEWS2_ZONES = [
    {"label": "CRITICAL", "min": 7,  "description": "Urgent clinical response required"},
    {"label": "MONITOR",  "min": 5,  "description": "Increase monitoring frequency"},
    {"label": "SAFE",     "min": 0,  "description": "Low clinical risk"},
]


def _get_vital_zone(vital: str, value: float) -> str:
    for rule in VITAL_ZONES.get(vital, []):
        if rule["cond"](value):
            return rule["label"]
    return "NORMAL"


def _get_news2_zone(score: int) -> str:
    for rule in NEWS2_ZONES:
        if score >= rule["min"]:
            return rule["label"]
    return "SAFE"


# ---------------------------------------------------------------------------
# VAR fitting helper (mirrors features.py logic)
# ---------------------------------------------------------------------------

def _fit_var(data: np.ndarray, max_lag_cap: int = 10):
    """Fit VAR on data array (n_obs x k_vars). Returns fitted result or None."""
    n_obs, k_vars = data.shape
    max_p_allowed = max(1, (n_obs - 2) // (k_vars + 1))
    max_p = min(max_lag_cap, max_p_allowed)
    stds = np.std(data, axis=0)
    trend = "n" if np.any(stds < 1e-5) else "c"
    try:
        model = VAR(data)
        sel = model.select_order(maxlags=max_p, trend=trend)
        best_p = max(1, min(int(sel.aic) if sel.aic else 1, max_p))
        return model.fit(maxlags=best_p, trend=trend)
    except Exception:
        try:
            return VAR(data).fit(maxlags=1, trend="n")
        except Exception:
            return None


# ---------------------------------------------------------------------------
# 1. Vital forecasts: 15 steps ahead
# ---------------------------------------------------------------------------

def forecast_vitals_15min(
    vitals_df: pd.DataFrame,
    steps: int = 15,
) -> Dict[str, Any]:
    """
    Fits a VAR model on the full input window and generates `steps`-step-ahead
    forecasts for all 5 vitals.

    Parameters
    ----------
    vitals_df : DataFrame with columns [PatientCaseID, Minute, PulseRate, SpO2,
                SystolicBP, RespRate, Temperature] — the 30-minute window.
    steps     : forecast horizon (default 15).

    Returns
    -------
    dict:
      vitals: {
        "PulseRate": [
          {"minute_offset": 1, "predicted_minute": int, "value": float, "zone": str},
          ...
        ],
        ...
      }
      var_fit_quality: "VAR" | "PERSISTENCE_FALLBACK"
    """
    group = vitals_df.sort_values("Minute").copy().reset_index(drop=True)
    last_minute = int(group["Minute"].iloc[-1])
    data = group[VITAL_COLS].values.astype(float)

    var_result = _fit_var(data)
    quality = "VAR"

    if var_result is not None:
        try:
            k_ar = var_result.k_ar
            lags_input = data[-k_ar:] if k_ar > 0 else data[-1:]
            fc_raw = var_result.forecast(lags_input, steps=steps)  # shape (steps, 5)
        except Exception:
            fc_raw = np.tile(data[-1], (steps, 1))
            quality = "PERSISTENCE_FALLBACK"
    else:
        fc_raw = np.tile(data[-1], (steps, 1))
        quality = "PERSISTENCE_FALLBACK"

    result: Dict[str, Any] = {"var_fit_quality": quality, "vitals": {}}
    for vi, vital in enumerate(VITAL_COLS):
        rows = []
        for step in range(steps):
            val = float(fc_raw[step, vi])
            rows.append({
                "minute_offset": step + 1,
                "predicted_minute": last_minute + step + 1,
                "value": round(val, 4),
                "zone": _get_vital_zone(vital, val),
            })
        result["vitals"][vital] = rows

    return result


# ---------------------------------------------------------------------------
# 2. NEWS2 forecast: compute NEWS2 for each of the 15 forecast rows
# ---------------------------------------------------------------------------

def forecast_news2_15min(
    vital_fc: Dict[str, Any],
    current_vitals_row: Dict[str, float],
) -> Dict[str, Any]:
    """
    Computes NEWS2 score for each of the 15 forecast steps and for
    the current (most recent) minute.

    Parameters
    ----------
    vital_fc          : output of forecast_vitals_15min()
    current_vitals_row: dict of {vital: current_value} for the last observed minute

    Returns
    -------
    dict:
      current_score : int
      current_zone  : str
      forecast      : list of {minute_offset, predicted_minute, news2_score, zone}
      peak_score    : int
      peak_zone     : str
      peak_at_offset: int
      zone_summary  : str
    """
    current_score = compute_news2_score(current_vitals_row)
    current_zone = _get_news2_zone(current_score)

    steps = len(vital_fc["vitals"][VITAL_COLS[0]])
    forecast_rows = []
    for step_idx in range(steps):
        row = {vital: vital_fc["vitals"][vital][step_idx]["value"] for vital in VITAL_COLS}
        score = compute_news2_score(row)
        zone = _get_news2_zone(score)
        forecast_rows.append({
            "minute_offset": step_idx + 1,
            "predicted_minute": vital_fc["vitals"][VITAL_COLS[0]][step_idx]["predicted_minute"],
            "news2_score": score,
            "zone": zone,
        })

    scores = [r["news2_score"] for r in forecast_rows]
    peak_score = max(scores)
    peak_offset = scores.index(peak_score) + 1
    peak_zone = _get_news2_zone(peak_score)

    # Zone summary sentence
    zones_hit = set(r["zone"] for r in forecast_rows)
    if "CRITICAL" in zones_hit:
        summary = f"Patient is forecast to enter CRITICAL zone (NEWS2 >= 7) within 15 minutes. Urgent assessment recommended."
    elif "MONITOR" in zones_hit:
        summary = f"Patient is forecast to reach MONITOR zone (NEWS2 5-6) within 15 minutes. Increase observation frequency."
    else:
        summary = f"Patient is expected to remain in SAFE zone (NEWS2 0-4) for the next 15 minutes."

    return {
        "current_score": current_score,
        "current_zone": current_zone,
        "forecast": forecast_rows,
        "peak_score": peak_score,
        "peak_zone": peak_zone,
        "peak_at_minute_offset": peak_offset,
        "zone_summary": summary,
    }


# ---------------------------------------------------------------------------
# 3. Trend classification: IMPROVING / STABLE / WORSENING
# ---------------------------------------------------------------------------

_VITAL_DIRECTIONS = {
    "PulseRate":   {"worsening_slope": 0.4,  "improving_slope": -0.4,  "unit": "bpm/min",    "direction_label": lambda s: "RISING" if s > 0.1 else ("FALLING" if s < -0.1 else "STABLE")},
    "SpO2":        {"worsening_slope": -0.1, "improving_slope": 0.1,   "unit": "%/min",      "direction_label": lambda s: "FALLING" if s < -0.05 else ("RISING" if s > 0.05 else "STABLE")},
    "SystolicBP":  {"worsening_slope": -0.5, "improving_slope": 0.5,   "unit": "mmHg/min",  "direction_label": lambda s: "FALLING" if s < -0.2 else ("RISING" if s > 0.2 else "STABLE")},
    "RespRate":    {"worsening_slope": 0.2,  "improving_slope": -0.2,  "unit": "br/min",    "direction_label": lambda s: "RISING" if s > 0.1 else ("FALLING" if s < -0.1 else "STABLE")},
    "Temperature": {"worsening_slope": 0.03, "improving_slope": -0.03, "unit": "degC/min",  "direction_label": lambda s: "RISING" if s > 0.01 else ("FALLING" if s < -0.01 else "STABLE")},
}

def _ols_slope(series: np.ndarray) -> float:
    """OLS slope of a 1-D array over integer time steps."""
    n = len(series)
    if n < 2:
        return 0.0
    x = np.arange(n, dtype=float)
    x_mean = x.mean()
    denom = np.sum((x - x_mean) ** 2)
    if denom == 0:
        return 0.0
    return float(np.sum((x - x_mean) * (series - series.mean())) / denom)


def classify_patient_trend(vitals_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Classifies the patient trajectory over the observed window as
    IMPROVING / STABLE / WORSENING and generates a plain-English explanation.

    Strategy:
      - Compute NEWS2 at every observed minute
      - Split window into first half / second half
      - Compare half-means of NEWS2 and each vital
      - Compute OLS slope of NEWS2 and each vital over the last 15 minutes
      - Score worsening vs improving signals and vote

    Returns
    -------
    dict:
      direction     : "IMPROVING" | "STABLE" | "WORSENING"
      confidence    : "HIGH" | "MODERATE" | "LOW"
      explanation   : str
      news2_current : int
      news2_start   : int
      news2_delta   : int
      vital_trends  : {vital: {slope_15min, direction, current, start, delta}}
    """
    group = vitals_df.sort_values("Minute").copy().reset_index(drop=True)

    # Compute NEWS2 at every minute
    news2_series = group[VITAL_COLS].apply(compute_news2_score, axis=1).values
    news2_start = int(news2_series[0])
    news2_current = int(news2_series[-1])
    news2_delta = news2_current - news2_start

    # NEWS2 slope over last 15 obs (or full window if shorter)
    tail_15 = news2_series[-15:] if len(news2_series) >= 15 else news2_series
    news2_slope = _ols_slope(tail_15.astype(float))

    # Per-vital slopes and deltas over last 15 min
    vital_trends: Dict[str, Any] = {}
    worsening_signals = 0
    improving_signals = 0
    vital_clauses = []

    for vital in VITAL_COLS:
        vals = group[vital].values.astype(float)
        tail = vals[-15:] if len(vals) >= 15 else vals
        slope = _ols_slope(tail)
        current = float(vals[-1])
        start = float(vals[0])
        delta = round(current - start, 3)

        cfg = _VITAL_DIRECTIONS[vital]
        direction = cfg["direction_label"](slope)

        # Is this direction clinically worsening or improving?
        is_worsening = False
        is_improving = False
        if vital == "PulseRate":
            is_worsening = slope > cfg["worsening_slope"]
            is_improving = slope < cfg["improving_slope"]
        elif vital == "SpO2":
            is_worsening = slope < cfg["worsening_slope"]
            is_improving = slope > cfg["improving_slope"]
        elif vital == "SystolicBP":
            is_worsening = slope < cfg["worsening_slope"]
            is_improving = slope > cfg["improving_slope"]
        elif vital == "RespRate":
            is_worsening = slope > cfg["worsening_slope"]
            is_improving = slope < cfg["improving_slope"]
        elif vital == "Temperature":
            is_worsening = abs(slope) > cfg["worsening_slope"]
            is_improving = abs(slope) < 0.005

        if is_worsening:
            worsening_signals += 1
        if is_improving:
            improving_signals += 1

        vital_trends[vital] = {
            "slope_15min": round(slope, 5),
            "direction": direction,
            "current": round(current, 3),
            "start": round(start, 3),
            "delta": delta,
        }

        # Clause for explanation
        sign = "+" if delta >= 0 else ""
        vital_clauses.append(f"{vital}: {direction} ({sign}{delta:.2f} over window, slope {slope:+.3f} {cfg['unit']})")

    # Vote
    total_signals = worsening_signals + improving_signals
    if news2_slope > 0.15 or worsening_signals >= 3:
        direction = "WORSENING"
        confidence = "HIGH" if (news2_slope > 0.3 or worsening_signals >= 4) else "MODERATE"
    elif news2_slope < -0.15 or improving_signals >= 3:
        direction = "IMPROVING"
        confidence = "HIGH" if (news2_slope < -0.3 or improving_signals >= 4) else "MODERATE"
    elif news2_delta > 2:
        direction = "WORSENING"
        confidence = "MODERATE"
    elif news2_delta < -2:
        direction = "IMPROVING"
        confidence = "MODERATE"
    else:
        direction = "STABLE"
        confidence = "HIGH" if abs(news2_slope) < 0.05 else "MODERATE"

    # Build explanation
    news2_clause = f"NEWS2 score moved from {news2_start} to {news2_current} (delta {news2_delta:+d}, slope {news2_slope:+.3f}/min over last 15 min)."
    vital_summary = " | ".join(vital_clauses)
    direction_word = {"WORSENING": "deteriorating", "IMPROVING": "recovering", "STABLE": "stable"}[direction]
    explanation = f"Patient is {direction_word} ({confidence.lower()} confidence). {news2_clause} Vital trends: {vital_summary}."

    return {
        "direction": direction,
        "confidence": confidence,
        "explanation": explanation,
        "news2_current": news2_current,
        "news2_start": news2_start,
        "news2_delta": news2_delta,
        "vital_trends": vital_trends,
    }


# ---------------------------------------------------------------------------
# Top-level: run everything together
# ---------------------------------------------------------------------------

def run_full_forecast(vitals_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Runs the complete forecasting + trend suite on a normalised vitals DataFrame.
    Designed to be called from the backend route alongside run_inference().

    Returns dict with keys:
      trend          : output of classify_patient_trend()
      vital_forecasts: output of forecast_vitals_15min()
      news2_forecast : output of forecast_news2_15min()
    """
    group = vitals_df.sort_values("Minute").copy().reset_index(drop=True)
    last_row = group[VITAL_COLS].iloc[-1].to_dict()

    trend = classify_patient_trend(group)
    vital_fc = forecast_vitals_15min(group, steps=15)
    news2_fc = forecast_news2_15min(vital_fc, last_row)

    return {
        "trend": trend,
        "vital_forecasts": vital_fc,
        "news2_forecast": news2_fc,
    }