"""
Model Training and Cross-Validation Pipeline
===========================================
Implements:
1. Leave-One-Patient-Out cross-validation (GroupKFold / LeaveOneGroupOut).
2. XGBoost binary classification model with scale_pos_weight for clinical class imbalance.
3. Grouped hyperparameter search (RandomizedSearchCV) optimizing clinical PR-AUC.
4. Out-of-fold probability collection and comprehensive metric computation (ROC-AUC, PR-AUC, confusion matrix).
5. Optimal decision threshold calibration.
6. Gain-based feature importance ranking.
7. Model persistence to model/xgboost_deterioration_model.json.
"""

from __future__ import annotations
import json
import os
import sys

# Ensure workspace root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import warnings
warnings.filterwarnings("ignore", message=".*No positive class found in y_true.*")
warnings.filterwarnings("ignore", category=UserWarning)

from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import LeaveOneGroupOut, RandomizedSearchCV

from model.evaluate import (
    compute_comprehensive_metrics,
    find_optimal_threshold,
    print_metrics_summary,
)



def load_dataset(csv_path: str = "data/processed/engineered_features_train.csv") -> Tuple[pd.DataFrame, pd.Series, np.ndarray, List[str]]:
    """
    Loads engineered features dataset and separates predictors X, target y, and patient groups.
    Ensures PatientCaseID, Minute, and label are NOT used as model features.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Processed dataset not found at {csv_path}. Run model/features.py first.")

    df = pd.read_csv(csv_path)
    exclude_cols = ["PatientCaseID", "Minute", "label"]
    feature_cols = [c for c in df.columns if c not in exclude_cols]

    X = df[feature_cols].copy()
    y = df["label"].copy()
    groups = df["PatientCaseID"].values

    return X, y, groups, feature_cols


def run_leave_one_patient_out_cv(
    X: pd.DataFrame,
    y: pd.Series,
    groups: np.ndarray,
    model_params: Dict[str, Any],
) -> Tuple[np.ndarray, Dict[str, Any], Dict[Any, Dict[str, float]]]:
    """
    Executes Leave-One-Patient-Out Cross-Validation.
    Computes out-of-fold predicted probabilities for every row in the dataset.
    """
    logo = LeaveOneGroupOut()
    oof_probs = np.zeros(len(y), dtype=float)
    per_patient_metrics = {}

    for fold_idx, (train_idx, val_idx) in enumerate(logo.split(X, y, groups)):
        val_patient = groups[val_idx[0]]
        X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
        X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

        # Calculate fold-specific scale_pos_weight
        n_pos = int(np.sum(y_train == 1))
        n_neg = int(np.sum(y_train == 0))
        fold_scale_pos = (n_neg / max(n_pos, 1))

        params = model_params.copy()
        params["scale_pos_weight"] = fold_scale_pos

        clf = XGBClassifier(**params)
        clf.fit(X_train, y_train)

        val_probs = clf.predict_proba(X_val)[:, 1]
        oof_probs[val_idx] = val_probs

        patient_metrics = compute_comprehensive_metrics(y_val.values, val_probs, threshold=0.5)
        per_patient_metrics[val_patient] = {
            "roc_auc": patient_metrics["roc_auc"],
            "pr_auc": patient_metrics["pr_auc"],
            "n_samples": len(val_idx),
            "n_positive": int(np.sum(y_val == 1)),
        }

    return oof_probs, per_patient_metrics


def tune_hyperparameters(
    X: pd.DataFrame,
    y: pd.Series,
    groups: np.ndarray,
    scale_pos_weight: float,
    n_iter: int = 25,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Performs RandomizedSearchCV over XGBoost hyperparameters using LeaveOneGroupOut CV
    optimizing average_precision (PR-AUC).
    """
    param_distributions = {
        "max_depth": [3, 4, 5, 6],
        "learning_rate": [0.01, 0.03, 0.05, 0.1, 0.15],
        "n_estimators": [60, 100, 150, 200],
        "subsample": [0.7, 0.8, 0.9, 1.0],
        "colsample_bytree": [0.6, 0.7, 0.8, 0.9],
        "min_child_weight": [1, 2, 4],
        "gamma": [0.0, 0.1, 0.2],
    }

    base_clf = XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        scale_pos_weight=scale_pos_weight,
        random_state=random_state,
        n_jobs=-1,
    )

    logo = LeaveOneGroupOut()
    search = RandomizedSearchCV(
        estimator=base_clf,
        param_distributions=param_distributions,
        n_iter=n_iter,
        scoring="average_precision",
        cv=logo,
        random_state=random_state,
        n_jobs=-1,
        verbose=0,
    )

    print(f"Starting Hyperparameter Tuning ({n_iter} iterations across Leave-One-Patient-Out CV)...")
    search.fit(X, y, groups=groups)
    print(f"Best Grouped CV PR-AUC Score: {search.best_score_:.4f}")
    print("Best Hyperparameters:", json.dumps(search.best_params_, indent=2))
    return search.best_params_


