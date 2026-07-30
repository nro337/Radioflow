"""Experiment Step 1"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.classification_jobs import get_job as get_training_job
from app.core.experiments_store import (
    create_experiment,
    delete_experiment,
    get_experiment,
    list_experiments,
)
from app.core.preprocessing_jobs import get_job as get_preprocessing_job
from app.routes.datasets import _get_dataset_root

router = APIRouter(prefix="/experiments", tags=["experiments"])


def _require_experiment(experiment_id: str) -> None:
    """Raise 404 if no experiment with this id exists. For use by other experiment-scoped routers."""
    if get_experiment(experiment_id) is None:
        raise HTTPException(status_code=404, detail="Experiment not found")


class ExperimentCreate(BaseModel):
    """Request body for defining a new experiment."""

    name: str
    datasetId: str
    description: Optional[str] = None


class Experiment(BaseModel):
    """Experiment resource, tracking config and current workflow stage."""

    id: str
    name: str
    datasetId: str
    description: Optional[str] = None
    createdAt: datetime
    stage: str


def _compute_stage(experiment_id: str) -> str:
    """Derive the experiment's current workflow stage from its preprocessing/training jobs."""
    preprocessing_job = get_preprocessing_job(experiment_id)
    if preprocessing_job is None:
        return "created"
    if preprocessing_job.status in ("pending", "running"):
        return "preprocessing"
    if preprocessing_job.status == "failed":
        return "preprocessing_failed"

    training_job = get_training_job(experiment_id)
    if training_job is None:
        return "preprocessed"
    if training_job.status in ("pending", "running"):
        return "training"
    if training_job.status == "failed":
        return "training_failed"
    return "trained"


def _to_response(experiment) -> Experiment:
    return Experiment(
        id=experiment.id,
        name=experiment.name,
        datasetId=experiment.datasetId,
        description=experiment.description,
        createdAt=experiment.createdAt,
        stage=_compute_stage(experiment.id),
    )


@router.post("", response_model=Experiment)
async def create_experiment_route(payload: ExperimentCreate) -> Experiment:
    """Define a new experiment (problem definition)."""
    # Validates the dataset exists (raises 404 otherwise) before the experiment is created.
    _get_dataset_root(payload.datasetId)
    experiment = create_experiment(
        name=payload.name,
        datasetId=payload.datasetId,
        description=payload.description,
    )
    return _to_response(experiment)


@router.get("", response_model=list[Experiment])
async def list_experiments_route() -> list[Experiment]:
    """List all experiments."""
    return [_to_response(experiment) for experiment in list_experiments()]


@router.get("/{experiment_id}", response_model=Experiment)
async def get_experiment_route(experiment_id: str) -> Experiment:
    """Get a single experiment's config and status."""
    experiment = get_experiment(experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return _to_response(experiment)


@router.delete("/{experiment_id}")
async def delete_experiment_route(experiment_id: str) -> None:
    """Delete an experiment."""
    if not delete_experiment(experiment_id):
        raise HTTPException(status_code=404, detail="Experiment not found")
