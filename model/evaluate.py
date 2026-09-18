"""
Evaluation and Clinical Metrics Module
======================================
Provides evaluation utilities for clinical risk prediction models, specifically
handling class-imbalanced time-series data:
- ROC-AUC and PR-AUC (Average Precision)
- Optimal decision threshold selection (maximizing F1 or F2 for clinical sensitivity)
- Detailed Confusion Matrix, Precision, Recall, Specificity
- Per-patient leave-one-out cross-validation breakdown
"""

from __future__ import annotations
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_recall_curve,
    roc_curve,
    confusion_matrix,
    classification_report,
    f1_score,
)


def find_optimal_threshold(y_true: np.ndarray, y_prob: np.ndarray, metric: str = "f1", beta: float = 1.0) -> Tuple[float, float]:
    """
    Finds the optimal classification probability threshold that maximizes F_beta score
    on the precision-recall curve.
    For clinical warnings, beta > 1.0 (e.g. beta=2) prioritizes recall/sensitivity.
    """
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_prob)
    # precision_recall_curve thresholds has length len(precisions)-1
    f_scores = []
    for p, r in zip(precisions[:-1], recalls[:-1]):
        if (p + r) == 0:
            f_scores.append(0.0)
        else:
            fb = (1 + beta**2) * (p * r) / ((beta**2 * p) + r)
            f_scores.append(fb)

    f_scores = np.array(f_scores)
    best_idx = np.argmax(f_scores)
    best_threshold = float(thresholds[best_idx])
    best_score = float(f_scores[best_idx])
    return best_threshold, best_score


def compute_comprehensive_metrics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """
    Computes clinical classification metrics: ROC-AUC, PR-AUC, Confusion Matrix,
    Sensitivity/Recall, Specificity, Precision, F1-Score at the given threshold.
    """
    y_true = np.asarray(y_true, dtype=int)
    y_prob = np.asarray(y_prob, dtype=float)
    y_pred = (y_prob >= threshold).astype(int)

    roc_auc = float(roc_auc_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else 0.0
    pr_auc = float(average_precision_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else 0.0

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0  # Sensitivity
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    accuracy = float((tp + tn) / len(y_true))

    return {
        "threshold": threshold,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "accuracy": accuracy,
        "precision": precision,
        "recall_sensitivity": recall,
        "specificity": specificity,
        "f1_score": f1,
        "confusion_matrix": {
            "TN": int(tn),
            "FP": int(fp),
            "FN": int(fn),
            "TP": int(tp),
        },
        "cm_array": cm,
    }


def print_metrics_summary(metrics: Dict[str, Any], title: str = "Model Evaluation"):
    """
    Prints an aesthetic clinical summary of performance metrics.
    """
    cm = metrics["confusion_matrix"]
    print("=" * 60)
    print(f" {title.upper()} (Threshold = {metrics['threshold']:.3f})")
    print("=" * 60)
    print(f"  ROC-AUC Score          : {metrics['roc_auc']:.4f}")
    print(f"  PR-AUC (Avg Precision) : {metrics['pr_auc']:.4f}")
    print(f"  Precision (PPV)        : {metrics['precision']:.4f}")
    print(f"  Recall (Sensitivity)   : {metrics['recall_sensitivity']:.4f}")
    print(f"  Specificity (TNR)      : {metrics['specificity']:.4f}")
    print(f"  F1-Score               : {metrics['f1_score']:.4f}")
    print(f"  Overall Accuracy       : {metrics['accuracy']:.4f}")
    print("-" * 60)
    print("  Confusion Matrix:")
    print(f"                Predicted Negative    Predicted Positive")
    print(f"  Actual Neg   TN: {cm['TN']:<8d}          FP: {cm['FP']:<8d}")
    print(f"  Actual Pos   FN: {cm['FN']:<8d}          TP: {cm['TP']:<8d}")
    print("=" * 60)
