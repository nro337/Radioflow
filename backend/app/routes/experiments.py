"""Experiment Step 1"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/experiments", tags=["experiments"])


class ExperimentCreate(BaseModel):
    """Request body for defining a new experiment."""


class Experiment(BaseModel):
    """Experiment resource, tracking config and current workflow stage."""


@router.post("", response_model=Experiment)
async def create_experiment(payload: ExperimentCreate) -> Experiment:
    """Define a new experiment (problem definition)."""
    raise NotImplementedError


@router.get("", response_model=list[Experiment])
async def list_experiments() -> list[Experiment]:
    """List all experiments."""
    raise NotImplementedError


@router.get("/{experiment_id}", response_model=Experiment)
async def get_experiment(experiment_id: str) -> Experiment:
    """Get a single experiment's config and status."""
    raise NotImplementedError


@router.delete("/{experiment_id}")
async def delete_experiment(experiment_id: str) -> None:
    """Delete an experiment."""
    raise NotImplementedError
