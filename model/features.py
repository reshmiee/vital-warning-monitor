"""
Vital Signs Deterioration Prediction Pipeline - Feature Engineering Module
========================================================================
Performs:
1. Clinical label generation with configurable deterioration rules and forward lookahead window.
2. Rolling VAR (Vector Autoregression) multi-vital forecasting and residual tracking.
3. Multi-scale trailing window feature extraction (5, 15, 30 min).
4. Threshold breach tracking and danger-distance metrics.
5. Cross-vital composites (Shock Index, NEWS2 composite score, worsening count, max VAR residual).
6. Forward-safe imputation (expanding window / historical backfill) with zero future data leakage.
"""

from __future__ import annotations
import os
import warnings
from typing import Dict, List, Optional, Tuple, Callable
import numpy as np
import pandas as pd
from statsmodels.tsa.api import VAR

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

VITAL_COLS = ["PulseRate", "SpO2", "SystolicBP", "RespRate", "Temperature"]

DEFAULT_THRESHOLDS = {
    "SpO2_low": 92.0,
    "SystolicBP_low": 90.0,
    "PulseRate_high": 120.0,
    "RespRate_high": 24.0,
    "Temp_low": 36.0,
    "Temp_high": 38.0,
}


def compute_news2_score(row: pd.Series | Dict[str, float]) -> int:
    """
    Computes standard NEWS2 (National Early Warning Score 2) points based on 5 vitals:
    RespRate, SpO2, SystolicBP, PulseRate, Temperature.
    """
    score = 0
    rr = row.get("RespRate", 16.0)
    spo2 = row.get("SpO2", 98.0)
    sbp = row.get("SystolicBP", 120.0)
    pr = row.get("PulseRate", 75.0)
    temp = row.get("Temperature", 37.0)

    # Respiration Rate
    if rr <= 8 or rr >= 25:
        score += 3
    elif 21 <= rr <= 24:
        score += 2
    elif 9 <= rr <= 11:
        score += 1

    # SpO2
    if spo2 <= 91:
        score += 3
    elif 92 <= spo2 <= 93:
        score += 2
    elif 94 <= spo2 <= 95:
        score += 1

    # Systolic BP
    if sbp <= 90 or sbp >= 220:
        score += 3
    elif 91 <= sbp <= 100:
        score += 2
    elif 101 <= sbp <= 110:
        score += 1

    # Pulse Rate
    if pr <= 40 or pr >= 131:
        score += 3
    elif 111 <= pr <= 130:
        score += 2
    elif (41 <= pr <= 50) or (91 <= pr <= 110):
        score += 1

    # Temperature
    if temp <= 35.0:
        score += 3
    elif temp >= 39.1:
        score += 2
    elif (35.1 <= temp <= 36.0) or (38.1 <= temp <= 39.0):
        score += 1

    return score


def default_deterioration_rule(df: pd.DataFrame, thresholds: Dict[str, float] = DEFAULT_THRESHOLDS) -> pd.Series:
    """
    Evaluates whether any vital breaches clinical deterioration thresholds:
    SpO2 < 92, SystolicBP < 90, PulseRate > 120, RespRate > 24.
    Returns boolean Series of deterioration events at each timestamp.
    """
    cond_spo2 = df["SpO2"] < thresholds["SpO2_low"]
    cond_sbp = df["SystolicBP"] < thresholds["SystolicBP_low"]
    cond_pr = df["PulseRate"] > thresholds["PulseRate_high"]
    cond_rr = df["RespRate"] > thresholds["RespRate_high"]
    return cond_spo2 | cond_sbp | cond_pr | cond_rr


