from __future__ import annotations
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from model.inference import DeteriorationRiskPredictor

_predictor = None


def load_predictor():
    global _predictor
    model_path = os.path.join(BASE_DIR, "model", "xgboost_deterioration_model.json")
    config_path = os.path.join(BASE_DIR, "model", "model_config.json")
    _predictor = DeteriorationRiskPredictor(model_path=model_path, config_path=config_path)
    return _predictor


def get_predictor():
    if _predictor is None:
        raise RuntimeError("Predictor not initialised. Call load_predictor() at startup.")
    return _predictor