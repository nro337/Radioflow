"""Training Step 4"""

import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.core.classification_core import models as default_models
from app.core.classification_core import scalers as default_scalers
from app.core.classification_core import test_ratios as default_test_ratios
from app.core.classification_jobs import get_job, start_job, subscribe
from app.core.preprocessing_jobs import get_job as get_preprocessing_job
from app.routes.experiments import _require_experiment

router = APIRouter(prefix="/experiments/{experiment_id}/train", tags=["training"])


class TrainingConfig(BaseModel):
    """Request body to kick off training (a sweep of classification experiments)."""

    testRatios: List[float] = Field(default_factory=lambda: list(default_test_ratios))
    scalers: List[str] = Field(default_factory=lambda: list(default_scalers))
    models: List[str] = Field(default_factory=lambda: list(default_models))
    targetColumn: str = "Class"
    dropFirstColumn: bool = True


class TrainingStatus(BaseModel):
    """Training status/progress (epochs, loss, etc.)."""

    status: str
    processed: int = 0
    total: int = 0
    currentTask: str = ""
    error: Optional[str] = None
    resultsPath: Optional[str] = None


def _to_status(job) -> TrainingStatus:
    return TrainingStatus(
        status=job.status,
        processed=job.processed,
        total=job.total,
        currentTask=job.currentTask,
        error=job.error,
        resultsPath=job.resultsPath,
    )


def _output_dir(experiment_id: str) -> str:
    return str(settings.RESULTS_DIR / experiment_id / "training")


@router.post("", response_model=TrainingStatus, status_code=202)
async def start_training(experiment_id: str, payload: TrainingConfig) -> TrainingStatus:
    """Kick off training for the experiment's model."""
    _require_experiment(experiment_id)

    existing = get_job(experiment_id)
    if existing is not None and existing.status == "running":
        raise HTTPException(
            status_code=409,
            detail="Training is already running for this experiment.",
        )

    preprocessing_job = get_preprocessing_job(experiment_id)
    if preprocessing_job is None or preprocessing_job.status != "completed":
        raise HTTPException(
            status_code=409,
            detail="Preprocessing must complete for this experiment before training.",
        )

    if not payload.testRatios or not payload.scalers or not payload.models:
        raise HTTPException(
            status_code=422,
            detail="At least one test ratio, scaler, and model must be provided.",
        )

    job = await start_job(
        experiment_id,
        preprocessing_job.featuresPath,
        _output_dir(experiment_id),
        payload.testRatios,
        payload.scalers,
        payload.models,
        payload.targetColumn,
        payload.dropFirstColumn,
    )
    return _to_status(job)


@router.get("", response_model=TrainingStatus)
async def get_training_status(experiment_id: str) -> TrainingStatus:
    """Get the experiment's training status/progress."""
    _require_experiment(experiment_id)

    job = get_job(experiment_id)
    if job is None:
        raise HTTPException(
            status_code=404, detail="No training job found for this experiment."
        )
    return _to_status(job)


@router.get("/stream")
async def stream_training_progress(experiment_id: str) -> StreamingResponse:
    """Server-sent events stream of live training progress for the UI to follow."""
    _require_experiment(experiment_id)

    job = get_job(experiment_id)
    if job is None:
        raise HTTPException(
            status_code=404, detail="No training job found for this experiment."
        )

    queue = subscribe(job)

    async def event_source():
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(vars(event))}\n\n"
            if event.status in ("completed", "failed"):
                break

    return StreamingResponse(event_source(), media_type="text/event-stream")