def generate_deterioration_labels(
    df: pd.DataFrame,
    future_window: int = 15,
    rule_fn: Callable[[pd.DataFrame], pd.Series] = default_deterioration_rule,
) -> pd.DataFrame:
    """
    STEP 1: For each patient and timestamp t, label = 1 if rule_fn holds at any point in (t, t + future_window].
    Drops rows in the last `future_window` minutes of each patient's series.
    """
    df = df.copy()
    processed_patients = []

    for patient_id, group in df.groupby("PatientCaseID", as_index=False):
        group = group.sort_values("Minute").copy().reset_index(drop=True)
        is_breach = rule_fn(group).astype(int)

        # Reverse rolling max to check if any breach in next `future_window` steps
        # breach in (t, t + future_window] means steps t+1 to t+future_window
        future_breach = is_breach.iloc[::-1].rolling(window=future_window, min_periods=1).max().iloc[::-1].shift(-1)

        group["label"] = future_breach

        # Drop the last future_window rows (where future label cannot be observed)
        if len(group) > future_window:
            group = group.iloc[:-future_window].copy()
        else:
            group = group.iloc[0:0].copy()

        group["label"] = group["label"].astype(int)
        processed_patients.append(group)

    return pd.concat(processed_patients, ignore_index=True)


def compute_fast_slope(arr: np.ndarray) -> float:
    """
    Computes OLS linear slope of 1D array over time steps 0, 1, ..., n-1.
    If length < 2 or variance is 0, returns 0.0.
    """
    n = len(arr)
    if n < 2:
        return 0.0
    x = np.arange(n, dtype=float)
    x_mean = (n - 1.0) / 2.0
    y_mean = np.mean(arr)
    denom = np.sum((x - x_mean) ** 2)
    if denom == 0:
        return 0.0
    numer = np.sum((x - x_mean) * (arr - y_mean))
    return float(numer / denom)


