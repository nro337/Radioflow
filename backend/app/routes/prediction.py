"""Prediction Step 6"""

from pathlib import Path
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.classification_jobs import get_job as get_training_job
from app.core.experiments_store import get_experiment
from app.core.prediction_core import run_prediction
from app.core.preprocessing_jobs import get_job as get_preprocessing_job
from app.routes.experiments import _require_experiment
from app.routes.training import _output_dir

router = APIRouter(prefix="/experiments/{experiment_id}/predict", tags=["prediction"])


class PredictionRequest(BaseModel):
    """Request body identifying which trained model/scaler/test-ratio combination to use."""

    testRatio: float
    model: str
    scaler: str


class PredictionResult(BaseModel):
    """Prediction result from the experiment's trained model, for a randomly sampled row."""

    sampleIndex: int
    file: Optional[str] = None
    trueClass: str
    predictedClass: str
    probabilities: Optional[Dict[str, float]] = None
    datasetId: str
    imagePath: Optional[str] = None


@router.post("", response_model=PredictionResult)
async def predict(experiment_id: str, payload: PredictionRequest) -> PredictionResult:
    """Run inference on a random sample using the experiment's trained model."""
    _require_experiment(experiment_id)
    experiment = get_experiment(experiment_id)

    preprocessing_job = get_preprocessing_job(experiment_id)
    if preprocessing_job is None or preprocessing_job.status != "completed":
        raise HTTPException(
            status_code=409,
            detail="Preprocessing must complete for this experiment before prediction.",
        )

    training_job = get_training_job(experiment_id)
    if training_job is None or training_job.status != "completed":
        raise HTTPException(
            status_code=409,
            detail="Training must complete for this experiment before prediction.",
        )

    results_dir = Path(_output_dir(experiment_id)) / f"TestRatio_{payload.testRatio}"
    pickle_path = results_dir / f"{payload.model}_{payload.scaler}.p"
    if not pickle_path.exists():
        raise HTTPException(
            status_code=404,
            detail="No trained model found for that test ratio/model/scaler combination.",
        )

    result = run_prediction(
        resultsDir=str(results_dir),
        model=payload.model,
        scaler=payload.scaler,
        featuresPath=preprocessing_job.featuresPath,
        targetColumn=training_job.targetColumn,
        dropFirstColumn=training_job.dropFirstColumn,
    )

    image_path = None
    if result["file"] is not None:
        image_path = f"images/{result['trueClass']}/{result['file']}"

    return PredictionResult(
        sampleIndex=result["sampleIndex"],
        file=result["file"],
        trueClass=result["trueClass"],
        predictedClass=result["predictedClass"],
        probabilities=result["probabilities"],
        datasetId=experiment.datasetId,
        imagePath=image_path,
    )