def get_feature_importances(
    model: XGBClassifier,
    feature_names: List[str],
    top_n: int = 25,
) -> pd.DataFrame:
    """
    Extracts gain-based feature importances from the trained XGBoost model.
    """
    booster = model.get_booster()
    # importance_type='gain' shows average gain across all splits where feature was used
    score_dict = booster.get_score(importance_type="gain")

    importances = []
    for f in feature_names:
        importances.append({"feature": f, "gain": score_dict.get(f, 0.0)})

    fi_df = pd.DataFrame(importances).sort_values("gain", ascending=False).reset_index(drop=True)
    fi_df["relative_gain"] = fi_df["gain"] / (fi_df["gain"].sum() + 1e-10)
    return fi_df


def train_and_evaluate(
    data_path: str = "data/processed/engineered_features_train.csv",
    output_dir: str = "model",
    run_tuning: bool = True,
):
    """
    Full training and evaluation pipeline:
    1. Ingestion
    2. Grouped LOPO CV tuning
    3. LOPO Out-of-fold evaluation
    4. Full dataset retraining
    5. Feature importance analysis & export
    """
    os.makedirs(output_dir, exist_ok=True)
    X, y, groups, feature_names = load_dataset(data_path)

    n_pos = int(np.sum(y == 1))
    n_neg = int(np.sum(y == 0))
    scale_pos_weight = float(n_neg / max(n_pos, 1))

    print(f"Loaded {len(X)} samples with {len(feature_names)} features across {len(np.unique(groups))} patients.")
    print(f"Class imbalance: Negatives={n_neg}, Positives={n_pos} (scale_pos_weight={scale_pos_weight:.3f})")

    default_params = {
        "objective": "binary:logistic",
        "eval_metric": "logloss",
        "max_depth": 4,
        "learning_rate": 0.05,
        "n_estimators": 100,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 2,
        "scale_pos_weight": scale_pos_weight,
        "random_state": 42,
        "n_jobs": -1,
    }

    if run_tuning:
        best_params = tune_hyperparameters(X, y, groups, scale_pos_weight=scale_pos_weight, n_iter=20)
        final_params = {**default_params, **best_params}
    else:
        final_params = default_params

    # Run Out-Of-Fold Leave-One-Patient-Out Cross-Validation
    print("\nRunning Leave-One-Patient-Out Out-Of-Fold Validation...")
    oof_probs, patient_metrics = run_leave_one_patient_out_cv(X, y, groups, final_params)

    # Find optimal threshold to balance Precision and Recall (F1 score)
    opt_threshold, opt_f1 = find_optimal_threshold(y.values, oof_probs, metric="f1")
    print(f"\nOptimal Decision Threshold on Out-Of-Fold Predictions: {opt_threshold:.4f} (Max F1 = {opt_f1:.4f})")

    # Overall metrics at default 0.5 and optimal threshold
    metrics_default = compute_comprehensive_metrics(y.values, oof_probs, threshold=0.5)
    metrics_opt = compute_comprehensive_metrics(y.values, oof_probs, threshold=opt_threshold)

    print("\n--- Out-of-Fold Performance at Standard 0.5 Threshold ---")
    print_metrics_summary(metrics_default, title="LOPO CV Out-of-Fold (Threshold 0.50)")

    print("\n--- Out-of-Fold Performance at Calibrated Optimal Threshold ---")
    print_metrics_summary(metrics_opt, title=f"LOPO CV Out-of-Fold (Calibrated Threshold {opt_threshold:.3f})")

    print("\n--- Per-Patient Leave-One-Out Breakdown ---")
    for pid, p_met in patient_metrics.items():
        print(f"Patient {pid:2d} (n={p_met['n_samples']:3d}, pos={p_met['n_positive']:2d}): "
              f"ROC-AUC = {p_met['roc_auc']:.4f}, PR-AUC = {p_met['pr_auc']:.4f}")

    # Train final model on full dataset
    print("\nFitting final model on all patient data...")
    final_model = XGBClassifier(**final_params)
    final_model.fit(X, y)

    # Model and feature persistence
    model_path = os.path.join(output_dir, "xgboost_deterioration_model.json")
    final_model.save_model(model_path)
    print(f"Saved trained XGBoost model to: {model_path}")

    # Feature importances
    fi_df = get_feature_importances(final_model, feature_names, top_n=25)
    fi_csv_path = os.path.join(output_dir, "feature_importances.csv")
    fi_df.to_csv(fi_csv_path, index=False)
    print(f"Saved feature importances to: {fi_csv_path}")

    print("\nTop 20 Predictive Features (Gain-based):")
    print(fi_df[["feature", "gain", "relative_gain"]].head(20).to_string(index=False))

    # Save model configuration and threshold metadata
    config = {
        "model_file": "xgboost_deterioration_model.json",
        "optimal_threshold": opt_threshold,
        "metrics_at_optimal_threshold": {
            "roc_auc": metrics_opt["roc_auc"],
            "pr_auc": metrics_opt["pr_auc"],
            "f1_score": metrics_opt["f1_score"],
            "precision": metrics_opt["precision"],
            "recall": metrics_opt["recall_sensitivity"],
            "specificity": metrics_opt["specificity"],
            "accuracy": metrics_opt["accuracy"],
            "confusion_matrix": metrics_opt["confusion_matrix"],
        },
        "feature_names": feature_names,
        "n_features": len(feature_names),
        "hyperparameters": final_params,
    }
    config_path = os.path.join(output_dir, "model_config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"Saved model metadata and config to: {config_path}")

    return final_model, metrics_opt, fi_df


if __name__ == "__main__":
    train_and_evaluate(run_tuning=True)
