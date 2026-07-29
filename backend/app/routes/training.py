"""Training Step 4"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/experiments/{experiment_id}/train", tags=["training"])


class TrainingConfig(BaseModel):
    """Request body to kick off training."""


class TrainingStatus(BaseModel):
    """Training status/progress (epochs, loss, etc.)."""


@router.post("", response_model=TrainingStatus)
async def start_training(experiment_id: str, payload: TrainingConfig) -> TrainingStatus:
    """Kick off training for the experiment's model."""
    raise NotImplementedError


@router.get("", response_model=TrainingStatus)
async def get_training_status(experiment_id: str) -> TrainingStatus:
    """Get the experiment's training status/progress."""
    raise NotImplementedError
