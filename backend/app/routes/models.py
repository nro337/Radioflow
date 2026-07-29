"""Model Step 3"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/experiments/{experiment_id}/model", tags=["model"])


class ModelConfig(BaseModel):
    """Request/response body for the model architecture and hyperparameters."""


@router.post("", response_model=ModelConfig)
async def define_model(experiment_id: str, payload: ModelConfig) -> ModelConfig:
    """Define/configure the AI model for the experiment."""
    raise NotImplementedError


@router.get("", response_model=ModelConfig)
async def get_model(experiment_id: str) -> ModelConfig:
    """Get the experiment's current model configuration."""
    raise NotImplementedError
