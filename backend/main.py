from __future__ import annotations
from contextlib import asynccontextmanager
import sys, os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.model_loader import load_predictor
from backend.routes.predict import router as predict_router
from backend.routes.patients import router as patients_router
from backend.routes.history import router as history_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading deterioration model...")
    predictor = load_predictor()
    print(f"Model ready. Features: {len(predictor.feature_names)}, Alert threshold: {predictor.optimal_threshold:.4f}")
    yield
    print("Shutting down.")


app = FastAPI(
    title="Vital Warning Monitor - Inference API",
    description="Real-time clinical deterioration risk prediction. POST /predict/run to score a 30-minute patient vitals window.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(patients_router)
app.include_router(history_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}

# Mount frontend as static files so visiting http://127.0.0.1:8000 loads the full UI
frontend_dir = os.path.join(BASE_DIR, "frontend")
if os.path.isdir(frontend_dir):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")