class RollingVARForecaster:
    """
    STEP 2: Rolling VAR forecaster for multi-vital time series.
    Fits a VAR model jointly on all 5 vitals over a trailing window (e.g. 30 min),
    refitting periodically (e.g. every 5 min) and producing forecasts for t+1, t+3, t+5, t+10.
    Tracks 1-step ahead forecast residuals at each t: actual(t) - predicted(t).
    Handles edge cases: constant columns -> fallback to trend='n'; insufficient window -> persistence fallback.
    """

    def __init__(
        self,
        vitals: List[str] = VITAL_COLS,
        window_size: int = 30,
        refit_interval: int = 5,
        horizons: List[int] = [1, 3, 5, 10],
        max_lag_cap: int = 10,
    ):
        self.vitals = vitals
        self.window_size = window_size
        self.refit_interval = refit_interval
        self.horizons = horizons
        self.max_lag_cap = max_lag_cap

    def fit_and_forecast_patient(self, patient_df: pd.DataFrame) -> pd.DataFrame:
        """
        Runs rolling VAR on a single patient's time series.
        Returns a DataFrame aligned to (PatientCaseID, Minute) with forecast and residual features.
        """
        n_rows = len(patient_df)
        k_vitals = len(self.vitals)

        # Output feature storage
        fc_features = {f"{vital}_var_fc_{h}": np.zeros(n_rows, dtype=float) for vital in self.vitals for h in self.horizons}
        fc_slopes = {f"{vital}_var_fc_slope": np.zeros(n_rows, dtype=float) for vital in self.vitals}
        residuals = {f"{vital}_var_residual": np.zeros(n_rows, dtype=float) for vital in self.vitals}

        vitals_data = patient_df[self.vitals].values.astype(float)
        active_model_res = None
        last_refit_idx = -999

        # Stored 1-step forecasts from t-1 for calculating residual at t: actual(t) - predicted(t)
        prev_step1_forecast = vitals_data[0].copy()

        for t in range(n_rows):
            current_vitals = vitals_data[t]

            # 1-step residual at time t: actual(t) - forecast_made_at_t-1
            for vi, vital in enumerate(self.vitals):
                residuals[f"{vital}_var_residual"][t] = current_vitals[vi] - prev_step1_forecast[vi]

            # If window is too small (early patient minutes), fallback to persistence forecast
            if t < self.window_size:
                for vi, vital in enumerate(self.vitals):
                    for h in self.horizons:
                        fc_features[f"{vital}_var_fc_{h}"][t] = current_vitals[vi]
                    fc_slopes[f"{vital}_var_fc_slope"][t] = 0.0
                prev_step1_forecast = current_vitals.copy()
                continue

            # Check if refit is due
            window_slice = vitals_data[t - self.window_size + 1 : t + 1]
            if (t - last_refit_idx) >= self.refit_interval or active_model_res is None:
                active_model_res = self._fit_var_window(window_slice)
                last_refit_idx = t

            # Generate multi-step forecast from model if available
            fc_success = False
            if active_model_res is not None:
                try:
                    k_ar = active_model_res.k_ar
                    if k_ar > 0 and len(window_slice) >= k_ar:
                        lags_input = window_slice[-k_ar:]
                        fc_raw = active_model_res.forecast(lags_input, steps=max(self.horizons))
                        # fc_raw has shape (max(horizons), k_vitals)
                        for vi, vital in enumerate(self.vitals):
                            vital_fc_vals = []
                            for h in self.horizons:
                                val = float(fc_raw[h - 1, vi])
                                fc_features[f"{vital}_var_fc_{h}"][t] = val
                                vital_fc_vals.append(val)

                            # Forecast slope across horizons [1, 3, 5, 10]
                            fc_slopes[f"{vital}_var_fc_slope"][t] = compute_fast_slope(np.array(vital_fc_vals))

                        prev_step1_forecast = fc_raw[0].copy()
                        fc_success = True
                except Exception:
                    fc_success = False

            if not fc_success:
                # Fallback to persistence forecast
                for vi, vital in enumerate(self.vitals):
                    for h in self.horizons:
                        fc_features[f"{vital}_var_fc_{h}"][t] = current_vitals[vi]
                    fc_slopes[f"{vital}_var_fc_slope"][t] = 0.0
                prev_step1_forecast = current_vitals.copy()

        # Build output dataframe
        res_df = pd.DataFrame(index=patient_df.index)
        for col_name, col_vals in fc_features.items():
            res_df[col_name] = col_vals
        for col_name, col_vals in fc_slopes.items():
            res_df[col_name] = col_vals
        for col_name, col_vals in residuals.items():
            res_df[col_name] = col_vals

        # Add rolling std of residuals (5 and 15 min) per vital
        for vital in self.vitals:
            res_col = f"{vital}_var_residual"
            res_df[f"{vital}_var_residual_std_5"] = (
                res_df[res_col].rolling(window=5, min_periods=1).std().fillna(0.0)
            )
            res_df[f"{vital}_var_residual_std_15"] = (
                res_df[res_col].rolling(window=15, min_periods=1).std().fillna(0.0)
            )

        return res_df

    def _fit_var_window(self, window_data: np.ndarray):
        """
        Fits VAR model with safe degrees of freedom and constant-column fallback.
        """
        n_obs, k_vars = window_data.shape
        # Ensure degrees of freedom: (n_obs - p) > k_vars * p + trend_deg
        max_p_allowed = max(1, (n_obs - 2) // (k_vars + 1))
        max_p = min(self.max_lag_cap, max_p_allowed)

        # Check if any column is constant
        stds = np.std(window_data, axis=0)
        has_constant = np.any(stds < 1e-5)

        trend = "n" if has_constant else "c"

        try:
            model = VAR(window_data)
            # Select lag order via AIC
            sel = model.select_order(maxlags=max_p, trend=trend)
            best_p = sel.aic if sel.aic is not None else 1
            best_p = max(1, min(int(best_p), max_p))
            res = model.fit(maxlags=best_p, trend=trend)
            return res
        except Exception:
            # Fallback attempt with trend='n' and lag=1
            try:
                model = VAR(window_data)
                res = model.fit(maxlags=1, trend="n")
                return res
            except Exception:
                return None


def engineer_features(
    df: pd.DataFrame,
    include_label: bool = True,
    future_window: int = 15,
    thresholds: Dict[str, float] = DEFAULT_THRESHOLDS,
) -> pd.DataFrame:
    """
    STEP 3: Computes all trailing-window, VAR, breach, and composite features.
    Outputs the engineered dataset ready for training or inference.
    """
    if include_label:
        df = generate_deterioration_labels(df, future_window=future_window, rule_fn=default_deterioration_rule)

    var_forecaster = RollingVARForecaster(vitals=VITAL_COLS, window_size=30, refit_interval=5)
    trailing_windows = [5, 15, 30]

    all_patient_features = []

    for patient_id, group in df.groupby("PatientCaseID", as_index=False):
        group = group.sort_values("Minute").copy().reset_index(drop=True)
        feat_dict = {}

        # Key identifiers preserved
        feat_dict["PatientCaseID"] = group["PatientCaseID"].values
        feat_dict["Minute"] = group["Minute"].values
        if include_label:
            feat_dict["label"] = group["label"].values

        # 1. Time / context feature
        min_minute = group["Minute"].min()
        feat_dict["minutes_elapsed"] = (group["Minute"] - min_minute).values

        # 2. VAR features
        var_feats = var_forecaster.fit_and_forecast_patient(group)
        for c in var_feats.columns:
            feat_dict[c] = var_feats[c].values

        # 3. Trailing window features per vital
        vital_trend_slopes_15 = {}

        for vital in VITAL_COLS:
            vals = group[vital].astype(float)
            feat_dict[f"{vital}_current"] = vals.values

            # Rolling stats (mean, std, min, max, range)
            for w in trailing_windows:
                r_mean = vals.rolling(window=w, min_periods=1).mean().values
                r_std = vals.rolling(window=w, min_periods=1).std().fillna(0.0).values
                r_min = vals.rolling(window=w, min_periods=1).min().values
                r_max = vals.rolling(window=w, min_periods=1).max().values
                r_range = r_max - r_min

                feat_dict[f"{vital}_mean_{w}"] = r_mean
                feat_dict[f"{vital}_std_{w}"] = r_std
                feat_dict[f"{vital}_min_{w}"] = r_min
                feat_dict[f"{vital}_max_{w}"] = r_max
                feat_dict[f"{vital}_range_{w}"] = r_range

                # Linear trend slope per window
                slopes = vals.rolling(window=w, min_periods=2).apply(
                    compute_fast_slope, raw=True
                ).fillna(0.0)
                feat_dict[f"{vital}_slope_{w}"] = slopes.values

                # Acceleration: change in slope vs previous window
                feat_dict[f"{vital}_slope_acc_{w}"] = slopes.diff(1).fillna(0.0).values

                if w == 15:
                    vital_trend_slopes_15[vital] = slopes

            # Rate of change: value(t) - value(t-k) for k in [1, 5, 15]
            feat_dict[f"{vital}_diff_1"] = vals.diff(1).fillna(0.0).values
            feat_dict[f"{vital}_diff_5"] = vals.diff(5).fillna(0.0).values
            feat_dict[f"{vital}_diff_15"] = vals.diff(15).fillna(0.0).values

            # Clinical threshold breach analysis
            if vital == "SpO2":
                is_breached = vals < thresholds["SpO2_low"]
                danger_dist = vals - thresholds["SpO2_low"]
            elif vital == "SystolicBP":
                is_breached = vals < thresholds["SystolicBP_low"]
                danger_dist = vals - thresholds["SystolicBP_low"]
            elif vital == "PulseRate":
                is_breached = vals > thresholds["PulseRate_high"]
                danger_dist = thresholds["PulseRate_high"] - vals
            elif vital == "RespRate":
                is_breached = vals > thresholds["RespRate_high"]
                danger_dist = thresholds["RespRate_high"] - vals
            elif vital == "Temperature":
                is_breached = (vals < thresholds["Temp_low"]) | (vals > thresholds["Temp_high"])
                dist_low = np.abs(vals - thresholds["Temp_low"])
                dist_high = np.abs(vals - thresholds["Temp_high"])
                danger_dist = np.minimum(dist_low, dist_high)
            else:
                is_breached = pd.Series(False, index=vals.index)
                danger_dist = pd.Series(0.0, index=vals.index)

            feat_dict[f"{vital}_danger_dist"] = danger_dist.values

            # Count of threshold breaches in last 15 and 30 minutes
            feat_dict[f"{vital}_breach_count_15"] = (
                is_breached.astype(int).rolling(window=15, min_periods=1).sum().values
            )
            feat_dict[f"{vital}_breach_count_30"] = (
                is_breached.astype(int).rolling(window=30, min_periods=1).sum().values
            )

            # Time since last breach: cumulative minutes since last breach
            time_since_breach = np.full(len(vals), fill_value=999.0, dtype=float)
            last_breach_time = -999.0
            for i, breached in enumerate(is_breached):
                curr_min = float(group["Minute"].iloc[i])
                if breached:
                    last_breach_time = curr_min
                    time_since_breach[i] = 0.0
                elif last_breach_time >= 0:
                    time_since_breach[i] = curr_min - last_breach_time
                else:
                    time_since_breach[i] = curr_min - min_minute
            feat_dict[f"{vital}_time_since_breach"] = time_since_breach

        # 4. Cross-vital composite features
        # Shock Index = PulseRate / SystolicBP
        feat_dict["shock_index"] = (group["PulseRate"] / (group["SystolicBP"].replace(0, np.nan).fillna(120.0))).values

        # Early-warning composite score (NEWS2)
        news2_scores = group[VITAL_COLS].apply(compute_news2_score, axis=1)
        feat_dict["early_warning_score"] = news2_scores.values

        # Count of vitals currently outside normal range (0-5)
        outside_normal = (
            (group["SpO2"] < 95.0).astype(int)
            + ((group["SystolicBP"] < 100.0) | (group["SystolicBP"] > 140.0)).astype(int)
            + ((group["PulseRate"] < 60.0) | (group["PulseRate"] > 100.0)).astype(int)
            + ((group["RespRate"] < 12.0) | (group["RespRate"] > 20.0)).astype(int)
            + ((group["Temperature"] < 36.1) | (group["Temperature"] > 37.8)).astype(int)
        )
        feat_dict["abnormal_vitals_count"] = outside_normal.values

        # Count of vitals with worsening trend slope simultaneously (0-5)
        worsening_pr = (vital_trend_slopes_15["PulseRate"] > 0.2).astype(int)
        worsening_rr = (vital_trend_slopes_15["RespRate"] > 0.1).astype(int)
        worsening_spo2 = (vital_trend_slopes_15["SpO2"] < -0.1).astype(int)
        worsening_sbp = (vital_trend_slopes_15["SystolicBP"] < -0.5).astype(int)
        worsening_temp = (
            ((group["Temperature"] >= 37.0) & (vital_trend_slopes_15["Temperature"] > 0.05))
            | ((group["Temperature"] < 37.0) & (vital_trend_slopes_15["Temperature"] < -0.05))
        ).astype(int)

        feat_dict["worsening_trend_count"] = (
            worsening_pr + worsening_rr + worsening_spo2 + worsening_sbp + worsening_temp
        ).values

        # Max absolute VAR residual across all 5 vitals at this timestamp
        res_cols = [f"{v}_var_residual" for v in VITAL_COLS]
        feat_df_temp = pd.DataFrame({k: feat_dict[k] for k in res_cols})
        feat_dict["max_var_residual"] = feat_df_temp.abs().max(axis=1).values

        feat_df = pd.DataFrame(feat_dict, index=group.index)
        all_patient_features.append(feat_df)

    full_features_df = pd.concat(all_patient_features, ignore_index=True)

    # Clean any residual NaNs with forward-appropriate imputation
    clean_dfs = []
    for pid, grp in full_features_df.groupby("PatientCaseID", as_index=False):
        grp = grp.ffill().bfill().fillna(0.0)
        clean_dfs.append(grp)
    full_features_df = pd.concat(clean_dfs, ignore_index=True)

    return full_features_df


def main():
    raw_path = os.path.join("data", "raw", "combined_5_patients_vitals.csv")
    out_dir = os.path.join("data", "processed")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "engineered_features_train.csv")

    print(f"Loading raw vitals from: {raw_path}")
    raw_df = pd.read_csv(raw_path)
    print(f"Loaded raw data with shape {raw_df.shape}")

    print("Running end-to-end feature engineering pipeline...")
    features_df = engineer_features(raw_df, include_label=True, future_window=15)

    print(f"Engineered feature table shape: {features_df.shape}")
    print(f"Class distribution of 'label':\n{features_df['label'].value_counts(dropna=False)}")
    print(f"Label positive rate: {features_df['label'].mean():.4f}")

    features_df.to_csv(out_path, index=False)
    print(f"Successfully saved engineered training features to: {out_path}")


if __name__ == "__main__":
    main()
